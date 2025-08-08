import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthForm } from '@/components/auth/AuthForm';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Shield, Heart, Brain, Users, Bug, AlertCircle, Stethoscope, HeartHandshake, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: _authLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(_false);
  const [showFeatures, setShowFeatures] = useState(_false);
  const [showDebug, setShowDebug] = useState(_false);
  const [_debugInfo, setDebugInfo] = useState<unknown>({});
  const [selectedUserType, setSelectedUserType] = useState<string>('');

  // Test log to verify page loads
  console.log('🎯 Auth page loaded successfully with new three-user-type design');

  // Check URL params for debug mode
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === '_true' || import.meta.env.DEV) {
      setShowDebug(_true);
    }
  }, []);

  // Update debug info
  useEffect(() => {
    setDebugInfo({
      user: user ? { id: user.id, _email: user._email } : _null,
      _authLoading,
      isRedirecting,
      _pathname: window.location._pathname,
      _timestamp: new Date().toISOString()
    });
  }, [user, _authLoading, isRedirecting]);

  // Redirect if user is already authenticated
  useEffect(() => {
    console.log('Auth page - checking user:', { user, _authLoading, isRedirecting });
    
    if (user && !_authLoading && !isRedirecting) {
      setIsRedirecting(_true);
      console.log('User authenticated, preparing redirect...');
      
      // Clear any error states
      localStorage.removeItem('auth_error');
      
      // Use React Router navigation to dashboard instead of home
      setTimeout(() => {
        console.log('Redirecting to dashboard...');
        navigate('/dashboard');
      }, 1000);
    }
  }, [user, _authLoading, isRedirecting, navigate]);

  // Show features after a delay
  useEffect(() => {
    const _timer = setTimeout(() => setShowFeatures(_true), 500);
    return () => clearTimeout(_timer);
  }, []);

  // Show loading state while checking auth status
  if (_authLoading) {
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left side - Auth Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-8 lg:max-w-md lg:min-w-[400px]">
          <div className="w-full max-w-md space-y-8">
            {/* Header */}
            <div className="text-center space-y-4 animate-fade-in">
              <div className="flex items-center justify-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent">
                    Serenity
                  </h1>
                  <p className="text-sm text-muted-foreground">Support Platform</p>
                </div>
                <ThemeToggle />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  Supporting Recovery Together
                </h2>
                <p className="text-base text-muted-foreground">
                  Whether you're in recovery, a healthcare provider, or a caring supporter - Serenity is built for you
                </p>
              </div>
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
                          onClick={() => navigate('/')}
                          className="flex-1"
                        >
                          Skip to Home
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate('/checkin')}
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
                        {JSON.stringify(_debugInfo, _null, 2)}
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
                            console.log('Current auth state:', { user, _authLoading });
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

            {/* User Type Selection */}
            <div className="text-center space-y-4">
              <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
                One platform, three perspectives, countless lives changed
              </p>
              
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  I am a:
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'recovery', label: 'Person in Recovery' },
                    { value: 'provider', label: 'Healthcare Provider' },
                    { value: 'supporter', label: 'Personal Supporter' }
                  ].map((option) => (
                    <label key={option.value} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="userType"
                        value={option.value}
                        checked={selectedUserType === option.value}
                        onChange={(e) => setSelectedUserType(e.target.value)}
                        className="text-blue-600"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Auth Form */}
            <AuthForm userType={selectedUserType} />

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

        {/* Right side - User Type Cards and Features */}
        <div className="flex-1 bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="p-6 lg:p-8 h-full overflow-y-auto">
            <div className={`max-w-4xl mx-auto space-y-8 transition-all duration-1000 ${showFeatures ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
              
              {/* Header */}
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-xl mx-auto animate-float">
                  <Heart className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                  Choose Your Journey
                </h2>
                <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto">
                  Serenity serves the entire recovery ecosystem with specialized tools and features for each role
                </p>
              </div>

              {/* User Type Selection Cards */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* Person in Recovery Card */}
                <Card 
                  className="group border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-emerald-200 dark:hover:border-emerald-800 cursor-pointer bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20"
                  onClick={() => {
                    setSelectedUserType('recovery');
                    console.log('✅ Recovery card clicked - user type set to: recovery');
                  }}
                >
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-emerald-800 dark:text-emerald-200">
                      I'm in Recovery
                    </CardTitle>
                    <p className="text-sm text-emerald-600 dark:text-emerald-300 font-medium">
                      Take control of your journey with evidence-based tools
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                        Daily check-ins & mood tracking
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                        Crisis support network
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                        Anonymous community support
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-emerald-500 mr-2 flex-shrink-0" />
                        Mental health assessments
                      </li>
                    </ul>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      Start Your Recovery Journey
                    </Button>
                  </CardContent>
                </Card>

                {/* Healthcare Provider Card */}
                <Card 
                  className="group border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-blue-200 dark:hover:border-blue-800 cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20"
                  onClick={() => {
                    setSelectedUserType('provider');
                    console.log('✅ Provider card clicked - user type set to: provider');
                  }}
                >
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <Stethoscope className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-blue-800 dark:text-blue-200">
                      I'm a Healthcare Provider
                    </CardTitle>
                    <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">
                      Support your patients with clinical-grade monitoring tools
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                        Patient progress dashboards
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                        Evidence-based assessments
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                        Secure communication
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                        Treatment plan integration
                      </li>
                    </ul>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Explore Provider Tools
                    </Button>
                  </CardContent>
                </Card>

                {/* Personal Supporter Card */}
                <Card 
                  className="group border-0 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-2 hover:border-purple-200 dark:hover:border-purple-800 cursor-pointer bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20"
                  onClick={() => {
                    setSelectedUserType('supporter');
                    console.log('✅ Supporter card clicked - user type set to: supporter');
                  }}
                >
                  <CardHeader className="text-center pb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <HeartHandshake className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-purple-800 dark:text-purple-200">
                      I'm Supporting Someone
                    </CardTitle>
                    <p className="text-sm text-purple-600 dark:text-purple-300 font-medium">
                      Be part of their support network with the right tools
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-purple-500 mr-2 flex-shrink-0" />
                        Crisis alert notifications
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-purple-500 mr-2 flex-shrink-0" />
                        Educational resources
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-purple-500 mr-2 flex-shrink-0" />
                        Communication guidelines
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-purple-500 mr-2 flex-shrink-0" />
                        Progress celebration tools
                      </li>
                    </ul>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                      Learn How to Help
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Updated Feature Cards with Badges */}
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
                    Core Features
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Discover how our platform serves each user type
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <Card className="border-0 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                    <CardContent className="p-4 flex items-start space-x-4">
                      <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Heart className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Daily Check-ins</h3>
                          <Badge variant="secondary" className="text-xs">Recovery & Providers</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Track mood, energy, and recovery progress with simple daily check-ins
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                    <CardContent className="p-4 flex items-start space-x-4">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Mental Health Screening</h3>
                          <Badge variant="default" className="text-xs">All Users</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Monitor mental wellness with evidence-based assessments
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
                    <CardContent className="p-4 flex items-start space-x-4">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Community Support</h3>
                          <Badge variant="outline" className="text-xs">Recovery & Supporters</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Connect with others and build your support network
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Footer Information */}
              <div className="grid md:grid-cols-3 gap-6 pt-8 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center space-y-2">
                  <h4 className="font-semibold text-emerald-600 dark:text-emerald-400">For Those in Recovery</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>Privacy-first design</li>
                    <li>Anonymous options</li>
                    <li>24/7 support access</li>
                  </ul>
                </div>
                <div className="text-center space-y-2">
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400">For Providers</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>HIPAA considerations</li>
                    <li>Clinical insights</li>
                    <li>Patient engagement tools</li>
                  </ul>
                </div>
                <div className="text-center space-y-2">
                  <h4 className="font-semibold text-purple-600 dark:text-purple-400">For Supporters</h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>Educational resources</li>
                    <li>Healthy boundaries</li>
                    <li>Effective communication</li>
                  </ul>
                </div>
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
    </div>
  );
};

export default Auth;
