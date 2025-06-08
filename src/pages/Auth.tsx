
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EnhancedAuth } from '@/components/auth/EnhancedAuth';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const Auth = () => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-4">
            <h1 className="text-3xl font-bold text-[#1E3A8A]">Serenity</h1>
            <ThemeToggle />
          </div>
          <p className="text-gray-600">Your recovery companion</p>
        </div>

        {/* Enhanced Auth Component */}
        <EnhancedAuth mode={mode} />

        {/* Toggle Mode */}
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
    </div>
  );
};

export default Auth;
