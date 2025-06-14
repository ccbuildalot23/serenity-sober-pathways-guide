
export interface CheckinResponses {
  mood: number | null;
  energy: number | null;
  hope: number | null;
  sobriety_confidence: number | null;
  recovery_importance: number | null;
  recovery_strength: string | null;
  support_needed: boolean;
  phq2_q1: number | null;
  phq2_q2: number | null;
  gad2_q1: number | null;
  gad2_q2: number | null;
  notes?: string;
  mood_triggers?: string[];
  gratitude_entries?: string[];
}

export interface CheckinDraft {
  responses: CheckinResponses;
  completedSections: string[];
  timestamp: string;
}

export interface CheckinData {
  user_id: string;
  checkin_date: string;
  mood_rating: number | null;
  energy_rating: number | null;
  hope_rating: number | null;
  sobriety_confidence: number | null;
  recovery_importance: number | null;
  recovery_strength: string | null;
  support_needed: string;
  phq2_q1_response: number | null;
  phq2_q2_response: number | null;
  phq2_score: number;
  gad2_q1_response: number | null;
  gad2_q2_response: number | null;
  gad2_score: number;
  completed_sections: string;
  is_complete: boolean;
  notes?: string;
}

export interface MoodTrigger {
  id: string;
  checkin_id: string;
  trigger_name: string;
  created_at: string;
}

export interface GratitudeEntry {
  id: string;
  checkin_id: string;
  gratitude_text: string;
  created_at: string;
}
