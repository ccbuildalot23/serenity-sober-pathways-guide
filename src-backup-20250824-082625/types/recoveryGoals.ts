
export interface RecoveryGoal {
  id: string;
  title: string;
  description: string;
  category: 'sobriety' | 'health' | 'relationships' | 'career' | 'personal' | 'spiritual';
  priority: 'low' | 'medium' | 'high';
  target_date: string;
  target_value?: number;
  current_value?: number;
  unit?: string;
  milestones: Milestone[];
  progress: number;
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  created_at: string;
  completed_at?: string;
  tags: string[];
  accountability_partner_id?: string;
  reminder_frequency: 'daily' | 'weekly' | 'monthly' | 'none';
  next_reminder?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description?: string;
  target_value?: number;
  target_date?: string;
  completed: boolean;
  completed_at?: string;
  celebration_message?: string;
  reward?: string;
}

export interface GoalProgress {
  id: string;
  goal_id: string;
  date: string;
  value: number;
  notes?: string;
  mood_rating?: number;
  confidence_rating?: number;
  created_at: string;
}

export interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  category: RecoveryGoal['category'];
  suggested_milestones: Omit<Milestone, 'id' | 'completed' | 'completed_at'>[];
  default_duration_days: number;
  tags: string[];
}

export interface CreateGoalData {
  title: string;
  description: string;
  category: RecoveryGoal['category'];
  priority: RecoveryGoal['priority'];
  target_date: string;
  target_value?: number;
  unit?: string;
  milestones?: Omit<Milestone, 'id' | 'completed' | 'completed_at'>[];
  tags?: string[];
  accountability_partner_id?: string;
  reminder_frequency?: RecoveryGoal['reminder_frequency'];
}

export interface UpdateProgressData {
  value: number;
  notes?: string;
  mood_rating?: number;
  confidence_rating?: number;
}
