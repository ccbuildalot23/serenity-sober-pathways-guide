
import { supabase } from '@/integrations/supabase/client';
import { CheckinData, CheckinResponses } from '@/types/dailyCheckIn';
import { toast } from 'sonner';

export const checkinSubmissionService = {
  prepareCheckinData: (userId: string, date: string, responses: CheckinResponses): CheckinData => {
    const phq2Score = (responses.phq2_q1 || 0) + (responses.phq2_q2 || 0);
    const gad2Score = (responses.gad2_q1 || 0) + (responses.gad2_q2 || 0);

    return {
      user_id: userId,
      checkin_date: date,
      mood_rating: responses.mood,
      energy_rating: responses.energy,
      hope_rating: responses.hope,
      sobriety_confidence: responses.sobriety_confidence,
      recovery_importance: responses.recovery_importance,
      recovery_strength: responses.recovery_strength,
      support_needed: responses.support_needed ? 'yes' : 'no',
      phq2_q1_response: responses.phq2_q1,
      phq2_q2_response: responses.phq2_q2,
      phq2_score: phq2Score,
      gad2_q1_response: responses.gad2_q1,
      gad2_q2_response: responses.gad2_q2,
      gad2_score: gad2Score,
      completed_sections: JSON.stringify(['mood', 'wellness', 'assessments']),
      is_complete: true,
      notes: responses.notes
    };
  },

  submitCheckin: async (checkinData: CheckinData, responses: CheckinResponses) => {
    // First, insert or update the main checkin record
    const { data: checkinResult, error: checkinError } = await supabase
      .from('daily_checkins')
      .upsert(checkinData, { 
        onConflict: 'user_id,checkin_date',
        ignoreDuplicates: false 
      })
      .select('id')
      .single();

    if (checkinError) throw checkinError;

    const checkinId = checkinResult.id;

    // Handle mood triggers
    if (responses.mood_triggers && responses.mood_triggers.length > 0) {
      // Delete existing triggers for this checkin
      await supabase
        .from('mood_triggers')
        .delete()
        .eq('checkin_id', checkinId);

      // Insert new triggers
      const triggerInserts = responses.mood_triggers.map(trigger => ({
        checkin_id: checkinId,
        trigger_name: trigger
      }));

      const { error: triggersError } = await supabase
        .from('mood_triggers')
        .insert(triggerInserts);

      if (triggersError) {
        console.error('Error saving mood triggers:', triggersError);
      }
    }

    // Handle gratitude entries
    if (responses.gratitude_entries && responses.gratitude_entries.length > 0) {
      // Delete existing gratitude entries for this checkin
      await supabase
        .from('gratitude_entries')
        .delete()
        .eq('checkin_id', checkinId);

      // Insert new gratitude entries
      const gratitudeInserts = responses.gratitude_entries.map(entry => ({
        checkin_id: checkinId,
        gratitude_text: entry
      }));

      const { error: gratitudeError } = await supabase
        .from('gratitude_entries')
        .insert(gratitudeInserts);

      if (gratitudeError) {
        console.error('Error saving gratitude entries:', gratitudeError);
      }
    }

    return checkinResult;
  },

  showSuccessMessage: () => {
    toast.success('Check-in completed successfully!', {
      description: 'Your daily check-in has been saved and will help track your recovery progress.',
      duration: 4000
    });
  },

  showErrorMessage: (message: string, retryFn: () => void) => {
    toast.error('Check-in failed', {
      description: message,
      action: {
        label: 'Retry',
        onClick: retryFn
      },
      duration: 6000
    });
  }
};
