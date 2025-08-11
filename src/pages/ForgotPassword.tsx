import React from 'react';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { useNavigate } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-8">
      <ForgotPasswordForm onBack={() => navigate('/auth')} />
    </div>
  );
};

export default ForgotPassword;


