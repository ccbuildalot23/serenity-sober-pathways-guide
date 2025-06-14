
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Brain, Zap, Target } from 'lucide-react';

interface CalendarInsightsProps {
  chartData: any[];
  monthStats: {
    totalEntries: number;
    averageMood: string;
    averageEnergy: string;
    streakDays: number;
    topTriggers: Array<{name: string; count: number}>;
  };
}

const CalendarInsights: React.FC<CalendarInsightsProps> = ({ chartData, monthStats }) => {
  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-gray-600">Entries</span>
            </div>
            <p className="text-2xl font-bold mt-1">{monthStats.totalEntries}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-gray-600">Avg Mood</span>
            </div>
            <p className="text-2xl font-bold mt-1">{monthStats.averageMood}/10</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-gray-600">Avg Energy</span>
            </div>
            <p className="text-2xl font-bold mt-1">{monthStats.averageEnergy}/10</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-gray-600">Streak</span>
            </div>
            <p className="text-2xl font-bold mt-1">{monthStats.streakDays} days</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mood & Energy Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="mood" 
                    stroke="#8b5cf6" 
                    strokeWidth={2}
                    name="Mood"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="energy" 
                    stroke="#eab308" 
                    strokeWidth={2}
                    name="Energy"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Triggers */}
      {monthStats.topTriggers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Common Triggers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {monthStats.topTriggers.map((trigger, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{trigger.name}</span>
                  <span className="text-sm font-medium text-gray-600">{trigger.count}x</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CalendarInsights;
