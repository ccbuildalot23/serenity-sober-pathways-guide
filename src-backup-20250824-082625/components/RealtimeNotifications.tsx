
import React, { useCallback } from 'react';
import { toast } from 'sonner';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { useAuth } from '@/contexts/AuthContext';
import { AlertTriangle, Heart, TrendingUp, ShieldAlert, CheckCircle } from 'lucide-react';
import logger from '../services/loggerService';

const RealtimeNotifications: React.FC = () => {
  const { user } = useAuth();

  // Don't initialize realtime if no user is authenticated
  if (!user) {
    return null;
  }
  const handleCrisisEvent = useCallback((payload: unknown) => {
    const eventData = payload.new;
    const eventTime = new Date(eventData.created_at).toLocaleTimeString();
    
    if (eventData.risk_level === 'high') {
      toast.error('High Risk Crisis Alert', {
        description: `High-risk crisis event detected at ${eventTime}`,
        icon: <ShieldAlert className="w-4 h-4" />,
        duration: 15000,
        action: {
          label: 'View Details',
          onClick: () => logger.debug('Navigate to crisis details', { component: 'RealtimeNotifications' })
        }
      });
    } else {
      toast.warning('Crisis Alert', {
        description: `Crisis event logged at ${eventTime}`,
        icon: <AlertTriangle className="w-4 h-4" />,
        duration: 10000,
      });
    }
  }, []);

  const handleMoodUpdate = useCallback((payload: unknown) => {
    const checkinData = payload.new;
    if (checkinData.mood_rating) {
      const moodLevel = checkinData.mood_rating >= 7 ? 'great' : 
                       checkinData.mood_rating >= 4 ? 'okay' : 'low';
      
      const moodColor = checkinData.mood_rating >= 7 ? 'success' : 
                       checkinData.mood_rating >= 4 ? 'info' : 'warning';
      
      if (checkinData.mood_rating <= 3) {
        toast.warning('Low Mood Alert', {
          description: `Mood rating is low (${checkinData.mood_rating}/10). Consider reaching out for support.`,
          icon: <Heart className="w-4 h-4" />,
          duration: 7000,
        });
      } else {
        toast.success('Mood Update', {
          description: `Mood rating: ${checkinData.mood_rating}/10 (${moodLevel})`,
          icon: <Heart className="w-4 h-4" />,
          duration: 4000,
        });
      }
    }
  }, []);

  const handleCheckInUpdate = useCallback((payload: unknown) => {
    const checkinData = payload.new;
    
    if (payload.eventType === 'INSERT' && checkinData.is_complete) {
      toast.success('Daily Check-in Complete', {
        description: 'Daily check-in completed successfully',
        icon: <CheckCircle className="w-4 h-4" />,
        duration: 3000,
      });
    } else if (payload.eventType === 'INSERT') {
      toast.info('Check-in Started', {
        description: 'Daily check-in in progress...',
        icon: <TrendingUp className="w-4 h-4" />,
        duration: 2000,
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
