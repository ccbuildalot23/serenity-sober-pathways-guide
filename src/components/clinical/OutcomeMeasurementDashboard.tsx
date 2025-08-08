import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, Target, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsService, UserAnalytics, OutcomeMeasure } from '@/services/analyticsService';
import { toast } from 'sonner';

const OutcomeMeasurementDashboard: React.FC = () => {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState<UserAnalytics[]>([]);
  const [outcomeMeasures, setOutcomeMeasures] = useState<OutcomeMeasure[]>([]);
  const [crisisRisk, setCrisisRisk] = useState<unknown>(null);
  const [_loading, setLoading] = useState(_true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(_true);
      
      // Generate current analytics
      await analyticsService.generateUserAnalytics(user!.id);
      
      // Load analytics data
      const _analyticsData = await analyticsService.getUserAnalytics(user!.id, 30);
      setAnalytics(_analyticsData);
      
      // Load outcome measures
      const _measuresData = await analyticsService.getOutcomeMeasures(user!.id);
      setOutcomeMeasures(_measuresData);
      
      // Get crisis risk prediction
      const _riskData = await analyticsService.getCrisisRiskPrediction(user!.id);
      setCrisisRisk(_riskData);
      
    } catch (error) {
      console.error('Error _loading dashboard data:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setLoading(_false);
    }
  };

  const latestAnalytics = analytics[0];
  const chartData = analytics.slice().reverse().map(a => ({
    date: new Date(a.analytics_date).toLocaleDateString(),
    mood: a.mood_trend_7day,
    progress: a.recovery_progress_score,
    risk: a.crisis_risk_score
  }));

  const getRiskBadgeColor = (_riskLevel: string) => {
    switch (_riskLevel) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'outline';
    }
  };

  if (_loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Track your recovery progress and insights</p>
        </div>
        <Button onClick={loadData} variant="outline">
          <Calendar className="w-4 h-4 mr-2" />
          Refresh Data
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recovery Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestAnalytics?.recovery_progress_score?.toFixed(1) || 'N/A'}%
            </div>
            <Progress 
              value={Math.max(0, latestAnalytics?.recovery_progress_score || 0)} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mood Trend (7d)</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestAnalytics?.mood_trend_7day?.toFixed(1) || 'N/A'}/10
            </div>
            <p className="text-xs text-muted-foreground">
              30d avg: {latestAnalytics?.mood_trend_30day?.toFixed(1) || 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Check-in Consistency</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestAnalytics?.checkin_consistency_score?.toFixed(0) || 'N/A'}%
            </div>
            <Progress 
              value={latestAnalytics?.checkin_consistency_score || 0} 
              className="mt-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crisis Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge variant={getRiskBadgeColor(crisisRisk?.risk_level)}>
                {crisisRisk?.risk_level || 'Unknown'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {crisisRisk?.recommendation}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Mood & Progress Trends</CardTitle>
            <CardDescription>Your mood and recovery progress over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="mood" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Mood (7d avg)"
                />
                <Line 
                  type="monotone" 
                  dataKey="progress" 
                  stroke="hsl(var(--secondary))" 
                  strokeWidth={2}
                  name="Recovery Progress"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Assessment</CardTitle>
            <CardDescription>Crisis risk factors and patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar 
                  dataKey="risk" 
                  fill="hsl(var(--destructive))" 
                  name="Crisis Risk Score"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights & Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Pattern Insights</CardTitle>
            <CardDescription>Discovered patterns in your data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {latestAnalytics?.pattern_insights?.best_day_of_week && (
              <div>
                <h4 className="font-medium">Best Day of Week</h4>
                <p className="text-sm text-muted-foreground">
                  {latestAnalytics.pattern_insights.best_day_of_week}
                </p>
              </div>
            )}
            
            <div>
              <h4 className="font-medium">Current Streak</h4>
              <p className="text-sm text-muted-foreground">
                {latestAnalytics?.engagement_metrics?.streak_days || 0} consecutive days
              </p>
            </div>

            <div>
              <h4 className="font-medium">Total Check-ins</h4>
              <p className="text-sm text-muted-foreground">
                {latestAnalytics?.engagement_metrics?.total_checkins || 0} check-ins completed
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Factors</CardTitle>
            <CardDescription>Areas that may need attention</CardDescription>
          </CardHeader>
          <CardContent>
            {crisisRisk?.factors?.length > 0 ? (
              <div className="space-y-2">
                {crisisRisk.factors.map((factor: string, index: number) => (
                  <div key={index} className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-sm">{factor}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No significant risk factors detected. Keep up the great work!
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outcome Measures */}
      {outcomeMeasures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Outcome Measures</CardTitle>
            <CardDescription>Clinical assessments and progress tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {outcomeMeasures.slice(0, 5).map((measure) => (
                <div key={measure.id} className="flex justify-between items-center p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{measure.measure_type}</h4>
                    <p className="text-sm text-muted-foreground">
                      {new Date(measure.measurement_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {measure.current_score}/{measure.target_score}
                    </div>
                    {measure.improvement_percentage && (
                      <div className={`text-sm ${measure.improvement_percentage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {measure.improvement_percentage > 0 ? '+' : ''}{measure.improvement_percentage.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OutcomeMeasurementDashboard;