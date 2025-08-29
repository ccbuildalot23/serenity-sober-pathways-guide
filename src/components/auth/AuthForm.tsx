
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import { ForgotPasswordForm } from './ForgotPasswordForm';
import { RoleSelector } from './RoleSelector';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Heart, Shield, Users, ArrowRight, Sparkles } from 'lucide-react';

interface AuthFormProps {
  initialMode?: 'signin' | 'signup' | 'forgot';
  userType?: string;
}

export const AuthForm: React.FC<AuthFormProps> = ({ initialMode = 'signin', userType: initialUserType }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<string | undefined>(initialUserType);
  const [showRoleSelector, setShowRoleSelector] = useState(initialMode === 'signup' && !initialUserType);

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'recovery':
        return <Heart className="w-4 h-4" />;
      case 'provider':
        return <Shield className="w-4 h-4" />;
      case 'supporter':
        return <Users className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'recovery':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'provider':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'supporter':
        return 'bg-turquoise-50 text-turquoise-700 border-turquoise-200';
      default:
        return 'bg-sage-50 text-sage-700 border-sage-200';
    }
  };

  const handleRoleSelect = (role: 'patient' | 'provider' | 'supporter') => {
    const roleMap = {
      patient: 'recovery',
      provider: 'provider',
      supporter: 'supporter'
    };
    setSelectedRole(roleMap[role]);
    setShowRoleSelector(false);
  };

  const handleModeChange = (newMode: 'signin' | 'signup' | 'forgot') => {
    setMode(newMode);
    if (newMode === 'signup' && !selectedRole) {
      setShowRoleSelector(true);
    } else {
      setShowRoleSelector(false);
    }
  };

  if (showRoleSelector && mode === 'signup') {
    return (
      <div className="space-y-6">
        <RoleSelector onSelectRole={handleRoleSelect} />
        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => handleModeChange('signin')}
            className="text-sm"
          >
            Already have an account? Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {selectedRole && mode === 'signup' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`text-center p-4 rounded-xl border ${getUserTypeColor(selectedRole)}`}
          >
            <div className="flex items-center justify-center space-x-2">
              {getUserTypeIcon(selectedRole)}
              <p className="text-sm font-medium">
                You've selected: <strong>
                  {selectedRole === 'recovery' && 'Person in Recovery'}
                  {selectedRole === 'provider' && 'Healthcare Provider'}
                  {selectedRole === 'supporter' && 'Personal Supporter'}
                </strong>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <AnimatePresence mode="wait">
        {mode === 'signin' && (
          <motion.div
            key="signin"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <SignInForm userType={selectedRole} />
          </motion.div>
        )}
        {mode === 'signup' && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <SignUpForm onSuccess={() => handleModeChange('signin')} userType={selectedRole} />
          </motion.div>
        )}
        {mode === 'forgot' && (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ForgotPasswordForm onBack={() => setMode('signin')} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-center space-y-3"
      >
        {mode !== 'forgot' && (
          <Button
            variant="link"
            onClick={() => handleModeChange(mode === 'signin' ? 'signup' : 'signin')}
            className="text-sm text-sage-600 hover:text-emerald-600 transition-colors duration-200 group"
          >
            <span className="flex items-center space-x-1">
              <span>
                {mode === 'signin' 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform duration-200" />
            </span>
          </Button>
        )}
        
        {mode === 'signin' && (
          <div>
            <Button
              variant="link"
              onClick={() => handleModeChange('forgot')}
              className="text-sm text-sage-500 hover:text-sage-700 transition-colors duration-200"
            >
              Forgot your password?
            </Button>
          </div>
        )}
      </motion.div>

      {/* Security Notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center"
      >
        <div className="inline-flex items-center space-x-2 text-xs text-sage-500 bg-sage-50 px-3 py-2 rounded-full">
          <Shield className="w-3 h-3" />
          <span>Your data is encrypted and secure</span>
        </div>
      </motion.div>
    </div>
  );
};
