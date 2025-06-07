
import React, { useCallback } from 'react';
import { toast } from 'sonner';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { AlertTriangle, Heart, TrendingUp } from 'lucide-react';

const RealtimeNotifications: React.FC = () => {
  const handleCrisisEvent = useCallback((payload: any) => {
    const eventData = payload.new;
    toast.error('Crisis Alert', {
      description: `Crisis event logged at ${new Date(eventData.created_at).toLocaleTimeString()}`,
      icon: <AlertTriangle className="w-4 h-4" />,
      duration: 10000, // Show for 10 seconds
    });
  }, []);

  const handleMoodUpdate = useCallback((payload: any) => {
    const checkinData = payload.new;
    if (checkinData.mood_rating) {
      const moodLevel = checkinData.mood_rating >= 7 ? 'great' : 
                       checkinData.mood_rating >= 4 ? 'okay' : 'low';
      
      toast.success('Mood Update', {
        description: `Mood rating updated to ${checkinData.mood_rating}/10 (${moodLevel})`,
        icon: <Heart className="w-4 h-4" />,
        duration: 5000,
      });
    }
  }, []);

  const handleCheckInUpdate = useCallback((payload: any) => {
    const checkinData = payload.new;
    
    if (payload.eventType === 'INSERT') {
      toast.info('Daily Check-in', {
        description: 'New daily check-in completed',
        icon: <TrendingUp className="w-4 h-4" />,
        duration: 3000,
      });
    }
  }, []);

  useRealtimeUpdates({
    onCrisisEvent: handleCrisisEvent,
    onMoodUpdate: handleMoodUpdate,
    onCheckInUpdate: handleCheckInUpdate,
  });

  return null; // This component only handles notifications
};

export default RealtimeNotifications;
