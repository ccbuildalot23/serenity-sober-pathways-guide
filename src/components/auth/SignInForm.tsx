
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
    
    // Check if user type is selected
    if (!userType) {
      toast({
        title: "Error",
        description: "Please select your user type before signing in",
        variant: "destructive",
      });
      return;
    }
    
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

    try {
      setLoading(true);
      console.log('Attempting sign in with user type:', userType);

      const { error } = await signIn(sanitizedEmail, sanitizedPassword);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Welcome back!",
      });
      
      // Let the auth context handle the redirect
      console.log('Sign in successful, waiting for auth state change...');
      
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Provide user-friendly error messages
      let errorMessage = "Failed to sign in";
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = "Please check your email and confirm your account before signing in.";
      } else if (error.message?.includes('User already registered')) {
        errorMessage = "This email is already registered. Please sign in instead.";
      } else if (error.message?.includes('Database error')) {
        errorMessage = "We're experiencing technical difficulties. Please try again later or contact support.";
      } else if (error.message?.includes('recursion')) {
        errorMessage = "Database configuration error. Please contact support for assistance.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Sign In Error",
        description: errorMessage,
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
      
      <Button type="submit" className="w-full" disabled={loading || !userType}>
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
};
