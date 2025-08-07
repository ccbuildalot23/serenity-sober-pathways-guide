import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { toast } from 'sonner';

export interface CrisisNotification {
  id: string;
  crisis_event_id: string;
  user_id: string;
  supporter_id?: string;
  type: 'crisis_alert' | 'response_request' | 'acknowledgment' | 'escalation' | 'resolution';
  severity: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  title: string;
  message: string;
  channel: 'in_app' | 'whatsapp' | 'email' | 'push';
  priority: number;
  scheduled_for?: string;
  delay_seconds: number;
  tier_level: number;
  status: 'pending' | 'queued' | 'sending' | 'delivered' | 'failed' | 'acknowledged' | 'expired';
  delivered_at?: string;
  acknowledged_at?: string;
  metadata?: any;
  created_at: string;
}

export interface CrisisResponse {
  id: string;
  notification_id: string;
  crisis_event_id: string;
  supporter_id: string;
  response_type: 'acknowledged' | 'responding' | 'on_way' | 'made_contact' | 'unavailable' | 'escalate';
  response_message?: string;
  eta_minutes?: number;
  is_primary_responder: boolean;
  created_at: string;
}

export interface SupporterAvailability {
  supporter_id: string;
  is_available: boolean;
  status: 'available' | 'busy' | 'in_crisis' | 'offline';
  status_message?: string;
  current_active_crises: number;
  updated_at: string;
}

type NotificationCallback = (notification: CrisisNotification) => void;
type ResponseCallback = (response: CrisisResponse) => void;
type AvailabilityCallback = (availability: SupporterAvailability) => void;

