import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualEmail, setManualEmail] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    // Debug: Log the current URL to see what we're working with
    console.log('ResetPassword URL:', window.location.href);
    console.log('Hash:', window.location.hash);
    console.log('Search:', window.location.search);

    // Supabase recovery flow usually sends the token in the URL hash (after #)
    // but errors come through the query string. Support both.
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);

    const accessToken = hashParams.get('access_token') || searchParams.get('access_token');
    const type = hashParams.get('type') || searchParams.get('type');
    const error = searchParams.get('error');
    const errorCode = searchParams.get('error_code');
    const errorDescription = searchParams.get('error_description');

    console.log('Debug - accessToken:', accessToken);
    console.log('Debug - type:', type);
    console.log('Debug - error:', error);
    console.log('Debug - errorCode:', errorCode);
    console.log('Debug - errorDescription:', errorDescription);

    // Handle specific error cases from Supabase
    if (error || errorCode) {
      console.log('Supabase returned an error:', { error, errorCode, errorDescription });
      
      if (errorCode === 'otp_expired') {
        setErrorMessage('This password reset link has expired. Please request a new one.');
      } else if (errorCode === 'invalid_grant') {
        setErrorMessage('This password reset link is invalid. Please request a new one.');
      } else if (error === 'access_denied') {
        setErrorMessage('Access denied. This password reset link may have been used already or is invalid.');
      } else {
        setErrorMessage(`Password reset error: ${errorDescription || error || 'Unknown error'}`);
      }
      setIsValidToken(false);
      return;
    }

    if (type === 'recovery' && accessToken) {
      console.log('Attempting to verify token with Supabase...');
      
      // Try to verify the token with Supabase
      supabase.auth.verifyOtp({
        token: accessToken,
        type: 'recovery'
      }).then(({ data, error }) => {
        if (error) {
          console.error('Token verification failed:', error);
          setErrorMessage(`Token verification failed: ${error.message}`);
          setIsValidToken(false);
        } else {
          console.log('Token verified successfully:', data);
          setIsValidToken(true);
        }
      }).catch((err) => {
        console.error('Unexpected error during token verification:', err);
        setErrorMessage('Unexpected error verifying token. Please try again.');
        setIsValidToken(false);
      });
    } else {
      console.log('No valid token found in URL');
      console.log('Type:', type);
      console.log('AccessToken present:', !!accessToken);
      setIsValidToken(false);
    }
  }, []);

  const handleManualVerify = async () => {
    setVerifying(true);
    setErrorMessage(null);
    try {
      // Send a new password reset email to the provided email address
      const { error } = await supabase.auth.resetPasswordForEmail(manualEmail, {
        redirectTo: window.location.origin + '/reset-password',
      });
      
      if (error) {
        setErrorMessage(error.message || 'Failed to send reset email. Please try again.');
      } else {
        setErrorMessage('A new password reset email has been sent to your email address. Please check your inbox and click the link in the email.');
      }
    } catch (e) {
      setErrorMessage('Unexpected error sending reset email.');
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

          {/* Manual email reset fallback */}
          <div className="mt-6 border rounded-md p-4 bg-white">
            <p className="text-sm mb-2 text-gray-700">Or enter your email to receive a new reset link:</p>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email address"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                className="w-full border px-3 py-2 rounded"
              />
              <button
                onClick={handleManualVerify}
                disabled={verifying || !manualEmail}
                className="w-full bg-primary text-white py-2 rounded disabled:opacity-50"
              >
                {verifying ? 'Sending…' : 'Send New Reset Link'}
              </button>
            </div>
          </div>

          <div className="mt-4 text-center">
            <button
              onClick={() => navigate('/auth')}
              className="text-sm text-gray-600 underline"
            >
              Return to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <h2 className="text-2xl font-bold text-center mb-6">Set New Password</h2>
        <p className="text-center text-gray-600 mb-6">
          Your reset link is valid. Please enter your new password below.
        </p>
        {/* Password reset form component would go here */}
        <div className="text-center">
          <p className="text-green-600">Token verified successfully!</p>
          <p className="text-sm text-gray-500 mt-2">Password reset form would appear here.</p>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;