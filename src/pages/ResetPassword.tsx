import React from 'react';
import { EnhancedResetPasswordForm } from '@/components/auth/EnhancedResetPasswordForm';

const ResetPassword: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <EnhancedResetPasswordForm />
    </div>
  );
};

export default ResetPassword;