
import { format } from 'date-fns';
import type { MoodEntry, DayData, ChartDataPoint } from '@/types/calendar';

export const getMoodColorClass = (mood: number): string => {
  if (mood <= 3) return 'bg-red-500';
  if (mood <= 5) return 'bg-amber-500';
  if (mood <= 7) return 'bg-blue-500';
  return 'bg-emerald-500';
};

export const groupEntriesByDay = (entries: MoodEntry[]): Map<string, DayData> => {
  const dayDataMap = new Map<string, DayData>();
  
  entries.forEach(entry => {
    const dateKey = format(entry.date, 'yyyy-MM-dd');
    if (!dayDataMap.has(dateKey)) {
      dayDataMap.set(dateKey, {
        date: entry.date,
        entries: [],
        averageMood: 0
      });
    }
    dayDataMap.get(dateKey)!.entries.push(entry);
  });

  // Calculate averages
  dayDataMap.forEach(dayData => {
    const totalMood = dayData.entries.reduce((sum, entry) => sum + entry.mood_rating, 0);
    dayData.averageMood = totalMood / dayData.entries.length;
  });

  return dayDataMap;
};

export const prepareChartData = (dayDataMap: Map<string, DayData>): ChartDataPoint[] => {
  return Array.from(dayDataMap.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(day => ({
      date: format(day.date, 'MMM dd'),
      mood: day.averageMood,
      energy: day.entries[0]?.energy_rating || 0
    }));
};

export const calculateTriggerCounts = (entries: MoodEntry[]): Record<string, number> => {
  const allTriggers = entries.flatMap(e => e.triggers || []);
  return allTriggers.reduce((acc, trigger) => {
    acc[trigger] = (acc[trigger] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
};

export const getTopTriggers = (triggerCounts: Record<string, number>, count: number = 3): [string, number][] => {
  return Object.entries(triggerCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, count);
};
