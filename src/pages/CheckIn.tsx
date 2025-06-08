
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, CheckCircle, Calendar, TrendingUp } from 'lucide-react';
import { useDailyCheckIn } from '@/hooks/useDailyCheckIn';
import { MoodSection } from '@/components/daily-checkin/MoodSection';
import { WellnessSection } from '@/components/daily-checkin/WellnessSection';
import { AssessmentsSection } from '@/components/daily-checkin/AssessmentsSection';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

const CheckIn = () => {
  const {
    responses,
    setResponses,
    completedSections,
    markSectionComplete,
    canComplete,
    handleComplete,
    isSubmitting,
    existingCheckin
  } = useDailyCheckIn();

  const progressPercentage = (completedSections.size / 3) * 100;

  return (
    <Layout activeTab="checkin" onTabChange={() => {}}>
      <div className="p-4 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[#1E3A8A]">Daily Check-In</h1>
          <p className="text-gray-600">Take a moment to reflect on your day</p>
          {existingCheckin && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-center space-x-2 text-green-700">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Check-in completed for today</span>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{completedSections.size}/3 sections</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Check-in Sections */}
        <div className="space-y-6">
          <MoodSection
            mood={responses.mood}
            onMoodChange={(value) => {
              setResponses(prev => ({ ...prev, mood: value }));
              markSectionComplete('mood');
            }}
          />

          <WellnessSection
            energy={responses.energy}
            hope={responses.hope}
            sobrietyConfidence={responses.sobriety_confidence}
            recoveryImportance={responses.recovery_importance}
            recoveryStrength={responses.recovery_strength}
            supportNeeded={responses.support_needed}
            onEnergyChange={(value) => setResponses(prev => ({ ...prev, energy: value }))}
            onHopeChange={(value) => setResponses(prev => ({ ...prev, hope: value }))}
            onSobrietyConfidenceChange={(value) => setResponses(prev => ({ ...prev, sobriety_confidence: value }))}
            onRecoveryImportanceChange={(value) => setResponses(prev => ({ ...prev, recovery_importance: value }))}
            onRecoveryStrengthChange={(value) => setResponses(prev => ({ ...prev, recovery_strength: value }))}
            onSupportNeededChange={(checked) => {
              setResponses(prev => ({ ...prev, support_needed: checked }));
              markSectionComplete('wellness');
            }}
          />

          <AssessmentsSection
            phq2Q1={responses.phq2_q1}
            phq2Q2={responses.phq2_q2}
            gad2Q1={responses.gad2_q1}
            gad2Q2={responses.gad2_q2}
            onPhq2Q1Change={(value) => setResponses(prev => ({ ...prev, phq2_q1: value }))}
            onPhq2Q2Change={(value) => setResponses(prev => ({ ...prev, phq2_q2: value }))}
            onGad2Q1Change={(value) => setResponses(prev => ({ ...prev, gad2_q1: value }))}
            onGad2Q2Change={(value) => {
              setResponses(prev => ({ ...prev, gad2_q2: value }));
              markSectionComplete('assessments');
            }}
          />
        </div>

        {/* Complete Button */}
        {canComplete() && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4 text-center">
              <Button
                onClick={handleComplete}
                disabled={isSubmitting}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {isSubmitting ? 'Completing...' : 'Complete Check-In'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default CheckIn;
