
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SecurityHeaders } from '@/lib/securityHeaders';

interface SignUpFormProps {
  onSuccess?: () => void;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Enhanced auth state cleanup
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Enhanced input sanitization and validation
    const sanitizedEmail = SecurityHeaders.sanitizeUserInput(email.trim().toLowerCase());
    const sanitizedFullName = SecurityHeaders.sanitizeUserInput(fullName.trim());
    const sanitizedPassword = password.trim();
    const sanitizedConfirmPassword = confirmPassword.trim();
    
    if (!sanitizedEmail || !sanitizedPassword || !sanitizedFullName || !sanitizedConfirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Enhanced email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Password confirmation check
    if (sanitizedPassword !== sanitizedConfirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    // Enhanced password validation
    if (sanitizedPassword.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    // Check for basic password complexity
    const hasUpperCase = /[A-Z]/.test(sanitizedPassword);
    const hasLowerCase = /[a-z]/.test(sanitizedPassword);
    const hasNumbers = /\d/.test(sanitizedPassword);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(sanitizedPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      toast({
        title: "Error",
        description: "Password must contain uppercase, lowercase, numbers, and special characters",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      SecurityHeaders.logSecurityEvent('SIGNUP_ATTEMPT', { email: sanitizedEmail });
      
      // Clean up existing state
      cleanupAuthState();
      
      // Attempt global sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
        console.log('Global signout attempt completed');
      }

      const { data, error } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: sanitizedPassword,
        options: {
          data: {
            full_name: sanitizedFullName,
          },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (error) {
        SecurityHeaders.logSecurityEvent('SIGNUP_FAILED', { error: error.message });
        throw error;
      }

      if (data.user) {
        SecurityHeaders.logSecurityEvent('SIGNUP_SUCCESS', { userId: data.user.id });
        toast({
          title: "Success",
          description: "Account created successfully! Please check your email to verify your account.",
        });
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignUp} className="space-y-4">
      <div>
        <Label htmlFor="fullName">Full Name</Label>
        <Input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          autoComplete="name"
          disabled={loading}
          maxLength={100}
        />
      </div>
      
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          disabled={loading}
          maxLength={254}
        />
      </div>
      
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
          disabled={loading}
          minLength={8}
          maxLength={128}
        />
        <p className="text-xs text-gray-600 mt-1">
          Must contain uppercase, lowercase, numbers, and special characters
        </p>
      </div>
      
      <div>
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
          disabled={loading}
          minLength={8}
          maxLength={128}
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Creating account...' : 'Create Account'}
      </Button>
    </form>
  );
};
