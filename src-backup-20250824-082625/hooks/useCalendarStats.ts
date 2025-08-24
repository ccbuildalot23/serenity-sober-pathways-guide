
import { useMemo } from 'react';
import { MoodEntry } from '@/types/calendar';
import { calculateTriggerCounts, getTopTriggers } from '@/utils/calendarAnalytics';
import { calculateStreak } from '@/components/calendar/utils/calendarHelpers';

interface MonthStats {
  totalEntries: number;
  averageMood: string;
  averageEnergy: string;
  streakDays: number;
  topTriggers: Array<{name: string; count: number}>;
}

export function useCalendarStats(filteredEntries: MoodEntry[] = []): MonthStats {
  return useMemo(() => {
    const safe = Array.isArray(filteredEntries) ? filteredEntries : [];
    const totalEntries = safe.length;
    const averageMood = totalEntries > 0 ? safe.reduce((sum, e) => sum + (e.mood_rating ?? 0), 0) / totalEntries : 0;
    const averageEnergy = totalEntries > 0 ? safe.reduce((sum, e) => sum + (e.energy_rating ?? 0), 0) / totalEntries : 0;
    const _triggerCounts = calculateTriggerCounts(safe);
    const topTriggers = getTopTriggers(_triggerCounts);

    return {
      totalEntries,
      averageMood: averageMood.toFixed(1),
      averageEnergy: averageEnergy.toFixed(1),
      streakDays: calculateStreak(safe),
      topTriggers
    };
  }, [filteredEntries]);
}
