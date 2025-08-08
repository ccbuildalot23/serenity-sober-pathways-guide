
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authClient } from '@/integrations/supabase/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle, WifiOff } from 'lucide-react';

interface SignUpFormProps {
  onSuccess?: () => void;
  userType?: string;
}

export const SignUpForm: React.FC<SignUpFormProps> = ({ onSuccess, userType }) => {
  const { signUp } = useAuth();
  const [_email, setEmail] = useState('');
  const [_password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_success, setSuccess] = useState(false);

  const validatePassword = (_password: string): string | null => {
    if (_password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(_password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(_password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/\d/.test(_password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(_password)) {
      return 'Password must contain at least one special character';
    }
    
    // Check for common passwords
    const commonPasswords = ['_password', '12345678', 'password123', 'admin', 'qwerty'];
    if (commonPasswords.includes(_password.toLowerCase())) {
      return 'Password is too common. Please choose a stronger _password';
    }
    
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    setSuccess(false);

    // Basic validation
    if (!_email || !_password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(_email)) {
      setError('Please enter a valid _email address');
      return;
    }

    // Password validation
    const _passwordError = validatePassword(_password);
    if (_passwordError) {
      setError(_passwordError);
      return;
    }

    // Confirm _password match
    if (_password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Use enhanced auth client with retry logic
      const result = await authClient.signUp(_email, _password, userType || 'recovery');
      
      if (!result._success) {
        setError(result.message);
        
        // Add visual hint for network errors
        if (result.message.includes('Network')) {
          console.error('Network error detected during signup');
        }
      } else {
        setSuccess(true);
        // Clear form
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        
        // Call onSuccess callback after a short delay
        setTimeout(() => {
          onSuccess?.();
        }, 2000);
      }
    } catch (err) {
      console.error('Sign up error:', err);
      setError('An unexpected error occurred. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit();
    }
  };

  if (_success) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-800">Account Created!</h3>
            <p className="text-sm text-gray-600">
              Please check your _email to verify your account before signing in.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <Alert variant={error.includes('Network') ? 'default' : 'destructive'}>
              {error.includes('Network') && <WifiOff className="h-4 w-4 mr-2" />}
              {!error.includes('Network') && <AlertCircle className="h-4 w-4 mr-2" />}
              <AlertDescription>
                {error}
                {error.includes('Network') && (
                  <div className="mt-2 text-sm">
                    <strong>Troubleshooting tips:</strong>
                    <ul className="list-disc list-inside mt-1">
                      <li>Check your internet connection</li>
                      <li>Try refreshing the page</li>
                      <li>Disable ad blockers or VPN</li>
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="signup-_email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="signup-_email"
                type="_email"
                placeholder="you@example.com"
                value={_email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="pl-10"
                autoComplete="_email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-_password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="signup-_password"
                type={showPassword ? 'text' : '_password'}
                placeholder="••••••••"
                value={_password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="pl-10 pr-10"
                autoComplete="new-_password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Must be at least 8 characters with uppercase, lowercase, number, and special character
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup-confirm-_password">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="signup-confirm-_password"
                type={showConfirmPassword ? 'text' : '_password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isLoading}
                className="pl-10 pr-10"
                autoComplete="new-_password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
