
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const signIn = async (email: string, password: string) => {
    try {
      // Basic email validation
      const sanitizedEmail = email.trim().toLowerCase();
      if (!sanitizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
        throw new Error('Invalid email format');
      }

      // Don't clear existing auth state - this can cause issues
      // Let Supabase handle the auth state management

      console.log('Attempting sign in with email:', sanitizedEmail);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        return { error };
      }

      if (data?.user) {
        console.log('Sign in successful for user:', data.user.email);
      }

      return { error: null };
    } catch (err: any) {
      console.error('Sign in exception:', err);
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

      console.log('Attempting sign up with email:', sanitizedEmail);

      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          ...(options as object)
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        return { data: null, error };
      }

      if (data?.user) {
        console.log('Sign up successful for user:', data.user.email);
      }

      return { data, error: null };
    } catch (err: any) {
      console.error('Sign up exception:', err);
      return { data: null, error: err };
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out user...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
      } else {
        console.log('Sign out successful');
      }
    } catch (err: any) {
      console.error('Sign out exception:', err);
    }
    
    // Force redirect to auth page
    window.location.href = '/auth';
  };

  const resetPasswordForEmail = async (email: string) => {
    try {
      const sanitizedEmail = email.trim().toLowerCase();
      console.log('Requesting password reset for:', sanitizedEmail);
      
      const { error } = await supabase.auth.resetPasswordForEmail(sanitizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        console.error('Password reset error:', error);
        return { error };
      }
      
      console.log('Password reset email sent successfully');
      return { error: null };
    } catch (err: any) {
      console.error('Password reset exception:', err);
      return { error: err };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      console.log('Updating user password...');
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        console.error('Password update error:', error);
        return { error };
      }
      
      console.log('Password updated successfully');
      return { error: null };
    } catch (err: any) {
      console.error('Password update exception:', err);
      return { error: err };
    }
  };

  useEffect(() => {
    console.log('Setting up auth state listener...');
    
    // Get initial _session first
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log('Initial session:', initialSession?.user?.email || 'none');
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setLoading(false);
      } catch (err: any) {
        console.error('Error getting initial session:', err);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('Auth state change:', event, newSession?.user?.email || 'none');
      
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up auth subscription');
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
