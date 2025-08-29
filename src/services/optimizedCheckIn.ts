import { supabase } from '@/integrations/supabase/client';
import logger from './loggerService';

interface CheckInData {
  mood: string;
  activities?: string[];
  sleep_quality?: number;
  notes?: string;
  energy?: number;
  hope?: number;
  sobriety_confidence?: number;
  recovery_importance?: number;
  recovery_strength?: number;
  support_needed?: boolean;
}

export async function submitCheckIn(data: CheckInData, userId: string | null) {
  const startTime = Date.now();
  
  try {
    if (!userId) {
      // Save to local storage for non-authenticated users
      saveToLocalStorage(data);
      updateStreakLocally();
      return { success: true, source: 'local' };
    }

    // Convert mood to numeric value
    const moodValue = data.mood === 'positive' ? 5 : data.mood === 'neutral' ? 3 : 1;
    
    // Submit to database
    const { data: result, error } = await supabase
      .from('daily_checkins')
      .insert({
        user_id: userId,
        mood: moodValue,
        energy_level: data.energy || 3,
        hope_level: data.hope || 3,
        sobriety_confidence: data.sobriety_confidence || 3,
        recovery_importance: data.recovery_importance || 3,
        recovery_strength: data.recovery_strength || 3,
        support_needed: data.support_needed || false,
        sleep_quality: data.sleep_quality || 3,
        activities: data.activities || [],
        notes: data.notes || '',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Update streak in profiles table
    await updateUserStreak(userId);
    
    // Dispatch events for UI updates
    dispatchCheckInEvents(userId);
    
    const elapsed = Date.now() - startTime;
    logger.debug(`Check-in completed in ${elapsed}ms`, { component: 'optimizedCheckIn' });
    
    return { success: true, source: 'database', data: result };
  } catch (error) {
    logger.error('Check-in submission failed', error, { component: 'optimizedCheckIn' });
    
    // Fallback to local storage
    saveToLocalStorage(data);
    updateStreakLocally();
    
    return { success: true, source: 'local', error };
  }
}

function saveToLocalStorage(data: CheckInData) {
  const date = new Date().toISOString().slice(0, 10);
  const checkins = JSON.parse(localStorage.getItem('local_checkins') || '{}');
  checkins[date] = {
    ...data,
    timestamp: Date.now()
  };
  localStorage.setItem('local_checkins', JSON.stringify(checkins));
}

async function updateUserStreak(userId: string) {
  try {
    // Get current streak
    const { data: profile } = await supabase
      .from('profiles')
      .select('recovery_streak, last_checkin_date')
      .eq('id', userId)
      .single();

    if (profile) {
      const today = new Date().toISOString().slice(0, 10);
      const lastCheckin = profile.last_checkin_date;
      
      let newStreak = 1;
      if (lastCheckin) {
        const lastDate = new Date(lastCheckin);
        const todayDate = new Date(today);
        const daysDiff = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 1) {
          // Consecutive day - increment streak
          newStreak = (profile.recovery_streak || 0) + 1;
        } else if (daysDiff === 0) {
          // Same day - keep current streak
          newStreak = profile.recovery_streak || 1;
        }
        // If daysDiff > 1, streak resets to 1
      }

      // Update profile with new streak
      await supabase
        .from('profiles')
        .update({
          recovery_streak: newStreak,
          last_checkin_date: today
        })
        .eq('id', userId);
    }
  } catch (error) {
    logger.error('Failed to update user streak', error, { component: 'optimizedCheckIn' });
  }
}

function updateStreakLocally() {
  const streakData = JSON.parse(localStorage.getItem('streak_data') || '{}');
  const today = new Date().toISOString().slice(0, 10);
  const lastDate = streakData.lastDate;
  
  let newStreak = 1;
  if (lastDate) {
    const last = new Date(lastDate);
    const todayDate = new Date(today);
    const daysDiff = Math.floor((todayDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      newStreak = (streakData.streak || 0) + 1;
    } else if (daysDiff === 0) {
      newStreak = streakData.streak || 1;
    }
  }
  
  localStorage.setItem('streak_data', JSON.stringify({
    streak: newStreak,
    lastDate: today
  }));
}

function dispatchCheckInEvents(userId: string | null) {
  // Notify dashboard to refresh
  window.dispatchEvent(new (window as any).CustomEvent('checkin:completed', {
    detail: { 
      when: Date.now(), 
      userId,
      source: userId ? 'database' : 'local'
    }
  }));
  
  // Update streak counter immediately
  window.dispatchEvent(new (window as any).CustomEvent('streak:update', {
    detail: { 
      increment: true,
      timestamp: Date.now()
    }
  }));
  
  // Notify any other listeners
  window.dispatchEvent(new (window as any).CustomEvent('data:refresh', {
    detail: { 
      type: 'checkin',
      timestamp: Date.now()
    }
  }));
}

export function getLocalStreak(): number {
  const streakData = JSON.parse(localStorage.getItem('streak_data') || '{}');
  return streakData.streak || 0;
}

export function getLocalCheckins(): Record<string, any> {
  return JSON.parse(localStorage.getItem('local_checkins') || '{}');
}