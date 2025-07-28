import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { format, parseISO } from 'date-fns';
import { CheckinHistoryData, FilterOptions } from './CheckInHistory';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MoodTrendsChartProps {
  data: CheckinHistoryData[];
  filters: FilterOptions;
  compareMode?: boolean;
}

export const MoodTrendsChart: React.FC<MoodTrendsChartProps> = ({ 
  data, 
  filters, 
  compareMode = false 
}) => {
  // Prepare chart data
  const chartData = data
    .filter(item => item.is_complete && item.mood_rating !== null)
    .sort((a, b) => new Date(a.checkin_date).getTime() - new Date(b.checkin_date).getTime())
    .map(item => ({
      date: item.checkin_date,
      mood: item.mood_rating,
      energy: item.energy_rating,
      hope: item.hope_rating,
      sleep: item.sleep_quality,
      phq2: item.phq2_score,
      gad2: item.gad2_score,
      dateFormatted: format(parseISO(item.checkin_date), 'MMM d')
    }));

  // Calculate trend indicators
  const calculateTrend = (values: (number | null)[]) => {
    const validValues = values.filter(v => v !== null) as number[];
    if (validValues.length < 2) return { direction: 'stable', change: 0 };
    
    const recent = validValues.slice(-7).reduce((a, b) => a + b, 0) / validValues.slice(-7).length;
    const previous = validValues.slice(-14, -7).reduce((a, b) => a + b, 0) / validValues.slice(-14, -7).length;
    
    const change = recent - previous;
    const direction = Math.abs(change) < 0.2 ? 'stable' : change > 0 ? 'up' : 'down';
    
    return { direction, change: Math.abs(change) };
  };

  const moodTrend = calculateTrend(data.map(d => d.mood_rating));
  const energyTrend = calculateTrend(data.map(d => d.energy_rating));
  const hopeTrend = calculateTrend(data.map(d => d.hope_rating));

  const formatTooltip = (value: any, name: string) => {
    const labels: Record<string, string> = {
      mood: 'Mood',
      energy: 'Energy',
      hope: 'Hope',
      sleep: 'Sleep Quality',
      phq2: 'PHQ-2 Score',
      gad2: 'GAD-2 Score'
    };
    return [value?.toFixed(1) || 'N/A', labels[name] || name];
  };

  const TrendIcon = ({ direction }: { direction: string }) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Trend Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Mood Trend</p>
                <p className="text-2xl font-bold">
                  {chartData.length > 0 
                    ? chartData[chartData.length - 1].mood?.toFixed(1) 
                    : 'N/A'
                  }
                </p>
              </div>
              <TrendIcon direction={moodTrend.direction} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {moodTrend.direction === 'stable' ? 'Stable' : 
               moodTrend.direction === 'up' ? `+${moodTrend.change.toFixed(1)}` : 
               `-${moodTrend.change.toFixed(1)}`} vs previous week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Energy Trend</p>
                <p className="text-2xl font-bold">
                  {chartData.length > 0 
                    ? chartData[chartData.length - 1].energy?.toFixed(1) 
                    : 'N/A'
                  }
                </p>
              </div>
              <TrendIcon direction={energyTrend.direction} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {energyTrend.direction === 'stable' ? 'Stable' : 
               energyTrend.direction === 'up' ? `+${energyTrend.change.toFixed(1)}` : 
               `-${energyTrend.change.toFixed(1)}`} vs previous week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hope Trend</p>
                <p className="text-2xl font-bold">
                  {chartData.length > 0 
                    ? chartData[chartData.length - 1].hope?.toFixed(1) 
                    : 'N/A'
                  }
                </p>
              </div>
              <TrendIcon direction={hopeTrend.direction} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {hopeTrend.direction === 'stable' ? 'Stable' : 
               hopeTrend.direction === 'up' ? `+${hopeTrend.change.toFixed(1)}` : 
               `-${hopeTrend.change.toFixed(1)}`} vs previous week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Mood & Wellness Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              {filters.assessmentTypes.includes('mood') ? (
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="dateFormatted" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    domain={[0, 10]}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={formatTooltip}
                  />
                  <Legend />
                  
                  <Area
                    type="monotone"
                    dataKey="mood"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.1}
                    strokeWidth={2}
                    name="Mood"
                  />
                  
                  {filters.assessmentTypes.includes('mood') && (
                    <>
                      <Line
                        type="monotone"
                        dataKey="energy"
                        stroke="hsl(var(--chart-2))"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Energy"
                      />
                      <Line
                        type="monotone"
                        dataKey="hope"
                        stroke="hsl(var(--chart-3))"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        name="Hope"
                      />
                    </>
                  )}
                </AreaChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="dateFormatted" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                    formatter={formatTooltip}
                  />
                  <Legend />
                  
                  {filters.assessmentTypes.includes('phq2') && (
                    <Line
                      type="monotone"
                      dataKey="phq2"
                      stroke="hsl(var(--chart-4))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="PHQ-2 Score"
                    />
                  )}
                  
                  {filters.assessmentTypes.includes('gad2') && (
                    <Line
                      type="monotone"
                      dataKey="gad2"
                      stroke="hsl(var(--chart-5))"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="GAD-2 Score"
                    />
                  )}
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};