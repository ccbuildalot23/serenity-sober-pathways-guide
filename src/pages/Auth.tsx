
import React, { useEffect, useState } from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Shield, Heart, Brain, Users, Bug, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const Auth = () => {
  const { user, loading: authLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>({});

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

  // Redirect if user is already authenticated
  useEffect(() => {
    console.log('Auth page - checking user:', { user, authLoading, isRedirecting });
    
    if (user && !authLoading && !isRedirecting) {
      setIsRedirecting(true);
      console.log('User authenticated, preparing redirect...');
      
      // Clear any error states
      localStorage.removeItem('auth_error');
      
      // Show success state briefly before redirect
      setTimeout(() => {
        console.log('Redirecting to home page...');
        window.location.href = '/';
      }, 1500);
    }
  }, [user, authLoading, isRedirecting]);

  // Show features after a delay
  useEffect(() => {
    const timer = setTimeout(() => setShowFeatures(true), 500);
    return () => clearTimeout(timer);
  }, []);

  // Show loading state while checking auth status
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show redirecting state
  if (isRedirecting && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center animate-pulse">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Welcome back!</h2>
          <p className="text-gray-600 dark:text-gray-400">Redirecting to your dashboard...</p>
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-slate-900 dark:to-slate-800">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left side - Auth Form */}
        <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
          <div className="w-full max-w-md space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-4">
                <h1 className="text-3xl font-bold text-blue-700 dark:text-blue-400">Serenity</h1>
                <ThemeToggle />
              </div>
              <p className="text-gray-600 dark:text-gray-400">Your recovery companion</p>
            </div>

            {/* Development Mode Tools */}
            {import.meta.env.DEV && (
              <div className="space-y-3">
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-sm">
                    <strong>Development Mode Active</strong>
                    <div className="mt-2 space-y-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = '/'}
                          className="flex-1"
                        >
                          Skip to Home
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.location.href = '/checkin'}
                          className="flex-1"
                        >
                          Skip to Check-in
                        </Button>
                      </div>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={() => setShowDebug(!showDebug)}
                        className="w-full"
                      >
                        <Bug className="w-3 h-3 mr-1" />
                        {showDebug ? 'Hide' : 'Show'} Debug Info
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>

                {/* Debug Panel */}
                {showDebug && (
                  <Card className="bg-gray-50 dark:bg-gray-800">
                    <CardContent className="pt-4">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <Bug className="w-4 h-4" />
                        Debug Information
                      </h4>
                      <pre className="text-xs bg-white dark:bg-gray-900 p-2 rounded overflow-auto max-h-40">
                        {JSON.stringify(debugInfo, null, 2)}
                      </pre>
                      <div className="mt-3 space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            localStorage.clear();
                            sessionStorage.clear();
                            window.location.reload();
                          }}
                          className="w-full"
                        >
                          Clear Storage & Reload
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            console.log('Current auth state:', { user, authLoading });
                            alert('Check console for auth state');
                          }}
                          className="w-full"
                        >
                          Log Auth State
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Auth Error Alert */}
            {localStorage.getItem('auth_error') && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {localStorage.getItem('auth_error')}
                  <button
                    onClick={() => {
                      localStorage.removeItem('auth_error');
                      window.location.reload();
                    }}
                    className="block mt-2 text-sm underline"
                  >
                    Clear error
                  </button>
                </AlertDescription>
              </Alert>
            )}

            {/* Auth Form */}
            <AuthForm />

            {/* Privacy Notice */}
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-6">
              By signing in, you agree to our{' '}
              <a href="/terms" className="underline hover:text-gray-700 dark:hover:text-gray-300">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="underline hover:text-gray-700 dark:hover:text-gray-300">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>

        {/* Right side - Features (Desktop only) */}
        <div className="hidden lg:flex flex-1 items-center justify-center p-8 bg-gradient-to-br from-blue-100 to-emerald-100 dark:from-slate-800 dark:to-slate-700">
          <div className={`max-w-md space-y-6 transition-all duration-1000 ${showFeatures ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="text-center space-y-2 mb-8">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                Start Your Recovery Journey
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Track your progress, connect with support, and build lasting habits
              </p>
            </div>

            <div className="space-y-4">
              {/* Feature Cards */}
              <Card className="border-0 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                <CardContent className="p-4 flex items-start space-x-4">
                  <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">Daily Check-ins</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Track your mood, energy, and recovery progress with simple daily check-ins
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                <CardContent className="p-4 flex items-start space-x-4">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">Mental Health Screening</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Monitor your mental wellness with evidence-based assessments
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                <CardContent className="p-4 flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200">Community Support</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Connect with others on similar journeys and build your support network
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center pt-6">
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Shield className="w-4 h-4" />
                <span>Your data is encrypted and secure</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
