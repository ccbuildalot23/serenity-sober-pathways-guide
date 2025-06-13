
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { RecoveryGoal, GoalTemplate, GoalProgress, CreateGoalData, UpdateProgressData } from '@/types/recoveryGoals';
import { GoalService } from '@/services/goalService';
import { getGoalsByCategory, getActiveGoals, getGoalsNeedingAttention } from '@/utils/goalUtils';

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
    const goals = await GoalService.loadGoals(user.id);
    setGoals(goals);
  };

  const loadGoalTemplates = async () => {
    const templates = await GoalService.loadGoalTemplates();
    setGoalTemplates(templates);
  };

  const loadGoalProgress = async () => {
    if (!user) return;
    const progress = await GoalService.loadGoalProgress(user.id);
    setGoalProgress(progress);
  };

  const createGoal = async (goalData: CreateGoalData) => {
    if (!user) return { error: 'User not authenticated' };
    
    const result = await GoalService.createGoal(user.id, goalData);
    if (result.success) {
      await loadGoals();
    }
    return result;
  };

  const updateGoalProgress = async (goalId: string, progressData: UpdateProgressData) => {
    if (!user) return { error: 'User not authenticated' };
    
    const result = await GoalService.updateGoalProgress(user.id, goalId, progressData, goals);
    if (result.success) {
      await loadGoalsData();
    }
    return result;
  };

  const pauseGoal = async (goalId: string, reason?: string) => {
    if (!user) return { error: 'User not authenticated' };
    
    const result = await GoalService.pauseGoal(goalId, reason);
    if (result.success) {
      await loadGoals();
    }
    return result;
  };

  const resumeGoal = async (goalId: string) => {
    if (!user) return { error: 'User not authenticated' };
    
    const result = await GoalService.resumeGoal(goalId);
    if (result.success) {
      await loadGoals();
    }
    return result;
  };

  const deleteGoal = async (goalId: string) => {
    if (!user) return { error: 'User not authenticated' };
    
    const result = await GoalService.deleteGoal(goalId);
    if (result.success) {
      await loadGoals();
    }
    return result;
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
    getGoalsByCategory: (category: RecoveryGoal['category']) => getGoalsByCategory(goals, category),
    getActiveGoals: () => getActiveGoals(goals),
    getGoalsNeedingAttention: () => getGoalsNeedingAttention(goals),
    refreshData: loadGoalsData
  };
};
