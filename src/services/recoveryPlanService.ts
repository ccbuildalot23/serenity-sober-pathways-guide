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
        plan_id: goalData.plan_id!,
        user_id: goalData.user_id!,
        title: goalData.title!,
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
        plan_id: milestoneData.plan_id!,
        user_id: milestoneData.user_id!,
        title: milestoneData.title!,
        description: milestoneData.description,
        milestone_date: milestoneData.milestone_date!,
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
          unit_of_measure: goalTemplate.unit || '',
          notes: '',
          priority_order: goalTemplate.priority === 'high' ? 3 : goalTemplate.priority === 'medium' ? 2 : 1,
          smart_criteria: {}
        });
      }
    }

    // Create milestones from template
    if (template.template_data?.milestones && Array.isArray(template.template_data.milestones)) {
      for (const milestoneTemplate of template.template_data.milestones) {
        await this.createMilestone({
          plan_id: plan.id,
          user_id: userId,
          title: milestoneTemplate.title,
          description: milestoneTemplate.description,
          milestone_date: milestoneTemplate.target_date || customizations.target_completion_date,
          goal_id: null,
          celebration_type: 'notification',
          celebration_data: { message: milestoneTemplate.celebration_message, reward: milestoneTemplate.reward },
          achievement_criteria: milestoneTemplate.achievement_criteria || ''
        });
      }
    }

    return plan;
  }
}