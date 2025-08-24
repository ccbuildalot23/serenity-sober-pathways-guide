
import { useState, useMemo } from 'react';
import { MoodEntry } from '@/types/calendar';

export function useCalendarFilters(entries: MoodEntry[] = []) {
  const [filters, setFilters] = useState({
    minMood: 1,
    maxMood: 10,
    triggers: [] as string[],
    searchTerm: '',
  });

  const filteredEntries = useMemo(() => {
    const safe = Array.isArray(entries) ? entries : [];
    return safe.filter(entry => {
      // Mood filter
      if ((entry.mood_rating ?? 0) < filters.minMood || (entry.mood_rating ?? 0) > filters.maxMood) {
        return false;
      }

      // Trigger filter
      if (filters.triggers.length > 0) {
        const hasMatchingTrigger = (entry.triggers || []).some(trigger =>
          filters.triggers.includes(trigger)
        );
        if (!hasMatchingTrigger) return false;
      }

      // Search filter
      if (filters.searchTerm) {
        const _searchLower = filters.searchTerm.toLowerCase();
        const matchesNotes = (entry.notes || '').toLowerCase().includes(_searchLower);
        const matchesGratitude = (entry.gratitude || []).some(g =>
          g.toLowerCase().includes(_searchLower)
        );
        if (!matchesNotes && !matchesGratitude) return false;
      }

      return true;
    });
  }, [entries, filters]);

  return {
    filters,
    setFilters,
    filteredEntries,
  };
}
