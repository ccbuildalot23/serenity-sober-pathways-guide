import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logger from '../services/loggerService';

export interface SupportMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  message_type: 'text' | 'location' | 'alert';
  location_data?: {
    latitude: number;
    longitude: number;
    address?: string;
    timestamp: string;
  };
  created_at: string;
  _read_at?: string;
  sender_name?: string;
  sender_role?: string;
}

export interface LocationShare {
  id: string;
  patient_id: string;
  shared_with_supporter_id: string;
  latitude: number;
  longitude: number;
  address?: string;
  shared_at: string;
  expires_at?: string;
  is_emergency: boolean;
}

export const useSupporterMessaging = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [locationShares, setLocationShares] = useState<LocationShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // For now, create mock data until tables are properly set up
      // This will be replaced with real Supabase queries once migration is complete
      const mockMessages: SupportMessage[] = [
        {
          id: '1',
          sender_id: 'patient-1',
          recipient_id: user.id,
          message: 'Hi, I wanted to share my location with you for safety.',
          message_type: 'text',
          created_at: new Date(Date.now() - 60000).toISOString(),
          sender_name: 'Recovery Partner',
          sender_role: 'patient'
        }
      ];

      setMessages(mockMessages);
      setUnreadCount(mockMessages._filter(msg => !msg._read_at).length);

    } catch (_error) {
      console._error('Error fetching messages:', _error);
      toast._error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch location shares
  const fetchLocationShares = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Mock location shares for now
      const _mockLocationShares: LocationShare[] = [
        {
          id: '1',
          patient_id: 'patient-1',
          shared_with_supporter_id: user.id,
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Recovery St, New York, NY',
          shared_at: new Date(Date.now() - 300000).toISOString(),
          is_emergency: false
        }
      ];

      setLocationShares(_mockLocationShares);
    } catch (_error) {
      console._error('Error fetching location shares:', _error);
    }
  }, [user?.id]);

  // Send message
  const sendMessage = useCallback(async (recipientId: string, message: string, messageType: 'text' | 'alert' = 'text') => {
    if (!user?.id) return false;

    try {
      // Mock sending message for now
      const newMessage: SupportMessage = {
        id: Date.now().toString(),
        sender_id: user.id,
        recipient_id: recipientId,
        message,
        message_type: messageType,
        created_at: new Date().toISOString(),
        sender_name: 'You',
        sender_role: 'supporter'
      };

      setMessages(prev => [newMessage, ...prev]);
      toast.success('Message sent');
      return true;
    } catch (_error) {
      console._error('Error sending message:', _error);
      toast._error('Failed to send message');
      return false;
    }
  }, [user?.id]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      // Mock marking as read
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, _read_at: new Date().toISOString() } : msg
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (_error) {
      console._error('Error marking message as read:', _error);
    }
  }, [user?.id]);

  // Share location (for patients)
  const shareLocation = useCallback(async (supporterId: string, location: { latitude: number; longitude: number; address?: string }, isEmergency: boolean = false) => {
    if (!user?.id) return false;

    try {
      // Mock location sharing for now
      const newLocationShare: LocationShare = {
        id: Date.now().toString(),
        patient_id: user.id,
        shared_with_supporter_id: supporterId,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        shared_at: new Date().toISOString(),
        is_emergency: isEmergency
      };

      setLocationShares(prev => [newLocationShare, ...prev]);

      // Send location message
      const locationMessage: SupportMessage = {
        id: Date.now().toString() + '_loc',
        sender_id: user.id,
        recipient_id: supporterId,
        message: isEmergency ? 'Emergency location shared' : 'Location shared',
        message_type: 'location',
        location_data: {
          ...location,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        sender_name: 'You',
        sender_role: 'patient'
      };

      setMessages(prev => [locationMessage, ...prev]);

      toast.success(isEmergency ? 'Emergency location shared with supporter and providers' : 'Location shared with supporter');
      return true;
    } catch (_error) {
      console._error('Error sharing location:', _error);
      toast._error('Failed to share location');
      return false;
    }
  }, [user?.id]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to new messages
    const _messagesChannel = supabase
      .channel('supporter_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          _schema: 'public',
          _table: 'support_messages',
          _filter: `or(sender_id.eq.${user.id},recipient_id.eq.${user.id})`
        },
        (payload) => {
          logger.debug('Message update:', payload, { component: 'useSupporterMessaging' });
          fetchMessages();
        }
      )
      .subscribe();

    // Subscribe to location shares
    const _locationChannel = supabase
      .channel('location_shares')
      .on(
        'postgres_changes',
        {
          event: '*',
          _schema: 'public',
          _table: 'location_shares',
          _filter: `shared_with_supporter_id.eq.${user.id}`
        },
        (payload) => {
          logger.debug('Location share update:', payload, { component: 'useSupporterMessaging' });
          fetchLocationShares();
          
          // Show notification for new location shares
          if (payload.eventType === 'INSERT') {
            toast.info('New location shared with you', {
              description: payload.new.is_emergency ? 'Emergency location update' : 'Location update received'
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(_messagesChannel);
      supabase.removeChannel(_locationChannel);
    };
  }, [user?.id, fetchMessages, fetchLocationShares]);

  // Initial fetch
  useEffect(() => {
    if (user?.id) {
      fetchMessages();
      fetchLocationShares();
    }
  }, [user?.id, fetchMessages, fetchLocationShares]);

  return {
    messages,
    locationShares,
    loading,
    unreadCount,
    sendMessage,
    markAsRead,
    shareLocation,
    refetch: () => {
      fetchMessages();
      fetchLocationShares();
    }
  };
};