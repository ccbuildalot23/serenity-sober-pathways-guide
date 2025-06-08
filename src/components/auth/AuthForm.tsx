
import React, { useState } from 'react';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { Button } from '@/components/ui/button';

interface AuthFormProps {
  initialMode?: 'signin' | 'signup';
}

export const AuthForm: React.FC<AuthFormProps> = ({ initialMode = 'signin' }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  return (
    <div className="space-y-6">
      {mode === 'signin' ? (
        <SignInForm />
      ) : (
        <SignUpForm onSuccess={() => setMode('signin')} />
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
