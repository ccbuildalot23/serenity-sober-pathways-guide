import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, CheckCircle, Calendar, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
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
    validateCompletion,
    handleComplete,
    isSubmitting,
    existingCheckin
  } = useDailyCheckIn();

  const progressPercentage = (completedSections.size / 3) * 100;

  const handleMoodChange = (value: number) => {
    setResponses(prev => ({ ...prev, mood: value }));
    markSectionComplete('mood');
  };

  const handleSubmit = async () => {
    if (!canComplete()) {
      validateCompletion();
      return;
    }

    const success = await handleComplete();
    if (success) {
      // Scroll to top to show completion message
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (existingCheckin) {
    return (
      <Layout activeTab="checkin" onTabChange={() => {}}>
        <div className="p-4 space-y-6 max-w-2xl mx-auto">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-green-800">Check-In Complete!</h1>
            <p className="text-green-700">
              You've already completed today's check-in. Come back tomorrow for your next one!
            </p>
          </div>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <div className="space-y-2">
                <p className="text-green-800 font-medium">Today's Check-In Summary</p>
                <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                  <div>
                    <span className="text-green-700">Mood:</span>
                    <span className="font-semibold ml-1">{responses.mood}/10</span>
                  </div>
                  <div>
                    <span className="text-green-700">Energy:</span>
                    <span className="font-semibold ml-1">{responses.energy}/10</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <Button
              onClick={() => window.location.href = '/'}
              className="bg-green-600 hover:bg-green-700"
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeTab="checkin" onTabChange={() => {}}>
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-[#1E3A8A]">Daily Check-In</h1>
          <p className="text-gray-600">Take a moment to reflect on your day</p>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-gray-500">{completedSections.size}/3 sections</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <div className="flex justify-between text-xs text-gray-500">
                <span className={completedSections.has('mood') ? 'text-green-600 font-medium' : ''}>
                  {completedSections.has('mood') ? '✓' : '○'} Mood
                </span>
                <span className={completedSections.has('wellness') ? 'text-green-600 font-medium' : ''}>
                  {completedSections.has('wellness') ? '✓' : '○'} Wellness
                </span>
                <span className={completedSections.has('assessments') ? 'text-green-600 font-medium' : ''}>
                  {completedSections.has('assessments') ? '✓' : '○'} Assessments
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check-in Sections */}
        <div className="space-y-6">
          {/* Mood Section */}
          <Card className={`${
            completedSections.has('mood') 
              ? 'border-green-200 bg-green-50' 
              : !canComplete() && completedSections.size > 0 
                ? 'border-yellow-200 bg-yellow-50' 
                : ''
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-500" />
                Mood Check
                {completedSections.has('mood') && <CheckCircle className="w-4 h-4 text-green-600" />}
                {!completedSections.has('mood') && !canComplete() && completedSections.size > 0 && (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MoodSection
                mood={responses.mood}
                onMoodChange={handleMoodChange}
              />
            </CardContent>
          </Card>

          {/* Wellness Section */}
          <Card className={`${
            completedSections.has('wellness') 
              ? 'border-green-200 bg-green-50' 
              : !canComplete() && completedSections.size > 0 
                ? 'border-yellow-200 bg-yellow-50' 
                : ''
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Wellness Check
                {completedSections.has('wellness') && <CheckCircle className="w-4 h-4 text-green-600" />}
                {!completedSections.has('wellness') && !canComplete() && completedSections.size > 0 && (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                onSupportNeededChange={(checked) => setResponses(prev => ({ ...prev, support_needed: checked }))}
                onSectionComplete={() => markSectionComplete('wellness')}
              />
            </CardContent>
          </Card>

          {/* Assessments Section */}
          <Card className={`${
            completedSections.has('assessments') 
              ? 'border-green-200 bg-green-50' 
              : !canComplete() && completedSections.size > 0 
                ? 'border-yellow-200 bg-yellow-50' 
                : ''
          }`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-500" />
                Mental Health Screening
                {completedSections.has('assessments') && <CheckCircle className="w-4 h-4 text-green-600" />}
                {!completedSections.has('assessments') && !canComplete() && completedSections.size > 0 && (
                  <AlertCircle className="w-4 h-4 text-yellow-600" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AssessmentsSection
                phq2Q1={responses.phq2_q1}
                phq2Q2={responses.phq2_q2}
                gad2Q1={responses.gad2_q1}
                gad2Q2={responses.gad2_q2}
                onPhq2Q1Change={(value) => setResponses(prev => ({ ...prev, phq2_q1: value }))}
                onPhq2Q2Change={(value) => setResponses(prev => ({ ...prev, phq2_q2: value }))}
                onGad2Q1Change={(value) => setResponses(prev => ({ ...prev, gad2_q1: value }))}
                onGad2Q2Change={(value) => setResponses(prev => ({ ...prev, gad2_q2: value }))}
                onSectionComplete={() => markSectionComplete('assessments')}
              />
            </CardContent>
          </Card>
        </div>

        {/* Completion Section */}
        <Card className={canComplete() ? 'border-green-200 bg-green-50' : 'border-gray-200'}>
          <CardContent className="p-6">
            {!canComplete() && (
              <div className="flex items-start space-x-3 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-yellow-800 font-medium">Complete all sections to finish</p>
                  <p className="text-yellow-700 text-sm">
                    Make sure to fill out all required fields in each section above.
                  </p>
                </div>
              </div>
            )}
            
            <Button
              onClick={handleSubmit}
              disabled={!canComplete() || isSubmitting}
              className={`w-full py-3 text-lg ${
                canComplete() 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
              size="lg"
              aria-label={canComplete() ? 'Complete daily check-in' : 'Complete all sections first'}
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Completing...</span>
                </div>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Complete Check-In
                </>
              )}
            </Button>
            
            {canComplete() && (
              <p className="text-center text-sm text-green-700 mt-2">
                Great job! You're ready to complete today's check-in.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Auto-save indicator */}
        <div className="text-center text-xs text-gray-500">
          Your responses are automatically saved as you go
        </div>
      </div>
    </Layout>
  );
};

export default CheckIn;
