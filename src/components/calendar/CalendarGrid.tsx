import React from 'react';
import { ChevronLeft, ChevronRight, Star, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { CalendarGridProps } from '@/types/calendar';

const CalendarGrid: React.FC<CalendarGridProps> = ({
  selectedDate,
  selectedMonth,
  dayDataMap,
  onDateSelect,
  onMonthChange,
  onDayClick,
}) => {
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getMoodColor = (mood: number) => {
    if (mood >= 8) return 'from-emerald-400 to-emerald-600';
    if (mood >= 6) return 'from-blue-400 to-blue-600';
    if (mood >= 4) return 'from-amber-400 to-amber-600';
    return 'from-rose-400 to-rose-600';
  };

  const getMoodEmoji = (mood: number) => {
    if (mood >= 8) return '✨';
    if (mood >= 6) return '💪';
    if (mood >= 4) return '🌱';
    return '🌅';
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedMonth);
    const days = [];
    const today = new Date();

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(
        selectedMonth.getFullYear(),
        selectedMonth.getMonth(),
        day
      );
      const dateKey = formatDateKey(date);
      const hasEntry = dayDataMap.has(dateKey);
      const entry = dayDataMap.get(dateKey);
      const isSelected = selectedDate && formatDateKey(selectedDate) === dateKey;
      const todayDate = isToday(date);
      const isPastDate = date < today && !hasEntry;

      days.push(
        <button
          key={day}
          onClick={() => onDayClick(date)}
          className={`
            relative p-2 rounded-xl transition-all duration-300 transform hover:scale-105
            ${hasEntry
              ? 'bg-white dark:bg-gray-800 shadow-md hover:shadow-lg'
              : isPastDate
                ? 'bg-gray-100 dark:bg-gray-800/50 opacity-50'
                : 'bg-white/50 dark:bg-gray-800/30 hover:bg-white dark:hover:bg-gray-800'
            }
            ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
            ${todayDate ? 'ring-2 ring-emerald-500 ring-offset-2' : ''}
          `}
        >
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{day}</div>
          
          {hasEntry && entry && (
            <>
              <div
                className={`
                mt-1 h-1 w-full rounded-full bg-gradient-to-r ${getMoodColor(
                  entry.averageMood
                )}
                animate-pulse-subtle
              `}
              />
              <div className="absolute -top-1 -right-1 text-xs">
                {getMoodEmoji(entry.averageMood)}
              </div>
              {entry.averageMood >= 8 && (
                <Sparkles className="absolute -bottom-1 -left-1 h-3 w-3 text-yellow-500 animate-pulse" />
              )}
            </>
          )}
          
          {todayDate && (
            <div className="absolute -top-2 -right-2">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                <div className="relative bg-emerald-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  ✓
                </div>
              </div>
            </div>
          )}
        </button>
      );
    }

    return days;
  };

  const handlePrevMonth = () => {
    const newMonth = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() - 1
    );
    onMonthChange(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth() + 1
    );
    onMonthChange(newMonth);
  };

  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-emerald-500 p-4">
        <div className="flex justify-between items-center">
          <Button
            onClick={handlePrevMonth}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-xl font-bold text-white">
            {selectedMonth.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </h2>
          <Button
            onClick={handleNextMonth}
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="p-4 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-7 gap-2 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-xs font-medium text-gray-600 dark:text-gray-400 p-2"
            >
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-2">{renderCalendarDays()}</div>
      </div>
    </Card>
  );
};

export default CalendarGrid;
