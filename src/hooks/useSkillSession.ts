
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SkillSessionData {
  skillCategory: string;
  skillName: string;
  moduleType: string;
  sessionDurationMinutes?: number;
  effectivenessRating?: number;
  notes?: string;
  realWorldApplied?: boolean;
}

interface Achievement {
  id: string;
  badgeName: string;
  badgeType: string;
  earnedAt: string;
}

export const useSkillSession = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const recordSkillSession = async (sessionData: SkillSessionData) => {
    if (!user) return { error: 'User not authenticated' };

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('skill_sessions')
        .insert({
          user_id: user.id,
          skill_category: sessionData.skillCategory,
          skill_name: sessionData.skillName,
          module_type: sessionData.moduleType,
          session_duration_minutes: sessionData.sessionDurationMinutes,
          effectiveness_rating: sessionData.effectivenessRating,
          notes: sessionData.notes,
          real_world_applied: sessionData.realWorldApplied || false
        });

      if (error) throw error;

      // Check for new achievements
      await checkAndAwardBadges();

      toast.success('Skill session recorded!', {
        description: 'Great job practicing your coping skills.'
      });

      return { success: true };
    } catch (error) {
      console.error('Error recording skill session:', error);
      return { error: 'Failed to record skill session' };
    } finally {
      setIsLoading(false);
    }
  };

  const checkAndAwardBadges = async () => {
    if (!user) return;

    const badges = ['CBT Explorer', 'Mindfulness Master', 'Skills Integrator'];

    for (const badgeName of badges) {
      // Check if user already has this badge
      const { data: existingBadge } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .eq('badge_name', badgeName)
        .single();

      if (!existingBadge) {
        // Check eligibility
        const { data: eligible } = await supabase.rpc('check_badge_eligibility', {
          user_uuid: user.id,
          badge_name_param: badgeName
        });

        if (eligible) {
          await supabase
            .from('user_achievements')
            .insert({
              user_id: user.id,
              badge_name: badgeName,
              badge_type: 'completion'
            });

          toast.success(`🏆 Achievement Unlocked!`, {
            description: `You've earned the ${badgeName} badge!`,
            duration: 5000
          });
        }
      }
    }
  };

  const getSkillProgress = async (skillCategory?: string) => {
    if (!user) return { data: null, error: 'User not authenticated' };

    try {
      let query = supabase
        .from('skill_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false });

      if (skillCategory) {
        query = query.eq('skill_category', skillCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error fetching skill progress:', error);
      return { data: null, error: 'Failed to fetch skill progress' };
    }
  };

  const getUserAchievements = async (): Promise<{ data: Achievement[] | null, error: string | null }> => {
    if (!user) return { data: null, error: 'User not authenticated' };

    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching achievements:', error);
      return { data: null, error: 'Failed to fetch achievements' };
    }
  };

  const getSkillMastery = async (skillCategory: string) => {
    if (!user) return { data: null, error: 'User not authenticated' };

    try {
      const { data, error } = await supabase.rpc('calculate_skill_mastery', {
        user_uuid: user.id,
        skill_category_param: skillCategory
      });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error calculating skill mastery:', error);
      return { data: null, error: 'Failed to calculate skill mastery' };
    }
  };

  return {
    recordSkillSession,
    getSkillProgress,
    getUserAchievements,
    getSkillMastery,
    isLoading
  };
};
