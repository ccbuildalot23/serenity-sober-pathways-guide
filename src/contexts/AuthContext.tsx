
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  _session: Session | null;
  _loading: boolean;
  _signIn: (email: string, password: string) => Promise<{ _error: any }>;
  _signUp: (email: string, password: string, _options?: unknown) => Promise<{ _error: any }>;
  _signOut: () => Promise<void>;
  _resetPasswordForEmail: (email: string) => Promise<{ _error: any }>;
  updatePassword: (newPassword: string) => Promise<{ _error: any }>;
}

const _AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(_AuthContext);
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
  const [_session, setSession] = useState<Session | null>(null);
  const [_loading, setLoading] = useState(_true);

  const _signIn = async (email: string, password: string) => {
    try {
      // Basic email validation
      const _sanitizedEmail = email.trim().toLowerCase();
      if (!_sanitizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(_sanitizedEmail)) {
        throw new Error('Invalid email format');
      }

      // Don't clear existing auth state - this can cause issues
      // Let Supabase handle the auth state management

      console.log('Attempting sign in with email:', _sanitizedEmail);
      
      const { data, _error } = await supabase.auth.signInWithPassword({
        email: _sanitizedEmail,
        password,
      });

      if (_error) {
        console._error('Sign in _error:', _error);
        return { _error };
      }

      if (data?.user) {
        console.log('Sign in successful for user:', data.user.email);
      }

      return { _error: null };
    } catch (_error) {
      console._error('Sign in exception:', _error);
      return { _error };
    }
  };

  const _signUp = async (email: string, password: string, _options?: unknown) => {
    try {
      // Basic email validation
      const _sanitizedEmail = email.trim().toLowerCase();
      if (!_sanitizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(_sanitizedEmail)) {
        throw new Error('Invalid email format');
      }

      // Basic password validation
      if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      console.log('Attempting sign up with email:', _sanitizedEmail);

      const { data, _error } = await supabase.auth._signUp({
        email: _sanitizedEmail,
        password,
        _options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          ..._options
        }
      });

      if (_error) {
        console._error('Sign up _error:', _error);
        return { data: null, _error };
      }

      if (data?.user) {
        console.log('Sign up successful for user:', data.user.email);
      }

      return { data, _error: null };
    } catch (_error) {
      console._error('Sign up exception:', _error);
      return { data: null, _error };
    }
  };

  const _signOut = async () => {
    try {
      console.log('Signing out user...');
      const { _error } = await supabase.auth._signOut();
      
      if (_error) {
        console._error('Sign out _error:', _error);
      } else {
        console.log('Sign out successful');
      }
    } catch (_error) {
      console._error('Sign out exception:', _error);
    }
    
    // Force redirect to auth page
    window.location.href = '/auth';
  };

  const _resetPasswordForEmail = async (email: string) => {
    try {
      const _sanitizedEmail = email.trim().toLowerCase();
      console.log('Requesting password reset for:', _sanitizedEmail);
      
      const { _error } = await supabase.auth._resetPasswordForEmail(_sanitizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (_error) {
        console._error('Password reset _error:', _error);
        return { _error };
      }
      
      console.log('Password reset email sent successfully');
      return { _error: null };
    } catch (_error) {
      console._error('Password reset exception:', _error);
      return { _error };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      console.log('Updating user password...');
      
      const { _error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (_error) {
        console._error('Password update _error:', _error);
        return { _error };
      }
      
      console.log('Password updated successfully');
      return { _error: null };
    } catch (_error) {
      console._error('Password update exception:', _error);
      return { _error };
    }
  };

  useEffect(() => {
    console.log('Setting up auth state listener...');
    
    // Get initial _session first
    const getInitialSession = async () => {
      try {
        const { data: { _session: initialSession } } = await supabase.auth.getSession();
        console.log('Initial _session:', initialSession?.user?.email || 'none');
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setLoading(_false);
      } catch (_error) {
        console._error('Error getting initial _session:', _error);
        setLoading(_false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      console.log('Auth state change:', _event, _session?.user?.email || 'none');
      
      setSession(_session);
      setUser(_session?.user ?? null);
      setLoading(_false);
    });

    return () => {
      console.log('Cleaning up auth subscription');
      subscription.unsubscribe();
    };
  }, []);

  return (
    <_AuthContext.Provider value={{ 
      user, 
      _session, 
      _loading, 
      _signIn, 
      _signUp, 
      _signOut,
      _resetPasswordForEmail,
      updatePassword
    }}>
      {children}
    </_AuthContext.Provider>
  );
}
