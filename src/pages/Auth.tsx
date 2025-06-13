
import React from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const Auth = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-4">
            <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-400">Serenity</h1>
            <ThemeToggle />
          </div>
          <p className="text-gray-600 dark:text-gray-400">Your recovery companion</p>
        </div>

        {/* Auth Form */}
        <AuthForm />
      </div>
    </div>
  );
};

export default Auth;
