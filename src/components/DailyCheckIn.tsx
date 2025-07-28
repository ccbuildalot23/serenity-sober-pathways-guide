
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Heart, Brain, TrendingUp, CheckCircle, Flame, Target, BarChart } from 'lucide-react';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import { useCheckInHandlers } from '@/hooks/useCheckInHandlers';
import { useAuth } from '@/contexts/AuthContext';
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
  const [streakMessage, setStreakMessage] = useState<string | null>(null);

  const { user } = useAuth();
  const {
    responses,
    setResponses,
    completedSections,
    markSectionComplete,
    canComplete,
    handleComplete,
    isSubmitting
  } = useDailyCheckIn();

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
      const message = enhancedCheckinService.getStreakCelebrationMessage(userStats.streak_count);
      if (message) {
        setStreakMessage(message);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const syncOfflineData = async () => {
    if (!user) return;
    
    try {
      await enhancedCheckinService.syncOfflineData(user.id);
    } catch (error) {
      console.error('Error syncing offline data:', error);
    }
  };

  // Real-time subscription to crisis events
  useRealtimeUpdates({
    onCrisisEvent: (payload) => {
      toast.warning("Crisis pattern detected", {
        description: "Your support network has been notified",
        action: {
          label: "View Tools",
          onClick: () => window.location.href = '/crisis-toolkit'
        }
      });
    }
  });

  const handleCompleteCheckIn = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      const checkinData = {
        user_id: user.id,
        checkin_date: today,
        mood_rating: responses.mood,
        energy_rating: responses.energy,
        hope_rating: responses.hope,
        sleep_quality: responses.sleep_quality,
        medication_taken: responses.medication_taken || false,
        sobriety_confidence: responses.sobriety_confidence,
        recovery_importance: responses.recovery_importance,
        recovery_strength: responses.recovery_strength,
        support_needed: responses.support_needed ? 'yes' : 'no',
        triggers: responses.mood_triggers || [],
        coping_strategies: responses.coping_strategies || [],
        notes: responses.notes,
        is_complete: true
      };

      const assessments = [];
      
      // Add PHQ-2 assessment if completed
      if (responses.phq2_q1 !== null && responses.phq2_q2 !== null) {
        assessments.push({
          assessment_type: 'PHQ-2',
          scores: { total: (responses.phq2_q1 + responses.phq2_q2) },
          responses: { q1: responses.phq2_q1, q2: responses.phq2_q2 }
        });
      }

      // Add GAD-2 assessment if completed
      if (responses.gad2_q1 !== null && responses.gad2_q2 !== null) {
        assessments.push({
          assessment_type: 'GAD-2',
          scores: { total: (responses.gad2_q1 + responses.gad2_q2) },
          responses: { q1: responses.gad2_q1, q2: responses.gad2_q2 }
        });
      }

      const result = await enhancedCheckinService.saveCheckin(checkinData, assessments);
      
      if (result.success) {
        // Reload stats after successful save
        await loadStats();
        setShowCelebration(true);
        
        // Show streak message if there's one
        if (streakMessage) {
          toast.success(streakMessage, { duration: 5000 });
        }
      }
    } catch (error) {
      console.error('Error completing check-in:', error);
      toast.error('Failed to complete check-in. Please try again.');
    }
  };

  const handleStartMindfulness = () => {
    setShowCelebration(false);
    toast.success('Opening mindfulness exercises...');
  };

  const handleCloseCelebration = () => {
    setShowCelebration(false);
  };

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
              onClick={handleCompleteCheckIn}
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

export default DailyCheckIn;
