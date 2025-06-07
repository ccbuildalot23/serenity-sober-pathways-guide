
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface SignInFormProps {
  onSuccess?: () => void;
}

export const SignInForm: React.FC<SignInFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const triggerHapticFeedback = (type: 'error' | 'success') => {
    if ('vibrate' in navigator) {
      if (type === 'error') {
        // Smooth tug pattern for error
        navigator.vibrate([50, 30, 50]);
      } else if (type === 'success') {
        // Smooth pop for success
        navigator.vibrate([30]);
      }
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setIsShaking(true);
      triggerHapticFeedback('error');
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    
    if (error) {
      setIsShaking(true);
      triggerHapticFeedback('error');
      toast({
        title: "Sign In Failed",
        description: error.message,
        variant: "destructive",
      });
      setTimeout(() => setIsShaking(false), 500);
    } else {
      triggerHapticFeedback('success');
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/');
      }
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSignIn} className={`space-y-4 ${isShaking ? 'animate-smooth-shake' : ''}`}>
      <div>
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
        />
      </div>
      <div>
        <Label htmlFor="signin-password">Password</Label>
        <Input
          id="signin-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          required
        />
      </div>
      <Button 
        type="submit" 
        className="w-full serenity-primary transition-all duration-200 hover:scale-[1.02]" 
        disabled={loading}
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </Button>
    </form>
  );
};
