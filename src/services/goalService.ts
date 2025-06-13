import { supabase } from '@/integrations/supabase/client';
import { RecoveryGoal, GoalTemplate, GoalProgress, CreateGoalData, UpdateProgressData, Milestone } from '@/types/recoveryGoals';
import { calculateNextReminder, calculateProgressFromMilestones } from '@/utils/goalUtils';
import { toast } from 'sonner';

export class GoalService {
  static async loadGoals(userId: string): Promise<RecoveryGoal[]> {
    const { data, error } = await supabase
      .from('recovery_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    const transformedGoals: RecoveryGoal[] = (data || []).map(goal => ({
      ...goal,
      category: goal.category as RecoveryGoal['category'],
      priority: goal.priority as RecoveryGoal['priority'],
      status: goal.status as RecoveryGoal['status'],
      reminder_frequency: goal.reminder_frequency as RecoveryGoal['reminder_frequency'],
      milestones: Array.isArray(goal.milestones) ? (goal.milestones as unknown as Milestone[]) : [],
      tags: Array.isArray(goal.tags) ? (goal.tags as unknown as string[]) : []
    }));
    
    return transformedGoals;
  }

  static async loadGoalTemplates(): Promise<GoalTemplate[]> {
    const { data, error } = await supabase
      .from('goal_templates')
      .select('*')
      .order('category', { ascending: true });

    if (error) throw error;
    
    const transformedTemplates: GoalTemplate[] = (data || []).map(template => ({
      ...template,
      category: template.category as RecoveryGoal['category'],
      suggested_milestones: Array.isArray(template.suggested_milestones) ? (template.suggested_milestones as unknown as Omit<Milestone, 'id' | 'completed' | 'completed_at'>[]) : [],
      tags: Array.isArray(template.tags) ? (template.tags as unknown as string[]) : []
    }));
    
    return transformedTemplates;
  }

  static async loadGoalProgress(userId: string): Promise<Record<string, GoalProgress[]>> {
    const { data, error } = await supabase
      .from('goal_progress')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });

    if (error) throw error;

    const progressByGoal = (data || []).reduce((acc, progress) => {
      if (!acc[progress.goal_id]) {
        acc[progress.goal_id] = [];
      }
      acc[progress.goal_id].push(progress);
      return acc;
    }, {} as Record<string, GoalProgress[]>);

    return progressByGoal;
  }

  static async createGoal(userId: string, goalData: CreateGoalData) {
    try {
      const milestonesWithIds = (goalData.milestones || []).map((m, index) => ({
        id: `milestone_${index}`,
        completed: false,
        ...m
      }));

      const { data, error } = await supabase
        .from('recovery_goals')
        .insert({
          user_id: userId,
          title: goalData.title,
          description: goalData.description,
          category: goalData.category,
          priority: goalData.priority,
          target_date: goalData.target_date,
          target_value: goalData.target_value,
          current_value: 0,
          unit: goalData.unit,
          milestones: milestonesWithIds as unknown as any,
          progress: 0,
          status: 'active',
          tags: goalData.tags || [],
          accountability_partner_id: goalData.accountability_partner_id,
          reminder_frequency: goalData.reminder_frequency || 'weekly',
          next_reminder: calculateNextReminder(goalData.reminder_frequency || 'weekly')
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Recovery goal created!', {
        description: `"${goalData.title}" has been added to your goals.`
      });

      return { success: true, goal: data };
    } catch (error) {
      console.error('Error creating goal:', error);
      return { error: 'Failed to create goal' };
    }
  }

  static async updateGoalProgress(userId: string, goalId: string, progressData: UpdateProgressData, goals: RecoveryGoal[]) {
    try {
      const { error: progressError } = await supabase
        .from('goal_progress')
        .insert({
          user_id: userId,
          goal_id: goalId,
          date: new Date().toISOString().split('T')[0],
          value: progressData.value,
          notes: progressData.notes,
          mood_rating: progressData.mood_rating,
          confidence_rating: progressData.confidence_rating
        });

      if (progressError) throw progressError;

      const goal = goals.find(g => g.id === goalId);
      if (!goal) throw new Error('Goal not found');

      const newCurrentValue = progressData.value;
      const newProgress = goal.target_value 
        ? Math.min(100, (newCurrentValue / goal.target_value) * 100)
        : calculateProgressFromMilestones(goal.milestones);

      const { error: goalError } = await supabase
        .from('recovery_goals')
        .update({
          current_value: newCurrentValue,
          progress: newProgress
        })
        .eq('id', goalId);

      if (goalError) throw goalError;

      await this.checkMilestoneCompletion(goalId, newCurrentValue, goal);

      if (newProgress >= 100) {
        await this.completeGoal(goalId, goal, userId);
      }

      toast.success('Progress updated!', {
        description: `${goal.title}: ${newProgress.toFixed(1)}% complete`
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating goal progress:', error);
      return { error: 'Failed to update progress' };
    }
  }

  static async checkMilestoneCompletion(goalId: string, currentValue: number, goal: RecoveryGoal) {
    const updatedMilestones = goal.milestones.map(milestone => {
      if (!milestone.completed && 
          milestone.target_value && 
          currentValue >= milestone.target_value) {
        return {
          ...milestone,
          completed: true,
          completed_at: new Date().toISOString()
        };
      }
      return milestone;
    });

    const newCompletions = updatedMilestones.filter((m, index) => 
      m.completed && !goal.milestones[index].completed
    );

    if (newCompletions.length > 0) {
      const { error } = await supabase
        .from('recovery_goals')
        .update({ milestones: updatedMilestones as unknown as any })
        .eq('id', goalId);

      if (error) {
        console.error('Error updating milestones:', error);
        return;
      }

      for (const milestone of newCompletions) {
        toast.success('🎉 Milestone Achieved!', {
          description: milestone.celebration_message || milestone.title,
          duration: 5000
        });
      }
    }
  }

  static async completeGoal(goalId: string, goal: RecoveryGoal, userId: string) {
    try {
      const { error } = await supabase
        .from('recovery_goals')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          progress: 100
        })
        .eq('id', goalId);

      if (error) throw error;

      toast.success('🏆 Goal Completed!', {
        description: `Congratulations on achieving "${goal.title}"!`,
        duration: 8000
      });

      await this.awardGoalCompletionBadge(userId, goal.category);
    } catch (error) {
      console.error('Error completing goal:', error);
    }
  }

  static async pauseGoal(goalId: string, reason?: string) {
    try {
      const { error } = await supabase
        .from('recovery_goals')
        .update({ 
          status: 'paused',
          pause_reason: reason 
        })
        .eq('id', goalId);

      if (error) throw error;

      toast.info('Goal paused', {
        description: 'You can resume this goal anytime from your goals list.'
      });

      return { success: true };
    } catch (error) {
      console.error('Error pausing goal:', error);
      return { error: 'Failed to pause goal' };
    }
  }

  static async resumeGoal(goalId: string) {
    try {
      const { error } = await supabase
        .from('recovery_goals')
        .update({ 
          status: 'active',
          next_reminder: calculateNextReminder('weekly')
        })
        .eq('id', goalId);

      if (error) throw error;

      toast.success('Goal resumed!', {
        description: 'Your goal is now active again.'
      });

      return { success: true };
    } catch (error) {
      console.error('Error resuming goal:', error);
      return { error: 'Failed to resume goal' };
    }
  }

  static async deleteGoal(goalId: string) {
    try {
      await supabase
        .from('goal_progress')
        .delete()
        .eq('goal_id', goalId);

      const { error } = await supabase
        .from('recovery_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast.success('Goal deleted');
      return { success: true };
    } catch (error) {
      console.error('Error deleting goal:', error);
      return { error: 'Failed to delete goal' };
    }
  }

  static async awardGoalCompletionBadge(userId: string, category: RecoveryGoal['category']) {
    try {
      const badgeName = `${category.charAt(0).toUpperCase() + category.slice(1)} Achiever`;
      
      const { data: existingBadge } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', userId)
        .eq('badge_name', badgeName)
        .single();

      if (!existingBadge) {
        await supabase
          .from('user_achievements')
          .insert({
            user_id: userId,
            badge_name: badgeName,
            badge_type: 'goal_completion'
          });

        toast.success(`🏆 Badge Earned: ${badgeName}!`, {
          duration: 5000
        });
      }
    } catch (error) {
      console.error('Error awarding badge:', error);
    }
  }
}
