import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Mail, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { emailService } from '@/services/emailService';
import logger from '../../services/loggerService';

interface ForgotPasswordFormProps {
  onBack?: () => void;
}

export const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    const emailValue = email.trim();
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValue) {
      setError('Email address is required');
      return;
    }
    if (!emailRegex.test(emailValue)) {
      setError('Please enter a valid email address');
      return;
    }

    // Check rate limiting before attempting
    const rateLimitCheck = emailService.canRequestReset(emailValue);
    if (!rateLimitCheck.allowed) {
      setError(`Too many password reset attempts. Please wait ${rateLimitCheck.retryAfter} minutes before trying again.`);
      return;
    }

    setIsLoading(true);

    try {
      logger.debug('Attempting password reset for:', emailValue, { component: 'ForgotPasswordForm' });
      
      // Use the new email service with proper rate limiting and error handling
      const result = await emailService.sendPasswordResetEmail(emailValue);

      logger.debug('Password reset result:', result, { component: 'ForgotPasswordForm' });

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || 'Failed to send reset email. Please try again later.');
      }
    } catch (err) {
      console.error('Unexpected error in password reset:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-green-800">Check Your Email</h3>
            <p className="text-sm text-gray-600">
              We've sent a password reset link to <strong>{email}</strong>
            </p>
            <p className="text-xs text-gray-500">
              If you don't see the email, check your spam folder or try again.
            </p>
            {onBack && (
              <Button variant="outline" onClick={onBack} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Reset Your Password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          {error && (
            <Alert variant="destructive" data-testid="password-reset-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="reset-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="reset-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="pl-10"
                data-testid="email-input"
                aria-label="Email address for password reset"
                aria-describedby="email-error"
                autoComplete="email"
                required
              />
            </div>
            <div id="email-error" data-testid="email-error" className="sr-only" aria-live="polite"></div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading} data-testid="login-button submit-login" aria-label="Send password reset email">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending reset link...
              </>
            ) : (
              'Send Reset Link'
            )}
          </Button>

          {onBack && (
            <Button
              type="button"
              variant="link"
              onClick={onBack}
              className="w-full"
              disabled={isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
};