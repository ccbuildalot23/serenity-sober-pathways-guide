import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from '@/components/auth/AuthForm';
import { AuthDebugPanel } from '@/components/auth/AuthDebugPanel';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  Shield, 
  Heart, 
  Brain, 
  Users, 
  Bug, 
  AlertCircle, 
  Stethoscope, 
  HeartHandshake, 
  CheckCircle,
  Sparkles,
  Leaf,
  Star,
  ArrowRight,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<unknown>({});
  const [selectedUserType, setSelectedUserType] = useState<string>('');
  
  // Check if we're on the /login route to show login form directly
  const isLoginRoute = window.location.pathname === '/login';
  const [showLoginForm, setShowLoginForm] = useState(isLoginRoute);

  // Test log to verify page loads
  console.log('🎯 Auth page loaded successfully with new three-user-type design');

  // Check URL params for debug mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'true' || import.meta.env.DEV) {
      setShowDebug(true);
    }
  }, []);

  // Update debug info
  useEffect(() => {
    setDebugInfo({
      user: user ? { id: user.id, email: user.email } : null,
      authLoading,
      isRedirecting,
      pathname: window.location.pathname,
      timestamp: new Date().toISOString()
    });
  }, [user, authLoading, isRedirecting]);

  // Dev/E2E: deterministic bypass to role-specific dashboard when flag is set
  useEffect(() => {
    if (import.meta.env.DEV && !user && !authLoading) {
      try {
        const bypass = localStorage.getItem('dev_bypass_auth');
        const hinted = localStorage.getItem('pw_role');
        if (bypass === 'true') {
          const route = hinted === 'provider'
            ? '/provider/dashboard'
            : hinted === 'support_member'
              ? '/supporter/dashboard'
              : '/patient/dashboard';
          navigate(route, { replace: true });
        }
      } catch (_) {}
    }
  }, [user, authLoading, navigate]);

  // Redirect if user is already authenticated
  useEffect(() => {
    console.log('Auth page - checking user:', { user, authLoading, isRedirecting });
    
    if (user && !authLoading && !isRedirecting) {
      setIsRedirecting(true);
      console.log('User authenticated, preparing redirect...');
      
      // Clear any error states
      localStorage.removeItem('auth_error');
      
      // Use user metadata directly for immediate, deterministic routing
      const userType = (user as any)?.user_metadata?.userType || 'recovery';
      console.log('Determined userType for redirect:', userType);
      
      const route = userType === 'provider'
        ? '/provider/dashboard'
        : userType === 'supporter'
          ? '/supporter/dashboard'
          : '/patient/dashboard';

      navigate(route);
    }
  }, [user, authLoading, isRedirecting, navigate]);

  // Show features after a delay
  useEffect(() => {
    const timer = setTimeout(() => setShowFeatures(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Show loading state while checking auth status
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-therapeutic flex items-center justify-center">
        {/* Floating Elements Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-32 h-32 bg-emerald-200/20 rounded-full animate-float"></div>
          <div className="absolute top-40 right-20 w-24 h-24 bg-turquoise-200/20 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-32 left-1/4 w-20 h-20 bg-sky-200/20 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-healing">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-sage-800 mb-2">Welcome to Serenity</h2>
          <p className="text-sage-600">Preparing your secure environment...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-therapeutic relative overflow-hidden">
      {/* Floating Elements Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-emerald-200/20 rounded-full animate-float"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-turquoise-200/20 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-20 h-20 bg-sky-200/20 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-sage-200/20 rounded-full animate-float" style={{ animationDelay: '0.5s' }}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-3"
          >
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center shadow-healing">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-sage-800">Serenity</span>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-4"
          >
            <ThemeToggle />
            {showDebug && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDebug(!showDebug)}
                className="border-sage-200 text-sage-700 hover:bg-sage-50"
              >
                <Bug className="w-4 h-4 mr-2" />
                Debug
              </Button>
            )}
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Column - Welcome & Features */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="mb-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>HIPAA-Compliant Recovery Platform</span>
                </motion.div>
                
                <h1 className="text-4xl lg:text-5xl font-bold text-sage-800 mb-6 leading-tight">
                  Your Journey to
                  <span className="block bg-gradient-primary bg-clip-text text-transparent">
                    Recovery Begins
                  </span>
                  <span className="block text-sage-700">Here</span>
                </h1>
                
                <p className="text-xl text-sage-600 mb-8 leading-relaxed">
                  A compassionate, secure platform supporting your recovery with evidence-based tools, 
                  community support, and professional guidance.
                </p>
              </div>

              {/* Features Grid */}
              <AnimatePresence>
                {showFeatures && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-sage-200 shadow-soft"
                    >
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                        <Shield className="w-6 h-6 text-emerald-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-sage-800 mb-2">Secure & Private</h3>
                      <p className="text-sage-600 text-sm">HIPAA-compliant with end-to-end encryption</p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 }}
                      className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-sage-200 shadow-soft"
                    >
                      <div className="w-12 h-12 bg-turquoise-100 rounded-xl flex items-center justify-center mb-4">
                        <HeartHandshake className="w-6 h-6 text-turquoise-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-sage-800 mb-2">Community Support</h3>
                      <p className="text-sage-600 text-sm">Connect with peers and supporters</p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 }}
                      className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-sage-200 shadow-soft"
                    >
                      <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center mb-4">
                        <Brain className="w-6 h-6 text-sky-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-sage-800 mb-2">Evidence-Based</h3>
                      <p className="text-sage-600 text-sm">Tools backed by clinical research</p>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 }}
                      className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-sage-200 shadow-soft"
                    >
                      <div className="w-12 h-12 bg-sage-100 rounded-xl flex items-center justify-center mb-4">
                        <Stethoscope className="w-6 h-6 text-sage-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-sage-800 mb-2">Professional Care</h3>
                      <p className="text-sage-600 text-sm">Connect with healthcare providers</p>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Right Column - Auth Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <Card className="bg-white/80 backdrop-blur-sm border-sage-200 shadow-calm">
                <CardHeader className="text-center pb-6">
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-healing"
                  >
                    <Lock className="w-8 h-8 text-white" />
                  </motion.div>
                  <CardTitle className="text-2xl font-bold text-sage-800">
                    Welcome Back
                  </CardTitle>
                  <p className="text-sage-600 mt-2">
                    Sign in to continue your recovery journey
                  </p>
                </CardHeader>
                <CardContent>
                  <AuthForm />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Debug Panel */}
      {showDebug && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-4 right-4 z-50"
        >
          <AuthDebugPanel debugInfo={debugInfo} />
        </motion.div>
      )}
    </div>
  );
};

export default Auth;
