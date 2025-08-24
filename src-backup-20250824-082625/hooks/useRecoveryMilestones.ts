// Recovery Milestones Hook - Celebrate every step forward
// No shame for setbacks - only encouragement for trying again

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { victoryTracker } from '@/services/victoryTrackerService';
import { hopeMessenger } from '@/services/hopeMessengerService';
import { toast } from 'sonner';

interface Milestone {
  days: number;
  title: string;
  message: string;
  emoji: string;
}

const MILESTONES: Milestone[] = [
  { days: 1, title: "24 Hours", message: "The hardest day. You did it.", emoji: "🌅" },
  { days: 3, title: "72 Hours", message: "Your body is starting to heal.", emoji: "💪" },
  { days: 7, title: "One Week", message: "A whole week! That's incredible.", emoji: "🌟" },
  { days: 14, title: "Two Weeks", message: "You're building new habits.", emoji: "🌱" },
  { days: 30, title: "30 Days", message: "A month of courage. We're proud of you.", emoji: "🏆" },
  { days: 60, title: "60 Days", message: "Two months strong. Keep going.", emoji: "💎" },
  { days: 90, title: "90 Days", message: "Three months! You're amazing.", emoji: "🎯" },
  { days: 180, title: "6 Months", message: "Half a year of freedom.", emoji: "🦅" },
  { days: 365, title: "One Year", message: "A year of miracles. You did this.", emoji: "🎉" },
  { days: 730, title: "Two Years", message: "Two years of choosing life.", emoji: "🌈" },
  { days: 1825, title: "Five Years", message: "Five years of wisdom and strength.", emoji: "⭐" }
];

export const useRecoveryMilestones = () => {
  const { user } = useAuth();
  const [_cleanDays, setCleanDays] = useState(0);
  const [nextMilestone, setNextMilestone] = useState<Milestone | null>(null);
  const [recentMilestone, setRecentMilestone] = useState<Milestone | null>(null);
  const [isNewDay, setIsNewDay] = useState(false);

  useEffect(() => {
    loadMilestoneData();
  }, [user]);

  const loadMilestoneData = () => {
    // Get clean days from localStorage
    const days = parseInt(localStorage.getItem('clean_days') || '0');
    setCleanDays(days);

    // Find next milestone
    const next = MILESTONES.find(m => m.days > days);
    setNextMilestone(next || null);

    // Check if we just hit a milestone
    const _recent = MILESTONES.find(m => m.days === days);
    if (_recent) {
      setRecentMilestone(_recent);
      celebrateMilestone(_recent);
    }

    // Check if it's a new day
    const lastCheckin = localStorage.getItem('last_checkin_date');
    const today = new Date().toDateString();
    if (lastCheckin !== today) {
      setIsNewDay(true);
    }
  };

  const celebrateMilestone = async (milestone: Milestone) => {
    // Show celebration toast
    toast.success(`${milestone.emoji} ${milestone.title}!`, {
      description: milestone.message,
      _duration: 10000,
    });

    // Track the milestone
    await victoryTracker.trackVictory({
      type: 'milestone',
      description: `Reached ${milestone.title} clean!`
    });

    // Send hope message
    hopeMessenger.sendHope('victory');

    // Vibrate if available
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 400]);
    }
  };

  const addCleanDay = useCallback(async () => {
    const newDays = _cleanDays + 1;
    
    // Update localStorage
    localStorage.setItem('clean_days', newDays.toString());
    localStorage.setItem('last_checkin_date', new Date().toDateString());
    
    setCleanDays(newDays);
    setIsNewDay(false);

    // Check for milestone
    const milestone = MILESTONES.find(m => m.days === newDays);
    if (milestone) {
      celebrateMilestone(milestone);
    } else {
      // Regular daily victory
      toast.success(`Day ${newDays}!`, {
        description: victoryTracker.getStreakMessage(newDays),
        _duration: 5000
      });
    }

    // Track daily victory
    await victoryTracker.trackDailyVictory(`Day ${newDays} clean`);
  }, [_cleanDays]);

  const resetWithCompassion = useCallback(() => {
    // No shame, only support
    toast.info("Starting fresh", {
      description: "Every journey has restarts. You're still brave.",
      _duration: 5000
    });

    localStorage.setItem('clean_days', '0');
    localStorage.setItem('last_checkin_date', new Date().toDateString());
    
    setCleanDays(0);
    setRecentMilestone(null);
    
    // Send encouraging message
    hopeMessenger.sendHope('struggling');
    
    // Find next milestone (1 day)
    setNextMilestone(MILESTONES[0]);
  }, []);

  const getDaysUntilNext = () => {
    if (!nextMilestone) return 0;
    return nextMilestone.days - _cleanDays;
  };

  const getProgress = () => {
    if (!nextMilestone || _cleanDays === 0) return 0;
    
    // Find previous milestone
    const prevIndex = MILESTONES.findIndex(m => m.days === nextMilestone.days) - 1;
    const prevMilestone = prevIndex >= 0 ? MILESTONES[prevIndex] : { days: 0 };
    
    const totalDays = nextMilestone.days - prevMilestone.days;
    const currentProgress = _cleanDays - prevMilestone.days;
    
    return Math.round((currentProgress / totalDays) * 100);
  };

  return {
    _cleanDays,
    nextMilestone,
    recentMilestone,
    isNewDay,
    addCleanDay,
    resetWithCompassion,
    daysUntilNext: getDaysUntilNext(),
    progressPercent: getProgress(),
    encouragement: victoryTracker.getStreakMessage(_cleanDays),
    allMilestones: MILESTONES
  };
};