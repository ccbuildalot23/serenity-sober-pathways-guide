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
        const { data, error } = await supabase
          .from('support_alerts')
          .select(`
            *,
            user:user_id (
              name,
              phone
            )
          `)
          .or(`contact_phone.eq.${user.phone},contact_email.eq.${user.email}`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAlerts(data || []);
      } catch (error) {
        console.error('Error loading alerts:', error);
        toast.error('Failed to load alerts');
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();

    // Set up real-time subscription
    const channel = supabase
      .channel('alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_alerts',
          filter: `contact_phone=eq.${user.phone}`
        },
        (payload) => {
          setAlerts(prev => [payload.new as Alert, ...prev]);
          
          // Show notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Support Alert', {
              body: payload.new.message,
              icon: '/icon-192x192.png'
            });
          }
          
          toast.urgent('New support alert received!');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('support_alerts')
        .update({
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId 
            ? { ...alert, status: 'acknowledged', acknowledged_at: new Date().toISOString() }
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
