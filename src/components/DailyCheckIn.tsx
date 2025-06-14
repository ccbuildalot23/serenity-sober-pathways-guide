
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Heart, Brain, TrendingUp, CheckCircle } from 'lucide-react';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import { useCheckInHandlers } from '@/hooks/useCheckInHandlers';
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
    const success = await handleComplete();
    if (success) {
      setShowCelebration(true);
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
