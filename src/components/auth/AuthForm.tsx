
import React, { useState } from 'react';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface AuthFormProps {
  initialMode?: 'signin' | 'signup';
  userType?: string;
}

export const AuthForm: React.FC<AuthFormProps> = ({ initialMode = 'signin', userType }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

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
      
      {!userType && (
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            Please select your user type above before signing in or signing up.
          </AlertDescription>
        </Alert>
      )}
      
      {mode === 'signin' ? (
        <SignInForm userType={userType} />
      ) : (
        <SignUpForm onSuccess={() => setMode('signin')} userType={userType} />
      )}

      <div className="text-center">
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
      </div>
    </div>
  );
};
