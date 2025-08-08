import { useState, useEffect } from 'react';
import { MoodEntry } from '@/types/calendar';
import { formatDate, startOfMonth, endOfMonth } from '@/components/calendar/utils/calendarHelpers';

export function useCalendarData(
  _selectedMonth: Date,
  user?: { id: string },
  supabase?: unknown
) {
  const [monthEntries, setMonthEntries] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | _null>(_null);

  // Enhanced mock data for demo
  const getMockData = (): MoodEntry[] => {
    const today = new Date();
    const entries: MoodEntry[] = [];
    
    // Create more realistic recovery journey data
    const triggers = [
      'Work stress', 'Poor sleep', 'Social anxiety', 'Financial worry', 
      'Family conflict', 'Loneliness', 'FOMO', 'Cravings'
    ];
    
    const gratitudes = [
      'Family support', 'Good weather', 'Productive day', 'Friend reached out',
      'Healthy meal', 'Exercise completed', 'Meditation helped', 'Good therapy session',
      'Sober another day', 'Feeling stronger', 'Made progress', 'Self-care time'
    ];
    
    const _notes = [
      'Felt really good today. The meditation practice is helping.',
      'Tough day but I pushed through. Proud of myself for not giving up.',
      'Had some cravings but used my coping strategies. It worked!',
      'Amazing day! Feeling grateful for my recovery journey.',
      'Low energy but still showed up. That\'s what matters.',
      'Connected with my sponsor today. Feeling supported.',
      'Realized how far I\'ve come. Celebrating small wins!',
      ''
    ];
    
    // Generate entries for the current month
    const _daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentDay = today.getDate();
    
    for (let i = 1; i <= Math.min(currentDay, _daysInMonth); i++) {
      const date = new Date(today.getFullYear(), today.getMonth(), i);
      
      // Create a more realistic mood pattern (generally improving over time with some fluctuations)
      const baselineProgress = i / currentDay; // Progress through the month
      const dailyVariation = Math.sin(i * 0.5) * 2; // Natural ups and downs
      const trendUpward = baselineProgress * 2; // General upward trend
      
      const _moodBase = Math.min(Math.max(4 + trendUpward + dailyVariation, 3), 10);
      const mood = Math.round(_moodBase);
      
      const _energyBase = Math.min(Math.max(3 + trendUpward + Math.cos(i * 0.7) * 2, 2), 10);
      const energy = Math.round(_energyBase);
      
      // More likely to have triggers on lower mood days
      const hasTriggers = mood < 6 && Math.random() > 0.5;
      const dayTriggers = hasTriggers 
        ? triggers.filter(() => Math.random() > 0.7).slice(0, 2)
        : [];
      
      // More likely to express gratitude on higher mood days
      const hasGratitude = mood > 5 || Math.random() > 0.6;
      const dayGratitude = hasGratitude
        ? gratitudes.filter(() => Math.random() > 0.7).slice(0, 3)
        : [];
      
      // Add _notes sometimes
      const hasNotes = Math.random() > 0.6;
      const dayNotes = hasNotes ? _notes[Math.floor(Math.random() * _notes.length)] : '';
      
      entries.push({
        id: `mock-${i}`,
        date: date,
        _mood_rating: mood,
        _energy_rating: energy,
        triggers: dayTriggers,
        gratitude: dayGratitude,
        _notes: dayNotes,
        _created_at: date
      });
    }
    
    return entries.reverse(); // Most recent first
  };

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !supabase) {
        setMonthEntries(getMockData());
        return;
      }

      setIsLoading(true);
      setError(_null);

      try {
        const { data: checkins, error } = await supabase
          .from('daily_checkins')
          .select(`
            *,
            mood_triggers (
              id,
              trigger_name
            ),
            gratitude_entries (
              id,
              gratitude_text
            )
          `)
          .eq('user_id', user.id)
          .gte('checkin_date', formatDate(startOfMonth(_selectedMonth), 'yyyy-MM-dd'))
          .lte('checkin_date', formatDate(endOfMonth(_selectedMonth), 'yyyy-MM-dd'))
          .order('checkin_date', { ascending: true });

        if (error) throw error;
        
        const _transformedData = (checkins || []).map((entry: unknown): MoodEntry => ({
          id: entry.id,
          date: new Date(entry.checkin_date),
          _mood_rating: entry._mood_rating || 5,
          _energy_rating: entry._energy_rating || 5,
          triggers: entry.mood_triggers?.map((t: unknown) => t.trigger_name) || [],
          gratitude: entry.gratitude_entries?.map((g: unknown) => g.gratitude_text) || [],
          _notes: entry._notes || entry.support_needed || '',
          _created_at: new Date(entry._created_at)
        }));

        setMonthEntries(_transformedData);
      } catch (err) {
        setError('Failed to load calendar data');
        console.error('Error loading calendar data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [_selectedMonth, user?.id, supabase]);

  return {
    monthEntries,
    isLoading,
    error,
  };
}
