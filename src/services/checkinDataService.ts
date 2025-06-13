
import { supabase } from '@/integrations/supabase/client';
import { CheckinResponses } from '@/types/dailyCheckIn';
import { checkinStorage } from '@/utils/checkinStorage';

export const checkinDataService = {
  loadExistingCheckin: async (userId: string, checkinDate: string) => {
    try {
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .eq('checkin_date', checkinDate)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        console.log('Loaded existing check-in:', data);
        return {
          existingCheckin: data,
          responses: {
            mood: data.mood_rating,
            energy: data.energy_rating,
            hope: data.hope_rating,
            sobriety_confidence: data.sobriety_confidence,
            recovery_importance: data.recovery_importance,
            recovery_strength: data.recovery_strength ? parseFloat(data.recovery_strength) : null,
            support_needed: typeof data.support_needed === 'boolean' ? data.support_needed : data.support_needed === 'true',
            phq2_q1: data.phq2_q1_response,
            phq2_q2: data.phq2_q2_response,
            gad2_q1: data.gad2_q1_response,
            gad2_q2: data.gad2_q2_response,
          } as CheckinResponses,
          completedSections: checkinDataService.parseCompletedSections(data.completed_sections)
        };
      }
    } catch (error) {
      console.error('Error loading existing check-in:', error);
      // Fallback to localStorage check
      const localCompleted = checkinStorage.loadCompleted(checkinDate);
      if (localCompleted) {
        return { existingCheckin: localCompleted, responses: null, completedSections: new Set<string>() };
      }
    }

    return { existingCheckin: null, responses: null, completedSections: new Set<string>() };
  },

  parseCompletedSections: (completedSections: any): Set<string> => {
    try {
      if (completedSections && typeof completedSections === 'string') {
        const parsed = JSON.parse(completedSections);
        if (Array.isArray(parsed)) {
          return new Set(parsed.map(item => String(item)));
        }
      } else if (Array.isArray(completedSections)) {
        return new Set(completedSections.map(item => String(item)));
      }
    } catch (error) {
      console.error('Error parsing completed sections:', error);
    }
    return new Set<string>();
  }
};
