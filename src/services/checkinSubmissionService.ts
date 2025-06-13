
import { supabase } from '@/integrations/supabase/client';
import { CheckinResponses, CheckinData } from '@/types/dailyCheckIn';
import { toast } from 'sonner';

export const checkinSubmissionService = {
  prepareCheckinData: (
    userId: string, 
    date: string, 
    responses: CheckinResponses
  ): CheckinData => {
    return {
      user_id: userId,
      checkin_date: date,
      mood_rating: responses.mood,
      energy_rating: responses.energy,
      hope_rating: responses.hope,
      sobriety_confidence: responses.sobriety_confidence,
      recovery_importance: responses.recovery_importance,
      recovery_strength: responses.recovery_strength?.toString() || null,
      support_needed: responses.support_needed?.toString() || 'false',
      phq2_q1_response: responses.phq2_q1,
      phq2_q2_response: responses.phq2_q2,
      phq2_score: (responses.phq2_q1 || 0) + (responses.phq2_q2 || 0),
      gad2_q1_response: responses.gad2_q1,
      gad2_q2_response: responses.gad2_q2,
      gad2_score: (responses.gad2_q1 || 0) + (responses.gad2_q2 || 0),
      completed_sections: JSON.stringify(['mood', 'wellness', 'assessments']),
      is_complete: true
    };
  },

  submitCheckin: async (checkinData: CheckinData) => {
    console.log('Prepared checkin data:', checkinData);

    const { data, error } = await supabase
      .from('daily_checkins')
      .upsert(checkinData, {
        onConflict: 'user_id,checkin_date'
      })
      .select();

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    console.log('Successfully saved check-in:', data);
    return data;
  },

  showSuccessMessage: () => {
    toast.success('Daily check-in completed successfully!', {
      description: "Great job completing today's check-in. Come back tomorrow!",
      duration: 4000
    });
  },

  showErrorMessage: (errorMessage: string, retryCallback: () => void) => {
    toast.error('Failed to complete check-in', {
      description: "There was a problem saving your check-in. Your responses are saved and you can try again.",
      duration: 8000,
      action: {
        label: "Retry",
        onClick: retryCallback
      }
    });
  }
};
