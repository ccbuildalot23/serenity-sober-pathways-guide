
import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  subscribeToCrisisEvents,
  subscribeToMoodUpdates,
  subscribeToAllCheckInUpdates,
  unsubscribeFromChannel
} from '@/services/enhancedRealtimeService';

interface UseRealtimeUpdatesProps {
  onCrisisEvent?: (payload: any) => void;
  onMoodUpdate?: (payload: any) => void;
  onCheckInUpdate?: (payload: any) => void;
}

export const useRealtimeUpdates = ({
  onCrisisEvent,
  onMoodUpdate,
  onCheckInUpdate
}: UseRealtimeUpdatesProps) => {
  const { user } = useAuth();
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up real-time subscriptions for user:', user.id);

    // Subscribe to crisis events
    if (onCrisisEvent) {
      const crisisChannel = subscribeToCrisisEvents(user.id, (payload) => {
        console.log('Crisis event received:', payload);
        onCrisisEvent(payload);
      });
      channelsRef.current.push(crisisChannel);
    }

    // Subscribe to mood updates
    if (onMoodUpdate) {
      const moodChannel = subscribeToMoodUpdates(user.id, (payload) => {
        console.log('Mood update received:', payload);
        onMoodUpdate(payload);
      });
      channelsRef.current.push(moodChannel);
    }

    // Subscribe to all check-in updates
    if (onCheckInUpdate) {
      const checkInChannel = subscribeToAllCheckInUpdates(user.id, (payload) => {
        console.log('Check-in update received:', payload);
        onCheckInUpdate(payload);
      });
      channelsRef.current.push(checkInChannel);
    }

    // Cleanup function
    return () => {
      console.log('Cleaning up real-time subscriptions');
      channelsRef.current.forEach(channel => {
        unsubscribeFromChannel(channel);
      });
      channelsRef.current = [];
    };
  }, [user?.id, onCrisisEvent, onMoodUpdate, onCheckInUpdate]);

  return {
    isConnected: channelsRef.current.length > 0
  };
};
