
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, options?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
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
    } catch (error) {
      console.error('Sign in exception:', error);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, options?: any) => {
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
          ...options
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
    } catch (error) {
      console.error('Sign up exception:', error);
      return { data: null, error };
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
    } catch (error) {
      console.error('Sign out exception:', error);
    }
    
    // Force redirect to auth page
    window.location.href = '/auth';
  };

  useEffect(() => {
    console.log('Setting up auth state listener...');
    
    // Get initial session first
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log('Initial session:', initialSession?.user?.email || 'none');
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setLoading(false);
      } catch (error) {
        console.error('Error getting initial session:', error);
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email || 'none');
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
