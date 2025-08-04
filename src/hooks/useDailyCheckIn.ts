// Simple Daily Check-in - Just "How are you today?"
// Complex assessments are removed for MVP - focus on connection not data

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { simpleCheckin, MoodToday } from '@/services/simpleCheckinService';
import { victoryTracker } from '@/services/victoryTrackerService';
import { hopeMessenger } from '@/services/hopeMessengerService';
import { toast } from 'sonner';

export const useDailyCheckIn = () => {
  const { user } = useAuth();
  const [mood, setMood] = useState<MoodToday | null>(null);
  const [gratitude, setGratitude] = useState('');
  const [todaysVictory, setTodaysVictory] = useState('');
  const [needsSupport, setNeedsSupport] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  useEffect(() => {
    checkTodaysStatus();
  }, [user]);

  const checkTodaysStatus = async () => {
    if (!user) return;
    
    const todaysCheckin = await simpleCheckin.getTodaysCheckin();
    if (todaysCheckin) {
      setMood(todaysCheckin.mood);
      setHasCheckedIn(true);
    }
  };

  const submitCheckIn = async () => {
    if (!user || !mood || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Submit mood
      await simpleCheckin.checkIn(mood);
      
      // Track victory if they shared one
      if (todaysVictory.trim()) {
        await victoryTracker.trackDailyVictory(todaysVictory);
      }
      
      // Track gratitude as a victory too
      if (gratitude.trim()) {
        await victoryTracker.trackVictory({
          type: 'gratitude',
          description: gratitude
        });
      }
      
      // Send appropriate encouragement
      if (mood === 'struggling' || needsSupport) {
        hopeMessenger.sendHope('struggling');
        toast.info("You're not alone", {
          description: "Check out the support page for immediate help",
          duration: 5000
        });
      } else if (mood === 'good') {
        hopeMessenger.sendHope('victory');
      }
      
      setHasCheckedIn(true);
      
      // Show success with recovery language
      const messages = {
        struggling: "Thank you for being honest. That takes courage.",
        managing: "One day at a time. You're doing it.",
        good: "Beautiful! Your strength inspires others."
      };
      
      toast.success(messages[mood], { duration: 4000 });
      
      // Navigate based on need
      if (mood === 'struggling' || needsSupport) {
        setTimeout(() => {
          window.location.href = '/crisis-intervention';
        }, 2000);
      }
      
    } catch (error) {
      console.error('Check-in error:', error);
      toast.error("Couldn't save your check-in. That's okay, you're still doing great.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const reset = () => {
    setMood(null);
    setGratitude('');
    setTodaysVictory('');
    setNeedsSupport(false);
  };

  return {
    mood,
    setMood,
    gratitude,
    setGratitude,
    todaysVictory,
    setTodaysVictory,
    needsSupport,
    setNeedsSupport,
    isSubmitting,
    hasCheckedIn,
    submitCheckIn,
    reset,
    canSubmit: mood !== null
  };
};