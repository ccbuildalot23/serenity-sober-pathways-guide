
import React, { useState, useEffect, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Heart, Brain, TrendingUp, CheckCircle, Flame, Target, BarChart } from 'lucide-react';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { useEnhancedDailyCheckIn } from '@/hooks/useEnhancedDailyCheckIn';
import { useCheckInHandlers } from '@/hooks/useCheckInHandlers';
import { useAuth } from '@/contexts/AuthContext';
import { useRecoveryMilestones } from '@/hooks/useRecoveryMilestones';
import { enhancedCheckinService, CheckinStats } from '@/services/enhancedCheckinService';
import { MoodSection } from './daily-checkin/MoodSection';
import { WellnessSection } from './daily-checkin/WellnessSection';
import { AssessmentsSection } from './daily-checkin/AssessmentsSection';
import { CheckInPatternAnalysis } from './daily-checkin/CheckInPatternAnalysis';
import { CheckInResponseHandlers } from './daily-checkin/CheckInResponseHandlers';
import CheckInCelebration from './CheckInCelebration';
import { toast } from 'sonner';

const DailyCheckIn = () => {
  const [currentTab, setCurrentTab] = useState('mood');
  const [showCelebration, setShowCelebration] = useState(false);
  const [stats, setStats] = useState<CheckinStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [_streakMessage, setStreakMessage] = useState<string | null>(null);

  const { user } = useAuth();
  const { addCleanDay } = useRecoveryMilestones();
  const {
    responses,
    setResponses,
    completedSections,
    markSectionComplete,
    canComplete,
    handleComplete,
    isSubmitting,
    _hasCheckedInToday,
    loading: checkinLoading
  } = useEnhancedDailyCheckIn();

  const { handleCrisisDetected, handleShowInterventions } = useCheckInHandlers();

  // Load user stats on component mount
  useEffect(() => {
    if (user) {
      loadStats();
      syncOfflineData();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    
    try {
      const userStats = await enhancedCheckinService.getCheckinStats(user.id);
      setStats(userStats);
      
      // Check for streak celebration
      const _message = enhancedCheckinService.getStreakCelebrationMessage(userStats.streak_count);
      if (_message) {
        setStreakMessage(_message);
      }
    } catch (_error) {
      console._error('Error loading stats:', _error);
    } finally {
      setLoading(false);
    }
  };

  const syncOfflineData = async () => {
    if (!user) return;
    
    try {
      await enhancedCheckinService.syncOfflineData(user.id);
    } catch (_error) {
      console._error('Error syncing offline data:', _error);
    }
  };

  // Real-time subscription to crisis events
  useRealtimeUpdates({
    onCrisisEvent: (_payload) => {
      toast.warning("Crisis pattern detected", {
        description: "Your support network has been notified",
        _action: {
          label: "View Tools",
          _onClick: () => window.location.href = '/crisis-support'
        }
      });
    }
  });

  const handleCompleteCheckIn = async () => {
    await handleComplete();
    
    // Show celebration and reload stats after successful completion
    if (!isSubmitting) {
      // Update clean days counter after successful check-in
      await addCleanDay();
      
      await loadStats();
      setShowCelebration(true);
      
      // Show streak _message if there's one
      if (_streakMessage) {
        toast.success(_streakMessage, { duration: 5000 });
      }
    }
  };

  const handleStartMindfulness = () => {
    setShowCelebration(false);
    toast.success('Opening mindfulness exercises...');
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false);
  };

  // Show loading state
  if (loading || checkinLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your check-in...</p>
        </CardContent>
      </Card>
    );
  }

  // Show "already checked in" state
  if (_hasCheckedInToday) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-green-600 flex items-center gap-2">
            <CheckCircle className="w-6 h-6" />
            Check-In Complete!
          </CardTitle>
          <p className="text-gray-600">You've already completed your check-in for today. Great job!</p>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800">
                Thank you for staying connected with your recovery journey today.
              </p>
            </div>
            <p className="text-gray-600">
              Come back tomorrow for your next check-in.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold serenity-navy">Daily Check-In</CardTitle>
          <p className="text-gray-600">How are you doing today? Take a moment to reflect.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics Section */}
          {!loading && stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-full">
                  <Flame className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Streak</p>
                  <p className="text-xl font-bold text-orange-600">{stats.streak_count} days</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Check-ins</p>
                  <p className="text-xl font-bold text-blue-600">{stats.total_checkins}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <BarChart className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">7-Day Rate</p>
                  <p className="text-xl font-bold text-green-600">{stats.completion_rate_7_days}%</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-full">
                  <Heart className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Mood</p>
                  <p className="text-xl font-bold text-purple-600">
                    {stats.average_mood ? stats.average_mood.toFixed(1) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 30-day completion rate badge */}
          {!loading && stats && (
            <div className="flex justify-center">
              <Badge 
                variant={stats.completion_rate_30_days >= 80 ? "default" : "secondary"}
                className="px-4 py-2"
              >
                30-Day Completion: {stats.completion_rate_30_days}%
                {stats.completion_rate_30_days >= 80 && " 🏆"}
              </Badge>
            </div>
          )}

          {/* Predictive Crisis Alert */}
          <CheckInPatternAnalysis
            onCrisisDetected={handleCrisisDetected}
            onShowInterventions={handleShowInterventions}
          />

          <CheckInResponseHandlers
            responses={responses}
            setResponses={setResponses}
            markSectionComplete={markSectionComplete}
          >
            {(handlers) => (
              <Tabs value={currentTab} onValueChange={setCurrentTab}>
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="mood" className="flex items-center space-x-2">
                    <Heart className="h-4 w-4" />
                    <span>Mood</span>
                  </TabsTrigger>
                  <TabsTrigger value="wellness" className="flex items-center space-x-2">
                    <Brain className="h-4 w-4" />
                    <span>Wellness</span>
                  </TabsTrigger>
                  <TabsTrigger value="assessments" className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4" />
                    <span>Assessments</span>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="mood">
                  <MoodSection
                    mood={responses.mood}
                    onMoodChange={handlers.handleMoodChange}
                  />
                </TabsContent>
                <TabsContent value="wellness">
                  <WellnessSection
                    energy={responses.energy}
                    hope={responses.hope}
                    sobrietyConfidence={responses.sobriety_confidence}
                    recoveryImportance={responses.recovery_importance}
                    recoveryStrength={responses.recovery_strength}
                    supportNeeded={responses.support_needed}
                    onEnergyChange={handlers.handleEnergyChange}
                    onHopeChange={handlers.handleHopeChange}
                    onSobrietyConfidenceChange={handlers.handleSobrietyConfidenceChange}
                    onRecoveryImportanceChange={handlers.handleRecoveryImportanceChange}
                    onRecoveryStrengthChange={handlers.handleRecoveryStrengthChange}
                    onSupportNeededChange={handlers.handleSupportNeededChange}
                  />
                </TabsContent>
                <TabsContent value="assessments">
                  <AssessmentsSection
                    phq2Q1={responses.phq2_q1}
                    phq2Q2={responses.phq2_q2}
                    gad2Q1={responses.gad2_q1}
                    gad2Q2={responses.gad2_q2}
                    onPhq2Q1Change={handlers.handlePhq2Q1Change}
                    onPhq2Q2Change={handlers.handlePhq2Q2Change}
                    onGad2Q1Change={handlers.handleGad2Q1Change}
                    onGad2Q2Change={handlers.handleGad2Q2Change}
                  />
                </TabsContent>
              </Tabs>
            )}
          </CheckInResponseHandlers>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-gray-600">
              <TrendingUp className="h-4 w-4" />
              <span>Progress:</span>
              <span>{completedSections.size}/3</span>
            </div>
            <Button
              _onClick={handleCompleteCheckIn}
              disabled={!canComplete() || isSubmitting}
              className="bg-green-500 text-white hover:bg-green-600"
            >
              {isSubmitting ? (
                <>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Check-In
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {showCelebration && (
        <CheckInCelebration 
          onStartMindfulness={handleStartMindfulness}
          onClose={handleCloseCelebration}
        />
      )}
    </>
  );
};

export default memo(DailyCheckIn);
