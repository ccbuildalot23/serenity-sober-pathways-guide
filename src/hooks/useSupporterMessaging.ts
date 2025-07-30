import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  read_at?: string;
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
      
      // Fetch messages where user is either sender or recipient
      const { data: messagesData, error: messagesError } = await supabase
        .from('support_messages')
        .select(`
          *,
          sender:profiles!sender_id(full_name),
          recipient:profiles!recipient_id(full_name)
        `)
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      const formattedMessages: SupportMessage[] = (messagesData || []).map(msg => ({
        ...msg,
        sender_name: msg.sender?.full_name || 'Unknown',
        sender_role: msg.sender_id === user.id ? 'supporter' : 'patient'
      }));

      setMessages(formattedMessages);
      
      // Count unread messages
      const unread = formattedMessages.filter(
        msg => msg.recipient_id === user.id && !msg.read_at
      ).length;
      setUnreadCount(unread);

    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Fetch location shares
  const fetchLocationShares = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('location_shares')
        .select(`
          *,
          patient:profiles!patient_id(full_name)
        `)
        .eq('shared_with_supporter_id', user.id)
        .order('shared_at', { ascending: false });

      if (error) throw error;
      setLocationShares(data || []);
    } catch (error) {
      console.error('Error fetching location shares:', error);
    }
  }, [user?.id]);

  // Send message
  const sendMessage = useCallback(async (recipientId: string, message: string, messageType: 'text' | 'alert' = 'text') => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('support_messages')
        .insert({
          sender_id: user.id,
          recipient_id: recipientId,
          message,
          message_type: messageType
        });

      if (error) throw error;
      
      toast.success('Message sent');
      return true;
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      return false;
    }
  }, [user?.id]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('support_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .eq('recipient_id', user?.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, [user?.id]);

  // Share location (for patients)
  const shareLocation = useCallback(async (supporterId: string, location: { latitude: number; longitude: number; address?: string }, isEmergency: boolean = false) => {
    if (!user?.id) return false;

    try {
      // Insert location share
      const { error: locationError } = await supabase
        .from('location_shares')
        .insert({
          patient_id: user.id,
          shared_with_supporter_id: supporterId,
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          is_emergency: isEmergency,
          expires_at: isEmergency ? null : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        });

      if (locationError) throw locationError;

      // Send location message
      const { error: messageError } = await supabase
        .from('support_messages')
        .insert({
          sender_id: user.id,
          recipient_id: supporterId,
          message: isEmergency ? 'Emergency location shared' : 'Location shared',
          message_type: 'location',
          location_data: {
            ...location,
            timestamp: new Date().toISOString()
          }
        });

      if (messageError) throw messageError;

      // Notify providers if it's an emergency
      if (isEmergency) {
        const { error: providerNotificationError } = await supabase.functions.invoke('notify-providers', {
          body: {
            patientId: user.id,
            supporterId,
            location,
            alertType: 'emergency_location'
          }
        });

        if (providerNotificationError) {
          console.error('Error notifying providers:', providerNotificationError);
        }
      }

      toast.success(isEmergency ? 'Emergency location shared with supporter and providers' : 'Location shared with supporter');
      return true;
    } catch (error) {
      console.error('Error sharing location:', error);
      toast.error('Failed to share location');
      return false;
    }
  }, [user?.id]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel('supporter_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_messages',
          filter: `or(sender_id.eq.${user.id},recipient_id.eq.${user.id})`
        },
        (payload) => {
          console.log('Message update:', payload);
          fetchMessages();
        }
      )
      .subscribe();

    // Subscribe to location shares
    const locationChannel = supabase
      .channel('location_shares')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'location_shares',
          filter: `shared_with_supporter_id.eq.${user.id}`
        },
        (payload) => {
          console.log('Location share update:', payload);
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
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(locationChannel);
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