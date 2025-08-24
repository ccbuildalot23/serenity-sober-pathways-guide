import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckinHistoryData, FilterOptions } from './CheckInHistory';
import { Lightbulb, TrendingUp, Target, AlertCircle, CheckCircle, Brain } from 'lucide-react';

interface InsightsPanelProps {
  data: CheckinHistoryData[];
  insights: unknown;
  filters: FilterOptions;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({ data, insights, filters }) => {
  if (!insights) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Analyzing your data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getInsightIcon = (_type: string) => {
    switch (_type) {
      case 'trend':
        return TrendingUp;
      case 'pattern':
        return Target;
      case 'recommendation':
        return Lightbulb;
      case 'concern':
        return AlertCircle;
      case 'achievement':
        return CheckCircle;
      default:
        return Brain;
    }
  };

  const getInsightColor = (_type: string) => {
    switch (_type) {
      case 'trend':
        return 'text-blue-500';
      case 'pattern':
        return 'text-purple-500';
      case 'recommendation':
        return 'text-green-500';
      case 'concern':
        return 'text-red-500';
      case 'achievement':
        return 'text-green-600';
      default:
        return 'text-muted-foreground';
    }
  };

  const getBadgeVariant = (_type: string) => {
    switch (_type) {
      case 'concern':
        return 'destructive';
      case 'achievement':
      case 'recommendation':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Key Insights Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                {insights.trends?.mood?.direction === 'improving' ? '↗️' :
                 insights.trends?.mood?.direction === 'declining' ? '↘️' : '→'}
              </p>
              <p className="text-sm text-muted-foreground">Mood Trend</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                {insights.patterns?.bestDay || 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground">Best Day</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                {insights.triggers?.mostCommon?.name || 'None'}
              </p>
              <p className="text-sm text-muted-foreground">Top Trigger</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">
                {insights.coping?.mostEffective?.name || 'None'}
              </p>
              <p className="text-sm text-muted-foreground">Best Strategy</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mood Patterns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Mood Patterns
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {insights.patterns?.weeklyPattern && (
              <div>
                <h4 className="font-medium mb-2">Weekly Pattern</h4>
                <div className="grid grid-cols-7 gap-1 text-xs">
                  {Object.entries(insights.patterns.weeklyPattern).map(([day, mood]: [string, any]) => (
                    <div key={day} className="text-center p-2 rounded bg-muted">
                      <p className="font-medium">{day.slice(0, 3)}</p>
                      <p className="text-primary">{mood?.toFixed(1) || '-'}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {insights.patterns?.timePattern && (
              <div>
                <h4 className="font-medium mb-2">Best Time Periods</h4>
                <div className="space-y-2">
                  {Object.entries(insights.patterns.timePattern)
                    .sort(([,a]: [string, any], [,b]: [string, any]) => b.avgMood - a.avgMood)
                    .slice(0, 3)
                    .map(([period, data]: [string, any]) => (
                      <div key={period} className="flex justify-between items-center">
                        <span className="text-sm">{period}</span>
                        <Badge variant="secondary">{data.avgMood?.toFixed(1)}</Badge>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Personalized Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.recommendations?.map((rec: unknown, index: number) => {
                const Icon = getInsightIcon(rec._type);
                return (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50">
                    <Icon className={`h-5 w-5 mt-0.5 ${getInsightColor(rec._type)}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getBadgeVariant(rec._type)} className="text-xs">
                          {rec._type}
                        </Badge>
                        {rec.priority && (
                          <Badge variant="outline" className="text-xs">
                            {rec.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-foreground">{rec.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{rec.description}</p>
                      {rec.actionable && (
                        <p className="text-xs text-primary mt-2 font-medium">
                          💡 {rec.action}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {(!insights.recommendations || insights.recommendations.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No specific recommendations at this time.</p>
                  <p className="text-xs mt-2">Keep logging your daily check-ins for personalized insights!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trigger and Coping Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Trigger Impact Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.triggers?.analysis?.length > 0 ? (
              <div className="space-y-3">
                {insights.triggers.analysis.slice(0, 5).map((trigger: unknown, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{trigger.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {trigger.frequency} occurrences
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Impact: <span className={
                          trigger.impact > 3 ? 'text-red-500' : 
                          trigger.impact > 2 ? 'text-yellow-500' : 'text-green-500'
                        }>
                          {trigger.impact?.toFixed(1)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Avg mood: {trigger.avgMood?.toFixed(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No trigger data available for analysis
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Coping Strategy Effectiveness
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insights.coping?.analysis?.length > 0 ? (
              <div className="space-y-3">
                {insights.coping.analysis.slice(0, 5).map((strategy: unknown, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{strategy.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {strategy.usage} uses
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        <span className={
                          strategy.effectiveness > 7 ? 'text-green-500' : 
                          strategy.effectiveness > 5 ? 'text-yellow-500' : 'text-red-500'
                        }>
                          {strategy.effectiveness?.toFixed(1)}/10
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Avg mood: {strategy.avgMood?.toFixed(1)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No coping strategy data available for analysis
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};