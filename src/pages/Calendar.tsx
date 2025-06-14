
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import CalendarInsights from '@/components/calendar/CalendarInsights';
import DayDetailSheet from '@/components/calendar/DayDetailSheet';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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
      
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Process data for calendar
  const dayDataMap = new Map();
  const chartData: any[] = [];
  
  monthEntries.forEach(entry => {
    const dateKey = entry.checkin_date;
    dayDataMap.set(dateKey, {
      ...entry,
      averageMood: entry.mood_rating || 5,
      entries: [entry]
    });
    
    chartData.push({
      date: format(new Date(entry.checkin_date), 'MMM dd'),
      mood: entry.mood_rating || 5,
      energy: entry.energy_rating || 5
    });
  });

  // Calculate month stats
  const monthStats = {
    totalEntries: monthEntries.length,
    averageMood: monthEntries.length > 0 ? 
      (monthEntries.reduce((sum, e) => sum + (e.mood_rating || 5), 0) / monthEntries.length).toFixed(1) : '0.0',
    averageEnergy: monthEntries.length > 0 ? 
      (monthEntries.reduce((sum, e) => sum + (e.energy_rating || 5), 0) / monthEntries.length).toFixed(1) : '0.0',
    streakDays: 0, // Could implement streak calculation
    topTriggers: [] // Could implement trigger analysis
  };

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
          monthStats={monthStats}
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
