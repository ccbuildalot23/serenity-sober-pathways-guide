
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RecoveryGoal {
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

interface Milestone {
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

interface GoalProgress {
  id: string;
  goal_id: string;
  date: string;
  value: number;
  notes?: string;
  mood_rating?: number;
  confidence_rating?: number;
  created_at: string;
}

interface GoalTemplate {
  id: string;
  title: string;
  description: string;
  category: RecoveryGoal['category'];
  suggested_milestones: Omit<Milestone, 'id' | 'completed' | 'completed_at'>[];
  default_duration_days: number;
  tags: string[];
}

export const useRecoveryGoals = () => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<RecoveryGoal[]>([]);
  const [goalTemplates, setGoalTemplates] = useState<GoalTemplate[]>([]);
  const [goalProgress, setGoalProgress] = useState<Record<string, GoalProgress[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadGoalsData();
    }
  }, [user]);

  const loadGoalsData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await Promise.all([
        loadGoals(),
        loadGoalTemplates(),
        loadGoalProgress()
      ]);
    } catch (error) {
      console.error('Error loading goals data:', error);
      toast.error('Failed to load recovery goals');
    } finally {
      setLoading(false);
    }
  };

  const loadGoals = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('recovery_goals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    setGoals(data || []);
  };

  const loadGoalTemplates = async () => {
    const { data, error } = await supabase
      .from('goal_templates')
      .select('*')
      .order('category', { ascending: true });

    if (error) throw error;
    setGoalTemplates(data || []);
  };

  const loadGoalProgress = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('goal_progress')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) throw error;

    const progressByGoal = (data || []).reduce((acc, progress) => {
      if (!acc[progress.goal_id]) {
        acc[progress.goal_id] = [];
      }
      acc[progress.goal_id].push(progress);
      return acc;
    }, {} as Record<string, GoalProgress[]>);

    setGoalProgress(progressByGoal);
  };

  const createGoal = async (goalData: {
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
  }) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const milestonesWithIds = (goalData.milestones || []).map((m, index) => ({
        id: `milestone_${index}`,
        completed: false,
        ...m
      }));

      const { data, error } = await supabase
        .from('recovery_goals')
        .insert({
          user_id: user.id,
          title: goalData.title,
          description: goalData.description,
          category: goalData.category,
          priority: goalData.priority,
          target_date: goalData.target_date,
          target_value: goalData.target_value,
          current_value: 0,
          unit: goalData.unit,
          milestones: milestonesWithIds,
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

      await loadGoals();
      return { success: true, goal: data };
    } catch (error) {
      console.error('Error creating goal:', error);
      return { error: 'Failed to create goal' };
    }
  };

  const updateGoalProgress = async (goalId: string, progressData: {
    value: number;
    notes?: string;
    mood_rating?: number;
    confidence_rating?: number;
  }) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const { error: progressError } = await supabase
        .from('goal_progress')
        .insert({
          user_id: user.id,
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

      await checkMilestoneCompletion(goalId, newCurrentValue);

      if (newProgress >= 100) {
        await completeGoal(goalId);
      }

      toast.success('Progress updated!', {
        description: `${goal.title}: ${newProgress.toFixed(1)}% complete`
      });

      await loadGoalsData();
      return { success: true };
    } catch (error) {
      console.error('Error updating goal progress:', error);
      return { error: 'Failed to update progress' };
    }
  };

  const checkMilestoneCompletion = async (goalId: string, currentValue: number) => {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;

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
        .update({ milestones: updatedMilestones })
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
  };

  const completeGoal = async (goalId: string) => {
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

      const goal = goals.find(g => g.id === goalId);
      if (goal) {
        toast.success('🏆 Goal Completed!', {
          description: `Congratulations on achieving "${goal.title}"!`,
          duration: 8000
        });

        await awardGoalCompletionBadge(goal.category);
      }
    } catch (error) {
      console.error('Error completing goal:', error);
    }
  };

  const pauseGoal = async (goalId: string, reason?: string) => {
    if (!user) return { error: 'User not authenticated' };

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

      await loadGoals();
      return { success: true };
    } catch (error) {
      console.error('Error pausing goal:', error);
      return { error: 'Failed to pause goal' };
    }
  };

  const resumeGoal = async (goalId: string) => {
    if (!user) return { error: 'User not authenticated' };

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

      await loadGoals();
      return { success: true };
    } catch (error) {
      console.error('Error resuming goal:', error);
      return { error: 'Failed to resume goal' };
    }
  };

  const deleteGoal = async (goalId: string) => {
    if (!user) return { error: 'User not authenticated' };

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
      await loadGoals();
      return { success: true };
    } catch (error) {
      console.error('Error deleting goal:', error);
      return { error: 'Failed to delete goal' };
    }
  };

  const createGoalFromTemplate = async (template: GoalTemplate, customizations: {
    target_date: string;
    target_value?: number;
    accountability_partner_id?: string;
  }) => {
    return await createGoal({
      title: template.title,
      description: template.description,
      category: template.category,
      priority: 'medium',
      target_date: customizations.target_date,
      target_value: customizations.target_value,
      milestones: template.suggested_milestones,
      tags: template.tags,
      accountability_partner_id: customizations.accountability_partner_id,
      reminder_frequency: 'weekly'
    });
  };

  const getGoalsByCategory = (category: RecoveryGoal['category']) => {
    return goals.filter(goal => goal.category === category);
  };

  const getActiveGoals = () => {
    return goals.filter(goal => goal.status === 'active');
  };

  const getGoalsNeedingAttention = () => {
    const today = new Date();
    return goals.filter(goal => {
      if (goal.status !== 'active') return false;
      
      const targetDate = new Date(goal.target_date);
      const daysUntilTarget = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysUntilTarget <= 7 && goal.progress < 75;
    });
  };

  const calculateProgressFromMilestones = (milestones: Milestone[]): number => {
    if (milestones.length === 0) return 0;
    const completedMilestones = milestones.filter(m => m.completed).length;
    return (completedMilestones / milestones.length) * 100;
  };

  const calculateNextReminder = (frequency: RecoveryGoal['reminder_frequency']): string | undefined => {
    if (frequency === 'none') return undefined;
    
    const now = new Date();
    const next = new Date(now);
    
    switch (frequency) {
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
    }
    
    return next.toISOString();
  };

  const awardGoalCompletionBadge = async (category: RecoveryGoal['category']) => {
    if (!user) return;

    try {
      const badgeName = `${category.charAt(0).toUpperCase() + category.slice(1)} Achiever`;
      
      const { data: existingBadge } = await supabase
        .from('user_achievements')
        .select('id')
        .eq('user_id', user.id)
        .eq('badge_name', badgeName)
        .single();

      if (!existingBadge) {
        await supabase
          .from('user_achievements')
          .insert({
            user_id: user.id,
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
  };

  return {
    goals,
    goalTemplates,
    goalProgress,
    loading,
    createGoal,
    updateGoalProgress,
    pauseGoal,
    resumeGoal,
    deleteGoal,
    createGoalFromTemplate,
    getGoalsByCategory,
    getActiveGoals,
    getGoalsNeedingAttention,
    refreshData: loadGoalsData
  };
};
