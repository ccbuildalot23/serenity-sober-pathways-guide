
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CalendarDays, Heart, TrendingUp, Users, AlertTriangle, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCrisisSystem } from '@/hooks/useCrisisSystem';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { NotificationService } from '@/services/notificationService';
import { toast } from 'sonner';
import Layout from '@/components/Layout';
import { UnifiedRecoveryContent } from '@/components/daily/UnifiedRecoveryContent';

const Index = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showProfile, setShowProfile] = useState(false);
  const [stats, setStats] = useState({
    streak: 42,
    checkIns: 15,
    goals: { completed: 3, total: 5 }
  });

  const {
    showAssessment,
    showResponse,
    riskLevel,
    currentCrisisEvent,
    voiceListening,
    hasLocationPermission,
    handleCrisisActivated,
    handleAssessmentComplete,
    handleResponseComplete,
    handleInterventionComplete
  } = useCrisisSystem();

  // Set up keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'h', ctrlKey: true, callback: () => window.location.href = '/' },
    { key: 'c', ctrlKey: true, callback: () => window.location.href = '/calendar' },
    { key: 't', ctrlKey: true, callback: () => window.location.href = '/crisis-toolkit' },
    { key: 's', ctrlKey: true, callback: () => window.location.href = '/settings' }
  ]);

  // Initialize notifications
  useEffect(() => {
    const initNotifications = async () => {
      const permission = await NotificationService.requestPermission();
      if (permission === 'granted') {
        console.log('Notifications enabled');
      }
    };
    
    initNotifications();
  }, []);

  return (
    <Layout 
      activeTab={activeTab} 
      onTabChange={setActiveTab}
      onProfileClick={() => setShowProfile(!showProfile)}
    >
      <div className="p-4 space-y-6">
        {/* Welcome Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[#1E3A8A]">
            Welcome back, {user?.email?.split('@')[0]}!
          </h1>
          <p className="text-gray-600">
            Today is day <span className="font-semibold text-[#10B981]">{stats.streak}</span> of your journey
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-[#10B981]">{stats.streak}</div>
              <div className="text-sm text-gray-600">Day Streak</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-[#1E3A8A]">{stats.checkIns}</div>
              <div className="text-sm text-gray-600">Check-ins</div>
            </CardContent>
          </Card>
        </div>

        {/* Crisis Status */}
        {riskLevel && (
          <Card className="border-orange-500 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <h3 className="font-semibold text-orange-800">Crisis Support Active</h3>
                  <p className="text-sm text-orange-700">
                    Risk level: {riskLevel}. Support resources are available.
                  </p>
                </div>
                <Button 
                  size="sm" 
                  className="bg-orange-600 hover:bg-orange-700"
                  onClick={() => window.location.href = '/crisis-toolkit'}
                >
                  View Tools
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Today's Recovery Content */}
        <UnifiedRecoveryContent />

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button 
            variant="outline" 
            className="h-16 border-2 border-[#1E3A8A] text-[#1E3A8A] hover:bg-blue-50"
            onClick={() => window.location.href = '/calendar'}
          >
            <CalendarDays className="mr-2 h-5 w-5" />
            View Calendar
          </Button>
          <Button 
            variant="outline" 
            className="h-16 border-2 border-[#10B981] text-[#10B981] hover:bg-green-50"
            onClick={() => toast.success("Daily check-in coming soon!")}
          >
            <Heart className="mr-2 h-5 w-5" />
            Daily Check-in
          </Button>
        </div>

        {/* Weekly Goals Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5" />
              Weekly Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Complete daily check-ins</span>
                <Badge variant={stats.goals.completed >= 3 ? "default" : "secondary"}>
                  {stats.goals.completed}/{stats.goals.total}
                </Badge>
              </div>
              <Progress value={(stats.goals.completed / stats.goals.total) * 100} />
              <p className="text-sm text-gray-600">
                {stats.goals.total - stats.goals.completed} more to complete this week
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Access to Crisis Tools */}
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="text-center space-y-3">
              <h3 className="font-semibold text-red-800">Need Immediate Support?</h3>
              <p className="text-sm text-red-700">
                Crisis tools are always available. Say "Hey Serenity, I need help" or tap below.
              </p>
              <Button 
                className="bg-red-600 hover:bg-red-700"
                onClick={() => window.location.href = '/crisis-toolkit'}
              >
                Access Crisis Toolkit
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Index;
