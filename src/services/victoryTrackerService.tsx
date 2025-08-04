// Victory Tracker Service - Celebrating every win, no matter how small

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Victory {
  id: string;
  user_id: string;
  type: 'daily' | 'milestone' | 'personal' | 'connection' | 'tool_used';
  description: string;
  days_clean?: number;
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
  async trackDailyVictory(description: string = "Stayed clean today"): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const daysClean = parseInt(localStorage.getItem('clean_days') || '0');
      
      await supabase.from('victories').insert({
        user_id: user.id,
        type: 'daily',
        description,
        days_clean: daysClean
      });
      
      // Check for milestones
      const milestone = milestones.find(m => m.days === daysClean);
      if (milestone) {
        await this.celebrateMilestone(milestone);
      }
      
      toast.success('Victory recorded! Every day matters. 💙');
    } catch (error) {
      console.error('Error tracking victory:', error);
    }
  }
  
  // Track using a recovery tool
  async trackToolUse(tool: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from('victories').insert({
        user_id: user.id,
        type: 'tool_used',
        description: `Used ${tool} to stay strong`
      });
      
      // Don't show toast for every tool use to avoid overwhelming
    } catch (error) {
      console.error('Error tracking tool use:', error);
    }
  }
  
  // Track connection victory
  async trackConnection(action: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from('victories').insert({
        user_id: user.id,
        type: 'connection',
        description: action
      });
      
      toast.success('Connection is the opposite of addiction. Well done! 🤝');
    } catch (error) {
      console.error('Error tracking connection:', error);
    }
  }
  
  // Track personal victory
  async trackPersonalVictory(description: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from('victories').insert({
        user_id: user.id,
        type: 'personal',
        description
      });
      
      toast.success('Victory logged! You\'re building an amazing story. ✨');
    } catch (error) {
      console.error('Error tracking personal victory:', error);
    }
  }
  
  // Get recent victories
  async getRecentVictories(limit: number = 10): Promise<Victory[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('victories')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Error loading victories:', error);
      return [];
    }
  }
  
  // Get victory count
  async getVictoryCount(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      
      const { count, error } = await supabase
        .from('victories')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      return count || 0;
    } catch (error) {
      console.error('Error counting victories:', error);
      return 0;
    }
  }
  
  // Celebrate milestone
  private async celebrateMilestone(milestone: MilestoneAchievement): Promise<void> {
    // Show celebration toast
    toast.success(
      <div className="space-y-2">
        <div className="text-2xl text-center">{milestone.emoji}</div>
        <div className="font-bold text-lg">{milestone.title}!</div>
        <div>{milestone.message}</div>
      </div>,
      {
        duration: 10000,
      }
    );
    
    // Track milestone victory
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      await supabase.from('victories').insert({
        user_id: user.id,
        type: 'milestone',
        description: `Reached ${milestone.title}!`,
        days_clean: milestone.days
      });
    } catch (error) {
      console.error('Error tracking milestone:', error);
    }
  }
  
  // Get next milestone
  getNextMilestone(currentDays: number): MilestoneAchievement | null {
    return milestones.find(m => m.days > currentDays) || null;
  }
  
  // Get days until next milestone
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
  const today = new Date().toDateString();
  
  if (lastTracked !== today) {
    const currentDays = parseInt(localStorage.getItem('clean_days') || '0');
    if (currentDays > 0) {
      victoryTracker.trackDailyVictory();
      localStorage.setItem('last_victory_tracked', today);
    }
  }
};