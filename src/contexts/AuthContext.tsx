
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { authService } from '@/services/authService';
import { authBridge } from '@/services/authBridge';
import type { User, Session } from '@supabase/supabase-js';
import logger from '@/services/loggerService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string, options?: unknown) => Promise<{ data?: any; error: any | null }>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<{ error: any | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: any | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// HIPAA compliance: 15-minute session timeout
const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());

  const signIn = async (email: string, password: string) => {
    try {
      // Basic email validation
      const sanitizedEmail = email.trim().toLowerCase();
      if (!sanitizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        throw new Error('Invalid email format');
      }

      logger.debug('User attempting sign in', { component: 'AuthContext', action: 'signIn' });
      
      // Use authBridge for hybrid authentication
      try {
        const authData = await authBridge.login(sanitizedEmail, password);
        
        if (authData && authData.user) {
          // Set user state from authBridge response
          setUser({
            id: authData.user.id,
            email: authData.user.email,
            user_metadata: { full_name: authData.user.name, role: authData.user.role }
          } as User);
          
          if (authData.session) {
            setSession(authData.session as Session);
          }
          
          logger.security('User sign in successful', { 
            component: 'AuthContext', 
            action: 'signIn',
            userId: authData.user.id 
          });
          
          return { error: null };
        }
      } catch (bridgeError) {
        logger.warn('AuthBridge failed, falling back to Supabase', { error: bridgeError });
        
        // Fallback to original Supabase auth
        const { data, error } = await authService.signInWithPassword({
          email: sanitizedEmail,
          password,
        });

        if (error) {
          logger.error('Sign in failed', error, { component: 'AuthContext', action: 'signIn' });
          return { error };
        }

        if (data?.user) {
          logger.security('User sign in successful via Supabase', { 
            component: 'AuthContext', 
            action: 'signIn',
            userId: data.user.id 
          });
        }

        return { error: null };
      }
    } catch (err: any) {
      logger.error('Sign in exception', err, { component: 'AuthContext', action: 'signIn' });
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, options?: unknown) => {
    try {
      // Basic email validation
      const sanitizedEmail = email.trim().toLowerCase();
      if (!sanitizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        throw new Error('Invalid email format');
      }

      // Basic password validation
      if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      logger.debug('User attempting sign up', { component: 'AuthContext', action: 'signUp' });

      const { data, error } = await authService.signUp({
        email: sanitizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          ...(options as object)
        }
      });

      if (error) {
        logger.error('Sign up failed', error, { component: 'AuthContext', action: 'signUp' });
        return { data: null, error };
      }

      if (data?.user) {
        logger.security('User sign up successful', { 
          component: 'AuthContext', 
          action: 'signUp',
          userId: data.user.id 
        });
      }

      return { data, error: null };
    } catch (err: any) {
      logger.error('Sign up exception', err, { component: 'AuthContext', action: 'signUp' });
      return { data: null, error: err };
    }
  };

  const signOut = async () => {
    try {
      logger.debug('User signing out', { component: 'AuthContext', action: 'signOut' });
      const { error } = await authService.signOut();
      
      if (error) {
        logger.error('Sign out failed', error, { component: 'AuthContext', action: 'signOut' });
      } else {
        logger.security('User sign out successful', { component: 'AuthContext', action: 'signOut' });
      }
    } catch (err: any) {
      logger.error('Sign out exception', err, { component: 'AuthContext', action: 'signOut' });
    }
    
    // Force redirect to auth page
    window.location.href = '/auth';
  };

  const resetPasswordForEmail = async (email: string) => {
    try {
      const sanitizedEmail = email.trim().toLowerCase();
      logger.debug('Password reset requested', { component: 'AuthContext', action: 'resetPassword' });
      
      const { error } = await authService.resetPasswordForEmail(sanitizedEmail);
      
      if (error) {
        logger.error('Password reset failed', error, { component: 'AuthContext', action: 'resetPassword' });
        return { error };
      }
      
      logger.info('Password reset email sent successfully', { component: 'AuthContext', action: 'resetPassword' });
      return { error: null };
    } catch (err: any) {
      logger.error('Password reset exception', err, { component: 'AuthContext', action: 'resetPassword' });
      return { error: err };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      logger.debug('User updating password', { component: 'AuthContext', action: 'updatePassword' });
      
      const { error } = await authService.updateUser({
        password: newPassword
      });
      
      if (error) {
        logger.error('Password update failed', error, { component: 'AuthContext', action: 'updatePassword' });
        return { error };
      }
      
      logger.security('Password updated successfully', { component: 'AuthContext', action: 'updatePassword' });
      return { error: null };
    } catch (err: any) {
      logger.error('Password update exception', err, { component: 'AuthContext', action: 'updatePassword' });
      return { error: err };
    }
  };

  // Removed auth bypass logic - require actual authentication

  useEffect(() => {

    logger.debug('Setting up auth state listener', { component: 'AuthContext', action: 'setup' });
    // Get initial session first
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await authService.getSession();
        logger.debug('Initial session loaded', { component: 'AuthContext', action: 'setup', hasSession: !!initialSession });
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setLoading(false);
      } catch (err: any) {
        logger.error('Error getting initial session', err, { component: 'AuthContext', action: 'setup' });
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange((event, newSession) => {
      logger.debug('Auth state change', { component: 'AuthContext', action: 'stateChange', event, hasSession: !!newSession });
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      logger.debug('Cleaning up auth subscription', { component: 'AuthContext', action: 'cleanup' });
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      signIn, 
      signUp, 
      signOut,
      resetPasswordForEmail,
      updatePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}
