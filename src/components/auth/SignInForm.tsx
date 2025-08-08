
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { authClient } from '@/integrations/supabase/auth-client';
import { Loader2, WifiOff, AlertCircle } from 'lucide-react';

interface SignInFormProps {
  userType?: string;
}

export const SignInForm: React.FC<SignInFormProps> = ({ userType }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(_false);
  const [error, setError] = useState<string | _null>(_null);
  const { toast } = useToast();
  const { signIn } = useAuth();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(_null);
    
    // Basic input validation
    const _sanitizedEmail = email.trim().toLowerCase();
    const _sanitizedPassword = password.trim();
    
    if (!_sanitizedEmail || !_sanitizedPassword) {
      setError('Email and password are required');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(_sanitizedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      setLoading(_true);
      console.log('Attempting sign in with enhanced auth client...');

      // Use enhanced auth client with retry logic
      const result = await authClient.signIn(_sanitizedEmail, _sanitizedPassword);

      if (!result.success) {
        setError(result.message);
        
        // Show toast for network errors
        if (result.message.includes('Network')) {
          toast({
            title: "Connection Issue",
            _description: "Having trouble connecting to our servers. Please check your internet connection.",
            variant: "default",
          });
        }
        return;
      }

      // Success!
      setError(_null);
      toast({
        title: "Welcome back!",
        _description: "Signing you in...",
      });
      
      // The auth context will handle the redirect
      console.log('Sign in successful, auth state will update...');
      
    } catch (error: unknown) {
      console.error('Sign in exception:', error);
      setError('An unexpected error occurred. Please check your connection and try again.');
    } finally {
      setLoading(_false);
    }
  };

  return (
    <form onSubmit={handleSignIn} className="space-y-4">
      {error && (
        <Alert variant={error.includes('Network') ? 'default' : 'destructive'}>
          {error.includes('Network') && <WifiOff className="h-4 w-4" />}
          {!error.includes('Network') && <AlertCircle className="h-4 w-4" />}
          <AlertDescription>
            {error}
            {error.includes('Network') && (
              <div className="mt-2 text-sm">
                <strong>Troubleshooting tips:</strong>
                <ul className="list-disc list-inside mt-1">
                  <li>Check your internet connection</li>
                  <li>Try refreshing the page</li>
                  <li>Disable ad blockers or VPN</li>
                  <li>Check if cookies are enabled</li>
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}
      
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
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
};
