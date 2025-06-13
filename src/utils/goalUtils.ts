
import { RecoveryGoal, Milestone } from '@/types/recoveryGoals';

export const calculateProgressFromMilestones = (milestones: Milestone[]): number => {
  if (milestones.length === 0) return 0;
  const completedMilestones = milestones.filter(m => m.completed).length;
  return (completedMilestones / milestones.length) * 100;
};

export const calculateNextReminder = (frequency: RecoveryGoal['reminder_frequency']): string | undefined => {
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

export const getGoalsByCategory = (goals: RecoveryGoal[], category: RecoveryGoal['category']) => {
  return goals.filter(goal => goal.category === category);
};

export const getActiveGoals = (goals: RecoveryGoal[]) => {
  return goals.filter(goal => goal.status === 'active');
};

export const getGoalsNeedingAttention = (goals: RecoveryGoal[]) => {
  const today = new Date();
  return goals.filter(goal => {
    if (goal.status !== 'active') return false;
    
    const targetDate = new Date(goal.target_date);
    const daysUntilTarget = Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilTarget <= 7 && goal.progress < 75;
  });
};
