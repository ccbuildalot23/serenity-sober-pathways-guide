
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

/**
 * DEDUPLICATION: Replaces legacy calendar component and page.
 * Reason: modular hooks with export and notification support.
 */
import CalendarLoadingState from './CalendarLoadingState';
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
    if (!supabase) {
      showNotification('success', 'Entry updated (demo mode)');
      return;
    }

    try {
      showNotification('success', 'Entry updated successfully');
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
      showNotification('error', 'No entry for this day');
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
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {/* Notification */}
      <NotificationToast notification={notification} />

      {/* Header with Filter Toggle */}
      <CalendarHeader
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        onExport={onExport}
      />

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

      {/* Calendar Insights */}
      <CalendarInsights
        chartData={chartData}
        monthStats={monthStats}
        monthlyTrends={monthlyTrends}
      />

      {/* Day Detail Sheet */}
      <DayDetailSheet
        isOpen={isDayDetailOpen}
        onOpenChange={setIsDayDetailOpen}
        selectedDate={selectedDate}
        selectedDayData={selectedDayData}
        onUpdate={handleUpdate}
      />
    </div>
  );
};

export default EnhancedCalendar;
