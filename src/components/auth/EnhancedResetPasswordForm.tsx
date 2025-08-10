import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Loader2, Lock, Eye, EyeOff, CheckCircle, AlertCircle, 
  Shield, Heart, ShieldCheck, Key, Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { hipaaAuditService } from '@/services/hipaaAuditService';
import { enhancedEmailService } from '@/services/enhancedEmailService';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: string;
}

export const EnhancedResetPasswordForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    color: 'bg-gray-300'
  });
  const [encouragingMessage] = useState(enhancedEmailService.getEncouragingMessage());
  const [tokenValid, setTokenValid] = useState(true);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    validateToken();
  }, []);

  useEffect(() => {
    if (password) {
      setPasswordStrength(calculatePasswordStrength(password));
    } else {
      setPasswordStrength({ score: 0, feedback: [], color: 'bg-gray-300' });
    }
  }, [password]);

  const validateToken = async () => {
    setIsValidating(true);
    
    // Get token from URL
    const code = searchParams.get('code');
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const token = code || accessToken;

    if (!token) {
      setTokenValid(false);
      setError('No reset token found. Please request a new password reset link.');
      await hipaaAuditService.logPasswordResetFailed('unknown', 'No token found');
    } else {
      // Token exists, consider it valid for now
      // Actual validation happens when submitting
      setTokenValid(true);
    }
    
    setIsValidating(false);
  };

  const calculatePasswordStrength = (pwd: string): PasswordStrength => {
    let score = 0;
    const feedback: string[] = [];
    
    // Length check
    if (pwd.length >= 8) score += 20;
    if (pwd.length >= 12) score += 10;
    if (pwd.length >= 16) score += 10;
    
    // Character variety
    if (/[a-z]/.test(pwd)) score += 15;
    if (/[A-Z]/.test(pwd)) score += 15;
    if (/\d/.test(pwd)) score += 15;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score += 15;
    
    // Common patterns to avoid
    if (!/(.)\1{2,}/.test(pwd)) score += 10; // No repeated characters
    if (!/^[0-9]+$/.test(pwd)) score += 10; // Not just numbers
    
    // Provide feedback
    if (pwd.length < 8) feedback.push('At least 8 characters required');
    if (!/[A-Z]/.test(pwd)) feedback.push('Add uppercase letters');
    if (!/[a-z]/.test(pwd)) feedback.push('Add lowercase letters');
    if (!/\d/.test(pwd)) feedback.push('Add numbers');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) feedback.push('Add special characters');
    
    // Determine color based on score
    let color = 'bg-red-500';
    if (score >= 80) color = 'bg-green-500';
    else if (score >= 60) color = 'bg-yellow-500';
    else if (score >= 40) color = 'bg-orange-500';
    
    return { score: Math.min(score, 100), feedback, color };
  };

  const validatePassword = (pwd: string): string | null => {
    if (pwd.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    if (!/[A-Z]/.test(pwd)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/[a-z]/.test(pwd)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/\d/.test(pwd)) {
      return 'Password must contain at least one number';
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) {
      return 'Password must contain at least one special character';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Check passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setIsLoading(true);

    try {
      // Get the current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('Your reset link has expired or is invalid. Please request a new one.');
        await hipaaAuditService.logPasswordResetFailed('unknown', 'Invalid session');
        setIsLoading(false);
        return;
      }

      // Update the password
      const { error: updateError, data } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) {
        console.error('Password update error:', updateError);
        setError('Failed to update password. Please try again or request a new reset link.');
        await hipaaAuditService.logPasswordResetFailed(
          session.user?.email || 'unknown',
          updateError.message
        );
      } else if (data?.user) {
        // Success!
        setSuccess(true);
        await hipaaAuditService.logPasswordResetSuccess(
          data.user.id,
          data.user.email || 'unknown'
        );
        
        toast({
          title: "Password Updated Successfully",
          description: "Your password has been reset. Redirecting to sign in...",
          duration: 5000,
        });
        
        // Sign out to ensure clean state
        await supabase.auth.signOut();
        
        // Redirect after showing success message
        setTimeout(() => {
          navigate('/auth', { 
            state: { 
              message: 'Password reset successful. Please sign in with your new password.',
              from: 'password-reset'
            }
          });
        }, 3000);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('An unexpected error occurred. Please try again or contact support.');
      await hipaaAuditService.logPasswordResetFailed('unknown', 'Unexpected error');
    } finally {
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardContent className="pt-6">
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tokenValid) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Invalid Reset Link</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {error || 'This password reset link is invalid or has expired.'}
            </p>
            <Button onClick={() => navigate('/auth')} className="mt-4">
              Return to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto shadow-lg">
        <CardContent className="pt-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-4"
          >
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-300" />
            </div>
            <h3 className="text-xl font-semibold text-green-800 dark:text-green-200">
              Password Reset Successful!
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Your password has been updated. You'll be redirected to sign in shortly.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              {encouragingMessage}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <ShieldCheck className="w-4 h-4" />
              Your account is now secured with your new password
            </div>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl flex items-center gap-2">
          <Key className="w-6 h-6" />
          Set Your New Password
        </CardTitle>
        <CardDescription>
          Create a strong password to protect your recovery journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Alert variant="destructive" data-testid="password-reset-form-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="new-password"
                data-testid="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="pl-10 pr-10"
                autoComplete="new-password"
                aria-label="New password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            
            {password && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Progress value={passwordStrength.score} className="flex-1" />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {passwordStrength.score}%
                  </span>
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <div className="text-xs space-y-1">
                    {passwordStrength.feedback.map((tip, index) => (
                      <div key={index} className="flex items-center gap-1 text-gray-500">
                        <Info className="w-3 h-3" />
                        {tip}
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="confirm-password"
                data-testid="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="pl-10 pr-10"
                autoComplete="new-password"
                aria-label="Confirm new password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Passwords do not match
              </p>
            )}
          </div>

          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
              Your password is encrypted and stored securely. We never store passwords in plain text.
            </AlertDescription>
          </Alert>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || passwordStrength.score < 60}
            aria-label="Update password"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating password...
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Update Password
              </>
            )}
          </Button>
        </form>
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-2">
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Heart className="w-3 h-3 text-red-500" />
          <span>{encouragingMessage}</span>
        </div>
        <p className="text-xs text-center text-gray-400 dark:text-gray-500">
          Need help? Call 988 for immediate support
        </p>
      </CardFooter>
    </Card>
  );
};