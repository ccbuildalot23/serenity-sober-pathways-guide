import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  TrendingDown, 
  Target,
  BarChart3,
  Clock,
  MapPin,
  Zap
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ScatterChart, Scatter, Cell } from 'recharts';

interface TriggerAnalysis {
  trigger: string;
  frequency: number;
  averageImpact: number;
  moodDrop: number;
  timePattern: { hour: number; count: number }[];
  recentTrend: 'increasing' | 'decreasing' | 'stable';
  associatedSymptoms: string[];
  effectiveCoping: string[];
}

export const TriggerImpactAnalysis: React.FC = () => {
  const { user } = useAuth();

  const { data: triggerData } = useQuery({
    queryKey: ['trigger-analysis', user?.id],
    queryFn: async () => {
      const { data: checkIns } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user!.id)
        .order('checkin_date', { ascending: false })
        .limit(90);

      return analyzeTriggers(checkIns || []);
    },
    enabled: !!user?.id
  });

  const analyzeTriggers = (checkIns: any[]): TriggerAnalysis[] => {
    const triggerMap = new Map<string, {
      occurrences: any[];
      moods: number[];
      times: number[];
      coping: string[];
    }>();

    checkIns.forEach(checkIn => {
      if (checkIn.triggers && checkIn.mood_rating) {
        checkIn.triggers.forEach(trigger => {
          if (!triggerMap.has(trigger)) {
            triggerMap.set(trigger, {
              occurrences: [],
              moods: [],
              times: [],
              coping: []
            });
          }
          
          const data = triggerMap.get(trigger)!;
          data.occurrences.push(checkIn);
          data.moods.push(checkIn.mood_rating);
          data.times.push(new Date(checkIn.created_at).getHours());
          if (checkIn.coping_strategies) {
            data.coping.push(...checkIn.coping_strategies);
          }
        });
      }
    });

    const analyses: TriggerAnalysis[] = [];
    
    triggerMap.forEach((data, trigger) => {
      if (data.occurrences.length >= 3) {
        const averageMood = data.moods.reduce((a, b) => a + b, 0) / data.moods.length;
        const baselineMood = 6; // Assumed baseline
        const moodDrop = Math.max(0, baselineMood - averageMood);
        
        // Time pattern analysis
        const timePattern = calculateTimePattern(data.times);
        
        // Recent trend analysis
        const recentTrend = calculateRecentTrend(data.occurrences);
        
        // Most effective coping strategies
        const copingFrequency = data.coping.reduce((acc, strategy) => {
          acc[strategy] = (acc[strategy] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        const effectiveCoping = Object.entries(copingFrequency)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 3)
          .map(([strategy]) => strategy);

        analyses.push({
          trigger,
          frequency: data.occurrences.length,
          averageImpact: moodDrop,
          moodDrop,
          timePattern,
          recentTrend,
          associatedSymptoms: extractSymptoms(data.occurrences),
          effectiveCoping
        });
      }
    });

    return analyses.sort((a, b) => b.averageImpact * b.frequency - a.averageImpact * a.frequency);
  };

  const calculateTimePattern = (times: number[]) => {
    const hourCounts = times.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count);
  };

  const calculateRecentTrend = (occurrences: any[]): 'increasing' | 'decreasing' | 'stable' => {
    if (occurrences.length < 6) return 'stable';
    
    const sorted = occurrences.sort((a, b) => 
      new Date(a.checkin_date).getTime() - new Date(b.checkin_date).getTime()
    );
    
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint).length;
    const secondHalf = sorted.slice(midpoint).length;
    
    const ratio = secondHalf / firstHalf;
    
    if (ratio > 1.2) return 'increasing';
    if (ratio < 0.8) return 'decreasing';
    return 'stable';
  };

  const extractSymptoms = (occurrences: any[]): string[] => {
    const symptoms = new Set<string>();
    
    occurrences.forEach(checkIn => {
      if (checkIn.phq2_score > 2) symptoms.add('Depression symptoms');
      if (checkIn.gad2_score > 2) symptoms.add('Anxiety symptoms');
      if (checkIn.energy_rating < 4) symptoms.add('Low energy');
      if (checkIn.sleep_quality < 4) symptoms.add('Poor sleep');
    });
    
    return Array.from(symptoms);
  };

  const chartData = useMemo(() => {
    if (!triggerData) return [];
    
    return triggerData.slice(0, 8).map(analysis => ({
      trigger: analysis.trigger.length > 15 ? 
        analysis.trigger.substring(0, 15) + '...' : 
        analysis.trigger,
      frequency: analysis.frequency,
      impact: analysis.averageImpact,
      severity: analysis.frequency * analysis.averageImpact
    }));
  }, [triggerData]);

  const scatterData = useMemo(() => {
    if (!triggerData) return [];
    
    return triggerData.map(analysis => ({
      x: analysis.frequency,
      y: analysis.averageImpact,
      name: analysis.trigger,
      size: analysis.frequency * 2
    }));
  }, [triggerData]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      case 'decreasing':
        return <Target className="h-4 w-4 text-success" />;
      default:
        return <Zap className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing': return 'destructive';
      case 'decreasing': return 'outline';
      default: return 'secondary';
    }
  };

  if (!triggerData || triggerData.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No trigger data available yet. Complete more check-ins to see trigger analysis.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trigger Impact Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Trigger Impact Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis 
                  dataKey="trigger" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">{label}</p>
                          <p className="text-sm">
                            Frequency: {payload[0]?.value}
                          </p>
                          <p className="text-sm">
                            Avg Impact: {typeof payload[1]?.value === 'number' ? payload[1].value.toFixed(1) : payload[1]?.value}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar dataKey="frequency" fill="hsl(var(--primary))" name="Frequency" />
                <Bar dataKey="impact" fill="hsl(var(--destructive))" name="Avg Impact" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Frequency vs Impact Scatter */}
          <div className="h-80">
            <h4 className="font-medium mb-3">Trigger Severity Matrix</h4>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={scatterData}>
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name="Frequency"
                  label={{ value: 'Frequency', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name="Impact"
                  label={{ value: 'Impact', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm">Frequency: {data.x}</p>
                          <p className="text-sm">Impact: {data.y.toFixed(1)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter dataKey="y" fill="hsl(var(--primary))">
                  {scatterData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.x > 5 && entry.y > 2 ? 'hsl(var(--destructive))' :
                        entry.x > 3 || entry.y > 1.5 ? 'hsl(var(--warning))' :
                        'hsl(var(--success))'
                      }
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Trigger Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {triggerData.slice(0, 6).map((analysis, index) => (
          <Card key={analysis.trigger}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{analysis.trigger}</CardTitle>
                <div className="flex items-center gap-2">
                  {getTrendIcon(analysis.recentTrend)}
                  <Badge variant={getTrendColor(analysis.recentTrend)}>
                    {analysis.recentTrend}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Impact Metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Frequency</div>
                  <div className="text-2xl font-bold">{analysis.frequency}</div>
                  <div className="text-xs text-muted-foreground">occurrences</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Impact</div>
                  <div className="text-2xl font-bold">{analysis.averageImpact.toFixed(1)}</div>
                  <div className="text-xs text-muted-foreground">mood points</div>
                </div>
              </div>

              {/* Severity Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Severity Score</span>
                  <span className="text-sm">
                    {(analysis.frequency * analysis.averageImpact).toFixed(1)}
                  </span>
                </div>
                <Progress 
                  value={Math.min((analysis.frequency * analysis.averageImpact) / 20 * 100, 100)} 
                  className="h-2"
                />
              </div>

              {/* Time Pattern */}
              {analysis.timePattern.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">Peak Times</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {analysis.timePattern.slice(0, 3).map(time => (
                      <Badge key={time.hour} variant="outline" className="text-xs">
                        {time.hour}:00 ({time.count}x)
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Associated Symptoms */}
              {analysis.associatedSymptoms.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-sm font-medium">Associated Symptoms</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {analysis.associatedSymptoms.map(symptom => (
                      <Badge key={symptom} variant="secondary" className="text-xs">
                        {symptom}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Effective Coping */}
              {analysis.effectiveCoping.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4" />
                    <span className="text-sm font-medium">Effective Coping</span>
                  </div>
                  <div className="space-y-1">
                    {analysis.effectiveCoping.map(strategy => (
                      <div key={strategy} className="text-sm text-muted-foreground">
                        • {strategy}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Key Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* High Impact Triggers */}
            {triggerData.filter(t => t.averageImpact > 2).length > 0 && (
              <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <h4 className="font-medium text-destructive mb-2">High Impact Triggers</h4>
                <p className="text-sm mb-3">
                  These triggers have the most significant impact on your mood and require immediate attention:
                </p>
                <ul className="space-y-1">
                  {triggerData
                    .filter(t => t.averageImpact > 2)
                    .slice(0, 3)
                    .map(trigger => (
                      <li key={trigger.trigger} className="text-sm">
                        • <strong>{trigger.trigger}</strong> - {trigger.averageImpact.toFixed(1)} point impact
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* Frequent Triggers */}
            {triggerData.filter(t => t.frequency > 5).length > 0 && (
              <div className="p-4 bg-warning/10 rounded-lg border border-warning/20">
                <h4 className="font-medium text-warning-foreground mb-2">Frequent Triggers</h4>
                <p className="text-sm mb-3">
                  These triggers occur most often and may benefit from proactive management:
                </p>
                <ul className="space-y-1">
                  {triggerData
                    .filter(t => t.frequency > 5)
                    .slice(0, 3)
                    .map(trigger => (
                      <li key={trigger.trigger} className="text-sm">
                        • <strong>{trigger.trigger}</strong> - {trigger.frequency} occurrences
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {/* Improving Triggers */}
            {triggerData.filter(t => t.recentTrend === 'decreasing').length > 0 && (
              <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                <h4 className="font-medium text-success-foreground mb-2">Improving Areas</h4>
                <p className="text-sm mb-3">
                  Great progress! These triggers are occurring less frequently:
                </p>
                <ul className="space-y-1">
                  {triggerData
                    .filter(t => t.recentTrend === 'decreasing')
                    .slice(0, 3)
                    .map(trigger => (
                      <li key={trigger.trigger} className="text-sm">
                        • <strong>{trigger.trigger}</strong> - Decreasing trend
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};