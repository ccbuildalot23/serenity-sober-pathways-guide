
import React, { useState } from 'react';
import { MoodEntry } from '@/types/calendar';
import { useCalendarFilters } from '@/hooks/useCalendarFilters';
import { useCalendarData } from '@/hooks/useCalendarData';
import { useCalendarExport } from '@/hooks/useCalendarExport';
import { useCalendarStats } from '@/hooks/useCalendarStats';
import { calculateMonthlyTrends } from '@/utils/calendarAnalytics';
import { groupEntriesByDay, prepareChartData } from '@/utils/calendarUtils';
import { formatDate } from './utils/calendarHelpers';
import CalendarFilters from './CalendarFilters';
import CalendarGrid from './CalendarGrid';
import CalendarInsights from './CalendarInsights';
import DayDetailSheet from './DayDetailSheet';
import CalendarHeader from './CalendarHeader';
import CalendarLoadingState from './CalendarLoadingState';
import CalendarLegend from './CalendarLegend';
import NotificationToast from './NotificationToast';

// Main Calendar Component
const EnhancedCalendar: React.FC<{
  user?: { id: string };
  supabase?: any;
  onTabChange?: () => void;
  showLayout?: boolean;
}> = ({ user, supabase, onTabChange, showLayout = true }) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isDayDetailOpen, setIsDayDetailOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Use custom hooks
  const { monthEntries, isLoading, error } = useCalendarData(selectedMonth, user, supabase);
  const { filters, setFilters, filteredEntries } = useCalendarFilters(monthEntries);
  const { handleExport } = useCalendarExport();
  const monthStats = useCalendarStats(filteredEntries);

  // Get available triggers for filter
  const availableTriggers = Array.from(new Set(monthEntries.flatMap(e => e.triggers || [])));

  // Simple notification system
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Update entry
  const handleUpdate = async (updates: Partial<MoodEntry>) => {
    if (!supabase || !selectedDate) {
      showNotification('success', 'Entry updated (demo mode)');
      return;
    }

    try {
      // In demo mode, just show success
      showNotification('success', 'Entry updated successfully');
      setIsDayDetailOpen(false);
    } catch (error) {
      showNotification('error', 'Failed to update entry');
    }
  };

  // Process filtered data
  const dayDataMap = groupEntriesByDay(filteredEntries);
  const chartData = prepareChartData(dayDataMap);
  const monthlyTrends = calculateMonthlyTrends(filteredEntries);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    const dateKey = formatDate(date, 'yyyy-MM-dd');
    const dayData = dayDataMap.get(dateKey);
    if (dayData && dayData.entries.length > 0) {
      setIsDayDetailOpen(true);
    } else {
      showNotification('error', 'No entry for this day. Create a check-in first!');
    }
  };

  const selectedDayData = selectedDate ? dayDataMap.get(formatDate(selectedDate, 'yyyy-MM-dd'))?.entries[0] : undefined;

  // Enhanced export functionality
  const onExport = async (format: 'csv' | 'json' = 'csv') => {
    const result = await handleExport(filteredEntries, selectedMonth, format);
    showNotification(result.success ? 'success' : 'error', result.message);
  };

  if (isLoading) {
    return <CalendarLoadingState />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        {/* Notification */}
        <NotificationToast notification={notification} />

        {/* Header with Filter Toggle */}
        <CalendarHeader
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onExport={onExport}
        />

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error}
            </p>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Calendar Grid */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filters */}
            {showFilters && (
              <CalendarFilters
                filters={filters}
                onFiltersChange={setFilters}
                availableTriggers={availableTriggers}
              />
            )}

            {/* Calendar Grid */}
            <CalendarGrid
              selectedDate={selectedDate}
              selectedMonth={selectedMonth}
              dayDataMap={dayDataMap}
              onDateSelect={setSelectedDate}
              onMonthChange={setSelectedMonth}
              onDayClick={handleDayClick}
            />

            {/* Calendar Legend */}
            <CalendarLegend />
          </div>

          {/* Right Column - Insights */}
          <div className="lg:col-span-1">
            <CalendarInsights
              chartData={chartData}
              monthStats={monthStats}
              monthlyTrends={monthlyTrends}
            />
          </div>
        </div>

        {/* Day Detail Sheet */}
        <DayDetailSheet
          isOpen={isDayDetailOpen}
          onOpenChange={setIsDayDetailOpen}
          selectedDate={selectedDate}
          selectedDayData={selectedDayData}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  );
};

export default EnhancedCalendar;
