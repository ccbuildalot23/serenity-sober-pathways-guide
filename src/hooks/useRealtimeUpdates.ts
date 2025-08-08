
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
  onCrisisEvent?: (_payload: unknown) => void;
  onMoodUpdate?: (_payload: unknown) => void;
  onCheckInUpdate?: (_payload: unknown) => void;
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
      const _crisisChannel = subscribeToCrisisEvents(user.id, (_payload) => {
        console.log('Crisis event received:', _payload);
        onCrisisEvent(_payload);
      });
      channelsRef.current.push(_crisisChannel);
    }

    // Subscribe to mood updates
    if (onMoodUpdate) {
      const _moodChannel = subscribeToMoodUpdates(user.id, (_payload) => {
        console.log('Mood update received:', _payload);
        onMoodUpdate(_payload);
      });
      channelsRef.current.push(_moodChannel);
    }

    // Subscribe to all check-in updates
    if (onCheckInUpdate) {
      const _checkInChannel = subscribeToAllCheckInUpdates(user.id, (_payload) => {
        console.log('Check-in update received:', _payload);
        onCheckInUpdate(_payload);
      });
      channelsRef.current.push(_checkInChannel);
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
