import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { RecoveryPlanService, UserRecoveryPlan, RecoveryPlanGoal, RecoveryMilestone, RecoveryPlanTemplate } from '@/services/recoveryPlanService';

export const useRecoveryPlan = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<UserRecoveryPlan[]>([]);
  const [templates, setTemplates] = useState<RecoveryPlanTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [_userPlans, _planTemplates] = await Promise.all([
        RecoveryPlanService.getUserPlans(user.id),
        RecoveryPlanService.getTemplates()
      ]);

      setPlans(_userPlans);
      setTemplates(_planTemplates);
    } catch (_error) {
      console._error('Error loading recovery plan data:', _error);
    } finally {
      setLoading(false);
    }
  };

  const createPlan = async (_planData: Partial<UserRecoveryPlan>) => {
    if (!user) return null;
    
    const plan = await RecoveryPlanService.createPlan(user.id, _planData);
    if (plan) {
      await loadData(); // Refresh data
    }
    return plan;
  };

  const createPlanFromTemplate = async (_templateId: string, _customizations: {
    title?: string;
    start_date: string;
    target_completion_date: string;
  }) => {
    if (!user) return null;
    
    const plan = await RecoveryPlanService.createPlanFromTemplate(user.id, _templateId, _customizations);
    if (plan) {
      await loadData(); // Refresh data
    }
    return plan;
  };

  const updatePlan = async (planId: string, _updates: Partial<UserRecoveryPlan>) => {
    const success = await RecoveryPlanService.updatePlan(planId, _updates);
    if (success) {
      await loadData(); // Refresh data
    }
    return success;
  };

  return {
    plans,
    templates,
    loading,
    createPlan,
    createPlanFromTemplate,
    updatePlan,
    refreshData: loadData
  };
};

export const usePlanGoals = (planId: string | null) => {
  const [goals, setGoals] = useState<RecoveryPlanGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (planId) {
      loadGoals();
    }
  }, [planId]);

  const loadGoals = async () => {
    if (!planId) return;

    setLoading(true);
    try {
      const _planGoals = await RecoveryPlanService.getPlanGoals(planId);
      setGoals(_planGoals);
    } catch (_error) {
      console._error('Error loading goals:', _error);
    } finally {
      setLoading(false);
    }
  };

  const createGoal = async (goalData: Partial<RecoveryPlanGoal>) => {
    const goal = await RecoveryPlanService.createGoal({ ...goalData, _plan_id: planId! });
    if (goal) {
      await loadGoals(); // Refresh goals
    }
    return goal;
  };

  const updateGoal = async (_goalId: string, _updates: Partial<RecoveryPlanGoal>) => {
    const success = await RecoveryPlanService.updateGoal(_goalId, _updates);
    if (success) {
      await loadGoals(); // Refresh goals
    }
    return success;
  };

  return {
    goals,
    loading,
    createGoal,
    updateGoal,
    refreshGoals: loadGoals
  };
};

export const usePlanMilestones = (planId: string | null) => {
  const [milestones, setMilestones] = useState<RecoveryMilestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (planId) {
      loadMilestones();
    }
  }, [planId]);

  const loadMilestones = async () => {
    if (!planId) return;

    setLoading(true);
    try {
      const _planMilestones = await RecoveryPlanService.getPlanMilestones(planId);
      setMilestones(_planMilestones);
    } catch (_error) {
      console._error('Error loading milestones:', _error);
    } finally {
      setLoading(false);
    }
  };

  const createMilestone = async (milestoneData: Partial<RecoveryMilestone>) => {
    const milestone = await RecoveryPlanService.createMilestone({ ...milestoneData, _plan_id: planId! });
    if (milestone) {
      await loadMilestones(); // Refresh milestones
    }
    return milestone;
  };

  const completeMilestone = async (_milestoneId: string) => {
    const success = await RecoveryPlanService.completeMilestone(_milestoneId);
    if (success) {
      await loadMilestones(); // Refresh milestones
    }
    return success;
  };

  return {
    milestones,
    loading,
    createMilestone,
    completeMilestone,
    refreshMilestones: loadMilestones
  };
};