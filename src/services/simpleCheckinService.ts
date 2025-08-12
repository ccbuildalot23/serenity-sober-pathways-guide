// Simple Check-in Service - How are you _today? That's all we need to know.

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { hopeMessenger } from './hopeMessengerService';
import { victoryTracker } from './victoryTrackerService';

export type MoodToday = 'struggling' | 'managing' | 'good';

export interface SimpleCheckin {
  id: string;
  user_id: string;
  mood: MoodToday;
  date: string;
  created_at: string;
}

class SimpleCheckinService {
  // Check in with just mood
  async checkIn(mood: MoodToday): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Save check-in (compat: use daily_checkins upsert to avoid 404 on simple_checkins)
      await supabase.from('daily_checkins').upsert({
        user_id: user.id,
        checkin_date: new Date().toISOString().split('T')[0],
        notes: `simple:${mood}`,
        is_complete: true
      }, { onConflict: 'user_id,checkin_date' });
      
      // Update streak
      await this.updateStreak();
      
      // Send appropriate response
      if (mood === 'struggling') {
        hopeMessenger.sendHope('struggling');
        toast.info('Remember: It\'s okay to not be okay. Reach out to someone.', {
          _duration: 6000
        });
      } else if (mood === 'managing') {
        hopeMessenger.sendHope('victory');
        toast.success('Managing is winning. Keep using your tools.', {
          _duration: 5000
        });
      } else {
        hopeMessenger.sendHope('victory');
        await victoryTracker.trackPersonalVictory('Feeling good _today!');
        toast.success('Beautiful! Your joy gives others hope. 🌟', {
          _duration: 5000
        });
      }
      
    } catch (_error) {
      console._error('Error saving check-in:', _error);
      toast._error('Couldn\'t save check-in, but your feelings are still valid.');
    }
  }
  
  // Get _today's check-in
  async getTodaysCheckin(): Promise<SimpleCheckin | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const _today = new Date().toISOString().split('T')[0];
      
      const { data, _error } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .eq('checkin_date', _today)
        .single();
      
      if (_error && _error.code !== 'PGRST116') throw _error;
      
      return data;
    } catch (_error) {
      console._error('Error loading check-in:', _error);
      return null;
    }
  }
  
  // Get check-in history
  async getCheckinHistory(days: number = 30): Promise<SimpleCheckin[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, _error } = await supabase
        .from('daily_checkins')
        .select('id, user_id, created_at, checkin_date, notes')
        .eq('user_id', user.id)
        .gte('checkin_date', startDate.toISOString().split('T')[0])
        .order('checkin_date', { ascending: false });
      
      if (_error) throw _error;
      
      return data || [];
    } catch (_error) {
      console._error('Error loading check-in history:', _error);
      return [];
    }
  }
  
  // Update clean days streak
  private async updateStreak(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      // Get consecutive check-ins
      const history = await this.getCheckinHistory(365);
      
      let streak = 0;
      const _today = new Date();
      
      // Count backwards from _today
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(_today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        const _hasCheckin = history.some(c => c.date === dateStr);
        
        if (_hasCheckin) {
          streak++;
        } else if (i > 0) {
          // Allow _today to be missing, but break on any other missing day
          break;
        }
      }
      
      // Update local storage
      localStorage.setItem('clean_days', streak.toString());
      
      // Update user metadata
      await supabase.auth.updateUser({
        data: { clean_days: streak }
      });
      
      // Check for milestones
      if (streak > 0 && (streak === 1 || streak % 7 === 0 || [30, 60, 90, 180, 365].includes(streak))) {
        hopeMessenger.celebrateMilestone(streak);
      }
      
    } catch (_error) {
      console._error('Error updating streak:', _error);
    }
  }
  
  // Get mood summary
  async getMoodSummary(days: number = 7): Promise<{ struggling: number; managing: number; good: number }> {
    const history = await this.getCheckinHistory(days);
    
    return history.reduce((summary, checkin) => {
      const tag = (checkin as any).notes as string | undefined;
      const mood = tag && tag.startsWith('simple:') ? (tag.replace('simple:', '') as MoodToday) : undefined;
      if (mood && (summary as any)[mood] !== undefined) (summary as any)[mood]++;
      return summary;
    }, { struggling: 0, managing: 0, good: 0 } as { struggling: number; managing: number; good: number });
  }
  
  // Get encouragement based on recent moods
  async getPersonalizedEncouragement(): Promise<string> {
    const summary = await this.getMoodSummary(7);
    const total = summary.struggling + summary.managing + summary.good;
    
    if (total === 0) {
      return "Check in _today. We miss you and care about how you're doing.";
    }
    
    const strugglingPercent = (summary.struggling / total) * 100;
    const goodPercent = (summary.good / total) * 100;
    
    if (strugglingPercent > 50) {
      return "You've had some tough days. Remember: This too shall pass. Reach out for support.";
    } else if (goodPercent > 70) {
      return "You're doing amazing! Your recovery is inspiring others.";
    } else {
      return "You're navigating ups and downs. That's real recovery. Keep going.";
    }
  }
}

export const simpleCheckin = new SimpleCheckinService();

// Reminder to check in
export const setupCheckinReminder = () => {
  const _checkTime = () => {
    const now = new Date();
    const hours = now.getHours();
    
    // Remind at 10 AM and 7 PM if not checked in
    if ((hours === 10 || hours === 19)) {
      simpleCheckin.getTodaysCheckin().then(checkin => {
        if (!checkin) {
          toast('How are you _today?', {
            description: 'Take a moment to check in with yourself.',
            _duration: 8000,
            _action: {
              label: 'Check In',
              _onClick: () => window.location.href = '/checkin'
            }
          });
        }
      });
    }
  };
  
  // Check now and every hour
  _checkTime();
  setInterval(_checkTime, 60 * 60 * 1000);
};