class RealtimeNotificationService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private notificationCallbacks: Set<NotificationCallback> = new Set();
  private responseCallbacks: Set<ResponseCallback> = new Set();
  private availabilityCallbacks: Set<AvailabilityCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  constructor() {
    this.setupRealtimeConnections();
    this.setupConnectionMonitoring();
  }

  private async setupRealtimeConnections() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No authenticated user for realtime notifications');
        return;
      }

      // Subscribe to crisis notifications
      const notificationChannel = supabase
        .channel('crisis-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'crisis_notifications',
            filter: `user_id=eq.${user.id},supporter_id=eq.${user.id}`
          },
          (payload: RealtimePostgresChangesPayload<CrisisNotification>) => {
            this.handleNotificationChange(payload);
          }
        )
        .on('presence', { event: 'sync' }, () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('Connected to crisis notifications');
            this.isConnected = true;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            this.handleDisconnection();
          }
        });

      this.channels.set('notifications', notificationChannel);

      // Subscribe to crisis responses
      const responseChannel = supabase
        .channel('crisis-responses')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'crisis_responses'
          },
          (payload: RealtimePostgresChangesPayload<CrisisResponse>) => {
            this.handleResponseChange(payload);
          }
        )
        .subscribe();

      this.channels.set('responses', responseChannel);

      // Subscribe to supporter availability
      const availabilityChannel = supabase
        .channel('supporter-availability')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'supporter_availability'
          },
          (payload: RealtimePostgresChangesPayload<SupporterAvailability>) => {
            this.handleAvailabilityChange(payload);
          }
        )
        .subscribe();

      this.channels.set('availability', availabilityChannel);

    } catch (error) {
      console.error('Failed to setup realtime connections:', error);
      this.handleDisconnection();
    }
  }

  private setupConnectionMonitoring() {
    // Monitor connection health every 30 seconds
    setInterval(() => {
      if (!this.isConnected) {
        console.log('Connection lost, attempting to reconnect...');
        this.attemptReconnection();
      }
    }, 30000);

    // Listen for network changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Network connection restored');
        this.attemptReconnection();
      });

      window.addEventListener('offline', () => {
        console.log('Network connection lost');
        this.isConnected = false;
      });
    }
  }

  private handleDisconnection() {
    this.isConnected = false;
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.attemptReconnection();
    } else {
      toast.error('Connection to notification service lost. Please refresh the page.');
    }
  }

  private async attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    setTimeout(async () => {
      console.log(`Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      // Unsubscribe from all channels
      for (const channel of this.channels.values()) {
        await supabase.removeChannel(channel);
      }
      this.channels.clear();

      // Re-establish connections
      await this.setupRealtimeConnections();
    }, delay);
  }

  private handleNotificationChange(payload: RealtimePostgresChangesPayload<CrisisNotification>) {
    const notification = payload.new as CrisisNotification;
    
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      // Notify all registered callbacks
      this.notificationCallbacks.forEach(callback => callback(notification));

      // Show toast for new notifications
      if (payload.eventType === 'INSERT' && notification.status === 'delivered') {
        this.showNotificationToast(notification);
      }
    }
  }

  private handleResponseChange(payload: RealtimePostgresChangesPayload<CrisisResponse>) {
    const response = payload.new as CrisisResponse;
    
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      this.responseCallbacks.forEach(callback => callback(response));
    }
  }

  private handleAvailabilityChange(payload: RealtimePostgresChangesPayload<SupporterAvailability>) {
    const availability = payload.new as SupporterAvailability;
    
    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      this.availabilityCallbacks.forEach(callback => callback(availability));
    }
  }

  private showNotificationToast(notification: CrisisNotification) {
    const severityConfig = {
      emergency: { duration: Infinity, action: true },
      critical: { duration: 10000, action: true },
      high: { duration: 7000, action: true },
      medium: { duration: 5000, action: false },
      low: { duration: 3000, action: false }
    };

    const config = severityConfig[notification.severity];

    toast(notification.title, {
      description: notification.message,
      duration: config.duration,
      action: config.action ? {
        label: 'View',
        onClick: () => this.handleNotificationAction(notification)
      } : undefined,
      className: `crisis-notification-${notification.severity}`
    });

    // Play sound for high severity
    if (['emergency', 'critical', 'high'].includes(notification.severity)) {
      this.playNotificationSound();
    }
  }

  private playNotificationSound() {
    if (typeof window !== 'undefined' && 'Audio' in window) {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.5;
      audio.play().catch(e => console.log('Could not play notification sound:', e));
    }
  }

  private handleNotificationAction(notification: CrisisNotification) {
    // Navigate to crisis response page or open modal
    window.location.href = `/crisis/respond/${notification.crisis_event_id}`;
  }

  // Public methods for component usage

  public onNotification(callback: NotificationCallback) {
    this.notificationCallbacks.add(callback);
    return () => this.notificationCallbacks.delete(callback);
  }

  public onResponse(callback: ResponseCallback) {
    this.responseCallbacks.add(callback);
    return () => this.responseCallbacks.delete(callback);
  }

  public onAvailability(callback: AvailabilityCallback) {
    this.availabilityCallbacks.add(callback);
    return () => this.availabilityCallbacks.delete(callback);
  }

  public async sendNotification(notification: Omit<CrisisNotification, 'id' | 'created_at'>) {
    try {
      const { data, error } = await supabase
        .from('crisis_notifications')
        .insert(notification)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to send notification:', error);
      throw error;
    }
  }

  public async acknowledgeNotification(notificationId: string) {
    try {
      const { error } = await supabase
        .from('crisis_notifications')
        .update({ 
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to acknowledge notification:', error);
      throw error;
    }
  }

  public async respondToCrisis(response: Omit<CrisisResponse, 'id' | 'created_at'>) {
    try {
      const { data, error } = await supabase
        .from('crisis_responses')
        .insert(response)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to respond to crisis:', error);
      throw error;
    }
  }

  public async updateAvailability(availability: Partial<SupporterAvailability>) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { error } = await supabase
        .from('supporter_availability')
        .upsert({
          supporter_id: user.id,
          ...availability,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update availability:', error);
      throw error;
    }
  }

  public async getActiveNotifications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user');

      const { data, error } = await supabase
        .from('crisis_notifications')
        .select('*')
        .or(`user_id.eq.${user.id},supporter_id.eq.${user.id}`)
        .in('status', ['pending', 'queued', 'sending', 'delivered'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to get active notifications:', error);
      throw error;
    }
  }

  public getConnectionStatus() {
    return this.isConnected;
  }

  public async cleanup() {
    for (const channel of this.channels.values()) {
      await supabase.removeChannel(channel);
    }
    this.channels.clear();
    this.notificationCallbacks.clear();
    this.responseCallbacks.clear();
    this.availabilityCallbacks.clear();
  }
}

// Export singleton instance
export const realtimeNotificationService = new RealtimeNotificationService();