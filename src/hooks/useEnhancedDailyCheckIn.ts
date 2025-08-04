import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CheckinResponses } from '@/types/dailyCheckIn';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseDailyCheckInReturn {
  responses: CheckinResponses;
  setResponses: React.Dispatch<React.SetStateAction<CheckinResponses>>;
  completedSections: Set<string>;
  markSectionComplete: (section: string) => void;
  canComplete: () => boolean;
  handleComplete: () => Promise<void>;
  isSubmitting: boolean;
  hasCheckedInToday: boolean;
  loading: boolean;
}

export const useEnhancedDailyCheckIn = (): UseDailyCheckInReturn => {
  const { user } = useAuth();
  const [responses, setResponses] = useState<CheckinResponses>({
    mood: null,
    energy: null,
    hope: null,
    sleep_quality: null,
    medication_taken: false,
    sobriety_confidence: null,
    recovery_importance: null,
    recovery_strength: null,
    support_needed: false,
    phq2_q1: null,
    phq2_q2: null,
    gad2_q1: null,
    gad2_q2: null,
    notes: '',
    mood_triggers: [],
    gratitude_entries: [],
    coping_strategies: []
  });
  
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user has already checked in today
  useEffect(() => {
    const checkTodayStatus = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('daily_checkins')
          .select('*')
          .eq('user_id', user.id)
          .eq('checkin_date', today)
          .eq('is_complete', true)
          .single();

        if (data && !error) {
          setHasCheckedInToday(true);
          // Load existing responses if found
          setResponses({
            mood: data.mood_rating,
            energy: data.energy_rating,
            hope: data.hope_rating,
            sleep_quality: data.sleep_quality,
            medication_taken: data.medication_taken,
            sobriety_confidence: data.sobriety_confidence,
            recovery_importance: data.recovery_importance,
            recovery_strength: data.recovery_strength,
            support_needed: data.support_needed === 'yes',
            phq2_q1: data.phq2_q1_response,
            phq2_q2: data.phq2_q2_response,
            gad2_q1: data.gad2_q1_response,
            gad2_q2: data.gad2_q2_response,
            notes: data.notes || '',
            mood_triggers: [],
            gratitude_entries: [],
            coping_strategies: []
          });
        } else {
          // Load draft if exists
          loadDraft();
        }
      } catch (error) {
        console.error('Error checking today status:', error);
        loadDraft();
      } finally {
        setLoading(false);
      }
    };

    checkTodayStatus();
  }, [user]);

  // Load draft from localStorage
  const loadDraft = () => {
    try {
      const draft = localStorage.getItem(`checkin_draft_${user?.id}`);
      if (draft) {
        const parsed = JSON.parse(draft);
        setResponses(parsed.responses || responses);
        setCompletedSections(new Set(parsed.completedSections || []));
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  };

  // Save draft to localStorage
  const saveDraft = useCallback(() => {
    if (!user) return;
    
    try {
      const draft = {
        responses,
        completedSections: Array.from(completedSections),
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(`checkin_draft_${user.id}`, JSON.stringify(draft));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  }, [responses, completedSections, user]);

  // Auto-save draft whenever responses change
  useEffect(() => {
    if (!hasCheckedInToday && user) {
      saveDraft();
    }
  }, [responses, saveDraft, hasCheckedInToday, user]);

  // Validate section completion
  useEffect(() => {
    const newCompletedSections = new Set<string>();

    // Mood section
    if (responses.mood !== null) {
      newCompletedSections.add('mood');
    }

    // Wellness section
    if (responses.energy !== null && 
        responses.hope !== null && 
        responses.sobriety_confidence !== null && 
        responses.recovery_importance !== null && 
        responses.recovery_strength !== null) {
      newCompletedSections.add('wellness');
    }

    // Assessments section
    if (responses.phq2_q1 !== null && 
        responses.phq2_q2 !== null && 
        responses.gad2_q1 !== null && 
        responses.gad2_q2 !== null) {
      newCompletedSections.add('assessments');
    }

    setCompletedSections(newCompletedSections);
  }, [responses]);

  const markSectionComplete = (section: string) => {
    setCompletedSections(prev => new Set([...prev, section]));
  };

  const canComplete = () => {
    return completedSections.size === 3 && 
           completedSections.has('mood') && 
           completedSections.has('wellness') && 
           completedSections.has('assessments');
  };

  const handleComplete = async () => {
    if (!user || !canComplete() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const checkinData = {
        user_id: user.id,
        checkin_date: today,
        mood_rating: responses.mood,
        energy_rating: responses.energy,
        hope_rating: responses.hope,
        sleep_quality: responses.sleep_quality,
        medication_taken: responses.medication_taken || false,
        sobriety_confidence: responses.sobriety_confidence,
        recovery_importance: responses.recovery_importance,
        recovery_strength: responses.recovery_strength,
        support_needed: responses.support_needed ? 'yes' : 'no',
        phq2_q1_response: responses.phq2_q1,
        phq2_q2_response: responses.phq2_q2,
        phq2_score: (responses.phq2_q1 || 0) + (responses.phq2_q2 || 0),
        gad2_q1_response: responses.gad2_q1,
        gad2_q2_response: responses.gad2_q2,
        gad2_score: (responses.gad2_q1 || 0) + (responses.gad2_q2 || 0),
        completed_sections: Array.from(completedSections).join(','),
        is_complete: true,
        notes: responses.notes
      };

      const { error } = await supabase
        .from('daily_checkins')
        .upsert(checkinData, {
          onConflict: 'user_id,checkin_date'
        });

      if (error) {
        throw error;
      }

      // Clear draft on successful submission
      localStorage.removeItem(`checkin_draft_${user.id}`);
      setHasCheckedInToday(true);
      
      toast.success('Check-in completed successfully!', {
        description: 'Your responses have been saved.',
        duration: 4000
      });

    } catch (error) {
      console.error('Error completing check-in:', error);
      toast.error('Failed to complete check-in', {
        description: 'Please try again.',
        duration: 4000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    responses,
    setResponses,
    completedSections,
    markSectionComplete,
    canComplete,
    handleComplete,
    isSubmitting,
    hasCheckedInToday,
    loading
  };
};