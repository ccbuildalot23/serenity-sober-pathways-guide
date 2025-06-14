
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

  // Mock data for demo
  const getMockData = (): MoodEntry[] => {
    const today = new Date();
    const entries: MoodEntry[] = [];
    
    for (let i = 0; i < 15; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      entries.push({
        id: `mock-${i}`,
        date: date,
        mood_rating: Math.floor(Math.random() * 5) + 5,
        energy_rating: Math.floor(Math.random() * 5) + 5,
        triggers: i % 3 === 0 ? ['Work stress', 'Poor sleep'] : [],
        gratitude: i % 2 === 0 ? ['Family time', 'Good weather'] : [],
        notes: i % 4 === 0 ? 'Had a good day overall' : '',
        created_at: date
      });
    }
    
    return entries;
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
