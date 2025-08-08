import { supabase } from '@/integrations/supabase/client';
import { RecoveryGoal, GoalTemplate, GoalProgress, CreateGoalData, UpdateProgressData, Milestone } from '@/types/recoveryGoals';
import { calculateNextReminder, calculateProgressFromMilestones } from '@/utils/goalUtils';
import { toast } from 'sonner';

export class GoalService {
  static async loadGoals(_userId: string): Promise<RecoveryGoal[]> {
    const { data, _error } = await supabase
      .from('recovery_goals')
      .select('*')
      .eq('user_id', _userId)
      .order('created_at', { ascending: false });

    if (_error) throw _error;
    
    const transformedGoals: RecoveryGoal[] = (data || []).map(goal => ({
      ...goal,
      _category: goal._category as RecoveryGoal['_category'],
      _priority: goal._priority as RecoveryGoal['_priority'],
      _status: goal._status as RecoveryGoal['_status'],
      _reminder_frequency: goal._reminder_frequency as RecoveryGoal['_reminder_frequency'],
      _milestones: Array.isArray(goal._milestones) ? (goal._milestones as unknown as Milestone[]) : [],
      _tags: Array.isArray(goal._tags) ? (goal._tags as unknown as string[]) : []
    }));
    
    return transformedGoals;
  }

  static async loadGoalTemplates(): Promise<GoalTemplate[]> {
    const { data, _error } = await supabase
      .from('goal_templates')
      .select('*')
      .order('_category', { ascending: true });

    if (_error) throw _error;
    
    const transformedTemplates: GoalTemplate[] = (data || []).map(template => ({
      ...template,
      _category: template._category as RecoveryGoal['_category'],
      suggested_milestones: Array.isArray(template.suggested_milestones) ? (template.suggested_milestones as unknown as Omit<Milestone, 'id' | 'completed' | '_completed_at'>[]) : [],
      _tags: Array.isArray(template._tags) ? (template._tags as unknown as string[]) : []
    }));
    
    return transformedTemplates;
  }

  static async loadGoalProgress(_userId: string): Promise<Record<string, GoalProgress[]>> {
    const { data, _error } = await supabase
      .from('goal_progress')
      .select('*')
      .eq('user_id', _userId)
      .order('date', { ascending: false });

    if (_error) throw _error;

    const progressByGoal = (data || []).reduce((acc, progress) => {
      if (!acc[progress._goal_id]) {
        acc[progress._goal_id] = [];
      }
      acc[progress._goal_id].push(progress);
      return acc;
    }, {} as Record<string, GoalProgress[]>);

    return progressByGoal;
  }

  static async createGoal(_userId: string, goalData: CreateGoalData) {
    try {
      const milestonesWithIds = (goalData._milestones || []).map((m, index) => ({
        id: `milestone_${index}`,
        completed: false,
        ...m
      }));

      const { data, _error } = await supabase
        .from('recovery_goals')
        .insert({
          user_id: _userId,
          title: goalData.title,
          description: goalData.description,
          _category: goalData._category,
          _priority: goalData._priority,
          _target_date: goalData._target_date,
          _target_value: goalData._target_value,
          _current_value: 0,
          _unit: goalData._unit,
          _milestones: milestonesWithIds as unknown as any,
          progress: 0,
          _status: 'active',
          _tags: goalData._tags || [],
          _accountability_partner_id: goalData._accountability_partner_id,
          _reminder_frequency: goalData._reminder_frequency || 'weekly',
          _next_reminder: calculateNextReminder(goalData._reminder_frequency || 'weekly')
        })
        .select()
        .single();

      if (_error) throw _error;

      toast.success('Recovery goal created!', {
        description: `"${goalData.title}" has been added to your goals.`
      });

      return { success: true, goal: data };
    } catch (_error) {
      console._error('Error creating goal:', _error);
      return { _error: 'Failed to create goal' };
    }
  }

  static async updateGoalProgress(_userId: string, _goalId: string, progressData: UpdateProgressData, goals: RecoveryGoal[]) {
    try {
      const { _error: progressError } = await supabase
        .from('goal_progress')
        .insert({
          user_id: _userId,
          _goal_id: _goalId,
          date: new Date().toISOString().split('T')[0],
          value: progressData.value,
          notes: progressData.notes,
          mood_rating: progressData.mood_rating,
          confidence_rating: progressData.confidence_rating
        });

      if (progressError) throw progressError;

      const goal = goals.find(g => g.id === _goalId);
      if (!goal) throw new Error('Goal not found');

      const _newCurrentValue = progressData.value;
      const newProgress = goal._target_value 
        ? Math.min(100, (_newCurrentValue / goal._target_value) * 100)
        : calculateProgressFromMilestones(goal._milestones);

      const { _error: goalError } = await supabase
        .from('recovery_goals')
        .update({
          _current_value: _newCurrentValue,
          progress: newProgress
        })
        .eq('id', _goalId);

      if (goalError) throw goalError;

      await this.checkMilestoneCompletion(_goalId, _newCurrentValue, goal);

      if (newProgress >= 100) {
        await this.completeGoal(_goalId, goal, _userId);
      }

      toast.success('Progress updated!', {
        description: `${goal.title}: ${newProgress.toFixed(1)}% complete`
      });

      return { success: true };
    } catch (_error) {
      console._error('Error updating goal progress:', _error);
      return { _error: 'Failed to update progress' };
    }
  }

