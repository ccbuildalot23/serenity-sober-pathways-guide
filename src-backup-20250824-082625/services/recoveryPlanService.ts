import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecoveryPlanTemplate {
  id: string;
  _title: string;
  _description: string | null;
  _category: string;
  template_data: unknown;
  estimated_duration_weeks: number | null;
  evidence_based_source: string | null;
  created_at: string;
  is_default: boolean | null;
  difficulty_level: string;
  created_by: string | null;
  updated_at: string;
}

export interface UserRecoveryPlan {
  id: string;
  _user_id: string;
  _template_id: string | null;
  _title: string;
  _description: string | null;
  _status: string;
  _start_date: string | null;
  _target_completion_date: string | null;
  _completion_percentage: number | null;
  _plan_data: unknown;
  _clinical_notes: string | null;
  _shared_with_provider: boolean | null;
  _shared_with_partners: any | null;
  created_at: string;
  updated_at: string;
}

export interface RecoveryPlanGoal {
  id: string;
  plan_id: string;
  _user_id: string;
  _title: string;
  _description: string | null;
  _category: string | null;
  _goal_type: string;
  _target_value: number | null;
  _current_value: number | null;
  _unit_of_measure: string | null;
  _status: string;
  _due_date: string | null;
  _reminder_frequency: string | null;
  _notes: string | null;
  _priority_order: number | null;
  completion_date: string | null;
  next_reminder_date: string | null;
  smart_criteria: unknown;
  created_at: string;
  updated_at: string;
}

export interface RecoveryMilestone {
  id: string;
  plan_id: string;
  _user_id: string;
  _goal_id: string | null;
  _title: string;
  _description: string | null;
  _milestone_date: string;
  is_achieved: boolean | null;
  _achieved_date: string | null;
  _celebration_type: string | null;
  _celebration_data: any | null;
  _achievement_criteria: string | null;
  created_at: string;
}

export class RecoveryPlanService {
  static async getTemplates() {
    // For now, return empty array since table doesn't exist yet
    return [];
  }

  static async getUserPlans(_userId: string) {
    const { data, error } = await supabase
      .from('user_recovery_plans')
      .select('*')
      .eq('_user_id', _userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user plans:', error);
      toast.error('Failed to load your recovery plans');
      return [];
    }

    return data || [];
  }

