import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from 'recharts';
import { TrendingUp, Heart, Zap, Trophy, Calendar, Sparkles, Star, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CalendarInsightsProps {
  chartData: any[];
  monthStats: {
    totalEntries: number;
    averageMood: string;
    averageEnergy: string;
    streakDays: number;
    topTriggers: Array<{name: string; count: number}>;
  };
  monthlyTrends?: Array<{
    week: string;
    avgMood: number;
    avgEnergy: number;
    entryCount: number;
  }>;
}

const CalendarInsights: React.FC<CalendarInsightsProps> = ({ 
  chartData, 
  monthStats, 
  monthlyTrends = [] 
}) => {
  const avgMood = parseFloat(monthStats.averageMood);
  const avgEnergy = parseFloat(monthStats.averageEnergy);

  const getMoodMessage = () => {
    if (avgMood >= 7) return { text: "Thriving! \ud83c\udf1f", color: "text-emerald-600 dark:text-emerald-400" };
    if (avgMood >= 5) return { text: "Growing stronger \ud83d\udcaa", color: "text-blue-600 dark:text-blue-400" };
    return { text: "Building resilience \ud83c\udf31", color: "text-amber-600 dark:text-amber-400" };
  };

  const moodMessage = getMoodMessage();

  return (
    <div className="space-y-4">
      {/* Motivational Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Mood Journey</span>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-bold text-purple-800 dark:text-purple-200">{monthStats.averageMood}</p>
              <span className="text-sm text-purple-600 dark:text-purple-400">/10</span>
            </div>
            <p className={`text-xs mt-1 font-medium ${moodMessage.color}`}>
              {moodMessage.text}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Energy Flow</span>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-bold text-amber-800 dark:text-amber-200">{monthStats.averageEnergy}</p>
              <span className="text-sm text-amber-600 dark:text-amber-400">/10</span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              {avgEnergy >= 6 ? "Energized! \u26a1" : "Recharging \ud83d\udd0b"}
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Victory Streak</span>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-200">{monthStats.streakDays}</p>
              <span className="text-sm text-emerald-600 dark:text-emerald-400">days</span>
            </div>
            {monthStats.streakDays >= 7 && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                <span className="text-xs text-emerald-700 dark:text-emerald-300">Amazing!</span>
              </div>
            )}
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Check-ins</span>
            </div>
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">{monthStats.totalEntries}</p>
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              This month \ud83d\udcdd
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Chart */}
      {chartData.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Your Progress Journey
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#eab308" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#eab308" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="mood" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorMood)"
                    name="Mood"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="energy" 
                    stroke="#eab308" 
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorEnergy)"
                    name="Energy"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekly Trends */}
      {monthlyTrends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
              Weekly Victories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends}>
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 10]} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar 
                    dataKey="avgMood" 
                    fill="#8b5cf6" 
                    name="Mood" 
                    radius={[8, 8, 0, 0]}
                  />
                  <Bar 
                    dataKey="avgEnergy" 
                    fill="#eab308" 
                    name="Energy" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Growth Triggers */}
      {monthStats.topTriggers.length > 0 && (
        <Card className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-900/20 dark:to-rose-800/20 border-rose-200 dark:border-rose-800">
          <CardHeader>
            <CardTitle className="text-lg text-rose-800 dark:text-rose-200">Growth Opportunities</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-rose-700 dark:text-rose-300 mb-3">
              Awareness is the first step to growth \ud83c\udf31
            </p>
            <div className="space-y-2">
              {monthStats.topTriggers.map((trigger, index) => (
                <div key={index} className="flex justify-between items-center p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <span className="text-sm font-medium text-rose-700 dark:text-rose-300">{trigger.name}</span>
                  <Badge variant="outline" className="border-rose-300 text-rose-700 dark:border-rose-700 dark:text-rose-300">
                    {trigger.count}x
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Motivational Message */}
      <Card className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
        <CardContent className="p-4 text-center">
          <p className="font-medium">Remember:</p>
          <p className="text-sm opacity-90 mt-1">Every check-in is a step forward. You're doing great! \ud83d\udc9c</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarInsights;