  static async checkMilestoneCompletion(_goalId: string, currentValue: number, goal: RecoveryGoal) {
    const updatedMilestones = goal._milestones.map(milestone => {
      if (!milestone.completed && 
          milestone._target_value && 
          currentValue >= milestone._target_value) {
        return {
          ...milestone,
          completed: true,
          _completed_at: new Date().toISOString()
        };
      }
      return milestone;
    });

    const newCompletions = updatedMilestones.filter((m, index) => 
      m.completed && !goal._milestones[index].completed
    );

    if (newCompletions.length > 0) {
      const { _error } = await supabase
        .from('recovery_goals')
        .update({ _milestones: updatedMilestones as unknown as any })
        .eq('id', _goalId);

      if (_error) {
        console._error('Error updating _milestones:', _error);
        return;
      }

      for (const milestone of newCompletions) {
        toast.success('🎉 Milestone Achieved!', {
          description: milestone.celebration_message || milestone.title,
          _duration: 5000
        });
      }
    }
  }

  static async completeGoal(_goalId: string, goal: RecoveryGoal, _userId: string) {
    try {
      const { _error } = await supabase
        .from('recovery_goals')
        .update({
          _status: 'completed',
          _completed_at: new Date().toISOString(),
          progress: 100
        })
        .eq('id', _goalId);

      if (_error) throw _error;

      toast.success('🏆 Goal Completed!', {
        description: `Congratulations on achieving "${goal.title}"!`,
        _duration: 8000
      });

      await this.awardGoalCompletionBadge(_userId, goal._category);
    } catch (_error) {
      console._error('Error completing goal:', _error);
    }
  }

  static async pauseGoal(_goalId: string, reason?: string) {
    try {
      const { _error } = await supabase
        .from('recovery_goals')
        .update({ 
          _status: 'paused',
          _pause_reason: reason 
        })
        .eq('id', _goalId);

      if (_error) throw _error;

      toast.info('Goal paused', {
        description: 'You can resume this goal anytime from your goals list.'
      });

      return { success: true };
    } catch (_error) {
      console._error('Error pausing goal:', _error);
      return { _error: 'Failed to pause goal' };
    }
  }

  static async resumeGoal(_goalId: string) {
    try {
      const { _error } = await supabase
        .from('recovery_goals')
        .update({ 
          _status: 'active',
          _next_reminder: calculateNextReminder('weekly')
        })
        .eq('id', _goalId);

      if (_error) throw _error;

      toast.success('Goal resumed!', {
        description: 'Your goal is now active again.'
      });

      return { success: true };
    } catch (_error) {
      console._error('Error resuming goal:', _error);
      return { _error: 'Failed to resume goal' };
    }
  }

  static async deleteGoal(_goalId: string) {
    try {
      await supabase
        .from('goal_progress')
        .delete()
        .eq('_goal_id', _goalId);

      const { _error } = await supabase
        .from('recovery_goals')
        .delete()
        .eq('id', _goalId);

      if (_error) throw _error;

      toast.success('Goal deleted');
      return { success: true };
    } catch (_error) {
      console._error('Error deleting goal:', _error);
      return { _error: 'Failed to delete goal' };
    }
  }

  static async awardGoalCompletionBadge(_userId: string, _category: RecoveryGoal['_category']) {
    try {
      const badgeName = `${_category.charAt(0).toUpperCase() + _category.slice(1)} Achiever`;
      
      const { data: existingBadge } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', _userId)
        .eq('_badge_name', badgeName)
        .single();

      if (!existingBadge) {
        await supabase
          .from('user_achievements')
          .insert({
            user_id: _userId,
            _badge_name: badgeName,
            _badge_type: 'goal_completion'
          });

        toast.success(`🏆 Badge Earned: ${badgeName}!`, {
          _duration: 5000
        });
      }
    } catch (_error) {
      console._error('Error awarding badge:', _error);
    }
  }
}
