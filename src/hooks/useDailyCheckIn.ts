
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CheckinResponses } from '@/types/dailyCheckIn';
import { checkinStorage } from '@/utils/checkinStorage';
import { checkinValidation } from '@/utils/checkinValidation';
import { checkinSubmissionService } from '@/services/checkinSubmissionService';
import { checkinDataService } from '@/services/checkinDataService';

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
    notes: '',
    mood_triggers: [],
    gratitude_entries: []
  });
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingCheckin, setExistingCheckin] = useState<any>(null);
  const [lastSubmissionError, setLastSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    const todayDate = new Date().toISOString().slice(0, 10);
    setToday(todayDate);
    loadExistingCheckin(todayDate);
    loadDraftResponses(todayDate);
  }, [user]);

  // Auto-save draft responses whenever they change
  useEffect(() => {
    if (today && !existingCheckin) {
      checkinStorage.saveDraft(today, responses, completedSections);
    }
  }, [responses, today, existingCheckin, completedSections]);

  const loadExistingCheckin = async (checkinDate: string) => {
    if (!user) return;

    const result = await checkinDataService.loadExistingCheckin(user.id, checkinDate);
    
    if (result.existingCheckin) {
      setExistingCheckin(result.existingCheckin);
      if (result.responses) {
        setResponses(result.responses);
      }
      // Fix the type casting issue here
      setCompletedSections(new Set(Array.from(result.completedSections).map(String)));
      // Clear draft if check-in is complete
      checkinStorage.clearDraft(checkinDate);
    }
  };

  const loadDraftResponses = (checkinDate: string) => {
    if (existingCheckin) return;
    
    const draft = checkinStorage.loadDraft(checkinDate);
    if (draft) {
      setResponses(prev => ({ ...prev, ...draft.responses }));
      setCompletedSections(new Set(draft.completedSections || []));
    }
  };

  const markSectionComplete = (section: string) => {
    console.log('Marking section complete:', section, 'Current responses:', responses);
    setCompletedSections(prev => {
      const newSet = new Set(prev);
      
      if (checkinValidation.validateSectionCompletion(section, responses)) {
        newSet.add(section);
        console.log(`${section} section completed`);
      }
      
      console.log('Updated completed sections:', Array.from(newSet));
      return newSet;
    });
  };

  const canComplete = () => {
    const isComplete = checkinValidation.canComplete(completedSections);
    console.log('Can complete check:', isComplete, 'Completed sections:', Array.from(completedSections));
    return isComplete;
  };

  const validateCompletion = () => {
    return checkinValidation.validateCompletion(completedSections);
  };

  const handleComplete = async (isRetry: boolean = false) => {
    console.log('Starting check-in completion...', { canComplete: canComplete(), user: !!user });
    
    if (!user) {
      checkinSubmissionService.showErrorMessage('You must be logged in to complete a check-in', () => {});
      return false;
    }
    
    if (!canComplete()) {
      validateCompletion();
      return false;
    }

    try {
      setIsSubmitting(true);
      setLastSubmissionError(null);
      
      console.log('Submitting check-in data:', responses);
      
      const checkinData = checkinSubmissionService.prepareCheckinData(user.id, today, responses);
      await checkinSubmissionService.submitCheckin(checkinData, responses);

      // Mark as completed
      setExistingCheckin(checkinData);
      setCompletedSections(new Set(['mood', 'wellness', 'assessments']));
      
      // Save to localStorage as backup
      checkinStorage.saveCompleted(today, checkinData);
      
      // Clear draft
      checkinStorage.clearDraft(today);
      
      checkinSubmissionService.showSuccessMessage();
      return true;
      
    } catch (error) {
      console.error('Error completing check-in:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setLastSubmissionError(errorMessage);
      
      checkinSubmissionService.showErrorMessage(errorMessage, () => handleComplete(true));
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
    existingCheckin,
    lastSubmissionError
  };
};
