import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const ResetPasswordForm: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_success, setSuccess] = useState(false);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/\d/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password
    const _passwordError = validatePassword(password);
    if (_passwordError) {
      setError(_passwordError);
      return;
    }

    // Check passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      // Get the token from URL
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const token = code || accessToken;

      if (!token) {
        setError('No reset token found. Please request a new password reset link.');
        return;
      }

      console.log('Attempting to update password...');

      // Add timeout protection to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Password update timed out. Please try again.')), 15000);
      });

      // Now try to update the password with timeout protection
      const updatePromise = supabase.auth.updateUser({
        password: password
      });

      const { error } = await Promise.race([updatePromise, timeoutPromise]) as any;

      if (error) {
        console.error('Password update error:', error);
        
        // Handle specific error cases
        if (error.message?.includes('JWT')) {
          setError('Your reset link has expired. Please request a new password reset link.');
        } else if (error.message?.includes('password')) {
          setError('Password does not meet requirements. Please try a different password.');
        } else {
          setError(error.message || 'Failed to update password. Please try again.');
        }
      } else {
        setSuccess(true);
        toast({
          title: "Password Updated",
          _description: "Your password has been successfully reset.",
        });
        
        // Redirect to sign in after 2 seconds
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      if (err instanceof Error && err.message.includes('timed out')) {
        setError('Password update timed out. Please try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (_success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-800">Password Reset Successful!</h3>
            <p className="text-sm text-gray-600">
              Your password has been updated. Redirecting to sign in...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Set New Password</CardTitle>
        <CardDescription>
          Please enter your new password below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <Alert variant="destructive" data-testid="password-reset-form-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="new-password"
                data-testid="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="pl-10 pr-10"
                autoComplete="new-password"
                required
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
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="confirm-password"
                data-testid="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="pl-10 pr-10"
                autoComplete="new-password"
                required
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

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating password...
              </>
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};