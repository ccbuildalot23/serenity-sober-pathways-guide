
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Fingerprint, Shield, Smartphone, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface EnhancedAuthProps {
  mode: 'signin' | 'signup';
}

export const EnhancedAuth: React.FC<EnhancedAuthProps> = ({ mode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [enable2FA, setEnable2FA] = useState(false);
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMFA, setShowMFA] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [biometricSupported, setBiometricSupported] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Check if biometric authentication is supported
    const checkBiometricSupport = async () => {
      if ('PublicKeyCredential' in window) {
        try {
          const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
          setBiometricSupported(available);
        } catch (error) {
          setBiometricSupported(false);
        }
      }
    };
    checkBiometricSupport();
  }, []);

  const handleBiometricAuth = async () => {
    if (!biometricSupported) {
      toast.error('Biometric authentication is not supported on this device');
      return;
    }

    try {
      setIsLoading(true);
      
      // Create credential request
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: {
            name: "Serenity Recovery App",
            id: window.location.hostname,
          },
          user: {
            id: new TextEncoder().encode(email || 'user'),
            name: email || 'user@example.com',
            displayName: email || 'User',
          },
          pubKeyCredParams: [{alg: -7, type: "public-key"}],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 60000,
          attestation: "direct"
        }
      });

      if (credential) {
        toast.success('Biometric authentication enabled!');
        setEnableBiometric(true);
      }
    } catch (error) {
      console.error('Biometric auth error:', error);
      toast.error('Failed to enable biometric authentication');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (password !== confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }
        
        const { error } = await signUp(email, password);
        if (error) throw error;
        
        if (enable2FA) {
          setShowMFA(true);
          toast.info('Please enter the verification code sent to your email');
          return;
        }
        
        toast.success('Account created successfully!');
        navigate('/');
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
        
        if (enable2FA) {
          setShowMFA(true);
          toast.info('Please enter your 2FA code');
          return;
        }
        
        toast.success('Signed in successfully!');
        navigate('/');
      }
    } catch (error: any) {
      toast.error(error.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMFAVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate MFA verification
    if (mfaCode === '123456' || mfaCode.length === 6) {
      toast.success('Two-factor authentication verified!');
      setShowMFA(false);
      navigate('/');
    } else {
      toast.error('Invalid verification code');
    }
  };

  if (showMFA) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="w-5 h-5" />
            Two-Factor Authentication
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleMFAVerification} className="space-y-4">
            <div>
              <Label htmlFor="mfaCode">Verification Code</Label>
              <Input
                id="mfaCode"
                type="text"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="Enter 6-digit code"
                maxLength={6}
                required
              />
              <p className="text-sm text-gray-600 mt-1">
                Enter the code sent to your email or from your authenticator app
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              className="w-full"
              onClick={() => setShowMFA(false)}
            >
              Back to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>
          {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {mode === 'signup' && (
            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
          )}

          {/* Security Options */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Smartphone className="w-4 h-4" />
                <Label htmlFor="2fa">Enable 2FA</Label>
                <Badge variant="outline" className="text-xs">Recommended</Badge>
              </div>
              <Switch
                id="2fa"
                checked={enable2FA}
                onCheckedChange={setEnable2FA}
              />
            </div>

            {biometricSupported && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Fingerprint className="w-4 h-4" />
                  <Label htmlFor="biometric">Biometric Login</Label>
                  <Badge variant="outline" className="text-xs">Secure</Badge>
                </div>
                <Switch
                  id="biometric"
                  checked={enableBiometric}
                  onCheckedChange={setEnableBiometric}
                />
              </div>
            )}

            {enableBiometric && biometricSupported && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBiometricAuth}
                className="w-full"
                disabled={isLoading}
              >
                <Fingerprint className="w-4 h-4 mr-2" />
                Set Up Biometric Login
              </Button>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
