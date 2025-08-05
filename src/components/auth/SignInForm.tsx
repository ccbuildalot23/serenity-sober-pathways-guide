
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SignInFormProps {
  userType?: string;
}

export const SignInForm: React.FC<SignInFormProps> = ({ userType }) => {
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
        title: "Please fill in all fields",
        description: "Email and password are required",
        variant: "destructive",
      });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      toast({
        title: "Invalid email format",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      console.log('Attempting sign in...');

      const { error } = await signIn(sanitizedEmail, sanitizedPassword);

      if (error) {
        console.error('Sign in error:', error);
        
        // Handle specific error types
        let errorMessage = "Failed to sign in. Please try again.";
        
        if (error.message?.includes('Invalid login credentials')) {
          errorMessage = "Invalid email or password. Please check your credentials and try again.";
        } else if (error.message?.includes('Email not confirmed')) {
          errorMessage = "Please check your email and click the verification link before signing in.";
        } else if (error.message?.includes('Too many requests')) {
          errorMessage = "Too many sign-in attempts. Please wait a moment before trying again.";
        } else if (error.message?.includes('User not found')) {
          errorMessage = "No account found with this email address. Please check your email or create a new account.";
        }
        
        toast({
          title: "Sign in failed",
          description: errorMessage,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome back!",
        description: "Signing you in...",
      });
      
      // Let the auth context handle the redirect
      console.log('Sign in successful, waiting for auth state change...');
      
    } catch (error: any) {
      console.error('Sign in exception:', error);
      toast({
        title: "Unexpected error",
        description: "Something went wrong. Please try again or contact support if the problem persists.",
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
          placeholder="Enter your email address"
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
          placeholder="Enter your password"
        />
      </div>
      
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
};
