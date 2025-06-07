
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logSecurityEvent } from '@/services/secureAuditLogService';
import { authRateLimiter, InputValidator } from '@/lib/inputValidation';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: { fullName: string; recoveryStartDate?: string }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Log security events
        if (event === 'SIGNED_IN' && session?.user) {
          setTimeout(() => {
            logSecurityEvent('USER_LOGIN', {
              user_id: session.user.id,
              email: session.user.email
            });
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setTimeout(() => {
            logSecurityEvent('USER_LOGOUT', {
              user_id: user?.id,
              email: user?.email
            });
          }, 0);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData: { fullName: string; recoveryStartDate?: string }) => {
    // Input validation
    if (!InputValidator.validateEmail(email)) {
      return { error: { message: 'Invalid email format' } };
    }

    if (password.length < 8) {
      return { error: { message: 'Password must be at least 8 characters' } };
    }

    // Rate limiting
    if (!authRateLimiter(email)) {
      await logSecurityEvent('SIGNUP_RATE_LIMITED', { email });
      return { error: { message: 'Too many attempts. Please try again later.' } };
    }

    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: InputValidator.sanitizeText(userData.fullName),
          recovery_start_date: userData.recoveryStartDate,
        }
      }
    });

    if (error) {
      await logSecurityEvent('SIGNUP_FAILED', { email, error: error.message });
    } else {
      await logSecurityEvent('SIGNUP_SUCCESS', { email });
    }
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    // Input validation
    if (!InputValidator.validateEmail(email)) {
      return { error: { message: 'Invalid email format' } };
    }

    // Rate limiting
    if (!authRateLimiter(email)) {
      await logSecurityEvent('LOGIN_RATE_LIMITED', { email });
      return { error: { message: 'Too many attempts. Please try again later.' } };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      await logSecurityEvent('LOGIN_FAILED', { email, error: error.message });
    }
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
