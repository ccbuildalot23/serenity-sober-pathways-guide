import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CheckinData {
  user_id: string;
  checkin_date: string;
  mood_rating?: number;
  energy_rating?: number;
  hope_rating?: number;
  sleep_quality?: number;
  medication_taken?: boolean;
  sobriety_confidence?: number;
  recovery_importance?: number;
  recovery_strength?: string;
  support_needed?: string;
  triggers?: string[];
  coping_strategies?: string[];
  notes?: string;
  is_complete: boolean;
}

export interface AssessmentData {
  assessment_type: string;
  scores: Record<string, number>;
  responses: Record<string, any>;
}

export interface CheckinStats {
  total_checkins: number;
  streak_count: number;
  last_checkin: string | null;
  average_mood: number | null;
  completion_rate_7_days: number;
  completion_rate_30_days: number;
}

class EnhancedCheckinService {
  private readonly STORAGE_KEY = 'offline_checkin_data';

  async saveCheckin(checkinData: CheckinData, assessments: AssessmentData[] = []): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Save to localStorage first for offline support
      this.saveToLocalStorage(checkinData, assessments);

      // Attempt to save to Supabase
      const { data: savedCheckin, error: checkinError } = await supabase
        .from('daily_checkins')
        .upsert({
          ...checkinData,
          completed_sections: JSON.stringify(['mood', 'wellness', 'assessments']),
        }, {
          onConflict: 'user_id,checkin_date'
        })
        .select()
        .single();

      if (checkinError) throw checkinError;

      // Save assessments if provided
      if (assessments.length > 0) {
        const assessmentRecords = assessments.map(assessment => ({
          checkin_id: savedCheckin.id,
          ...assessment
        }));

        const { error: assessmentError } = await supabase
          .from('checkin_assessments')
          .upsert(assessmentRecords);

        if (assessmentError) throw assessmentError;
      }

      // Clear offline storage on successful save
      this.clearLocalStorage(checkinData.checkin_date);

      toast.success('Daily check-in saved successfully!');
      return { success: true, data: savedCheckin };

    } catch (error) {
      console.error('Error saving checkin:', error);
      toast.error('Unable to save online. Data saved locally and will sync when connection is restored.');
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async loadCheckinHistory(userId: string, days: number = 30): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('daily_checkins')
        .select(`
          *,
          checkin_assessments(*)
        `)
        .eq('user_id', userId)
        .gte('checkin_date', startDate.toISOString().split('T')[0])
        .order('checkin_date', { ascending: false });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('Error loading checkin history:', error);
      toast.error('Unable to load check-in history');
      return [];
    }
  }

  async getCheckinStats(userId: string): Promise<CheckinStats> {
    try {
      // Get stats from the stats table
      const { data: statsData, error: statsError } = await supabase
        .from('checkin_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (statsError && statsError.code !== 'PGRST116') throw statsError;

      // Calculate completion rates
      const [rate7, rate30] = await Promise.all([
        this.calculateCompletionRate(userId, 7),
        this.calculateCompletionRate(userId, 30)
      ]);

      return {
        total_checkins: statsData?.total_checkins || 0,
        streak_count: statsData?.streak_count || 0,
        last_checkin: statsData?.last_checkin || null,
        average_mood: statsData?.average_mood || null,
        completion_rate_7_days: rate7,
        completion_rate_30_days: rate30
      };

    } catch (error) {
      console.error('Error getting checkin stats:', error);
      return {
        total_checkins: 0,
        streak_count: 0,
        last_checkin: null,
        average_mood: null,
        completion_rate_7_days: 0,
        completion_rate_30_days: 0
      };
    }
  }

  private async calculateCompletionRate(userId: string, days: number): Promise<number> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('daily_checkins')
        .select('checkin_date')
        .eq('user_id', userId)
        .eq('is_complete', true)
        .gte('checkin_date', startDate.toISOString().split('T')[0]);

      if (error) throw error;

      const completedDays = data?.length || 0;
      return Math.round((completedDays / days) * 100);

    } catch (error) {
      console.error(`Error calculating ${days}-day completion rate:`, error);
      return 0;
    }
  }

  async syncOfflineData(userId: string): Promise<void> {
    try {
      const offlineData = this.getOfflineData();
      
      for (const [date, data] of Object.entries(offlineData)) {
        if (data.checkinData.user_id === userId) {
          await this.saveCheckin(data.checkinData, data.assessments);
        }
      }

      localStorage.removeItem(this.STORAGE_KEY);
      toast.success('Offline data synced successfully!');

    } catch (error) {
      console.error('Error syncing offline data:', error);
      toast.error('Some offline data could not be synced');
    }
  }

  private saveToLocalStorage(checkinData: CheckinData, assessments: AssessmentData[]): void {
    try {
      const offlineData = this.getOfflineData();
      offlineData[checkinData.checkin_date] = {
        checkinData,
        assessments,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(offlineData));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }

  private getOfflineData(): Record<string, any> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return {};
    }
  }

  private clearLocalStorage(date: string): void {
    try {
      const offlineData = this.getOfflineData();
      delete offlineData[date];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(offlineData));
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  getStreakCelebrationMessage(streak: number): string | null {
    const milestones = [1, 3, 7, 14, 30, 60, 90, 180, 365];
    
    if (milestones.includes(streak)) {
      const messages = {
        1: "🎉 Great start! You've completed your first daily check-in!",
        3: "🔥 Three days strong! You're building a healthy habit!",
        7: "⭐ One week streak! You're showing real commitment!",
        14: "💪 Two weeks! Your dedication is inspiring!",
        30: "🏆 One month milestone! You're crushing your recovery goals!",
        60: "🌟 Two months! Your consistency is remarkable!",
        90: "🎊 Three months! You've built an incredible habit!",
        180: "🥇 Six months! You're a daily check-in champion!",
        365: "👑 One full year! You're absolutely amazing!"
      };
      return messages[streak as keyof typeof messages] || null;
    }
    
    return null;
  }
}

export const enhancedCheckinService = new EnhancedCheckinService();