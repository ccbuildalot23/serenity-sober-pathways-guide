
import React from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

const Auth = () => {
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

        {/* Auth Form */}
        <AuthForm />
      </div>
    </div>
  );
};

export default Auth;
