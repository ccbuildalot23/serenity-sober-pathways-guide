
import React, { useState } from 'react';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface AuthFormProps {
  initialMode?: 'signin' | 'signup' | 'forgot';
  userType?: string;
}

export const AuthForm: React.FC<AuthFormProps> = ({ initialMode = 'signin', userType }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);

  return (
    <div className="space-y-6">
      {userType && (
        <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            You've selected: <strong>
              {userType === 'recovery' && 'Person in Recovery'}
              {userType === 'provider' && 'Healthcare Provider'}
              {userType === 'supporter' && 'Personal Supporter'}
            </strong>
          </p>
        </div>
      )}
      
      {mode === 'signin' && (
        <SignInForm userType={userType} />
      )}
      {mode === 'signup' && (
        <SignUpForm onSuccess={() => setMode('signin')} userType={userType} />
      )}
      {mode === 'forgot' && (
        <ForgotPasswordForm onBack={() => setMode('signin')} />
      )}

      <div className="text-center space-y-2">
        {mode !== 'forgot' && (
          <Button
            variant="link"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="text-sm"
          >
            {mode === 'signin' 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"
            }
          </Button>
        )}
        
        {mode === 'signin' && (
          <div>
            <Button
              variant="link"
              onClick={() => setMode('forgot')}
              className="text-sm text-muted-foreground"
            >
              Forgot your password?
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
