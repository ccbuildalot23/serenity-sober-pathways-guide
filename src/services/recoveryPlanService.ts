import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecoveryPlanTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  template_data: any;
  estimated_duration_weeks: number;
  evidence_based_source: string;
  created_at: string;
  is_default: boolean;
  difficulty_level: string;
  created_by: string;
  updated_at: string;
}

export interface UserRecoveryPlan {
  id: string;
  user_id: string;
  template_id?: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
  start_date: string;
  target_completion_date: string;
  completion_percentage: number;
  plan_data: any;
  clinical_notes: string;
  shared_with_provider: boolean;
  shared_with_partners: any;
  created_at: string;
  updated_at: string;
}

export interface RecoveryPlanGoal {
  id: string;
  plan_id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  goal_type: string;
  target_value: number;
  current_value: number;
  unit: string;
  status: string;
  due_date: string;
  reminder_frequency: string;
  notes: string;
  priority_level: number;
  completion_date: string;
  next_reminder_date: string;
  created_at: string;
}

export interface RecoveryMilestone {
  id: string;
  plan_id: string;
  user_id: string;
  goal_id: string;
  title: string;
  description: string;
  milestone_date: string;
  is_achieved: boolean;
  achieved_date: string;
  celebration_type: string;
  celebration_data: any;
  achievement_criteria: string;
  created_at: string;
}

export class RecoveryPlanService {
  // Templates
  static async getTemplates(): Promise<RecoveryPlanTemplate[]> {
    const { data, error } = await supabase
      .from('recovery_plan_templates')
      .select('*')
      .eq('is_active', true)
      .order('title');

    if (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load recovery plan templates');
      return [];
    }

    return data || [];
  }

