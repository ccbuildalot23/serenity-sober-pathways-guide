import { useState, useEffect } from 'react';
import { MoodEntry } from '@/types/calendar';
import { formatDate, startOfMonth, endOfMonth } from '@/components/calendar/utils/calendarHelpers';

export function useCalendarData(
  selectedMonth: Date,
  user?: { id: string },
  supabase?: any
) {
  const [monthEntries, setMonthEntries] = useState<MoodEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    
    const notes = [
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
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentDay = today.getDate();
    
    for (let i = 1; i <= Math.min(currentDay, daysInMonth); i++) {
      const date = new Date(today.getFullYear(), today.getMonth(), i);
      
      // Create a more realistic mood pattern (generally improving over time with some fluctuations)
      const baselineProgress = i / currentDay; // Progress through the month
      const dailyVariation = Math.sin(i * 0.5) * 2; // Natural ups and downs
      const trendUpward = baselineProgress * 2; // General upward trend
      
      const moodBase = Math.min(Math.max(4 + trendUpward + dailyVariation, 3), 10);
      const mood = Math.round(moodBase);
      
      const energyBase = Math.min(Math.max(3 + trendUpward + Math.cos(i * 0.7) * 2, 2), 10);
      const energy = Math.round(energyBase);
      
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
      
      // Add notes sometimes
      const hasNotes = Math.random() > 0.6;
      const dayNotes = hasNotes ? notes[Math.floor(Math.random() * notes.length)] : '';
      
      entries.push({
        id: `mock-${i}`,
        date: date,
        mood_rating: mood,
        energy_rating: energy,
        triggers: dayTriggers,
        gratitude: dayGratitude,
        notes: dayNotes,
        created_at: date
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
      setError(null);

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
          .gte('checkin_date', formatDate(startOfMonth(selectedMonth), 'yyyy-MM-dd'))
          .lte('checkin_date', formatDate(endOfMonth(selectedMonth), 'yyyy-MM-dd'))
          .order('checkin_date', { ascending: true });

        if (error) throw error;
        
        const transformedData = (checkins || []).map((entry: any): MoodEntry => ({
          id: entry.id,
          date: new Date(entry.checkin_date),
          mood_rating: entry.mood_rating || 5,
          energy_rating: entry.energy_rating || 5,
          triggers: entry.mood_triggers?.map((t: any) => t.trigger_name) || [],
          gratitude: entry.gratitude_entries?.map((g: any) => g.gratitude_text) || [],
          notes: entry.notes || entry.support_needed || '',
          created_at: new Date(entry.created_at)
        }));

        setMonthEntries(transformedData);
      } catch (err) {
        setError('Failed to load calendar data');
        console.error('Error loading calendar data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth, user?.id, supabase]);

  return {
    monthEntries,
    isLoading,
    error,
  };
}
