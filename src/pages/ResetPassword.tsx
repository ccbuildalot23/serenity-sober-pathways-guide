import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualEmail, setManualEmail] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    // Supabase recovery flow usually sends the token in the URL hash (after #)
    // but errors come through the query string. Support both.
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);

    const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
    const type = hashParams.get('type') || searchParams.get('type');
    const error = searchParams.get('error');
    const errorCode = searchParams.get('error_code');

    if (error || errorCode) {
      setErrorMessage(
        errorCode === 'otp_expired'
          ? 'This password reset link has expired. Please request a new one.'
          : 'This password reset link is invalid. Please request a new one.'
      );
      setIsValidToken(false);
      return;
    }

    if (type === 'recovery' && accessToken) {
      setIsValidToken(true);
    } else {
      setIsValidToken(false);
    }
  }, []);

  const handleManualVerify = async () => {
    setVerifying(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: manualEmail,
        token: manualCode,
        type: 'recovery',
      });
      if (error) {
        setErrorMessage(error.message || 'Invalid code. Please try again.');
        setIsValidToken(false);
      } else {
        // Session should be established; allow password reset form
        setIsValidToken(true);
      }
    } catch (e) {
      setErrorMessage('Unexpected error verifying code.');
      setIsValidToken(false);
    } finally {
      setVerifying(false);
    }
  };

  if (isValidToken === null) {
    // Still checking
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Invalid or Expired Link</strong>
              <p className="mt-2">{errorMessage ?? 'This password reset link is invalid or has expired.'}</p>
              <button
                onClick={() => navigate('/forgot-password')}
                className="mt-3 underline text-sm text-primary"
              >
                Send a new reset link
              </button>
            </AlertDescription>
          </Alert>

          {/* Manual OTP verify fallback */}
          <div className="mt-6 border rounded-md p-4 bg-white">
            <p className="text-sm mb-2 text-gray-700">Or enter the 6-digit code from your email:</p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email address"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                className="w-full border px-3 py-2 rounded"
              />
              <input
                type="text"
                placeholder="6-digit code"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="w-full border px-3 py-2 rounded tracking-widest"
                maxLength={12}
              />
              <button
                onClick={handleManualVerify}
                disabled={verifying || !manualEmail || !manualCode}
                className="w-full bg-primary text-white py-2 rounded disabled:opacity-50"
              >
                {verifying ? 'Verifying…' : 'Verify Code'}
              </button>
            </div>
          </div>
          <button
            onClick={() => navigate('/auth')}
            className="mt-4 w-full text-center text-sm text-primary hover:underline"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Reset Your Password</h1>
          <p className="mt-2 text-gray-600">Enter your new password below</p>
        </div>
        <ResetPasswordForm />
      </div>
    </div>
  );
};

export default ResetPassword;