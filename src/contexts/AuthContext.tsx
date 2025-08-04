
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

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

      console.log('🔐 Starting sign in process for:', sanitizedEmail);

      // Clear any existing auth state before signing in
      try {
        // Clear localStorage auth keys
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('supabase.auth') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.warn('⚠️ Error clearing previous auth state:', err);
        // Continue even if this fails
      }

      console.log('📡 Attempting Supabase sign in...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (error) {
        console.error('❌ Supabase sign in error:', error);
        console.error('Error details:', { code: error.code, message: error.message, status: error.status });
      } else {
        console.log('✅ Sign in successful!', { user: data.user?.email, session: !!data.session });
      }

      return { error };
    } catch (error) {
      console.error('❌ Sign in exception:', error);
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

      // Clear any existing auth state before signing up
      try {
        // Clear localStorage auth keys
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('supabase.auth') || key.includes('sb-')) {
            localStorage.removeItem(key);
          }
        });
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          ...options
        }
      });

      return { data, error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Clear localStorage auth keys
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      await supabase.auth.signOut({ scope: 'global' });
    } catch (error) {
      console.error('Sign out error:', error);
    }
    
    // Force redirect to auth page
    window.location.href = '/auth';
  };

  useEffect(() => {
    // Listen for auth changes first
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.error('Error getting session:', error);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;
