import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Calendar, Heart, Target, Activity, Sparkles } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { dashboardDataService } from '@/services/dashboardDataService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MoodTrend {
  checkin_date: string;
  mood_rating: number;
  energy_rating: number;
  hope_rating: number;
  trend_direction: string;
}

interface RecoveryStats {
  current_streak_days: number;
  longest_streak_days: number;
  total_recovery_days: number;
  completion_rate_30_days: number;
}

export const ProgressVisualization: React.FC = () => {
  const { user } = useAuth();
  const [moodTrends, setMoodTrends] = useState<MoodTrend[]>([]);
  const [recoveryStats, setRecoveryStats] = useState<RecoveryStats | null>(null);
  const [userStats, setUserStats] = useState<unknown>(null);
  const [timeRange, setTimeRange] = useState<'7' | '30' | '90'>('30');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadProgressData();
    }
  }, [user, timeRange]);

  const loadProgressData = async () => {
    if (!user) return;

    try {
      const [_userStatsResult, moodTrendsResult, recoveryStatsResult] = await Promise.all([
        dashboardDataService.getUserStats(user.id),
        supabase.rpc('get_daily_trends', { 
          user_uuid: user.id, 
          _days_back: parseInt(timeRange) 
        }),
        supabase.rpc('get_recovery_streak', { user_uuid: user.id })
      ]);

      setUserStats(_userStatsResult);
      
      if (moodTrendsResult.data) {
        setMoodTrends(moodTrendsResult.data);
      }
      
      if (recoveryStatsResult.data && typeof recoveryStatsResult.data === 'object' && !Array.isArray(recoveryStatsResult.data)) {
        setRecoveryStats(recoveryStatsResult.data as unknown as RecoveryStats);
      }
    } catch (_error) {
      console._error('Error loading progress data:', _error);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = moodTrends.map(trend => ({
    date: new Date(trend.checkin_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mood: trend.mood_rating,
    energy: trend.energy_rating,
    hope: trend.hope_rating
  }));

  const averages = {
    mood: moodTrends.length > 0 ? moodTrends.reduce((sum, t) => sum + t.mood_rating, 0) / moodTrends.length : 0,
    energy: moodTrends.length > 0 ? moodTrends.reduce((sum, t) => sum + t.energy_rating, 0) / moodTrends.length : 0,
    hope: moodTrends.length > 0 ? moodTrends.reduce((sum, t) => sum + t.hope_rating, 0) / moodTrends.length : 0
  };

  const getMotivationalMessage = () => {
    if (!recoveryStats) return "Your recovery journey is unique and valuable.";
    
    const { current_streak_days, completion_rate_30_days } = recoveryStats;
    
    if (current_streak_days >= 30) {
      return "🌟 You're absolutely crushing it! A month-long streak is incredible!";
    } else if (current_streak_days >= 7) {
      return "🔥 Amazing work! You're building fantastic momentum!";
    } else if (completion_rate_30_days >= 80) {
      return "💪 Great consistency! You're developing strong habits!";
    } else if (completion_rate_30_days >= 50) {
      return "🌱 Every step counts! You're making real progress!";
    } else {
      return "✨ Remember, healing isn't linear. Every day is a new opportunity!";
    }
  };

  const getProgressColor = (value: number, max: number = 10) => {
    const percentage = (value / max) * 100;
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-orange-600";
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please sign in to view your progress</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Motivational Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-xl font-semibold text-primary">Your Recovery Journey</h2>
              <p className="text-muted-foreground">{getMotivationalMessage()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Range Selector */}
      <div className="flex justify-center gap-2">
        <Button
          variant={timeRange === '7' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('7')}
        >
          7 Days
        </Button>
        <Button
          variant={timeRange === '30' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('30')}
        >
          30 Days
        </Button>
        <Button
          variant={timeRange === '90' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTimeRange('90')}
        >
          90 Days
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Streak</p>
                <p className="text-2xl font-bold">{recoveryStats?.current_streak_days || 0}</p>
                <p className="text-xs text-muted-foreground">
                  Best: {recoveryStats?.longest_streak_days || 0} days
                </p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Check-ins</p>
                <p className="text-2xl font-bold">{userStats?.checkIns || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {recoveryStats?.completion_rate_30_days || 0}% this month
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Mood</p>
                <p className={`text-2xl font-bold ${getProgressColor(averages.mood)}`}>
                  {averages.mood.toFixed(1)}/10
                </p>
                <p className="text-xs text-muted-foreground">Last {timeRange} days</p>
              </div>
              <Heart className="h-8 w-8 text-pink-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recovery Days</p>
                <p className="text-2xl font-bold">{recoveryStats?.total_recovery_days || 0}</p>
                <p className="text-xs text-muted-foreground">Total journey</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mood Trends Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Mood Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis domain={[0, 10]} className="text-xs" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="mood" 
                    stackId="1"
                    stroke="hsl(var(--primary))" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.6}
                    name="Mood"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="energy" 
                    stackId="2"
                    stroke="hsl(var(--secondary))" 
                    fill="hsl(var(--secondary))" 
                    fillOpacity={0.6}
                    name="Energy"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="hope" 
                    stackId="3"
                    stroke="hsl(var(--accent))" 
                    fill="hsl(var(--accent))" 
                    fillOpacity={0.6}
                    name="Hope"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Bars */}
      <Card>
        <CardHeader>
          <CardTitle>Current Averages</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Mood</span>
                <span className={getProgressColor(averages.mood)}>{averages.mood.toFixed(1)}/10</span>
              </div>
              <Progress value={(averages.mood / 10) * 100} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Energy</span>
                <span className={getProgressColor(averages.energy)}>{averages.energy.toFixed(1)}/10</span>
              </div>
              <Progress value={(averages.energy / 10) * 100} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Hope</span>
                <span className={getProgressColor(averages.hope)}>{averages.hope.toFixed(1)}/10</span>
              </div>
              <Progress value={(averages.hope / 10) * 100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};