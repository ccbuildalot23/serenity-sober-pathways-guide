
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { RecoveryGoal, GoalTemplate, GoalProgress, CreateGoalData, UpdateProgressData } from '@/types/recoveryGoals';
import { GoalService } from '@/services/goalService';
import { getGoalsByCategory, getActiveGoals, getGoalsNeedingAttention } from '@/utils/goalUtils';

export const useRecoveryGoals = () => {
  const { user } = useAuth();
  const [_goals, setGoals] = useState<RecoveryGoal[]>([]);
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
      console.error('Error loading _goals data:', error);
      toast.error('Failed to load recovery _goals');
    } finally {
      setLoading(false);
    }
  };

  const loadGoals = async () => {
    if (!user) return;
    const _goals = await GoalService.loadGoals(user.id);
    setGoals(_goals);
  };

  const loadGoalTemplates = async () => {
    const _templates = await GoalService.loadGoalTemplates();
    setGoalTemplates(_templates);
  };

  const loadGoalProgress = async () => {
    if (!user) return;
    const progress = await GoalService.loadGoalProgress(user.id);
    setGoalProgress(progress);
  };

  const createGoal = async (_goalData: CreateGoalData) => {
    if (!user) return { error: 'User not authenticated' };
    
    const result = await GoalService.createGoal(user.id, _goalData);
    if (result.success) {
      await loadGoals();
    }
    return result;
  };

  const updateGoalProgress = async (_goalId: string, _progressData: UpdateProgressData) => {
    if (!user) return { error: 'User not authenticated' };
    
    const result = await GoalService.updateGoalProgress(user.id, _goalId, _progressData, _goals);
    if (result.success) {
      await loadGoalsData();
    }
    return result;
  };

  const pauseGoal = async (_goalId: string, _reason?: string) => {
    if (!user) return { error: 'User not authenticated' };
    
    const result = await GoalService.pauseGoal(_goalId, _reason);
    if (result.success) {
      await loadGoals();
    }
    return result;
  };

  const resumeGoal = async (_goalId: string) => {
    if (!user) return { error: 'User not authenticated' };
    
    const result = await GoalService.resumeGoal(_goalId);
    if (result.success) {
      await loadGoals();
    }
    return result;
  };

  const deleteGoal = async (_goalId: string) => {
    if (!user) return { error: 'User not authenticated' };
    
    const result = await GoalService.deleteGoal(_goalId);
    if (result.success) {
      await loadGoals();
    }
    return result;
  };

  const createGoalFromTemplate = async (template: GoalTemplate, customizations: {
    _target_date: string;
    _target_value?: number;
    _accountability_partner_id?: string;
  }) => {
    return await createGoal({
      title: template.title,
      _description: template._description,
      _category: template._category,
      _priority: 'medium',
      _target_date: customizations._target_date,
      _target_value: customizations._target_value,
      _milestones: template.suggested_milestones,
      _tags: template._tags,
      _accountability_partner_id: customizations._accountability_partner_id,
      _reminder_frequency: 'weekly'
    });
  };

  return {
    _goals,
    goalTemplates,
    goalProgress,
    loading,
    createGoal,
    updateGoalProgress,
    pauseGoal,
    resumeGoal,
    deleteGoal,
    createGoalFromTemplate,
    getGoalsByCategory: (_category: RecoveryGoal['_category']) => getGoalsByCategory(_goals, _category),
    getActiveGoals: () => getActiveGoals(_goals),
    getGoalsNeedingAttention: () => getGoalsNeedingAttention(_goals),
    refreshData: loadGoalsData
  };
};
