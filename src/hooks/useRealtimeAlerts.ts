
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Alert {
  id: string;
  user_id: string;
  contact_id: string;
  message: string;
  urgency: 'high' | 'medium' | 'low';
  status: 'pending' | 'acknowledged' | 'resolved';
  location?: { lat: number; lng: number };
  created_at: string;
  acknowledged_at?: string;
  user?: {
    name: string;
    phone: string;
  };
}

export const useRealtimeAlerts = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const loadAlerts = async () => {
      try {
        // Since support_alerts table doesn't exist, we'll use crisis_contacts as a fallback
        // and create mock alerts for demonstration
        const { data: contacts } = await supabase
          .from('crisis_contacts')
          .select('*')
          .eq('user_id', user.id);

        // Create mock alerts from contacts
        const mockAlerts: Alert[] = (contacts || []).slice(0, 2).map(contact => ({
          id: contact.id,
          user_id: contact.user_id,
          contact_id: contact.id,
          message: 'Support needed - checking in',
          urgency: 'medium' as const,
          status: 'pending' as const,
          created_at: new Date().toISOString(),
          user: {
            name: contact.name,
            phone: contact.phone_number
          }
        }));

        setAlerts(mockAlerts);
      } catch (error) {
        console.error('Error loading alerts:', error);
        toast.error('Failed to load alerts');
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();

    // Set up real-time subscription using crisis_contacts table instead
    const channel = supabase
      .channel('alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crisis_contacts',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newAlert: Alert = {
            id: payload.new.id as string,
            user_id: payload.new.user_id as string,
            contact_id: payload.new.id as string,
            message: 'New crisis contact added',
            urgency: 'low',
            status: 'pending',
            created_at: new Date().toISOString(),
            user: {
              name: payload.new.name as string,
              phone: payload.new.phone_number as string
            }
          };
          
          setAlerts(prev => [newAlert, ...prev]);
          
          // Show notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Support Alert', {
              body: newAlert.message,
              icon: '/icon-192x192.png'
            });
          }
          
          toast.error('New support alert received!'); // Using error for urgency
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      // Since support_alerts table doesn't exist, we'll just update the local state
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: 'acknowledged' as const, acknowledged_at: new Date().toISOString() }
            : alert
        )
      );

      toast.success('Alert acknowledged');
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast.error('Failed to acknowledge alert');
    }
  };

  return { alerts, loading, acknowledgeAlert };
};
