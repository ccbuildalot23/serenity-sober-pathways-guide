import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardDataService, DashboardStats, UserProfile } from '@/services/dashboardDataService';
import { toast } from 'sonner';
import { victoryTracker } from '@/services/victoryTrackerService';
import { hopeMessenger } from '@/services/hopeMessengerService';

// Victory-focused dashboard - celebrate every win
export const useVictoryDashboard = () => {
  const { user } = useAuth();
  const [victories, setVictories] = useState({
    cleanDays: 0,
    dailyWins: 0,
    momentsOfStrength: [],
    recentVictories: [],
    supportGiven: 0,
    supportReceived: 0,
    toolsUsed: [],
    nextMilestone: { days: 0, message: '' }
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [encouragement, setEncouragement] = useState('');

  const fetchVictories = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    console.log('Loading your victories:', user.id);
    
    try {
      // Get clean days from localStorage
      const cleanDays = parseInt(localStorage.getItem('clean_days') || '0');
      const dailyWins = await victoryTracker.getTodaysVictories();
      const recentVictories = await victoryTracker.getRecentVictories(7);
      
      // Calculate next milestone
      const nextMilestone = victoryTracker.getNextMilestone(cleanDays);
      
      // Get user profile
      const profileData = await dashboardDataService.getUserProfile(user.id);
      
      setVictories({
        cleanDays,
        dailyWins: dailyWins.length,
        momentsOfStrength: recentVictories.filter(v => v.type === 'strength'),
        recentVictories,
        supportGiven: recentVictories.filter(v => v.type === 'helped_someone').length,
        supportReceived: recentVictories.filter(v => v.type === 'asked_for_help').length,
        toolsUsed: [...new Set(recentVictories.map(v => v.tool).filter(Boolean))],
        nextMilestone
      });
      
      setProfile(profileData);
      
      // Get personalized encouragement
      const message = await hopeMessenger.getPersonalizedMessage(cleanDays > 0 ? 'victory' : 'struggling');
      setEncouragement(message);
      
    } catch (err) {
      console.error('Error loading victories:', err);
      
      // Set default victories to show something positive
      const cleanDays = parseInt(localStorage.getItem('clean_days') || '0');
      setVictories({
        cleanDays,
        dailyWins: 0,
        momentsOfStrength: [],
        recentVictories: [],
        supportGiven: 0,
        supportReceived: 0,
        toolsUsed: [],
        nextMilestone: victoryTracker.getNextMilestone(cleanDays)
      });
      
      setEncouragement("You're here. That's a victory.");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const refreshVictories = useCallback(() => {
    if (user?.id) {
      console.log('Refreshing victories');
      setLoading(true);
      fetchVictories();
    }
  }, [user?.id, fetchVictories]);

  useEffect(() => {
    fetchVictories();
  }, [fetchVictories]);

  return {
    victories,
    profile,
    loading,
    encouragement,
    refreshVictories,
    streakMessage: victoryTracker.getStreakMessage(victories.cleanDays)
  };
};

// Backward compatibility
export const useDashboardData = useVictoryDashboard;
