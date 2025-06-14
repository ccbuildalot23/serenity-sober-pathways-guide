
import { CheckinResponses, CheckinDraft } from '@/types/dailyCheckIn';

const DRAFT_KEY_PREFIX = 'daily-checkin-draft-';
const COMPLETED_KEY_PREFIX = 'daily-checkin-completed-';

export const checkinStorage = {
  saveDraft: (date: string, responses: CheckinResponses, completedSections: Set<string>) => {
    const draftKey = DRAFT_KEY_PREFIX + date;
    const draft: CheckinDraft = {
      responses,
      completedSections: Array.from(completedSections),
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(draftKey, JSON.stringify(draft));
  },

  loadDraft: (date: string): CheckinDraft | null => {
    const draftKey = DRAFT_KEY_PREFIX + date;
    const savedDraft = localStorage.getItem(draftKey);
    
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        // Ensure new fields have default values
        return {
          ...parsed,
          responses: {
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
            gratitude_entries: [],
            ...parsed.responses
          }
        };
      } catch (error) {
        console.error('Error loading draft responses:', error);
        return null;
      }
    }
    return null;
  },

  clearDraft: (date: string) => {
    const draftKey = DRAFT_KEY_PREFIX + date;
    localStorage.removeItem(draftKey);
  },

  saveCompleted: (date: string, data: any) => {
    localStorage.setItem(COMPLETED_KEY_PREFIX + date, JSON.stringify(data));
  },

  loadCompleted: (date: string) => {
    const localCompleted = localStorage.getItem(COMPLETED_KEY_PREFIX + date);
    return localCompleted ? JSON.parse(localCompleted) : null;
  }
};
