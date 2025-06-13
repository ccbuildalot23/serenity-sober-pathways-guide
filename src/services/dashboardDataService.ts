
import { supabase } from '@/integrations/supabase/client';

export const dashboardDataService = {
  async getUserStats(userId: string) {
    try {
      // Get recovery streak
      const { data: streakData } = await supabase
        .rpc('get_recovery_streak', { user_uuid: userId });

      // Get total check-ins count
      const { data: checkinsData, error: checkinsError } = await supabase
        .from('daily_checkins')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);

      if (checkinsError) throw checkinsError;

      // Get active goals with progress
      const { data: goalsData, error: goalsError } = await supabase
        .from('recovery_goals')
        .select('id, progress, status')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (goalsError) throw goalsError;

      const completedGoals = goalsData?.filter(goal => goal.progress >= 100).length || 0;
      const totalGoals = goalsData?.length || 0;

      return {
        streak: streakData?.current_streak_days || 0,
        checkIns: checkinsData?.length || 0,
        goals: {
          completed: completedGoals,
          total: totalGoals
        }
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  },

  async getUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }
};
