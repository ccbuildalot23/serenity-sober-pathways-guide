
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, ArrowLeft, Heart, Battery, Trophy, Brain, AlertCircle } from 'lucide-react';
import { CheckinResponses } from '@/types/dailyCheckIn';

interface CheckInCompletedProps {
  responses: CheckinResponses;
  onNavigateToHome: () => void;
  onNavigateToProgress: () => void;
}

export const CheckInCompleted: React.FC<CheckInCompletedProps> = ({
  responses,
  onNavigateToHome,
  onNavigateToProgress
}) => {
  const getScoreSummary = (score: number, max: number = 10) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return { label: 'Excellent', color: 'text-green-600' };
    if (percentage >= 60) return { label: 'Good', color: 'text-blue-600' };
    if (percentage >= 40) return { label: 'Fair', color: 'text-yellow-600' };
    return { label: 'Needs Attention', color: 'text-red-600' };
  };

  return (
    <Layout activeTab="checkin" onTabChange={() => {}}>
      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        <Button
          onClick={onNavigateToHome}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-green-800">Check-In Complete!</h1>
          <p className="text-green-700">
            You've already completed today's check-in. Keep up the great work!
          </p>
        </div>

        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">Today's Check-In Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Mood</span>
                  <Heart className="w-4 h-4 text-pink-500" />
                </div>
                <div className="mt-1">
                  <span className="text-2xl font-bold">{responses.mood || 0}</span>
                  <span className="text-gray-500">/10</span>
                </div>
                <p className={`text-xs mt-1 ${getScoreSummary(responses.mood || 0).color}`}>
                  {getScoreSummary(responses.mood || 0).label}
                </p>
              </div>
              
              <div className="bg-white p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Energy</span>
                  <Battery className="w-4 h-4 text-blue-500" />
                </div>
                <div className="mt-1">
                  <span className="text-2xl font-bold">{responses.energy || 0}</span>
                  <span className="text-gray-500">/10</span>
                </div>
                <p className={`text-xs mt-1 ${getScoreSummary(responses.energy || 0).color}`}>
                  {getScoreSummary(responses.energy || 0).label}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Hope Level</span>
                  <Trophy className="w-4 h-4 text-yellow-500" />
                </div>
                <div className="mt-1">
                  <span className="text-2xl font-bold">{responses.hope || 0}</span>
                  <span className="text-gray-500">/10</span>
                </div>
              </div>
              
              <div className="bg-white p-3 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Sobriety Confidence</span>
                  <Brain className="w-4 h-4 text-purple-500" />
                </div>
                <div className="mt-1">
                  <span className="text-2xl font-bold">{responses.sobriety_confidence || 0}</span>
                  <span className="text-gray-500">/10</span>
                </div>
              </div>
            </div>

            {responses.support_needed && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  You indicated you need additional support today. Consider reaching out to your support network.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="text-center space-x-4">
          <Button
            onClick={onNavigateToHome}
            className="bg-green-600 hover:bg-green-700"
          >
            Return to Dashboard
          </Button>
          <Button
            onClick={onNavigateToProgress}
            variant="outline"
          >
            View Progress
          </Button>
        </div>
      </div>
    </Layout>
  );
};
