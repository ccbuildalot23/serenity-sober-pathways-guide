
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { SecurityHeaders } from '@/lib/securityHeaders';
import { SecureMonitoring } from '@/lib/secureMonitoring';

export const SignInForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { signIn } = useAuth();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic input validation
    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedPassword = password.trim();
    
    if (!sanitizedEmail || !sanitizedPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Check if user is rate limited due to failed attempts (more lenient)
    if (!SecureMonitoring.trackAuthAttempt(sanitizedEmail, false)) {
      toast({
        title: "Too Many Attempts",
        description: "Please wait before trying again.",
        variant: "destructive",
      });
      SecurityHeaders.logSecurityEvent('AUTH_RATE_LIMITED', { email: sanitizedEmail });
      return;
    }

    try {
      setLoading(true);
      SecurityHeaders.logSecurityEvent('SIGNIN_ATTEMPT', { email: sanitizedEmail });

      const { error } = await signIn(sanitizedEmail, sanitizedPassword);

      if (error) {
        // Track failed attempt
        SecureMonitoring.trackAuthAttempt(sanitizedEmail, false);
        SecurityHeaders.logSecurityEvent('SIGNIN_FAILED', { error: error.message });
        throw error;
      }

      // Track successful attempt
      SecureMonitoring.trackAuthAttempt(sanitizedEmail, true);
      SecurityHeaders.logSecurityEvent('SIGNIN_SUCCESS');
      
      toast({
        title: "Success",
        description: "Welcome back!",
      });
      
      // Let the auth context handle the redirect
      console.log('Sign in successful, waiting for auth state change...');
      
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
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
          autoComplete="current-password"
          disabled={loading}
          maxLength={128}
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
};
