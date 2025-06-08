
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { SecurityHeaders } from '@/lib/securityHeaders';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
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

  // Enhanced auth state cleanup helper
  const cleanupAuthState = () => {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-') || key.includes('supabase-auth')) {
        localStorage.removeItem(key);
      }
    });
    
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-') || key.includes('supabase-auth')) {
        sessionStorage.removeItem(key);
      }
    });
    
    SecurityHeaders.logSecurityEvent('AUTH_STATE_CLEANED');
  };

  const signOut = async () => {
    try {
      SecurityHeaders.logSecurityEvent('SIGNOUT_ATTEMPT', { userId: user?.id });
      
      // Clean up auth state first
      cleanupAuthState();
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('Global signout completed');
      }
      
      SecurityHeaders.logSecurityEvent('SIGNOUT_SUCCESS');
      
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      SecurityHeaders.logSecurityEvent('SIGNOUT_ERROR', { error: error.message });
      // Force redirect even if signout fails
      window.location.href = '/auth';
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        SecurityHeaders.logSecurityEvent('SESSION_RESTORED', { userId: session.user.id });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event);
      SecurityHeaders.logSecurityEvent('AUTH_STATE_CHANGE', { event });
      
      // Update state synchronously
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_IN') {
        // Defer any additional processing to prevent deadlocks
        setTimeout(() => {
          console.log('User signed in successfully');
          SecurityHeaders.logSecurityEvent('USER_SIGNED_IN', { userId: session?.user?.id });
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        // Clean up any remaining auth data
        cleanupAuthState();
        setUser(null);
        setSession(null);
        SecurityHeaders.logSecurityEvent('USER_SIGNED_OUT');
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Enhanced security validation on user change
  useEffect(() => {
    if (user) {
      // Validate that we're in a secure context for authenticated users
      if (!SecurityHeaders.isSecureContext()) {
        console.warn('User authenticated but not in secure context');
        SecurityHeaders.logSecurityEvent('INSECURE_AUTH_CONTEXT', { userId: user.id });
      }
      
      // Log user session details for security monitoring
      SecurityHeaders.logSecurityEvent('USER_SESSION_ACTIVE', { 
        userId: user.id,
        email: user.email,
        lastSignIn: user.last_sign_in_at 
      });
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
