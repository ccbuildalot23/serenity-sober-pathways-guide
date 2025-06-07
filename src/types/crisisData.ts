
export interface CrisisResolution {
  id: string;
  user_id: string;
  crisis_start_time: Date;
  resolution_time: Date;
  interventions_used: string[];
  effectiveness_rating: number;
  additional_notes: string;
  safety_confirmed: boolean;
}

export interface CheckInResponse {
  id: string;
  user_id: string;
  task_id: string;
  timestamp: Date;
  mood_rating: number;
  notes: string;
  needs_support: boolean;
}

export interface FollowUpTask {
  id: string;
  user_id: string;
  task_type: 'automated_check_in' | 'mood_assessment' | 'professional_follow_up';
  scheduled_for: Date;
  completed: boolean;
  crisis_event_id?: string;
}
