import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress as ProgressBar } from '@/components/ui/progress';
import {
  TrendingUp,
  Calendar,
  Heart,
  Trophy,
  Target,
  Activity
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Progress = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('week');

  // Mock data for demonstration
  const mockStats = {
    currentStreak: 23,
    longestStreak: 28,
    totalCheckIns: 67,
    averageMood: 7.2,
    completionRate: 85,
  };

  const mockMilestones = [
    { id: 1, title: '7 Day Streak', achieved: true, icon: '🔥' },
    { id: 2, title: '30 Check-ins', achieved: true, icon: '📝' },
    { id: 3, title: '30 Day Streak', progress: 23, total: 30, icon: '🏆' },
    { id: 4, title: '100 Check-ins', progress: 67, total: 100, icon: '💯' }
  ];

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="p-4 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Your Recovery Progress
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your journey and celebrate milestones
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex justify-center gap-2">
          <Button
            variant={timeRange === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('week')}
          >
            Week
          </Button>
          <Button
            variant={timeRange === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('month')}
          >
            Month
          </Button>
          <Button
            variant={timeRange === 'year' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange('year')}
          >
            Year
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current Streak</p>
                  <p className="text-2xl font-bold">{mockStats.currentStreak} days</p>
                  <p className="text-xs text-gray-500">Best: {mockStats.longestStreak} days</p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Check-ins</p>
                  <p className="text-2xl font-bold">{mockStats.totalCheckIns}</p>
                  <p className="text-xs text-gray-500">{mockStats.completionRate}% completion</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Average Mood</p>
                  <p className="text-2xl font-bold">{mockStats.averageMood}/10</p>
                  <p className="text-xs text-green-600">↑ Improving</p>
                </div>
                <Heart className="h-8 w-8 text-pink-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This {timeRange}</p>
                  <p className="text-2xl font-bold">Great!</p>
                  <p className="text-xs text-gray-500">Keep it up</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Milestones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Recovery Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockMilestones.map((milestone) => (
                <div key={milestone.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{milestone.icon}</div>
                    <div>
                      <h4 className="font-medium">{milestone.title}</h4>
                      {!milestone.achieved && milestone.progress && (
                        <div className="mt-1 space-y-1">
                          <ProgressBar value={(milestone.progress / milestone.total) * 100} className="h-2 w-32" />
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {milestone.progress} / {milestone.total}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  {milestone.achieved && (
                    <div className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded text-sm">
                      Achieved
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>Great progress!</strong> Your mood has been improving over the past {timeRange}.
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Keep it up!</strong> You're {7} days away from your longest streak.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back to Dashboard Button */}
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default Progress;
