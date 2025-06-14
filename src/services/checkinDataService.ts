
import { supabase } from '@/integrations/supabase/client';
import { CheckinResponses } from '@/types/dailyCheckIn';

export const checkinDataService = {
  async loadExistingCheckin(userId: string, checkinDate: string) {
    try {
      const { data: existingCheckin, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .eq('checkin_date', checkinDate)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading existing check-in:', error);
        return { existingCheckin: null, responses: null, completedSections: new Set() };
      }

      if (!existingCheckin) {
        return { existingCheckin: null, responses: null, completedSections: new Set() };
      }

      // Load mood triggers and gratitude entries
      const [triggersResponse, gratitudeResponse] = await Promise.all([
        supabase
          .from('mood_triggers')
          .select('trigger_name')
          .eq('checkin_id', existingCheckin.id),
        supabase
          .from('gratitude_entries')
          .select('gratitude_text')
          .eq('checkin_id', existingCheckin.id)
      ]);

      const mood_triggers = triggersResponse.data?.map(t => t.trigger_name) || [];
      const gratitude_entries = gratitudeResponse.data?.map(g => g.gratitude_text) || [];

      // Convert database format to form responses
      const responses: CheckinResponses = {
        mood: existingCheckin.mood_rating,
        energy: existingCheckin.energy_rating,
        hope: existingCheckin.hope_rating,
        sobriety_confidence: existingCheckin.sobriety_confidence,
        recovery_importance: existingCheckin.recovery_importance,
        recovery_strength: existingCheckin.recovery_strength,
        support_needed: existingCheckin.support_needed === 'yes',
        phq2_q1: existingCheckin.phq2_q1_response,
        phq2_q2: existingCheckin.phq2_q2_response,
        gad2_q1: existingCheckin.gad2_q1_response,
        gad2_q2: existingCheckin.gad2_q2_response,
        notes: existingCheckin.notes,
        mood_triggers,
        gratitude_entries
      };

      const completedSections = new Set(
        typeof existingCheckin.completed_sections === 'string'
          ? JSON.parse(existingCheckin.completed_sections)
          : Array.isArray(existingCheckin.completed_sections)
          ? existingCheckin.completed_sections
          : []
      );

      return { existingCheckin, responses, completedSections };
    } catch (error) {
      console.error('Error in loadExistingCheckin:', error);
      return { existingCheckin: null, responses: null, completedSections: new Set() };
    }
  }
};
