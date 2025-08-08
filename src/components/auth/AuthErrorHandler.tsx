import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Mail, HelpCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthErrorHandlerProps {
  error: unknown;
  onRetry?: () => void;
  onBack?: () => void;
  context?: 'signin' | 'signup' | 'general';
}

export const AuthErrorHandler: React.FC<AuthErrorHandlerProps> = ({
  error,
  onRetry,
  onBack,
  context = 'general'
}) => {
  const { signOut } = useAuth();

  const getErrorInfo = (error: unknown) => {
    const message = error?.message?.toLowerCase() || '';
    const code = error?.code?.toLowerCase() || '';

    // Network/connection errors
    if (message.includes('fetch') || message.includes('network') || code.includes('network')) {
      return {
        title: "Connection Issue",
        description: "We're having trouble connecting to our servers. This might be a temporary issue.",
        suggestion: "Please check your internet connection and try again.",
        severity: 'warning' as const,
        canRetry: true
      };
    }

    // Authentication errors
    if (message.includes('invalid login') || message.includes('invalid credentials')) {
      return {
        title: "Invalid Credentials",
        description: "The email or password you entered doesn't match our records.",
        suggestion: "Please double-check your email and password, or try resetting your password.",
        severity: 'destructive' as const,
        canRetry: true
      };
    }

    if (message.includes('email not confirmed') || message.includes('email not verified')) {
      return {
        title: "Email Not Verified",
        description: "Please check your email and click the verification link before signing in.",
        suggestion: "If you didn't receive the email, check your spam folder or request a new one.",
        severity: 'destructive' as const,
        canRetry: false
      };
    }

    if (message.includes('too many requests') || message.includes('rate limit')) {
      return {
        title: "Too Many Attempts",
        description: "You've made too many sign-in attempts. Please wait a moment before trying again.",
        suggestion: "This is a security measure to protect your account.",
        severity: 'destructive' as const,
        canRetry: false
      };
    }

    if (message.includes('user not found')) {
      return {
        title: "Account Not Found",
        description: "No account was found with this email address.",
        suggestion: "Please check your email address or create a new account.",
        severity: 'destructive' as const,
        canRetry: false
      };
    }

    // Default error
    return {
      title: "Authentication Error",
      description: "Something went wrong during the authentication process.",
      suggestion: "Please try again, and if the problem persists, contact support.",
      severity: 'destructive' as const,
      canRetry: true
    };
  };

  const errorInfo = getErrorInfo(error);

  const handleClearSession = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          {errorInfo.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant={errorInfo.severity}>
          <AlertDescription>
            {errorInfo.description}
          </AlertDescription>
        </Alert>

        <p className="text-sm text-muted-foreground">
          {errorInfo.suggestion}
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              Technical Details (Development)
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
              {JSON.stringify(error, _null, 2)}
            </pre>
          </details>
        )}

        <div className="flex flex-col gap-2">
          {errorInfo.canRetry && onRetry && (
            <Button onClick={onRetry} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}

          {onBack && (
            <Button onClick={onBack} variant="outline" className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          )}

          <Button 
            onClick={handleClearSession} 
            variant="ghost" 
            className="w-full"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Clear Session & Start Over
          </Button>
        </div>

        <div className="text-xs text-muted-foreground text-center pt-4 border-t">
          <p>Need help? Contact our support team</p>
          <a 
            href="mailto:support@serenitypathways.com" 
            className="text-primary hover:underline flex items-center justify-center gap-1 mt-1"
          >
            <Mail className="h-3 w-3" />
            support@serenitypathways.com
          </a>
        </div>
      </CardContent>
    </Card>
  );
}; 