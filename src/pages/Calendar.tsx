
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { groupEntriesByDay, prepareChartData, calculateTriggerCounts, getTopTriggers } from '@/utils/calendarUtils';
import CalendarHeader from '@/components/calendar/CalendarHeader';
import CalendarGrid from '@/components/calendar/CalendarGrid';
import CalendarInsights from '@/components/calendar/CalendarInsights';
import DayDetailSheet from '@/components/calendar/DayDetailSheet';
import type { MoodEntry } from '@/types/calendar';

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
    // Mock export functionality
    console.log('Exporting month report...');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
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
  );
};

export default CalendarPage;
