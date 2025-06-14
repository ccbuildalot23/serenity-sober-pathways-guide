
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(selectedMonth);
    const firstDay = getFirstDayOfMonth(selectedMonth);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="p-2" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
      const dateKey = formatDateKey(date);
      const hasEntry = dayDataMap.has(dateKey);
      const entry = dayDataMap.get(dateKey);

      days.push(
        <button
          key={day}
          onClick={() => onDayClick(date)}
          className={`
            p-2 rounded-lg border transition-colors
            ${hasEntry ? 'bg-primary/10 border-primary' : 'border-gray-200'}
            ${selectedDate && formatDateKey(selectedDate) === dateKey ? 'ring-2 ring-primary' : ''}
            hover:bg-gray-50
          `}
        >
          <div className="text-sm font-medium">{day}</div>
          {hasEntry && entry && (
            <div className="mt-1">
              <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-green-400 rounded" 
                style={{
                  opacity: (entry.averageMood || entry.mood_rating || 5) / 10
                }}
              />
            </div>
          )}
        </button>
      );
    }

    return days;
  };

  const handlePrevMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1);
    onMonthChange(newMonth);
  };

  const handleNextMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1);
    onMonthChange(newMonth);
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex justify-between items-center mb-4">
        <Button onClick={handlePrevMonth} variant="ghost" size="sm">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <Button onClick={handleNextMonth} variant="ghost" size="sm">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 p-2">
            {day}
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {renderCalendarDays()}
      </div>
    </div>
  );
};

export default CalendarGrid;
