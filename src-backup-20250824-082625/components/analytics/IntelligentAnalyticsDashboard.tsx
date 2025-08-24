import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { intelligentAnalyticsService } from '@/services/intelligentAnalyticsService';
import { MoodJourneyMap } from './MoodJourneyMap';
import { TriggerImpactAnalysis } from './TriggerImpactAnalysis';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Calendar,
  AlertTriangle,
  Download,
  RefreshCw,
  Settings,
  BarChart3,
  Activity,
  Zap,
  MapPin
} from 'lucide-react';

export const IntelligentAnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: patterns, refetch: refetchPatterns } = useQuery({
    queryKey: ['intelligent-patterns', user?.id],
    queryFn: () => intelligentAnalyticsService.detectMoodPatterns(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const { data: forecast } = useQuery({
    queryKey: ['mood-forecast', user?.id],
    queryFn: () => intelligentAnalyticsService.generate7DayMoodForecast(user!.id),
    enabled: !!user?.id
  });

  const { data: recommendations } = useQuery({
    queryKey: ['ai-recommendations', user?.id],
    queryFn: () => intelligentAnalyticsService.generatePersonalizedRecommendations(user!.id),
    enabled: !!user?.id
  });

  const { data: riskAlerts } = useQuery({
    queryKey: ['risk-alerts', user?.id],
    queryFn: () => intelligentAnalyticsService.generateRiskAlerts(user!.id),
    enabled: !!user?.id
  });

  const { data: optimalTiming } = useQuery({
    queryKey: ['optimal-timing', user?.id],
    queryFn: () => intelligentAnalyticsService.suggestOptimalTiming(user!.id),
    enabled: !!user?.id
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      refetchPatterns()
    ]);
    setIsRefreshing(false);
  };

  const exportAnalytics = () => {
    const data = {
      patterns,
      forecast,
      recommendations,
      riskAlerts,
      optimalTiming,
      generatedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getPatternStrength = () => {
    if (!patterns?.confidence) return 'Low';
    const confidence = patterns.confidence;
    if (confidence > 0.8) return 'Very High';
    if (confidence > 0.6) return 'High';
    if (confidence > 0.4) return 'Moderate';
    if (confidence > 0.2) return 'Low';
    return 'Very Low';
  };

  const getHighRiskAlerts = () => {
    return riskAlerts?.filter(alert => alert.riskLevel === 'high' || alert.riskLevel === 'critical') || [];
  };

  const getTopRecommendations = () => {
    return recommendations?.slice(0, 3) || [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Intelligent Analytics</h1>
          <p className="text-muted-foreground">
            AI-powered insights into your mental health patterns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportAnalytics}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Pattern Detection</span>
            </div>
            <div className="text-2xl font-bold">{getPatternStrength()}</div>
            <p className="text-xs text-muted-foreground">
              Algorithm confidence: {Math.round((patterns?.confidence || 0) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium">Risk Alerts</span>
            </div>
            <div className="text-2xl font-bold">{getHighRiskAlerts().length}</div>
            <p className="text-xs text-muted-foreground">
              High/Critical risk detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-success" />
              <span className="text-sm font-medium">AI Recommendations</span>
            </div>
            <div className="text-2xl font-bold">{recommendations?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Personalized suggestions available
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Forecast Accuracy</span>
            </div>
            <div className="text-2xl font-bold">
              {forecast ? Math.round(forecast.reduce((acc, f) => acc + f.confidence, 0) / forecast.length * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              7-day prediction confidence
            </p>
          </CardContent>
        </Card>
      </div>

      {/* High Priority Alerts */}
      {getHighRiskAlerts().length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              High Priority Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {getHighRiskAlerts().map((alert, index) => (
              <div key={index} className="p-3 bg-background rounded-lg border border-destructive/20">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="destructive">
                    {alert.riskLevel.toUpperCase()}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {alert.timeWindow}
                  </span>
                </div>
                <div className="text-sm mb-2">
                  Risk Probability: <strong>{Math.round(alert.probability)}%</strong>
                </div>
                <div className="space-y-1">
                  {alert.recommendations.map((rec, i) => (
                    <div key={i} className="text-sm text-muted-foreground">
                      • {rec}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Top Recommendations Preview */}
      {getTopRecommendations().length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Top AI Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {getTopRecommendations().map((rec) => (
              <div key={rec.id} className="p-3 bg-background/50 rounded-lg border">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium">{rec.title}</h4>
                  <Badge variant="outline">
                    {Math.round(rec.confidence * 100)}% confident
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {rec.description}
                </p>
                <div className="text-xs text-primary">
                  Priority: {rec.priority}/10 • Type: {rec.type.replace('_', ' ')}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Optimal Timing Suggestions */}
      {optimalTiming && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Optimal Timing Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 bg-background/50 rounded-lg border">
                <div className="text-sm font-medium mb-1">Check-in Time</div>
                <div className="text-lg font-bold">{optimalTiming.checkInTime}</div>
                <div className="text-xs text-muted-foreground">
                  Best time for daily check-ins
                </div>
              </div>
              
              {optimalTiming.medicationTime && (
                <div className="p-3 bg-background/50 rounded-lg border">
                  <div className="text-sm font-medium mb-1">Medication</div>
                  <div className="text-lg font-bold">{optimalTiming.medicationTime}</div>
                  <div className="text-xs text-muted-foreground">
                    Suggested medication time
                  </div>
                </div>
              )}
              
              <div className="p-3 bg-background/50 rounded-lg border">
                <div className="text-sm font-medium mb-1">Therapy</div>
                <div className="text-lg font-bold capitalize">{optimalTiming.therapyPreference}</div>
                <div className="text-xs text-muted-foreground">
                  Optimal therapy timing
                </div>
              </div>
              
              <div className="p-3 bg-background/50 rounded-lg border">
                <div className="text-sm font-medium mb-1">Support Contact</div>
                <div className="text-lg font-bold">{optimalTiming.supportContactTime}</div>
                <div className="text-xs text-muted-foreground">
                  Best time to reach out
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Analytics Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="journey" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Mood Journey
          </TabsTrigger>
          <TabsTrigger value="triggers" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Trigger Analysis
          </TabsTrigger>
          <TabsTrigger value="predictions" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Predictions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pattern Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Pattern Detection Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {patterns?.insights && patterns.insights.length > 0 ? (
                  <div className="space-y-3">
                    {patterns.insights.slice(0, 5).map((insight, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-background/50 rounded">
                        <Brain className="h-4 w-4 mt-1 text-primary" />
                        <span className="text-sm">{insight}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No significant patterns detected yet. Continue tracking to improve analysis.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* 7-Day Forecast Summary */}
            <Card>
              <CardHeader>
                <CardTitle>7-Day Mood Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                {forecast && forecast.length > 0 ? (
                  <div className="space-y-2">
                    {forecast.slice(0, 4).map((day, index) => (
                      <div key={day.date} className="flex items-center justify-between p-2 bg-background/50 rounded">
                        <span className="text-sm">
                          {index === 0 ? 'Tomorrow' : `Day ${index + 1}`}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{day.predictedMood.toFixed(1)}</span>
                          <Badge variant="outline" className="text-xs">
                            {Math.round(day.confidence * 100)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Insufficient data for mood forecasting. Complete more check-ins.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="journey">
          <MoodJourneyMap />
        </TabsContent>

        <TabsContent value="triggers">
          <TriggerImpactAnalysis />
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          {/* Detailed Forecast */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed 7-Day Forecast</CardTitle>
            </CardHeader>
            <CardContent>
              {forecast && forecast.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {forecast.map((day, index) => (
                    <div key={day.date} className="p-4 bg-background/50 rounded-lg border">
                      <div className="text-sm font-medium mb-2">
                        {index === 0 ? 'Tomorrow' : 
                         index === 1 ? 'Day After' : 
                         `Day ${index + 1}`}
                      </div>
                      <div className="text-2xl font-bold mb-1">
                        {day.predictedMood.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground mb-3">
                        {Math.round(day.confidence * 100)}% confidence
                      </div>
                      {day.factors.length > 0 && (
                        <div>
                          <div className="text-xs font-medium mb-1">Factors:</div>
                          {day.factors.slice(0, 2).map((factor, i) => (
                            <div key={i} className="text-xs text-muted-foreground">
                              • {factor}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No forecast data available. Complete more check-ins to enable predictions.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>All AI Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {recommendations && recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.map((rec) => (
                    <div key={rec.id} className="p-4 bg-background/50 rounded-lg border">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{rec.title}</h4>
                          <Badge variant="outline" className="mt-1">
                            {rec.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          <div>{Math.round(rec.confidence * 100)}% confidence</div>
                          <div>Priority: {rec.priority}/10</div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {rec.description}
                      </p>
                      
                      {rec.actionItems.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium mb-1">Action Items:</h5>
                          <ul className="text-sm space-y-1">
                            {rec.actionItems.map((action, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <Target className="h-3 w-3 mt-1 text-primary" />
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No recommendations available yet. The AI needs more data to generate insights.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};