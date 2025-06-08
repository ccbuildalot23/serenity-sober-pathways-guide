
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { groupEntriesByDay, prepareChartData, calculateTriggerCounts, getTopTriggers } from '@/utils/calendarUtils';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import CalendarInsights from '@/components/calendar/CalendarInsights';
import DayDetailSheet from '@/components/calendar/DayDetailSheet';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { MoodEntry } from '@/types/calendar';

const Calendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const { user } = useAuth();

  // Enhanced query to load month data
  const { data: monthEntries = [], isLoading } = useQuery({
    queryKey: ['calendar-entries', format(selectedMonth, 'yyyy-MM'), user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .gte('checkin_date', format(startOfMonth(selectedMonth), 'yyyy-MM-dd'))
        .lte('checkin_date', format(endOfMonth(selectedMonth), 'yyyy-MM-dd'))
        .order('checkin_date', { ascending: true });

      if (error) throw error;
      
      // Transform to match MoodEntry type
      return (data || []).map(entry => ({
        id: entry.id,
        date: new Date(entry.checkin_date),
        mood_rating: entry.mood_rating || 5,
        energy_rating: entry.energy_rating || 5,
        triggers: [], // We don't have triggers in daily_checkins, could add later
        gratitude: [], // We don't have gratitude in daily_checkins, could add later
        notes: entry.support_needed || '',
        created_at: new Date(entry.created_at)
      }));
    },
    enabled: !!user?.id,
  });

  // Process data
  const dayDataMap = groupEntriesByDay(monthEntries);
  const chartData = prepareChartData(dayDataMap);
  
  // Calculate insights
  const totalEntries = monthEntries.length;
  const averageMood = totalEntries > 0 ? monthEntries.reduce((sum, e) => sum + e.mood_rating, 0) / totalEntries : 0;
  const triggerCounts = calculateTriggerCounts(monthEntries);
  const topTriggers = getTopTriggers(triggerCounts);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const dateKey = format(date, 'yyyy-MM-dd');
    if (dayDataMap.has(dateKey)) {
      setIsDayDetailOpen(true);
    }
  };

  const selectedDayData = selectedDate ? dayDataMap.get(format(selectedDate, 'yyyy-MM-dd')) : undefined;

  const handleExport = () => {
    console.log('Exporting month report...');
    // Could implement CSV export later
  };

  if (isLoading) {
    return (
      <Layout activeTab="calendar" onTabChange={() => {}}>
        <div className="p-4 space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-64 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout activeTab="calendar" onTabChange={() => {}}>
      <div className="p-4 space-y-6">
        <CalendarHeader onExport={handleExport} />
        
        <CalendarGrid
          selectedDate={selectedDate}
          selectedMonth={selectedMonth}
          dayDataMap={dayDataMap}
          onDateSelect={setSelectedDate}
          onMonthChange={setSelectedMonth}
          onDayClick={handleDayClick}
        />

        <CalendarInsights
          chartData={chartData}
          totalEntries={totalEntries}
          averageMood={averageMood}
          topTriggers={topTriggers}
        />

        <DayDetailSheet
          isOpen={isDayDetailOpen}
          onOpenChange={setIsDayDetailOpen}
          selectedDate={selectedDate}
          selectedDayData={selectedDayData}
        />
      </div>
    </Layout>
  );
};

export default Calendar;
