import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO, eachDayOfInterval, startOfMonth, endOfMonth, getDay, startOfWeek, endOfWeek } from 'date-fns';
import { CheckinHistoryData, FilterOptions } from './CheckInHistory';
import { Calendar } from 'lucide-react';

interface CheckInHeatMapProps {
  data: CheckinHistoryData[];
  filters: FilterOptions;
}

export const CheckInHeatMap: React.FC<CheckInHeatMapProps> = ({ data, filters }) => {
  // Create a map of dates to completion status and mood
  const dataMap = new Map(
    data.map(item => [
      item.checkin_date,
      {
        completed: item.is_complete,
        mood: item.mood_rating,
        energy: item.energy_rating,
        hope: item.hope_rating
      }
    ])
  );

  // Generate calendar days for the selected range
  const startDate = startOfWeek(filters.dateRange.start);
  const endDate = endOfWeek(filters.dateRange.end);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Group days by weeks
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];
  
  days.forEach((day, index) => {
    if (index > 0 && getDay(day) === 0) {
      weeks.push(currentWeek);
      currentWeek = [day];
    } else {
      currentWeek.push(day);
    }
  });
  
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  // Get intensity based on mood rating
  const getIntensity = (mood: number | null): string => {
    if (mood === null) return 'bg-muted';
    if (mood >= 8) return 'bg-green-500';
    if (mood >= 6) return 'bg-green-300';
    if (mood >= 4) return 'bg-yellow-300';
    if (mood >= 2) return 'bg-orange-300';
    return 'bg-red-300';
  };

  const getTooltipText = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayData = dataMap.get(dateStr);
    
    if (!dayData) {
      return `${format(date, 'MMM d, yyyy')} - No check-in`;
    }
    
    if (!dayData.completed) {
      return `${format(date, 'MMM d, yyyy')} - Incomplete check-in`;
    }
    
    return `${format(date, 'MMM d, yyyy')}
Mood: ${dayData.mood?.toFixed(1) || 'N/A'}
Energy: ${dayData.energy?.toFixed(1) || 'N/A'}
Hope: ${dayData.hope?.toFixed(1) || 'N/A'}`;
  };

  // Calculate statistics
  const totalDays = days.filter(day => 
    day >= filters.dateRange.start && day <= filters.dateRange.end
  ).length;
  
  const completedDays = days.filter(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayData = dataMap.get(dateStr);
    return dayData?.completed && day >= filters.dateRange.start && day <= filters.dateRange.end;
  }).length;
  
  const streak = calculateCurrentStreak();
  
  function calculateCurrentStreak(): number {
    const sortedDays = days
      .filter(day => day <= new Date())
      .sort((a, b) => b.getTime() - a.getTime());
    
    let streak = 0;
    for (const day of sortedDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayData = dataMap.get(dateStr);
      if (dayData?.completed) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  }

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{completedDays}</p>
              <p className="text-sm text-muted-foreground">Completed Check-ins</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">
                {totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{streak}</p>
              <p className="text-sm text-muted-foreground">Current Streak</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Heat Map Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Check-in Completion Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Less</span>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-muted rounded-sm" title="No data" />
                <div className="w-3 h-3 bg-red-300 rounded-sm" title="Mood: 0-2" />
                <div className="w-3 h-3 bg-orange-300 rounded-sm" title="Mood: 2-4" />
                <div className="w-3 h-3 bg-yellow-300 rounded-sm" title="Mood: 4-6" />
                <div className="w-3 h-3 bg-green-300 rounded-sm" title="Mood: 6-8" />
                <div className="w-3 h-3 bg-green-500 rounded-sm" title="Mood: 8-10" />
              </div>
              <span>More</span>
            </div>

            {/* Calendar Grid */}
            <div className="space-y-2">
              {/* Day labels */}
              <div className="grid grid-cols-7 gap-1 text-xs text-muted-foreground text-center">
                {dayLabels.map(label => (
                  <div key={label} className="py-1">
                    {label}
                  </div>
                ))}
              </div>

              {/* Calendar weeks */}
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1">
                  {week.map((day, dayIndex) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const dayData = dataMap.get(dateStr);
                    const isInRange = day >= filters.dateRange.start && day <= filters.dateRange.end;
                    const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                    
                    let cellClass = 'w-4 h-4 rounded-sm cursor-pointer transition-all duration-200 hover:scale-110';
                    
                    if (!isInRange) {
                      cellClass += ' bg-muted opacity-30';
                    } else if (!dayData) {
                      cellClass += ' bg-muted';
                    } else if (!dayData.completed) {
                      cellClass += ' bg-muted border border-dashed border-muted-foreground';
                    } else {
                      cellClass += ` ${getIntensity(dayData.mood)}`;
                    }
                    
                    if (isToday) {
                      cellClass += ' ring-2 ring-primary ring-offset-1';
                    }

                    return (
                      <div
                        key={dayIndex}
                        className={cellClass}
                        title={getTooltipText(day)}
                      />
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Additional Info */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Darker colors indicate higher mood ratings</p>
              <p>• Dashed borders indicate incomplete check-ins</p>
              <p>• Today is highlighted with a ring</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};