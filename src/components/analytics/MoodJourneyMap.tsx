import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { intelligentAnalyticsService } from '@/services/intelligentAnalyticsService';
import { analyticsService } from '@/services/analyticsService';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Brain, 
  Target, 
  Calendar,
  AlertTriangle,
  Lightbulb,
  Activity,
  MapPin,
  Zap
} from 'lucide-react';

interface MoodPoint {
  date: string;
  mood: number;
  energy?: number;
  triggers: string[];
  coping: string[];
  isAnomaly?: boolean;
  note?: string;
}

export const MoodJourneyMap: React.FC = () => {
  const { user } = useAuth();

  const { data: patterns } = useQuery({
    queryKey: ['mood-patterns', user?.id],
    queryFn: () => intelligentAnalyticsService.detectMoodPatterns(user!.id),
    enabled: !!user?.id
  });

  const { data: forecast } = useQuery({
    queryKey: ['mood-forecast', user?.id],
    queryFn: () => intelligentAnalyticsService.generate7DayMoodForecast(user!.id),
    enabled: !!user?.id
  });

  const { data: recommendations } = useQuery({
    queryKey: ['personalized-recommendations', user?.id],
    queryFn: () => intelligentAnalyticsService.generatePersonalizedRecommendations(user!.id),
    enabled: !!user?.id
  });

  const { data: riskAlerts } = useQuery({
    queryKey: ['risk-alerts', user?.id],
    queryFn: () => intelligentAnalyticsService.generateRiskAlerts(user!.id),
    enabled: !!user?.id
  });

  const moodPoints = useMemo(() => {
    if (!patterns?.patterns) return [];
    
    // Generate visual mood journey points
    const journey: MoodPoint[] = [];
    
    // Add historical points with pattern analysis
    if (patterns.patterns.sequentialPatterns) {
      patterns.patterns.sequentialPatterns.forEach((pattern, index) => {
        journey.push({
          date: `Day ${index + 1}`,
          mood: pattern.avgOutcome || 5,
          triggers: pattern.commonTriggers || [],
          coping: pattern.effectiveCoping || [],
          isAnomaly: false
        });
      });
    }
    
    return journey;
  }, [patterns]);

  const getJourneyVisualization = () => {
    const maxPoints = 30;
    const points = moodPoints.slice(0, maxPoints);
    const width = 800;
    const height = 200;
    const padding = 40;
    
    return points.map((point, index) => {
      const x = padding + (index / (maxPoints - 1)) * (width - 2 * padding);
      const y = height - padding - ((point.mood - 1) / 9) * (height - 2 * padding);
      
      return (
        <g key={index}>
          <circle
            cx={x}
            cy={y}
            r={point.isAnomaly ? 8 : 5}
            fill={point.mood >= 7 ? 'hsl(var(--success))' : 
                  point.mood >= 4 ? 'hsl(var(--warning))' : 
                  'hsl(var(--destructive))'}
            stroke={point.isAnomaly ? 'hsl(var(--destructive))' : 'transparent'}
            strokeWidth={2}
            className="cursor-pointer hover:scale-110 transition-transform"
          />
          {index < points.length - 1 && (
            <line
              x1={x}
              y1={y}
              x2={padding + ((index + 1) / (maxPoints - 1)) * (width - 2 * padding)}
              y2={height - padding - ((points[index + 1].mood - 1) / 9) * (height - 2 * padding)}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              opacity={0.5}
            />
          )}
        </g>
      );
    });
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  if (!patterns || !patterns.patterns) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-48">
              <div className="text-center">
                <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Loading your mood journey analysis...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk Alerts */}
      {riskAlerts && riskAlerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">Risk Alerts</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {riskAlerts.map((alert, index) => (
              <div key={index} className="p-3 bg-background rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant={getRiskBadgeVariant(alert.riskLevel)}>
                    {alert.riskLevel.toUpperCase()} RISK
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {alert.timeWindow}
                  </span>
                </div>
                <p className="text-sm mb-2">
                  Probability: {Math.round(alert.probability)}%
                </p>
                {alert.triggers.length > 0 && (
                  <div className="text-sm">
                    <strong>Factors:</strong> {alert.triggers.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Interactive Mood Journey */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              <CardTitle>Your Mood Journey</CardTitle>
            </div>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Export Timeline
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <svg width="100%" height="200" viewBox="0 0 800 200" className="border rounded-lg bg-background/50">
              {/* Grid lines */}
              {[1, 3, 5, 7, 9].map(mood => (
                <line
                  key={mood}
                  x1={40}
                  y1={200 - 40 - ((mood - 1) / 8) * 120}
                  x2={760}
                  y2={200 - 40 - ((mood - 1) / 8) * 120}
                  stroke="hsl(var(--border))"
                  strokeWidth={0.5}
                  opacity={0.5}
                />
              ))}
              
              {/* Y-axis labels */}
              {[1, 5, 9].map(mood => (
                <text
                  key={mood}
                  x={30}
                  y={200 - 40 - ((mood - 1) / 8) * 120 + 5}
                  fontSize="12"
                  fill="hsl(var(--muted-foreground))"
                  textAnchor="end"
                >
                  {mood}
                </text>
              ))}
              
              {/* Journey visualization */}
              {getJourneyVisualization()}
            </svg>
          </div>

          {/* Pattern Insights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-background/80 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4" />
                <span className="text-sm font-medium">Pattern Confidence</span>
              </div>
              <div className="text-2xl font-bold">
                {Math.round((patterns.confidence || 0) * 100)}%
              </div>
              <p className="text-sm text-muted-foreground">
                Algorithm confidence in pattern detection
              </p>
            </div>

            <div className="p-4 bg-background/80 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">Anomalies Detected</span>
              </div>
              <div className="text-2xl font-bold">
                {patterns.patterns.anomalies?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                Unusual patterns requiring attention
              </p>
            </div>

            <div className="p-4 bg-background/80 rounded-lg border">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4" />
                <span className="text-sm font-medium">Patterns Found</span>
              </div>
              <div className="text-2xl font-bold">
                {patterns.patterns.sequentialPatterns?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground">
                Predictable mood sequences
              </p>
            </div>
          </div>

          {/* Key Insights */}
          {patterns.insights && patterns.insights.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Key Insights</h4>
              {patterns.insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-background/50 rounded-lg">
                  <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-500" />
                  <span className="text-sm">{insight}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 7-Day Forecast */}
      {forecast && forecast.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              7-Day Mood Forecast
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {forecast.map((day, index) => (
                <div key={day.date} className="p-3 bg-background/50 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      {index === 0 ? 'Tomorrow' : 
                       index === 1 ? 'Day After' : 
                       `Day ${index + 1}`}
                    </span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(day.predictedMood >= 6 ? 'improving' : 
                                   day.predictedMood <= 4 ? 'declining' : 'stable')}
                    </div>
                  </div>
                  <div className="text-2xl font-bold mb-1">
                    {day.predictedMood.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {Math.round(day.confidence * 100)}% confidence
                  </div>
                  {day.factors.length > 0 && (
                    <div className="text-xs">
                      <div className="font-medium mb-1">Factors:</div>
                      {day.factors.slice(0, 2).map((factor, i) => (
                        <div key={i} className="text-muted-foreground">
                          • {factor}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personalized Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              AI-Powered Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
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
                      <div className="text-sm text-muted-foreground">
                        {Math.round(rec.confidence * 100)}% confidence
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3">
                      {rec.description}
                    </p>
                    
                    {rec.reasoning.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium mb-1">Reasoning:</h5>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {rec.reasoning.map((reason, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
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
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};