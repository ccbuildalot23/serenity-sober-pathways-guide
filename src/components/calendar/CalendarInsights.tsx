
import React from 'react';
import { TrendingUp, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { getMoodColorClass } from '@/utils/calendarUtils';
import type { ChartDataPoint } from '@/types/calendar';

interface CalendarInsightsProps {
  chartData: ChartDataPoint[];
  totalEntries: number;
  averageMood: number;
  topTriggers: [string, number][];
}

const CalendarInsights: React.FC<CalendarInsightsProps> = ({
  chartData,
  totalEntries,
  averageMood,
  topTriggers
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Mood Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Mood Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis dataKey="date" />
                <YAxis domain={[1, 10]} />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="mood" 
                  stroke="#1E3A8A" 
                  strokeWidth={2}
                  dot={{ fill: '#1E3A8A' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-200 flex items-center justify-center text-gray-500">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights Panel */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Monthly Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Average Mood */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Average Mood</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{averageMood.toFixed(1)}</span>
              <div className={cn("w-3 h-3 rounded-full", getMoodColorClass(averageMood))} />
            </div>
          </div>

          {/* Top Triggers */}
          <div>
            <span className="text-sm font-medium mb-2 block">Top Triggers</span>
            <div className="space-y-1">
              {topTriggers.length > 0 ? topTriggers.map(([trigger, count]) => (
                <div key={trigger} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{trigger}</span>
                  <Badge variant="secondary">{count}x</Badge>
                </div>
              )) : (
                <span className="text-sm text-gray-500">No triggers logged</span>
              )}
            </div>
          </div>

          {/* Entry Count */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Check-ins</span>
            <span className="text-lg font-semibold">{totalEntries}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarInsights;
