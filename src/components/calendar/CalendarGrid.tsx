
import React from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getMoodColorClass } from '@/utils/calendarUtils';
import type { CalendarGridProps, DayData } from '@/types/calendar';
import CalendarLegend from './CalendarLegend';

const CalendarGrid: React.FC<CalendarGridProps> = ({
  selectedDate,
  selectedMonth,
  dayDataMap,
  onDateSelect,
  onMonthChange,
  onDayClick
}) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          {format(selectedMonth, 'MMMM yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          selected={selectedDate}
          onSelect={onDateSelect}
          month={selectedMonth}
          onMonthChange={onMonthChange}
          onDayClick={onDayClick}
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
        
        <CalendarLegend />
      </CardContent>
    </Card>
  );
};

export default CalendarGrid;
