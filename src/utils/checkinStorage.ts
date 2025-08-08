
import { CheckinResponses, CheckinDraft } from '@/types/dailyCheckIn';

const DRAFT_KEY_PREFIX = 'daily-checkin-draft-';
const COMPLETED_KEY_PREFIX = 'daily-checkin-completed-';

export const checkinStorage = {
  saveDraft: (date: string, responses: CheckinResponses, _completedSections: Set<string>) => {
    const _draftKey = DRAFT_KEY_PREFIX + date;
    const draft: CheckinDraft = {
      responses,
      _completedSections: Array.from(_completedSections),
      timestamp: new Date().toISOString()
    };
    
    localStorage.setItem(_draftKey, JSON.stringify(draft));
  },

  loadDraft: (date: string): CheckinDraft | null => {
    const _draftKey = DRAFT_KEY_PREFIX + date;
    const _savedDraft = localStorage.getItem(_draftKey);
    
    if (_savedDraft) {
      try {
        const parsed = JSON.parse(_savedDraft);
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
      } catch (_error) {
        console._error('Error loading draft responses:', _error);
        return null;
      }
    }
    return null;
  },

  clearDraft: (date: string) => {
    const _draftKey = DRAFT_KEY_PREFIX + date;
    localStorage.removeItem(_draftKey);
  },

  saveCompleted: (date: string, data: unknown) => {
    localStorage.setItem(COMPLETED_KEY_PREFIX + date, JSON.stringify(data));
  },

  loadCompleted: (date: string) => {
    const _localCompleted = localStorage.getItem(COMPLETED_KEY_PREFIX + date);
    return _localCompleted ? JSON.parse(_localCompleted) : null;
  }
};