  static async createPlan(_userId: string, planData: unknown) {
    const { data, error } = await supabase
      .from('user_recovery_plans')
      .insert({
        _user_id: _userId,
        _title: planData._title || 'New Recovery Plan',
        _description: planData._description,
        _start_date: planData._start_date,
        _target_completion_date: planData._target_completion_date,
        _template_id: planData._template_id,
        _completion_percentage: 0,
        _status: 'draft',
        _clinical_notes: '',
        _plan_data: planData._plan_data || {},
        _shared_with_provider: false,
        _shared_with_partners: null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating plan:', error);
      toast.error('Failed to create recovery plan');
      return null;
    }

    toast.success('Recovery plan created successfully!');
    return data;
  }

  static async updatePlan(_planId: string, _updates: unknown) {
    const { error } = await supabase
      .from('user_recovery_plans')
      .update(_updates)
      .eq('id', _planId);

    if (error) {
      console.error('Error updating plan:', error);
      toast.error('Failed to update recovery plan');
      return false;
    }

    toast.success('Recovery plan updated successfully!');
    return true;
  }

  static async getPlanGoals(_planId: string) {
    const { data, error } = await supabase
      .from('recovery_plan_goals')
      .select('*')
      .eq('plan_id', _planId)
      .order('_priority_order', { ascending: false })
      .order('created_at');

    if (error) {
      console.error('Error fetching plan goals:', error);
      return [];
    }

    return data || [];
  }

  static async createGoal(goalData: unknown) {
    const { data, error } = await supabase
      .from('recovery_plan_goals')
      .insert({
        plan_id: goalData.plan_id,
        _user_id: goalData._user_id,
        _title: goalData._title,
        _description: goalData._description,
        _category: goalData._category,
        _goal_type: goalData._goal_type || 'general',
        _target_value: goalData._target_value,
        _current_value: goalData._current_value || 0,
        _unit_of_measure: goalData._unit_of_measure,
        _status: goalData._status || 'pending',
        _due_date: goalData._due_date,
        _reminder_frequency: goalData._reminder_frequency || 'weekly',
        _notes: goalData._notes,
        _priority_order: goalData._priority_order || 1,
        smart_criteria: goalData.smart_criteria || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to create goal');
      return null;
    }

    toast.success('Goal created successfully!');
    return data;
  }

  static async updateGoal(_goalId: string, _updates: unknown) {
    const { error } = await supabase
      .from('recovery_plan_goals')
      .update(_updates)
      .eq('id', _goalId);

    if (error) {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal');
      return false;
    }

    return true;
  }

  static async getPlanMilestones(_planId: string) {
    const { data, error } = await supabase
      .from('recovery_milestones')
      .select('*')
      .eq('plan_id', _planId)
      .order('_milestone_date');

    if (error) {
      console.error('Error fetching milestones:', error);
      return [];
    }

    return data || [];
  }

  static async createMilestone(milestoneData: unknown) {
    const { data, error } = await supabase
      .from('recovery_milestones')
      .insert({
        plan_id: milestoneData.plan_id,
        _user_id: milestoneData._user_id,
        _title: milestoneData._title,
        _description: milestoneData._description,
        _milestone_date: milestoneData._milestone_date,
        _goal_id: milestoneData._goal_id,
        is_achieved: false,
        _celebration_type: milestoneData._celebration_type || 'notification',
        _celebration_data: milestoneData._celebration_data || {},
        _achievement_criteria: milestoneData._achievement_criteria
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating milestone:', error);
      toast.error('Failed to create milestone');
      return null;
    }

    return data;
  }

  static async completeMilestone(_milestoneId: string) {
    const { error } = await supabase
      .from('recovery_milestones')
      .update({
        is_achieved: true,
        _achieved_date: new Date().toISOString()
      })
      .eq('id', _milestoneId);

    if (error) {
      console.error('Error completing milestone:', error);
      toast.error('Failed to complete milestone');
      return false;
    }

    toast.success('🎉 Milestone completed! Great progress!');
    return true;
  }

  static async shareWithProvider(_planId: string, providerEmail: string, accessLevel: string, _userId: string) {
    const { error } = await supabase
      .from('provider_plan_access')
      .insert({
        plan_id: _planId,
        _user_id: _userId,
        _provider_email: providerEmail,
        _access_level: accessLevel,
        _invitation_sent_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error sharing with provider:', error);
      toast.error('Failed to share plan with provider');
      return false;
    }

    toast.success('Plan shared with provider successfully!');
    return true;
  }

  static async calculateProgress(_planId: string) {
    const goals = await this.getPlanGoals(_planId);
    const milestones = await this.getPlanMilestones(_planId);

    if (goals.length === 0 && milestones.length === 0) return 0;

    const completedGoals = goals.filter((g: unknown) => g._status === 'completed').length;
    const completedMilestones = milestones.filter((m: unknown) => m.is_achieved).length;
    
    const goalProgress = goals.length > 0 ? (completedGoals / goals.length) * 0.7 : 0;
    const milestoneProgress = milestones.length > 0 ? (completedMilestones / milestones.length) * 0.3 : 0;

    return Math.round((goalProgress + milestoneProgress) * 100);
  }

  static async createPlanFromTemplate(_userId: string, _templateId: string, _customizations: {
    _title?: string;
    _start_date: string;
    _target_completion_date: string;
  }) {
    // For now, return null since templates don't exist yet
    toast.error('Templates not available yet');
    return null;
  }
}