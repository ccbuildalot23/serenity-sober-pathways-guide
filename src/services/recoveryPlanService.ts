import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecoveryPlanTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  template_data: any;
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
  user_id: string;
  template_id: string | null;
  title: string;
  description: string | null;
  status: string;
  start_date: string | null;
  target_completion_date: string | null;
  completion_percentage: number | null;
  plan_data: any;
  clinical_notes: string | null;
  shared_with_provider: boolean | null;
  shared_with_partners: any | null;
  created_at: string;
  updated_at: string;
}

export interface RecoveryPlanGoal {
  id: string;
  plan_id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  goal_type: string;
  target_value: number | null;
  current_value: number | null;
  unit_of_measure: string | null;
  status: string;
  due_date: string | null;
  reminder_frequency: string | null;
  notes: string | null;
  priority_order: number | null;
  completion_date: string | null;
  next_reminder_date: string | null;
  smart_criteria: any;
  created_at: string;
  updated_at: string;
}

export interface RecoveryMilestone {
  id: string;
  plan_id: string;
  user_id: string;
  goal_id: string | null;
  title: string;
  description: string | null;
  milestone_date: string;
  is_achieved: boolean | null;
  achieved_date: string | null;
  celebration_type: string | null;
  celebration_data: any | null;
  achievement_criteria: string | null;
  created_at: string;
}

export class RecoveryPlanService {
  static async getTemplates() {
    // For now, return empty array since table doesn't exist yet
    return [];
  }

  static async getUserPlans(userId: string) {
    const { data, error } = await supabase
      .from('user_recovery_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user plans:', error);
      toast.error('Failed to load your recovery plans');
      return [];
    }

    return data || [];
  }

  static async createPlan(userId: string, planData: any) {
    const { data, error } = await supabase
      .from('user_recovery_plans')
      .insert({
        user_id: userId,
        title: planData.title || 'New Recovery Plan',
        description: planData.description,
        start_date: planData.start_date,
        target_completion_date: planData.target_completion_date,
        template_id: planData.template_id,
        completion_percentage: 0,
        status: 'draft',
        clinical_notes: '',
        plan_data: planData.plan_data || {},
        shared_with_provider: false,
        shared_with_partners: null
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

  static async updatePlan(planId: string, updates: any) {
    const { error } = await supabase
      .from('user_recovery_plans')
      .update(updates)
      .eq('id', planId);

    if (error) {
      console.error('Error updating plan:', error);
      toast.error('Failed to update recovery plan');
      return false;
    }

    toast.success('Recovery plan updated successfully!');
    return true;
  }

  static async getPlanGoals(planId: string) {
    const { data, error } = await supabase
      .from('recovery_plan_goals')
      .select('*')
      .eq('plan_id', planId)
      .order('priority_order', { ascending: false })
      .order('created_at');

    if (error) {
      console.error('Error fetching plan goals:', error);
      return [];
    }

    return data || [];
  }

  static async createGoal(goalData: any) {
    const { data, error } = await supabase
      .from('recovery_plan_goals')
      .insert({
        plan_id: goalData.plan_id,
        user_id: goalData.user_id,
        title: goalData.title,
        description: goalData.description,
        category: goalData.category,
        goal_type: goalData.goal_type || 'general',
        target_value: goalData.target_value,
        current_value: goalData.current_value || 0,
        unit_of_measure: goalData.unit_of_measure,
        status: goalData.status || 'pending',
        due_date: goalData.due_date,
        reminder_frequency: goalData.reminder_frequency || 'weekly',
        notes: goalData.notes,
        priority_order: goalData.priority_order || 1,
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

  static async updateGoal(goalId: string, updates: any) {
    const { error } = await supabase
      .from('recovery_plan_goals')
      .update(updates)
      .eq('id', goalId);

    if (error) {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal');
      return false;
    }

    return true;
  }

  static async getPlanMilestones(planId: string) {
    const { data, error } = await supabase
      .from('recovery_milestones')
      .select('*')
      .eq('plan_id', planId)
      .order('milestone_date');

    if (error) {
      console.error('Error fetching milestones:', error);
      return [];
    }

    return data || [];
  }

  static async createMilestone(milestoneData: any) {
    const { data, error } = await supabase
      .from('recovery_milestones')
      .insert({
        plan_id: milestoneData.plan_id,
        user_id: milestoneData.user_id,
        title: milestoneData.title,
        description: milestoneData.description,
        milestone_date: milestoneData.milestone_date,
        goal_id: milestoneData.goal_id,
        is_achieved: false,
        celebration_type: milestoneData.celebration_type || 'notification',
        celebration_data: milestoneData.celebration_data || {},
        achievement_criteria: milestoneData.achievement_criteria
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

  static async completeMilestone(milestoneId: string) {
    const { error } = await supabase
      .from('recovery_milestones')
      .update({
        is_achieved: true,
        achieved_date: new Date().toISOString()
      })
      .eq('id', milestoneId);

    if (error) {
      console.error('Error completing milestone:', error);
      toast.error('Failed to complete milestone');
      return false;
    }

    toast.success('🎉 Milestone completed! Great progress!');
    return true;
  }

  static async shareWithProvider(planId: string, providerEmail: string, accessLevel: string, userId: string) {
    const { error } = await supabase
      .from('provider_plan_access')
      .insert({
        plan_id: planId,
        user_id: userId,
        provider_email: providerEmail,
        access_level: accessLevel,
        invitation_sent_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error sharing with provider:', error);
      toast.error('Failed to share plan with provider');
      return false;
    }

    toast.success('Plan shared with provider successfully!');
    return true;
  }

  static async calculateProgress(planId: string) {
    const goals = await this.getPlanGoals(planId);
    const milestones = await this.getPlanMilestones(planId);

    if (goals.length === 0 && milestones.length === 0) return 0;

    const completedGoals = goals.filter((g: any) => g.status === 'completed').length;
    const completedMilestones = milestones.filter((m: any) => m.is_achieved).length;
    
    const goalProgress = goals.length > 0 ? (completedGoals / goals.length) * 0.7 : 0;
    const milestoneProgress = milestones.length > 0 ? (completedMilestones / milestones.length) * 0.3 : 0;

    return Math.round((goalProgress + milestoneProgress) * 100);
  }

  static async createPlanFromTemplate(userId: string, templateId: string, customizations: {
    title?: string;
    start_date: string;
    target_completion_date: string;
  }) {
    // For now, return null since templates don't exist yet
    toast.error('Templates not available yet');
    return null;
  }
}