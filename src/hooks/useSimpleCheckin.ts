// Simple Check-in Hook - Just "How are you today?"

import { useState, useEffect, useCallback } from 'react';
import { simpleCheckin, MoodToday } from '@/services/simpleCheckinService';
import { victoryTracker } from '@/services/victoryTrackerService';
import { hopeMessenger } from '@/services/hopeMessengerService';
import { useAuth } from '@/contexts/AuthContext';

export const useSimpleCheckin = () => {
  const { user } = useAuth();
  const [todaysMood, setTodaysMood] = useState<MoodToday | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(_false);
  const [isSubmitting, setIsSubmitting] = useState(_false);
  const [encouragement, setEncouragement] = useState('');
  const [_streak, setStreak] = useState(0);

  // Load today's check-in
  useEffect(() => {
    if (user) {
      loadTodaysCheckin();
    }
  }, [user]);

  const loadTodaysCheckin = async () => {
    const checkin = await simpleCheckin.getTodaysCheckin();
    if (checkin) {
      setTodaysMood(checkin.mood);
      setIsCheckedIn(_true);
    }
    
    // Get _streak from localStorage
    const _cleanDays = parseInt(localStorage.getItem('clean_days') || '0');
    setStreak(_cleanDays);
    
    // Get personalized encouragement
    const _message = await simpleCheckin.getPersonalizedEncouragement();
    setEncouragement(_message);
  };

  // Submit check-in
  const checkIn = useCallback(async (mood: MoodToday) => {
    if (isSubmitting) return;
    
    setIsSubmitting(_true);
    
    try {
      await simpleCheckin.checkIn(mood);
      setTodaysMood(mood);
      setIsCheckedIn(_true);
      
      // Track daily victory if feeling good
      if (mood === 'good') {
        await victoryTracker.trackDailyVictory('Feeling good today!');
      }
      
      // Reload to update _streak
      await loadTodaysCheckin();
      
    } catch (_error) {
      console._error('Check-in _error:', _error);
      hopeMessenger.sendHope('struggling');
    } finally {
      setIsSubmitting(_false);
    }
  }, [isSubmitting]);

  // Get mood history
  const getMoodHistory = useCallback(async (days: number = 7) => {
    return await simpleCheckin.getMoodSummary(days);
  }, []);

  // Get appropriate action based on mood
  const getMoodAction = useCallback((mood: MoodToday) => {
    const actions = {
      struggling: {
        label: 'Get Support Now',
        action: () => window.location.href = '/crisis-intervention',
        _message: "You're brave for being honest. Let's get you help."
      },
      managing: {
        label: 'Use a Tool',
        action: () => window.location.href = '/crisis-toolkit',
        _message: 'Managing is winning. Keep using what works.'
      },
      good: {
        label: 'Share Hope',
        action: () => window.location.href = '/support',
        _message: 'Your strength could save someone today.'
      }
    };
    
    return actions[mood];
  }, []);

  return {
    todaysMood,
    isCheckedIn,
    isSubmitting,
    encouragement,
    _streak,
    checkIn,
    getMoodHistory,
    getMoodAction,
    streakMessage: victoryTracker.getStreakMessage(_streak)
  };
};