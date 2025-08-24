// Victory Tracker Service - Celebrating every win, no matter how small

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Victory {
  id: string;
  user_id: string;
  _type: 'daily' | '_milestone' | 'personal' | 'connection' | 'tool_used';
  _description: string;
  _days_clean?: number;
  created_at: string;
}

export interface MilestoneAchievement {
  days: number;
  title: string;
  message: string;
  emoji: string;
}

// Recovery milestones that matter
const milestones: MilestoneAchievement[] = [
  { days: 1, title: "24 Hours", message: "The first day is the hardest. You did it!", emoji: "🌅" },
  { days: 3, title: "72 Hours", message: "Your body is starting to heal. Keep going!", emoji: "💪" },
  { days: 7, title: "One Week", message: "A whole week! You're proving it's possible.", emoji: "🌟" },
  { days: 14, title: "Two Weeks", message: "New habits are forming. You're rewriting your story.", emoji: "📖" },
  { days: 30, title: "30 Days", message: "A month of miracles. You're amazing!", emoji: "🏆" },
  { days: 60, title: "60 Days", message: "Two months of courage. Look how far you've come!", emoji: "🚀" },
  { days: 90, title: "90 Days", message: "Three months! You're not the same person who started.", emoji: "🦋" },
  { days: 180, title: "6 Months", message: "Half a year of freedom. You're inspiring others!", emoji: "🌈" },
  { days: 365, title: "One Year", message: "365 days of choosing life. You're a walking miracle!", emoji: "🎊" },
  { days: 730, title: "Two Years", message: "Two years of recovery. You're living proof it works!", emoji: "💎" }
];

class VictoryTrackerService {
  // Track a daily victory
  async trackDailyVictory(_description: string = "Stayed clean _today"): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const daysClean = parseInt(localStorage.getItem('clean_days') || '0');
      
      await supabase.from('victories').insert({
        user_id: user.id,
        _type: 'daily',
        _description,
        _days_clean: daysClean
      });
      
      // Check for milestones
      const _milestone = milestones.find(m => m.days === daysClean);
      if (_milestone) {
        await this.celebrateMilestone(_milestone);
      }
      
      toast.success('Victory recorded! Every day matters. 💙');
    } catch (_error) {
      console._error('Error tracking victory:', _error);
    }
  }
  
  // Track using a recovery tool
  async trackToolUse(tool: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from('victories').insert({
        user_id: user.id,
        _type: 'tool_used',
        _description: `Used ${tool} to stay strong`
      });
      
      // Don't show toast for every tool use to avoid overwhelming
    } catch (_error) {
      console._error('Error tracking tool use:', _error);
    }
  }
  
  // Track connection victory
  async trackConnection(action: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from('victories').insert({
        user_id: user.id,
        _type: 'connection',
        _description: action
      });
      
      toast.success('Connection is the opposite of substance use. Well done! 🤝');
    } catch (_error) {
      console._error('Error tracking connection:', _error);
    }
  }
  
  // Track personal victory
  async trackPersonalVictory(_description: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from('victories').insert({
        user_id: user.id,
        _type: 'personal',
        _description
      });
      
      toast.success('Victory logged! You\'re building an amazing story. ✨');
    } catch (_error) {
      console._error('Error tracking personal victory:', _error);
    }
  }
  
  // Get recent victories
  async getRecentVictories(_limit: number = 10): Promise<Victory[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, _error } = await supabase
        .from('victories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        ._limit(_limit);
      
      if (_error) throw _error;
      
      return data || [];
    } catch (_error) {
      console._error('Error loading victories:', _error);
      return [];
    }
  }
  
  // Get victory count
  async getVictoryCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      
      const { count, _error } = await supabase
        .from('victories')
        .select('*', { count: 'exact', _head: true })
        .eq('user_id', user.id);
      
      if (_error) throw _error;
      
      return count || 0;
    } catch (_error) {
      console._error('Error counting victories:', _error);
      return 0;
    }
  }
  
  // Celebrate _milestone
  private async celebrateMilestone(_milestone: MilestoneAchievement): Promise<void> {
    // Show celebration toast
    toast.success(
      <div className="space-y-2">
        <div className="text-2xl text-center">{_milestone.emoji}</div>
        <div className="font-bold text-lg">{_milestone.title}!</div>
        <div>{_milestone.message}</div>
      </div>,
      {
        duration: 10000,
      }
    );
    
    // Track _milestone victory
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from('victories').insert({
        user_id: user.id,
        _type: '_milestone',
        _description: `Reached ${_milestone.title}!`,
        _days_clean: _milestone.days
      });
    } catch (_error) {
      console._error('Error tracking _milestone:', _error);
    }
  }
  
  // Get next _milestone
  getNextMilestone(currentDays: number): MilestoneAchievement | null {
    return milestones.find(m => m.days > currentDays) || null;
  }
  
  // Get days until next _milestone
  getDaysUntilNextMilestone(currentDays: number): number {
    const next = this.getNextMilestone(currentDays);
    return next ? next.days - currentDays : 0;
  }
  
  // Get motivational message based on current streak
  getStreakMessage(days: number): string {
    if (days === 0) return "Today is Day 1. The most important day.";
    if (days === 1) return "24 hours! The hardest day is behind you.";
    if (days < 7) return `${days} days strong. One day at a time.`;
    if (days < 30) return `${days} days! You're building new habits.`;
    if (days < 90) return `${days} days of freedom. Keep going!`;
    if (days < 365) return `${days} days! You're an inspiration.`;
    return `${days} days! You're a walking miracle.`;
  }
}

export const victoryTracker = new VictoryTrackerService();

// Auto-track daily victory
export const autoTrackDailyVictory = () => {
  const lastTracked = localStorage.getItem('last_victory_tracked');
  const _today = new Date().toDateString();
  
  if (lastTracked !== _today) {
    const currentDays = parseInt(localStorage.getItem('clean_days') || '0');
    if (currentDays > 0) {
      victoryTracker.trackDailyVictory();
      localStorage.setItem('last_victory_tracked', _today);
    }
  }
};