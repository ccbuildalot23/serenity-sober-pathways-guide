
import { useState, useMemo } from 'react';

interface MoodEntry {
  id: string;
  date: Date;
  mood_rating: number;
  energy_rating: number;
  triggers: string[];
  gratitude: string[];
  notes: string;
  created_at: Date;
}

export function useCalendarFilters(entries: MoodEntry[]) {
  const [filters, setFilters] = useState({
    minMood: 1,
    maxMood: 10,
    triggers: [] as string[],
    searchTerm: '',
  });

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Mood filter
      if (entry.mood_rating < filters.minMood || entry.mood_rating > filters.maxMood) {
        return false;
      }

      // Trigger filter
      if (filters.triggers.length > 0) {
        const hasMatchingTrigger = entry.triggers.some(trigger =>
          filters.triggers.includes(trigger)
        );
        if (!hasMatchingTrigger) return false;
      }

      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesNotes = entry.notes.toLowerCase().includes(searchLower);
        const matchesGratitude = entry.gratitude.some(g =>
          g.toLowerCase().includes(searchLower)
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
