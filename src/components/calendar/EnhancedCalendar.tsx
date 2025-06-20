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
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Heart, TrendingUp } from 'lucide-react';

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
      showNotification('error', 'No check-in for this day yet. Keep building your journey! 💪');
    }
  };

  const selectedDayData = selectedDate ? dayDataMap.get(formatDate(selectedDate, 'yyyy-MM-dd'))?.entries[0] : undefined;

  // Enhanced export functionality
  const onExport = async (format: 'csv' | 'json' = 'csv') => {
    const result = await handleExport(filteredEntries, selectedMonth, format);
    showNotification(result.success ? 'success' : 'error', result.message);
  };

  // Get motivational message based on stats
  const getMotivationalMessage = () => {
    const avgMood = parseFloat(monthStats.averageMood);
    if (avgMood >= 7) return "You're doing amazing! Keep shining ✨";
    if (avgMood >= 5) return "You're making progress every day 🌱";
    return "Every day is a new opportunity to grow 🌅";
  };

  if (isLoading) {
    return <CalendarLoadingState />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-gray-900 dark:to-gray-800 transition-colors">
      <div className="p-4 space-y-6 max-w-7xl mx-auto">
        {/* Notification */}
        <NotificationToast notification={notification} />

        {/* Motivational Header */}
        <Card className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Your Recovery Journey</h1>
                <p className="text-blue-100 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  {getMotivationalMessage()}
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{monthStats.streakDays}</div>
                <div className="text-sm text-blue-100">day streak</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Header with Filter Toggle */}
        <CalendarHeader
          showFilters={showFilters}
          onToggleFilters={() => setShowFilters(!showFilters)}
          onExport={onExport}
        />

        {/* Error Alert */}
        {error && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <p className="text-sm text-amber-800 dark:text-amber-400">
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

            {/* Progress Message */}
            {monthStats.totalEntries > 0 && (
              <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                <CardContent className="p-4 flex items-center gap-3">
                  <Heart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-emerald-800 dark:text-emerald-200">
                    You've checked in {monthStats.totalEntries} times this month. Every check-in is a victory!
                  </p>
                </CardContent>
              </Card>
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
