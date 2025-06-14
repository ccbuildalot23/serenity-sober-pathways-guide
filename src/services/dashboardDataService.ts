
import { supabase } from '@/integrations/supabase/client';

export const dashboardDataService = {
  async getUserStats(userId: string) {
    try {
      console.log('Fetching user stats for:', userId);

      // Get recovery streak - with error handling
      let streakData = null;
      try {
        const { data } = await supabase.rpc('get_recovery_streak', { user_uuid: userId });
        streakData = data;
      } catch (streakError) {
        console.warn('Error fetching streak data:', streakError);
        // Continue with default values
      }

      // Get total check-ins count with timeout
      const { data: checkinsData, error: checkinsError } = await supabase
        .from('daily_checkins')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .limit(1000); // Add limit to prevent large queries

      if (checkinsError) {
        console.warn('Error fetching checkins:', checkinsError);
      }

      // Get active goals with progress - with timeout
      const { data: goalsData, error: goalsError } = await supabase
        .from('recovery_goals')
        .select('id, progress, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(100); // Add limit

      if (goalsError) {
        console.warn('Error fetching goals:', goalsError);
      }

      const completedGoals = goalsData?.filter(goal => goal.progress >= 100).length || 0;
      const totalGoals = goalsData?.length || 0;

      // Handle streak data safely
      const streak = streakData?.current_streak_days || 0;

      const result = {
        streak,
        checkIns: checkinsData?.length || 0,
        goals: {
          completed: completedGoals,
          total: totalGoals
        }
      };

      console.log('User stats result:', result);
      return result;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Return default values instead of throwing
      return {
        streak: 0,
        checkIns: 0,
        goals: {
          completed: 0,
          total: 0
        }
      };
    }
  },

  async getUserProfile(userId: string) {
    try {
      console.log('Fetching user profile for:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching profile:', error);
        return null;
      }
      
      console.log('Profile data:', data);
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }
};
