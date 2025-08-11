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
  _acknowledged_at?: string;
  metadata?: unknown;
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
  _updated_at: string;
}

type NotificationCallback = (notification: CrisisNotification) => void;
type ResponseCallback = (_response: CrisisResponse) => void;
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
        // Don't log error - this is expected for unauthenticated users
        return;
      }

      // Subscribe to crisis notifications
      const _notificationChannel = supabase
        .channel('crisis-notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            _schema: 'public',
            _table: 'crisis_notifications',
            _filter: `user_id=eq.${user.id},supporter_id=eq.${user.id}`
          },
          (_payload: RealtimePostgresChangesPayload<CrisisNotification>) => {
            this.handleNotificationChange(_payload);
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

      this.channels.set('notifications', _notificationChannel);

      // Subscribe to crisis responses
      const _responseChannel = supabase
        .channel('crisis-responses')
        .on(
          'postgres_changes',
          {
            event: '*',
            _schema: 'public',
            _table: 'crisis_responses'
          },
          (_payload: RealtimePostgresChangesPayload<CrisisResponse>) => {
            this.handleResponseChange(_payload);
          }
        )
        .subscribe();

      this.channels.set('responses', _responseChannel);

      // Subscribe to supporter availability
      const _availabilityChannel = supabase
        .channel('supporter-availability')
        .on(
          'postgres_changes',
          {
            event: '*',
            _schema: 'public',
            _table: 'supporter_availability'
          },
          (_payload: RealtimePostgresChangesPayload<SupporterAvailability>) => {
            this.handleAvailabilityChange(_payload);
          }
        )
        .subscribe();

      this.channels.set('availability', _availabilityChannel);

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

  private handleNotificationChange(_payload: RealtimePostgresChangesPayload<CrisisNotification>) {
    const notification = _payload.new as CrisisNotification;
    
    if (_payload.eventType === 'INSERT' || _payload.eventType === 'UPDATE') {
      // Notify all registered callbacks
      this.notificationCallbacks.forEach(_callback => _callback(notification));

      // Show toast for new notifications
      if (_payload.eventType === 'INSERT' && notification.status === 'delivered') {
        this.showNotificationToast(notification);
      }
    }
  }

  private handleResponseChange(_payload: RealtimePostgresChangesPayload<CrisisResponse>) {
    const _response = _payload.new as CrisisResponse;
    
    if (_payload.eventType === 'INSERT' || _payload.eventType === 'UPDATE') {
      this.responseCallbacks.forEach(_callback => _callback(_response));
    }
  }

  private handleAvailabilityChange(_payload: RealtimePostgresChangesPayload<SupporterAvailability>) {
    const availability = _payload.new as SupporterAvailability;
    
    if (_payload.eventType === 'INSERT' || _payload.eventType === 'UPDATE') {
      this.availabilityCallbacks.forEach(_callback => _callback(availability));
    }
  }

  private showNotificationToast(notification: CrisisNotification) {
    const severityConfig = {
      emergency: { _duration: Infinity, _action: true },
      critical: { _duration: 10000, _action: true },
      high: { _duration: 7000, _action: true },
      medium: { _duration: 5000, _action: false },
      low: { _duration: 3000, _action: false }
    };

    const config = severityConfig[notification.severity];

    toast(notification.title, {
      description: notification.message,
      _duration: config._duration,
      _action: config._action ? {
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
    // Navigate to crisis _response page or open modal
    window.location.href = `/crisis/respond/${notification.crisis_event_id}`;
  }

  // Public methods for component usage

  public onNotification(_callback: NotificationCallback) {
    this.notificationCallbacks.add(_callback);
    return () => this.notificationCallbacks.delete(_callback);
  }

  public onResponse(_callback: ResponseCallback) {
    this.responseCallbacks.add(_callback);
    return () => this.responseCallbacks.delete(_callback);
  }

  public onAvailability(_callback: AvailabilityCallback) {
    this.availabilityCallbacks.add(_callback);
    return () => this.availabilityCallbacks.delete(_callback);
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

  public async acknowledgeNotification(_notificationId: string) {
    try {
      const { error } = await supabase
        .from('crisis_notifications')
        .update({ 
          status: 'acknowledged',
          _acknowledged_at: new Date().toISOString()
        })
        .eq('id', _notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to acknowledge notification:', error);
      throw error;
    }
  }

  public async respondToCrisis(_response: Omit<CrisisResponse, 'id' | 'created_at'>) {
    try {
      const { data, error } = await supabase
        .from('crisis_responses')
        .insert(_response)
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
          _updated_at: new Date().toISOString()
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