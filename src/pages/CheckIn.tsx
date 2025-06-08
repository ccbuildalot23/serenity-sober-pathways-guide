
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
            responses={responses}
            setResponses={setResponses}
            onSectionComplete={() => markSectionComplete('mood')}
            isCompleted={completedSections.has('mood')}
          />

          <WellnessSection
            responses={responses}
            setResponses={setResponses}
            onSectionComplete={() => markSectionComplete('wellness')}
            isCompleted={completedSections.has('wellness')}
          />

          <AssessmentsSection
            responses={responses}
            setResponses={setResponses}
            onSectionComplete={() => markSectionComplete('assessments')}
            isCompleted={completedSections.has('assessments')}
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
