
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { SecureValidationService } from '@/services/secureValidationService';
import { EnhancedSecurityAuditService } from '@/services/enhancedSecurityAuditService';

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
      // Validate and sanitize inputs
      const sanitizedEmail = SecureValidationService.validateUserInput(email, 'email');
      if (!SecureValidationService.validateEmail(sanitizedEmail)) {
        throw new Error('Invalid email format');
      }

      // Clear any existing auth state before signing in
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password,
      });

      if (error) {
        await EnhancedSecurityAuditService.logSecurityEvent({
          action: 'SIGN_IN_FAILED',
          severity: 'medium',
          details: {
            email: sanitizedEmail,
            error: error.message,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        await EnhancedSecurityAuditService.logSecurityEvent({
          action: 'SIGN_IN_SUCCESS',
          severity: 'low',
          details: {
            email: sanitizedEmail,
            timestamp: new Date().toISOString()
          }
        });
      }

      return { error };
    } catch (error) {
      await EnhancedSecurityAuditService.logSecurityViolation('SIGN_IN_VALIDATION_ERROR', {
        error: error.message,
        email: email?.substring(0, 10) + '...'
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string, options?: any) => {
    try {
      // Validate and sanitize inputs
      const sanitizedEmail = SecureValidationService.validateUserInput(email, 'email');
      if (!SecureValidationService.validateEmail(sanitizedEmail)) {
        throw new Error('Invalid email format');
      }

      // Validate password strength
      const passwordValidation = SecureValidationService.validatePassword(password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
      }

      // Clear any existing auth state before signing up
      try {
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

      if (error) {
        await EnhancedSecurityAuditService.logSecurityEvent({
          action: 'SIGN_UP_FAILED',
          severity: 'medium',
          details: {
            email: sanitizedEmail,
            error: error.message,
            timestamp: new Date().toISOString()
          }
        });
      } else {
        await EnhancedSecurityAuditService.logSecurityEvent({
          action: 'SIGN_UP_SUCCESS',
          severity: 'low',
          details: {
            email: sanitizedEmail,
            timestamp: new Date().toISOString()
          }
        });
      }

      return { data, error };
    } catch (error) {
      await EnhancedSecurityAuditService.logSecurityViolation('SIGN_UP_VALIDATION_ERROR', {
        error: error.message,
        email: email?.substring(0, 10) + '...'
      });
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
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
