
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CheckinResponses {
  mood: number | null;
  energy: number | null;
  hope: number | null;
  sobriety_confidence: number | null;
  recovery_importance: number | null;
  recovery_strength: number | null;
  support_needed: boolean;
  phq2_q1: number | null;
  phq2_q2: number | null;
  gad2_q1: number | null;
  gad2_q2: number | null;
}

const DRAFT_KEY_PREFIX = 'daily-checkin-draft-';
const COMPLETED_KEY_PREFIX = 'daily-checkin-completed-';

export const useDailyCheckIn = () => {
  const { user } = useAuth();
  const [today, setToday] = useState('');
  const [responses, setResponses] = useState<CheckinResponses>({
    mood: null,
    energy: null,
    hope: null,
    sobriety_confidence: null,
    recovery_importance: null,
    recovery_strength: null,
    support_needed: false,
    phq2_q1: null,
    phq2_q2: null,
    gad2_q1: null,
    gad2_q2: null,
  });
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingCheckin, setExistingCheckin] = useState<any>(null);

  useEffect(() => {
    const todayDate = new Date().toISOString().slice(0, 10);
    setToday(todayDate);
    loadExistingCheckin(todayDate);
    loadDraftResponses(todayDate);
  }, [user]);

  // Auto-save draft responses whenever they change
  useEffect(() => {
    if (today && !existingCheckin) {
      saveDraftResponses();
    }
  }, [responses, today, existingCheckin]);

  const loadExistingCheckin = async (checkinDate: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('checkin_date', checkinDate)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setExistingCheckin(data);
        setResponses({
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
        });
        
        if (data.completed_sections && typeof data.completed_sections === 'string') {
          const parsed = JSON.parse(data.completed_sections);
          if (Array.isArray(parsed)) {
            setCompletedSections(new Set(parsed.map(item => String(item))));
          }
        } else if (Array.isArray(data.completed_sections)) {
          setCompletedSections(new Set(data.completed_sections.map(item => String(item))));
        }
        
        // Clear draft if check-in is complete
        clearDraftResponses(checkinDate);
      }
    } catch (error) {
      console.error('Error loading existing check-in:', error);
      // Fallback to localStorage check
      const localCompleted = localStorage.getItem(COMPLETED_KEY_PREFIX + checkinDate);
      if (localCompleted) {
        setExistingCheckin(JSON.parse(localCompleted));
      }
    }
  };

  const loadDraftResponses = (checkinDate: string) => {
    if (existingCheckin) return;
    
    const draftKey = DRAFT_KEY_PREFIX + checkinDate;
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setResponses(prev => ({ ...prev, ...draft.responses }));
        setCompletedSections(new Set(draft.completedSections || []));
      } catch (error) {
        console.error('Error loading draft responses:', error);
      }
    }
  };

  const saveDraftResponses = () => {
    if (!today || existingCheckin) return;
    
    const draftKey = DRAFT_KEY_PREFIX + today;
    const draft = {
      responses,
      completedSections: Array.from(completedSections),
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(draftKey, JSON.stringify(draft));
  };

  const clearDraftResponses = (checkinDate: string) => {
    const draftKey = DRAFT_KEY_PREFIX + checkinDate;
    localStorage.removeItem(draftKey);
  };

  const markSectionComplete = (section: string) => {
    setCompletedSections(prev => {
      const newSet = new Set(prev);
      
      // Validate section completion
      if (section === 'mood' && responses.mood !== null) {
        newSet.add('mood');
      } else if (section === 'wellness' && 
        responses.energy !== null && 
        responses.hope !== null && 
        responses.sobriety_confidence !== null && 
        responses.recovery_importance !== null && 
        responses.recovery_strength !== null) {
        newSet.add('wellness');
      } else if (section === 'assessments' && 
        responses.phq2_q1 !== null && 
        responses.phq2_q2 !== null && 
        responses.gad2_q1 !== null && 
        responses.gad2_q2 !== null) {
        newSet.add('assessments');
      }
      
      return newSet;
    });
  };

  const canComplete = () => {
    return completedSections.size === 3 && 
           completedSections.has('mood') && 
           completedSections.has('wellness') && 
           completedSections.has('assessments');
  };

  const validateCompletion = () => {
    const missing = [];
    if (!completedSections.has('mood')) missing.push('Mood');
    if (!completedSections.has('wellness')) missing.push('Wellness');
    if (!completedSections.has('assessments')) missing.push('Assessments');
    
    if (missing.length > 0) {
      toast.error(`Please complete the following sections: ${missing.join(', ')}`);
      return false;
    }
    return true;
  };

  const handleComplete = async () => {
    if (!user || !canComplete()) {
      validateCompletion();
      return false;
    }

    try {
      setIsSubmitting(true);
      
      const checkinData = {
        user_id: user.id,
        checkin_date: today,
        mood_rating: responses.mood,
        energy_rating: responses.energy,
        hope_rating: responses.hope,
        sobriety_confidence: responses.sobriety_confidence,
        recovery_importance: responses.recovery_importance,
        recovery_strength: responses.recovery_strength?.toString() || null,
        support_needed: responses.support_needed?.toString() || null,
        phq2_q1_response: responses.phq2_q1,
        phq2_q2_response: responses.phq2_q2,
        phq2_score: (responses.phq2_q1 || 0) + (responses.phq2_q2 || 0),
        gad2_q1_response: responses.gad2_q1,
        gad2_q2_response: responses.gad2_q2,
        gad2_score: (responses.gad2_q1 || 0) + (responses.gad2_q2 || 0),
        completed_sections: JSON.stringify(Array.from(completedSections)),
        is_complete: true
      };

      const { error } = await supabase
        .from('daily_checkins')
        .upsert(checkinData);

      if (error) throw error;

      // Mark as completed
      setExistingCheckin(checkinData);
      setCompletedSections(new Set(['mood', 'wellness', 'assessments']));
      
      // Save to localStorage as backup
      localStorage.setItem(COMPLETED_KEY_PREFIX + today, JSON.stringify(checkinData));
      
      // Clear draft
      clearDraftResponses(today);
      
      toast.success('Daily check-in completed successfully!');
      return true;
      
    } catch (error) {
      console.error('Error completing check-in:', error);
      toast.error('Failed to complete check-in. Please try again.');
      return false;
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
    validateCompletion,
    handleComplete,
    isSubmitting,
    existingCheckin
  };
};
