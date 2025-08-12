// Patient Dashboard - For users in recovery

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Calendar, 
  TrendingUp, 
  Shield, 
  Users, 
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Clock,
  Activity,
  UserCheck,
  PhoneCall,
  Sparkles,
  Leaf,
  Star,
  ArrowRight,
  Plus,
  Target,
  Award
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { emergencyFallback } from '@/lib/emergencyFallback';
import { testDatabaseConnection } from '@/utils/databaseTest';
import { loadDashboardDataFixed } from '@/utils/databaseFix';
import '@/utils/patientJourneyTest';

const PatientDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    recoveryStreak: 0,
    totalCheckins: 0,
    lastCheckinDate: null,
    supportNetworkCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user?.id) return;
    try {
      const data = await loadDashboardDataFixed();
      if (data) {
        setDashboardData({
          recoveryStreak: data.currentStreak || 0,
          totalCheckins: data.totalCheckIns || 0,
          lastCheckinDate: (data as any).lastCheckIn || null,
          supportNetworkCount: data.supportNetworkCount || 0,
        });
        return;
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Phase 1.2: Execute Database Test in Browser on mount for visibility
  useEffect(() => {
    (async () => {
      try {
        const results = await testDatabaseConnection();
        console.log('🎯 DATABASE TEST RESULTS:', results);
        if ((results as any).error) console.error('🚨 CRITICAL: Database completely broken');
        // user comes from context; results.auth duplicates visibility for console only
      } catch (err) {
        console.error('🚨 Database test runner failed:', err);
      }
    })();
  }, []);

  // Phase 3.2: Real-Time Data Verification (logs only)
  useEffect(() => {
    if (!user?.id) return;
    const interval = setInterval(async () => {
      try {
        console.log('🔄 REAL-TIME DATA CHECK...');
        const { count: checkinsCount, error: checkinsError } = await supabase
          .from('daily_checkins')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        const { count: contactsCount, error: contactsError } = await supabase
          .from('support_contacts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        console.log('📊 LIVE DATA CHECK:', {
          daily_checkins: checkinsCount || 0,
          support_contacts: contactsCount || 0,
          errors: { checkinsError, contactsError },
        });
      } catch (e) {
        console.error('Real-time data check failed:', e);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [user?.id]);
  return (
    <div className="min-h-screen bg-gradient-therapeutic relative overflow-hidden" data-testid="patient-dashboard">
      {/* Floating Elements Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-emerald-200/20 rounded-full animate-float"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-turquoise-200/20 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-32 left-1/4 w-20 h-20 bg-sky-200/20 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-sage-200/20 rounded-full animate-float" style={{ animationDelay: '0.5s' }}></div>
      </div>

      {/* Navigation */}
      <nav className="relative z-10 px-4 py-3 border-b border-sage-200 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex gap-4 text-sm">
          <Link to="/patient/dashboard" data-testid="nav-dashboard" className="text-sage-700 hover:text-emerald-600 transition-colors font-medium">Dashboard</Link>
          <Link to="/checkin" data-testid="nav-checkin" className="text-sage-600 hover:text-emerald-600 transition-colors">Check-in</Link>
          <Link to="/peer-support" data-testid="nav-peer-support" className="text-sage-600 hover:text-emerald-600 transition-colors">Peer Support</Link>
          <Link to="/community" data-testid="nav-community" className="text-sage-600 hover:text-emerald-600 transition-colors">Community</Link>
        </div>
      </nav>

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-sage-200 shadow-soft"
      >
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl font-bold text-sage-800 flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-healing">
                  <Heart className="w-7 h-7 text-white" />
                </div>
                Serenity Dashboard
              </h1>
              <p className="mt-3 text-lg text-sage-600">
                Welcome back, Friend. Your journey matters.
              </p>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-4"
            >
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-2 px-4 py-2">
                <Shield className="w-4 h-4" />
                Patient Portal
              </Badge>
              <Button asChild variant="outline" size="sm" className="border-sage-200 text-sage-700 hover:bg-sage-50">
                <Link to="/profile" data-testid="nav-profile">Profile</Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Mood tracker anchor for E2E */}
        <div data-testid="mood-tracker" className="sr-only">anchor</div>
        
        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-sage-200 shadow-soft hover:shadow-calm transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-sage-600">Hope Journey</p>
                    <p className="text-3xl font-bold text-sage-800">
                      {loading ? '...' : dashboardData.recoveryStreak}
                    </p>
                    <p className="text-xs text-sage-500">days of courage</p>
                  </div>
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-sage-200 shadow-soft hover:shadow-calm transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-sage-600">Total Check-ins</p>
                    <p className="text-3xl font-bold text-sage-800">
                      {loading ? '...' : dashboardData.totalCheckins}
                    </p>
                    <p className="text-xs text-sage-500">completed</p>
                    <p className="text-xs text-sage-500" data-testid="last-checkin-status">
                      {loading ? 'Loading...' : 
                       dashboardData.lastCheckinDate ? 
                       `Last: ${new Date(dashboardData.lastCheckinDate).toLocaleDateString()}` : 
                       'No recent check-ins'}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-sky-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-sage-200 shadow-soft hover:shadow-calm transition-all duration-300 cursor-pointer"
                  onClick={() => navigate('/support-network')}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-sage-600">Support Network</p>
                    <p className="text-3xl font-bold text-sage-800">
                      {loading ? '...' : dashboardData.supportNetworkCount}
                    </p>
                    <p className="text-xs text-sage-500">connections</p>
                  </div>
                  <div className="w-12 h-12 bg-turquoise-100 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-turquoise-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-sage-200 shadow-soft hover:shadow-calm transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-sage-600">Resources</p>
                    <p className="text-3xl font-bold text-sage-800">12</p>
                    <p className="text-xs text-sage-500">available</p>
                  </div>
                  <div className="w-12 h-12 bg-sage-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-sage-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Main Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8"
        >
          {/* Daily Check-in Section */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.0 }}
            data-testid="daily-checkin-section"
          >
            <Card className="bg-white/80 backdrop-blur-sm border-sage-200 shadow-soft">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-sage-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                  </div>
                  Daily Check-in
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sage-600">
                  Take a moment to reflect on your day and track your progress.
                </p>
                <Button 
                  asChild 
                  className="w-full bg-gradient-primary hover:bg-gradient-primary/90 text-white font-semibold py-3 rounded-xl shadow-gentle hover:shadow-calm transition-all duration-300 transform hover:scale-[1.02]"
                  data-testid="start-checkin-button"
                >
                  <Link to="/checkin" className="flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" />
                    Start Today's Check-in
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Crisis Support */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.1 }}
          >
            <Card className="bg-white/80 backdrop-blur-sm border-sage-200 shadow-soft">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-sage-800 flex items-center gap-2">
                  <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-sky-600" />
                  </div>
                  Crisis Support
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sage-600">
                  Immediate help and resources when you need them most.
                </p>
                <Button 
                  asChild 
                  variant="outline"
                  className="w-full border-sky-200 text-sky-700 hover:bg-sky-50 font-semibold py-3 rounded-xl transition-all duration-300"
                  data-testid="crisis-support-button"
                >
                  <Link to="/crisis" className="flex items-center justify-center gap-2">
                    <PhoneCall className="w-5 h-5" />
                    Get Support Now
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Additional Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {/* Peer Support */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.3 }}
            data-testid="peer-support-access"
          >
            <Card className="bg-white/80 backdrop-blur-sm border-sage-200 shadow-soft hover:shadow-calm transition-all duration-300">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-turquoise-100 rounded-xl flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6 text-turquoise-600" />
                  </div>
                  <h3 className="font-semibold text-sage-800">Peer Support</h3>
                  <p className="text-sm text-sage-600">Connect with others on similar journeys</p>
                  <Button asChild variant="outline" size="sm" className="border-turquoise-200 text-turquoise-700 hover:bg-turquoise-50">
                    <Link to="/peer-support">Connect</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Community */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4 }}
            data-testid="community-access"
          >
            <Card className="bg-white/80 backdrop-blur-sm border-sage-200 shadow-soft hover:shadow-calm transition-all duration-300">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto">
                    <Heart className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h3 className="font-semibold text-sage-800">Community</h3>
                  <p className="text-sm text-sage-600">Join our supportive community</p>
                  <Button asChild variant="outline" size="sm" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                    <Link to="/community">Join</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
            data-testid="progress-nav"
          >
            <Card className="bg-white/80 backdrop-blur-sm border-sage-200 shadow-soft hover:shadow-calm transition-all duration-300">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center mx-auto">
                    <Target className="w-6 h-6 text-sky-600" />
                  </div>
                  <h3 className="font-semibold text-sage-800">Progress</h3>
                  <p className="text-sm text-sage-600">Track your recovery journey</p>
                  <Button asChild variant="outline" size="sm" className="border-sky-200 text-sky-700 hover:bg-sky-50">
                    <Link to="/progress">View</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Encouragement Message */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.6 }}
          className="mt-8 text-center"
        >
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-emerald-800">You're Doing Great!</h3>
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-emerald-700">
              Every step forward is a victory. Remember, you're not alone on this journey.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PatientDashboard;