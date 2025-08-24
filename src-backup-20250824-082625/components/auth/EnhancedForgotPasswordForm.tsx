import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Loader2, Mail, CheckCircle, AlertCircle, ArrowLeft, Heart, Phone, MessageCircle, Shield } from 'lucide-react';
import { enhancedEmailService } from '@/services/enhancedEmailService';
import { hipaaAuditService } from '@/services/hipaaAuditService';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';

interface EnhancedForgotPasswordFormProps {
  onBack?: () => void;
}

export const EnhancedForgotPasswordForm: React.FC<EnhancedForgotPasswordFormProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [encouragingMessage, setEncouragingMessage] = useState('');
  const [showCrisisResources, setShowCrisisResources] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Set an encouraging message when component mounts
    setEncouragingMessage(enhancedEmailService.getEncouragingMessage());
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Basic validation
    if (!email.trim()) {
      setError('Please enter your email address to continue.');
      return;
    }

    // Check rate limiting before attempting
    const rateLimitCheck = enhancedEmailService.canRequestReset(email);
    if (!rateLimitCheck.allowed) {
      setError(`Too many attempts. Please wait ${rateLimitCheck.retryAfter} minutes. If you need immediate help, use our crisis resources below.`);
      setShowCrisisResources(true);
      return;
    }

    setIsLoading(true);

    try {
      const result = await enhancedEmailService.sendPasswordResetEmail(email);

      if (result.success) {
        setSuccess(true);
        toast({
          title: "Email Sent",
          description: "Check your inbox for the password reset link.",
          duration: 5000,
        });
      } else {
        setError(result.message);
        if (result.retryAfter && result.retryAfter > 10) {
          setShowCrisisResources(true);
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Something went wrong. Please try again or contact support.');
      setShowCrisisResources(true);
    } finally {
      setIsLoading(false);
    }
  };

  const CrisisResources = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800"
    >
      <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
        <Heart className="w-4 h-4" />
        Immediate Support Available
      </h4>
      <div className="space-y-2">
        <a
          href="tel:988"
          className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
        >
          <Phone className="w-4 h-4" />
          988 - Suicide & Crisis Lifeline (24/7)
        </a>
        <a
          href="sms:741741"
          className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
        >
          <MessageCircle className="w-4 h-4" />
          Text "HELLO" to 741741 - Crisis Text Line
        </a>
        <a
          href="tel:1-800-662-4357"
          className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
        >
          <Phone className="w-4 h-4" />
          SAMHSA National Helpline: 1-800-662-HELP
        </a>
      </div>
    </motion.div>
  );

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
            <h3 className="text-xl font-semibold text-green-800 dark:text-green-200">Check Your Email</h3>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                We've sent a password reset link to:
              </p>
              <p className="font-medium text-gray-900 dark:text-gray-100">{email}</p>
            </div>
            <Alert className="text-left">
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-xs">
                For your security, the link will expire in 15 minutes. Check your spam folder if you don't see the email.
              </AlertDescription>
            </Alert>
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              {encouragingMessage}
            </p>
            {onBack && (
              <Button variant="outline" onClick={onBack} className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            )}
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Reset Your Password</CardTitle>
        <CardDescription className="text-base">
          We'll help you regain access to your recovery resources
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
                <Alert variant="destructive" data-testid="password-reset-error">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

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
                autoComplete="email"
                aria-label="Email address for password reset"
                required
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Enter the email address associated with your account
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
            aria-label="Send password reset email"
          >
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

        <AnimatePresence>
          {showCrisisResources && <CrisisResources />}
        </AnimatePresence>
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-2 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <Shield className="inline w-3 h-3 mr-1" />
          Your information is protected with HIPAA-compliant security
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Need help? Contact support@serenityrecovery.com
        </p>
      </CardFooter>
    </Card>
  );
};