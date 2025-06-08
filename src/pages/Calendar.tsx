
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Calendar } from '@/components/ui/calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, endOfMonth, isSameDay } from 'date-fns';
import { Download, TrendingUp, Calendar as CalendarIcon, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MoodEntry {
  id: string;
  date: Date;
  mood_rating: number;
  energy_rating?: number;
  triggers?: string[];
  gratitude?: string[];
  notes?: string;
  created_at: Date;
}

interface DayData {
  date: Date;
  entries: MoodEntry[];
  averageMood: number;
}

// Mock data - replace with actual Supabase query
const mockData: MoodEntry[] = [
  {
    id: '1',
    date: new Date(2024, 5, 5),
    mood_rating: 7,
    energy_rating: 6,
    triggers: ['work stress'],
    gratitude: ['supportive team'],
    notes: 'Good day overall',
    created_at: new Date()
  },
  {
    id: '2', 
    date: new Date(2024, 5, 6),
    mood_rating: 4,
    energy_rating: 3,
    triggers: ['loneliness', 'work stress'],
    gratitude: ['morning coffee'],
    notes: 'Challenging day',
    created_at: new Date()
  },
  {
    id: '3',
    date: new Date(2024, 5, 7),
    mood_rating: 8,
    energy_rating: 8,
    triggers: [],
    gratitude: ['family time', 'good weather'],
    notes: 'Great day!',
    created_at: new Date()
  }
];

const CalendarPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);

  // Mock query - replace with actual Supabase query
  const { data: monthEntries = [] } = useQuery({
    queryKey: ['calendar-entries', format(selectedMonth, 'yyyy-MM')],
    queryFn: () => Promise.resolve(mockData),
  });

  // Group entries by day
  const dayDataMap = new Map<string, DayData>();
  monthEntries.forEach(entry => {
    const dateKey = format(entry.date, 'yyyy-MM-dd');
    if (!dayDataMap.has(dateKey)) {
      dayDataMap.set(dateKey, {
        date: entry.date,
        entries: [],
        averageMood: 0
      });
    }
    dayDataMap.get(dateKey)!.entries.push(entry);
  });

  // Calculate averages
  dayDataMap.forEach(dayData => {
    const totalMood = dayData.entries.reduce((sum, entry) => sum + entry.mood_rating, 0);
    dayData.averageMood = totalMood / dayData.entries.length;
  });

  // Prepare chart data
  const chartData = Array.from(dayDataMap.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(day => ({
      date: format(day.date, 'MMM dd'),
      mood: day.averageMood,
      energy: day.entries[0]?.energy_rating || 0
    }));

  // Get mood color class
  const getMoodColorClass = (mood: number) => {
    if (mood <= 3) return 'bg-red-500';
    if (mood <= 5) return 'bg-amber-500';
    if (mood <= 7) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  // Custom day rendering
  const renderDay = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayData = dayDataMap.get(dateKey);
    
    if (!dayData) return null;

    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <div 
          className={cn(
            "absolute bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full",
            getMoodColorClass(dayData.averageMood)
          )}
        />
        {dayData.entries.length > 1 && (
          <div className={cn(
            "absolute bottom-1 left-1/2 transform -translate-x-1/2 translate-x-1 w-1.5 h-1.5 rounded-full",
            getMoodColorClass(dayData.entries[1]?.mood_rating || dayData.averageMood)
          )} />
        )}
      </div>
    );
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const dateKey = format(date, 'yyyy-MM-dd');
    if (dayDataMap.has(dateKey)) {
      setIsDayDetailOpen(true);
    }
  };

  const selectedDayData = selectedDate ? dayDataMap.get(format(selectedDate, 'yyyy-MM-dd')) : null;

  // Calculate insights
  const totalEntries = monthEntries.length;
  const averageMood = totalEntries > 0 ? monthEntries.reduce((sum, e) => sum + e.mood_rating, 0) / totalEntries : 0;
  const allTriggers = monthEntries.flatMap(e => e.triggers || []);
  const triggerCounts = allTriggers.reduce((acc, trigger) => {
    acc[trigger] = (acc[trigger] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topTriggers = Object.entries(triggerCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3);

  const handleExport = () => {
    // Mock export functionality
    console.log('Exporting month report...');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-blue-900" />
          <h1 className="text-2xl font-bold text-blue-900">Recovery Calendar</h1>
        </div>
        <Button onClick={handleExport} variant="outline" className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            {format(selectedMonth, 'MMMM yyyy')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={selectedMonth}
            onMonthChange={setSelectedMonth}
            onDayClick={handleDayClick}
            components={{
              Day: ({ date, ...props }) => (
                <div {...props} className="relative">
                  <button className="w-full h-full relative">
                    {date.getDate()}
                    {renderDay(date)}
                  </button>
                </div>
              )
            }}
            className="w-full"
          />
          
          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span>Crisis (1-3)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-amber-500 rounded-full" />
              <span>Struggling (4-5)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full" />
              <span>Stable (6-7)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <span>Thriving (8-10)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Insights */}
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

      {/* Day Detail Sheet */}
      <Sheet open={isDayDetailOpen} onOpenChange={setIsDayDetailOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>
              {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </SheetTitle>
          </SheetHeader>
          
          {selectedDayData && (
            <div className="mt-6 space-y-4">
              {/* Mood Timeline */}
              <div>
                <h3 className="font-medium mb-2">Mood Timeline</h3>
                <div className="space-y-2">
                  {selectedDayData.entries.map((entry, index) => (
                    <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <div className={cn("w-3 h-3 rounded-full", getMoodColorClass(entry.mood_rating))} />
                        <span className="text-sm font-medium">{entry.mood_rating}/10</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {format(entry.created_at, 'h:mm a')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Triggers */}
              {selectedDayData.entries.some(e => e.triggers?.length) && (
                <div>
                  <h3 className="font-medium mb-2">Triggers</h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedDayData.entries.flatMap(e => e.triggers || []).map((trigger, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {trigger}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Gratitude */}
              {selectedDayData.entries.some(e => e.gratitude?.length) && (
                <div>
                  <h3 className="font-medium mb-2">Gratitude</h3>
                  <ul className="space-y-1">
                    {selectedDayData.entries.flatMap(e => e.gratitude || []).map((item, index) => (
                      <li key={index} className="text-sm text-gray-600">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes */}
              {selectedDayData.entries.some(e => e.notes) && (
                <div>
                  <h3 className="font-medium mb-2">Notes</h3>
                  <div className="space-y-2">
                    {selectedDayData.entries.filter(e => e.notes).map((entry, index) => (
                      <p key={index} className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                        {entry.notes}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CalendarPage;
