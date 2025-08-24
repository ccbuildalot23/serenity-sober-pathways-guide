import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { CheckinHistoryData, FilterOptions } from './CheckInHistory';
import { Activity, Brain, Heart, Moon, Pill, AlertTriangle } from 'lucide-react';

interface CorrelationAnalysisProps {
  data: CheckinHistoryData[];
  filters: FilterOptions;
}

export const CorrelationAnalysis: React.FC<CorrelationAnalysisProps> = ({ data, filters }) => {
  // Calculate correlation coefficient between two arrays
  const calculateCorrelation = (x: number[], y: number[]): number => {
    if (x.length !== y.length || x.length === 0) return 0;
    
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };

  // Prepare correlation data
  const validData = data.filter(d => 
    d.is_complete && 
    d.mood_rating !== null && 
    d.energy_rating !== null &&
    d.hope_rating !== null
  );

  const moodValues = validData.map(d => d.mood_rating!);
  const energyValues = validData.map(d => d.energy_rating!);
  const hopeValues = validData.map(d => d.hope_rating!);
  const sleepValues = validData.filter(d => d.sleep_quality !== null).map(d => d.sleep_quality!);
  const medicationData = validData.filter(d => d.medication_taken !== null);

  // Calculate correlations
  const correlations = [
    {
      factor: 'Energy',
      icon: Activity,
      correlation: calculateCorrelation(moodValues, energyValues),
      description: 'How mood relates to energy levels'
    },
    {
      factor: 'Hope',
      icon: Heart,
      correlation: calculateCorrelation(moodValues, hopeValues),
      description: 'How mood relates to feelings of hope'
    },
    {
      factor: 'Sleep Quality',
      icon: Moon,
      correlation: sleepValues.length > 0 ? calculateCorrelation(
        validData.filter(d => d.sleep_quality !== null).map(d => d.mood_rating!),
        sleepValues
      ) : 0,
      description: 'How sleep quality affects mood'
    }
  ];

  // Prepare scatter plot data for mood vs energy
  const scatterData = validData.map(d => ({
    mood: d.mood_rating,
    energy: d.energy_rating,
    hope: d.hope_rating,
    sleep: d.sleep_quality,
    date: d.checkin_date
  }));

  // Analyze triggers
  const triggerAnalysis = analyzeTriggers(validData);
  const copingAnalysis = analyzeCopingStrategies(validData);

  function analyzeTriggers(data: CheckinHistoryData[]) {
    const triggerCounts: Record<string, { count: number; avgMood: number; totalMood: number }> = {};
    
    data.forEach(d => {
      if (d.triggers && d.mood_rating !== null) {
        d.triggers.forEach(trigger => {
          if (!triggerCounts[trigger]) {
            triggerCounts[trigger] = { count: 0, avgMood: 0, totalMood: 0 };
          }
          triggerCounts[trigger].count++;
          triggerCounts[trigger].totalMood += d.mood_rating!;
        });
      }
    });

    return Object.entries(triggerCounts)
      .map(([trigger, data]) => ({
        trigger,
        count: data.count,
        avgMood: data.totalMood / data.count,
        impact: 5 - (data.totalMood / data.count) // Lower mood = higher impact
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  function analyzeCopingStrategies(data: CheckinHistoryData[]) {
    const strategyEffectiveness: Record<string, { count: number; avgMood: number; totalMood: number }> = {};
    
    data.forEach(d => {
      if (d.coping_strategies && d.mood_rating !== null) {
        d.coping_strategies.forEach(strategy => {
          if (!strategyEffectiveness[strategy]) {
            strategyEffectiveness[strategy] = { count: 0, avgMood: 0, totalMood: 0 };
          }
          strategyEffectiveness[strategy].count++;
          strategyEffectiveness[strategy].totalMood += d.mood_rating!;
        });
      }
    });

    return Object.entries(strategyEffectiveness)
      .map(([strategy, data]) => ({
        strategy,
        count: data.count,
        avgMood: data.totalMood / data.count,
        effectiveness: data.totalMood / data.count
      }))
      .sort((a, b) => b.effectiveness - a.effectiveness)
      .slice(0, 5);
  }

  const getCorrelationColor = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs > 0.7) return 'text-green-600';
    if (abs > 0.5) return 'text-yellow-600';
    if (abs > 0.3) return 'text-orange-600';
    return 'text-red-600';
  };

  const getCorrelationStrength = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs > 0.7) return 'Strong';
    if (abs > 0.5) return 'Moderate';
    if (abs > 0.3) return 'Weak';
    return 'Very Weak';
  };

  return (
    <div className="space-y-6">
      {/* Correlation Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {correlations.map(({ factor, icon: Icon, correlation, description }) => (
          <Card key={factor}>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Icon className="h-8 w-8 text-primary" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{factor}</p>
                  <p className="text-2xl font-bold">
                    <span className={getCorrelationColor(correlation)}>
                      {correlation.toFixed(2)}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getCorrelationStrength(correlation)} correlation
                  </p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scatter Plot */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Mood vs Energy Correlation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={scatterData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number" 
                  dataKey="mood" 
                  name="Mood" 
                  domain={[0, 10]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Mood Rating', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  type="number" 
                  dataKey="energy" 
                  name="Energy" 
                  domain={[0, 10]}
                  tick={{ fontSize: 12 }}
                  label={{ value: 'Energy Level', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                  formatter={(value, name) => [value, name === 'mood' ? 'Mood' : 'Energy']}
                />
                <Scatter 
                  dataKey="energy" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.6}
                  r={4}
                />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Trigger Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Common Mood Triggers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {triggerAnalysis.length > 0 ? (
              <div className="space-y-4">
                {triggerAnalysis.map(({ trigger, count, avgMood, impact }) => (
                  <div key={trigger} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{trigger}</p>
                      <p className="text-sm text-muted-foreground">
                        {count} occurrences • Avg mood: {avgMood.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Impact: <span className={impact > 3 ? 'text-red-500' : impact > 2 ? 'text-yellow-500' : 'text-green-500'}>
                          {impact.toFixed(1)}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No trigger data available for analysis
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Effective Coping Strategies
            </CardTitle>
          </CardHeader>
          <CardContent>
            {copingAnalysis.length > 0 ? (
              <div className="space-y-4">
                {copingAnalysis.map(({ strategy, count, avgMood, effectiveness }) => (
                  <div key={strategy} className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{strategy}</p>
                      <p className="text-sm text-muted-foreground">
                        {count} uses • Avg mood: {avgMood.toFixed(1)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        <span className={effectiveness > 7 ? 'text-green-500' : effectiveness > 5 ? 'text-yellow-500' : 'text-red-500'}>
                          {effectiveness.toFixed(1)}/10
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No coping strategy data available for analysis
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};