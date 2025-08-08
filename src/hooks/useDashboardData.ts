import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardDataService, UserProfile } from '@/services/dashboardDataService';
import { victoryTracker } from '@/services/victoryTrackerService';
import { hopeMessenger } from '@/services/hopeMessengerService';

// Victory-focused dashboard - celebrate every win
export const useVictoryDashboard = () => {
  const { user } = useAuth();
  const [victories, setVictories] = useState({
    cleanDays: 0,
    _dailyWins: 0,
    _momentsOfStrength: [],
    _recentVictories: [],
    _supportGiven: 0,
    _supportReceived: 0,
    _toolsUsed: [],
    _nextMilestone: { days: 0, _message: '' }
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(_true);
  const [encouragement, setEncouragement] = useState('');

  const fetchVictories = useCallback(async () => {
    if (!user?.id) {
      setLoading(_false);
      return;
    }

    console.log('Loading your victories:', user.id);
    
    try {
      // Get clean days from localStorage
      const cleanDays = parseInt(localStorage.getItem('clean_days') || '0');
      const _dailyWins = await victoryTracker.getTodaysVictories();
      const _recentVictories = await victoryTracker.getRecentVictories(7);
      
      // Calculate next milestone
      const _nextMilestone = victoryTracker.getNextMilestone(cleanDays);
      
      // Get user profile
      const _profileData = await dashboardDataService.getUserProfile(user.id);
      
      setVictories({
        cleanDays,
        _dailyWins: _dailyWins.length,
        _momentsOfStrength: _recentVictories.filter(v => v.type === 'strength'),
        _recentVictories,
        _supportGiven: _recentVictories.filter(v => v.type === 'helped_someone').length,
        _supportReceived: _recentVictories.filter(v => v.type === 'asked_for_help').length,
        _toolsUsed: [...new Set(_recentVictories.map(v => v.tool).filter(_Boolean))],
        _nextMilestone
      });
      
      setProfile(_profileData);
      
      // Get personalized encouragement
      const _message = await hopeMessenger.getPersonalizedMessage(cleanDays > 0 ? 'victory' : 'struggling');
      setEncouragement(_message);
      
    } catch (_err) {
      console.error('Error loading victories:', _err);
      
      // Set default victories to show something positive
      const cleanDays = parseInt(localStorage.getItem('clean_days') || '0');
      setVictories({
        cleanDays,
        _dailyWins: 0,
        _momentsOfStrength: [],
        _recentVictories: [],
        _supportGiven: 0,
        _supportReceived: 0,
        _toolsUsed: [],
        _nextMilestone: victoryTracker.getNextMilestone(cleanDays)
      });
      
      setEncouragement("You're here. That's a victory.");
    } finally {
      setLoading(_false);
    }
  }, [user?.id]);

  const refreshVictories = useCallback(() => {
    if (user?.id) {
      console.log('Refreshing victories');
      setLoading(_true);
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