  // User Plans
  static async getUserPlans(userId: string): Promise<UserRecoveryPlan[]> {
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

  static async createPlan(userId: string, planData: Partial<UserRecoveryPlan>): Promise<UserRecoveryPlan | null> {
    const { data, error } = await supabase
      .from('user_recovery_plans')
      .insert({
        user_id: userId,
        ...planData,
        completion_percentage: 0,
        status: 'draft',
        clinical_notes: '',
        plan_data: {},
        shared_with_provider: false,
        shared_with_partners: {}
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

  static async updatePlan(planId: string, updates: Partial<UserRecoveryPlan>): Promise<boolean> {
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

  // Goals
  static async getPlanGoals(planId: string): Promise<RecoveryPlanGoal[]> {
    const { data, error } = await supabase
      .from('recovery_plan_goals')
      .select('*')
      .eq('plan_id', planId)
      .order('priority', { ascending: false })
      .order('created_at');

    if (error) {
      console.error('Error fetching plan goals:', error);
      return [];
    }

    return data || [];
  }

  static async createGoal(goalData: Partial<RecoveryPlanGoal>): Promise<RecoveryPlanGoal | null> {
    const { data, error } = await supabase
      .from('recovery_plan_goals')
      .insert({
        ...goalData,
        goal_type: goalData.category || 'general',
        user_id: goalData.user_id || '',
        target_value: goalData.target_value || 0,
        current_value: goalData.current_value || 0,
        unit: goalData.unit || '',
        status: goalData.status || 'pending',
        due_date: goalData.due_date || goalData.target_date || '',
        reminder_frequency: goalData.reminder_frequency || 'weekly',
        notes: goalData.notes || '',
        priority_level: goalData.priority_level || 1,
        completion_date: goalData.completion_date || '',
        next_reminder_date: goalData.next_reminder_date || ''
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

  static async updateGoal(goalId: string, updates: Partial<RecoveryPlanGoal>): Promise<boolean> {
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

  // Milestones
  static async getPlanMilestones(planId: string): Promise<RecoveryMilestone[]> {
    const { data, error } = await supabase
      .from('recovery_milestones')
      .select('*')
      .eq('plan_id', planId)
      .order('target_date');

    if (error) {
      console.error('Error fetching milestones:', error);
      return [];
    }

    return data || [];
  }

  static async createMilestone(milestoneData: Partial<RecoveryMilestone>): Promise<RecoveryMilestone | null> {
    const { data, error } = await supabase
      .from('recovery_milestones')
      .insert({
        ...milestoneData,
        milestone_date: milestoneData.milestone_date || milestoneData.target_date || '',
        user_id: milestoneData.user_id || '',
        goal_id: milestoneData.goal_id || '',
        is_achieved: false,
        achieved_date: '',
        celebration_type: 'notification',
        celebration_data: {},
        achievement_criteria: ''
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

  static async completeMilestone(milestoneId: string): Promise<boolean> {
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

  // Provider Integration
  static async shareWithProvider(planId: string, providerEmail: string, accessLevel: string): Promise<boolean> {
    const { error } = await supabase
      .from('provider_plan_access')
      .insert({
        plan_id: planId,
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

  // Progress Calculation
  static async calculateProgress(planId: string): Promise<number> {
    const goals = await this.getPlanGoals(planId);
    const milestones = await this.getPlanMilestones(planId);

    if (goals.length === 0 && milestones.length === 0) return 0;

    const completedGoals = goals.filter(g => g.status === 'completed').length;
    const completedMilestones = milestones.filter(m => m.is_achieved).length;
    
    const goalProgress = goals.length > 0 ? (completedGoals / goals.length) * 0.7 : 0;
    const milestoneProgress = milestones.length > 0 ? (completedMilestones / milestones.length) * 0.3 : 0;

    return Math.round((goalProgress + milestoneProgress) * 100);
  }

  // Create plan from template
  static async createPlanFromTemplate(userId: string, templateId: string, customizations: {
    title?: string;
    start_date: string;
    target_completion_date: string;
  }): Promise<UserRecoveryPlan | null> {
    const { data: template, error: templateError } = await supabase
      .from('recovery_plan_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      toast.error('Template not found');
      return null;
    }

    // Create the plan
    const plan = await this.createPlan(userId, {
      template_id: templateId,
      title: customizations.title || template.title,
      description: template.description,
      start_date: customizations.start_date,
      target_completion_date: customizations.target_completion_date,
      custom_goals: template.goals_template || []
    });

    if (!plan) return null;

    // Create goals from template
    if (template.template_data?.goals && Array.isArray(template.template_data.goals)) {
      for (const goalTemplate of template.template_data.goals) {
        await this.createGoal({
          plan_id: plan.id,
          user_id: userId,
          title: goalTemplate.title,
          description: goalTemplate.description,
          category: goalTemplate.category,
          due_date: goalTemplate.target_date || customizations.target_completion_date,
          status: 'pending',
          reminder_frequency: goalTemplate.reminder_frequency || 'weekly',
          goal_type: goalTemplate.category || 'general',
          target_value: goalTemplate.target_value || 1,
          current_value: 0,
          unit: goalTemplate.unit || '',
          notes: '',
          priority_level: goalTemplate.priority === 'high' ? 3 : goalTemplate.priority === 'medium' ? 2 : 1,
          completion_date: '',
          next_reminder_date: ''
        });
      }
    }

    // Create milestones from template
    if (template.template_data?.milestones && Array.isArray(template.template_data.milestones)) {
      for (const milestoneTemplate of template.template_data.milestones) {
        await this.createMilestone({
          plan_id: plan.id,
          user_id: userId,
          goal_id: '',
          title: milestoneTemplate.title,
          description: milestoneTemplate.description,
          milestone_date: milestoneTemplate.target_date || customizations.target_completion_date,
          is_achieved: false,
          achieved_date: '',
          celebration_type: 'notification',
          celebration_data: { message: milestoneTemplate.celebration_message, reward: milestoneTemplate.reward },
          achievement_criteria: ''
        });
      }
    }

    return plan;
  }
}