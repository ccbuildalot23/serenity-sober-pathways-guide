import {supabase} from '@contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CheckinData {
  id?: string;
  userId: string;
  mood: number;
  anxiety: number;
  sleep: {
    hours: number;
    quality: number;
    sleepTime?: string;
    wakeTime?: string;
  };
  substance: {
    used: boolean;
    type?: string;
    amount?: string;
    triggers?: string[];
  };
  notes?: string;
  goals: string[];
  completedAt: string;
}

export interface CheckinStreak {
  currentStreak: number;
  longestStreak: number;
  totalCheckins: number;
}

export class CheckinService {
  /**
   * Get today's check-in if it exists
   */
  static async getTodaysCheckin(userId: string): Promise<CheckinData | null> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const {data, error} = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .gte('completed_at', `${today}T00:00:00`)
        .lt('completed_at', `${today}T23:59:59`)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data ? this.mapDatabaseToCheckin(data) : null;
    } catch (error) {
      console.error('Failed to get today\'s checkin:', error);
      return null;
    }
  }

  /**
   * Submit a daily check-in
   */
  static async submitCheckin(userId: string, checkinData: CheckinData): Promise<{
    success: boolean;
    error?: string;
    checkin?: CheckinData;
    isMilestone?: boolean;
    milestoneType?: string;
  }> {
    try {
      const dbData = this.mapCheckinToDatabase(checkinData, userId);
      
      const {data, error} = await supabase
        .from('daily_checkins')
        .insert([dbData])
        .select()
        .single();

      if (error) {
        return {success: false, error: error.message};
      }

      const savedCheckin = this.mapDatabaseToCheckin(data);
      
      // Check for milestones
      const milestone = await this.checkForMilestones(userId);
      
      return {
        success: true,
        checkin: savedCheckin,
        isMilestone: milestone.isMilestone,
        milestoneType: milestone.type,
      };
    } catch (error: any) {
      return {success: false, error: error.message || 'Failed to submit check-in'};
    }
  }

  /**
   * Get check-in streak data
   */
  static async getCheckinStreak(userId: string): Promise<CheckinStreak> {
    try {
      const {data, error} = await supabase
        .from('daily_checkins')
        .select('completed_at')
        .eq('user_id', userId)
        .order('completed_at', {ascending: false});

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return {currentStreak: 0, longestStreak: 0, totalCheckins: 0};
      }

      const dates = data.map(item => new Date(item.completed_at).toDateString());
      const uniqueDates = [...new Set(dates)];
      
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;
      
      const today = new Date();
      
      // Calculate current streak
      for (let i = 0; i < uniqueDates.length; i++) {
        const checkDate = new Date(uniqueDates[i]);
        const daysDiff = Math.floor((today.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (i === 0 && (daysDiff === 0 || daysDiff === 1)) {
          currentStreak = 1;
          tempStreak = 1;
        } else if (i > 0) {
          const prevDate = new Date(uniqueDates[i - 1]);
          const diffBetweenDates = Math.floor((prevDate.getTime() - checkDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffBetweenDates === 1) {
            if (currentStreak > 0) currentStreak++;
            tempStreak++;
          } else {
            if (currentStreak > 0 && i > 1) currentStreak = 0;
            tempStreak = 1;
          }
        }
        
        longestStreak = Math.max(longestStreak, tempStreak);
      }

      return {
        currentStreak,
        longestStreak,
        totalCheckins: uniqueDates.length,
      };
    } catch (error) {
      console.error('Failed to get checkin streak:', error);
      return {currentStreak: 0, longestStreak: 0, totalCheckins: 0};
    }
  }

  /**
   * Get check-in history
   */
  static async getCheckinHistory(userId: string, days: number = 30): Promise<CheckinData[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const {data, error} = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', userId)
        .gte('completed_at', startDate.toISOString())
        .order('completed_at', {ascending: false});

      if (error) {
        throw error;
      }

      return data ? data.map(item => this.mapDatabaseToCheckin(item)) : [];
    } catch (error) {
      console.error('Failed to get checkin history:', error);
      return [];
    }
  }

  /**
   * Check for milestones
   */
  private static async checkForMilestones(userId: string): Promise<{
    isMilestone: boolean;
    type?: string;
  }> {
    try {
      const streak = await this.getCheckinStreak(userId);
      
      // Check for streak milestones
      const milestoneNumbers = [7, 14, 30, 60, 90, 180, 365];
      
      if (milestoneNumbers.includes(streak.currentStreak)) {
        return {
          isMilestone: true,
          type: `${streak.currentStreak}-day streak`,
        };
      }

      // Check for total checkins milestones
      const totalMilestones = [10, 25, 50, 100, 250, 500, 1000];
      
      if (totalMilestones.includes(streak.totalCheckins)) {
        return {
          isMilestone: true,
          type: `${streak.totalCheckins} total check-ins`,
        };
      }

      return {isMilestone: false};
    } catch (error) {
      console.error('Failed to check milestones:', error);
      return {isMilestone: false};
    }
  }

  /**
   * Map check-in data to database format
   */
  private static mapCheckinToDatabase(checkin: CheckinData, userId: string): any {
    return {
      user_id: userId,
      mood: checkin.mood,
      anxiety: checkin.anxiety,
      sleep_hours: checkin.sleep.hours,
      sleep_quality: checkin.sleep.quality,
      sleep_time: checkin.sleep.sleepTime,
      wake_time: checkin.sleep.wakeTime,
      substance_used: checkin.substance.used,
      substance_type: checkin.substance.type,
      substance_amount: checkin.substance.amount,
      substance_triggers: checkin.substance.triggers,
      notes: checkin.notes,
      goals: checkin.goals,
      completed_at: checkin.completedAt,
    };
  }

  /**
   * Map database data to check-in format
   */
  private static mapDatabaseToCheckin(data: any): CheckinData {
    return {
      id: data.id,
      userId: data.user_id,
      mood: data.mood,
      anxiety: data.anxiety,
      sleep: {
        hours: data.sleep_hours,
        quality: data.sleep_quality,
        sleepTime: data.sleep_time,
        wakeTime: data.wake_time,
      },
      substance: {
        used: data.substance_used,
        type: data.substance_type,
        amount: data.substance_amount,
        triggers: data.substance_triggers || [],
      },
      notes: data.notes,
      goals: data.goals || [],
      completedAt: data.completed_at,
    };
  }

  /**
   * Cache check-in data offline
   */
  static async cacheCheckinOffline(userId: string, checkinData: CheckinData): Promise<void> {
    try {
      const cacheKey = `offline_checkin_${userId}`;
      const existingData = await AsyncStorage.getItem(cacheKey);
      const checkins = existingData ? JSON.parse(existingData) : [];
      
      checkins.push(checkinData);
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(checkins));
    } catch (error) {
      console.error('Failed to cache checkin offline:', error);
    }
  }

  /**
   * Sync offline check-ins
   */
  static async syncOfflineCheckins(userId: string): Promise<void> {
    try {
      const cacheKey = `offline_checkin_${userId}`;
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (!cachedData) return;
      
      const checkins: CheckinData[] = JSON.parse(cachedData);
      
      for (const checkin of checkins) {
        await this.submitCheckin(userId, checkin);
      }
      
      // Clear cached data after successful sync
      await AsyncStorage.removeItem(cacheKey);
      
      console.log(`Synced ${checkins.length} offline check-ins`);
    } catch (error) {
      console.error('Failed to sync offline checkins:', error);
    }
  }
}