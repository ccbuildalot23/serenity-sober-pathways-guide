
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Real-time updates for crisis events (critical for family notifications)
export const subscribeToCrisisEvents = (userId: string, callback: (payload: any) => void): RealtimeChannel => {
  return supabase
    .channel('crisis_events')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'crisis_events',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

// Real-time mood tracking updates
export const subscribeToMoodUpdates = (userId: string, callback: (payload: any) => void): RealtimeChannel => {
  return supabase
    .channel('daily_checkins')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'daily_checkins',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

// Helper function to unsubscribe from channels
export const unsubscribeFromChannel = (channel: RealtimeChannel): void => {
  supabase.removeChannel(channel);
};

// Subscribe to all checkin events (INSERT and UPDATE)
export const subscribeToAllCheckInUpdates = (userId: string, callback: (payload: any) => void): RealtimeChannel => {
  return supabase
    .channel('all_checkins')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'daily_checkins',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

// Subscribe to emergency contact updates
export const subscribeToEmergencyContactUpdates = (userId: string, callback: (payload: any) => void): RealtimeChannel => {
  return supabase
    .channel('emergency_contacts')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'emergency_contacts',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};
