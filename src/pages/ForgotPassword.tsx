import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Forgot your password?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 text-center">
              Enter the email associated with your account. We’ll send a secure link to reset your password.
              This works for patients, providers, and supporters.
            </p>
          </CardContent>
        </Card>
        <ForgotPasswordForm onBack={() => navigate('/auth')} />
        <Button variant="link" className="w-full mt-4" onClick={() => navigate('/auth')}>
          Back to Sign In
        </Button>
      </div>
    </div>
  );
};

export default ForgotPassword;


