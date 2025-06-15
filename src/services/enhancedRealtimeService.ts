import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { debugService } from './debugService';
import { RealtimeAlert, RealtimePresence } from './realtime/types';

// DEDUPLICATION: Replaces `realtimeService.ts`
// Combines connection health monitoring, alert broadcasting,
// and presence tracking in a single service.

interface ConnectionHealth {
  isConnected: boolean;
  lastPing: number;
  reconnectAttempts: number;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
}

export class EnhancedRealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private lastPing = Date.now();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private presenceChannel: RealtimeChannel | null = null;
  private alertHandlers = new Map<string, (alert: RealtimeAlert) => void>();
  private presenceHandlers = new Set<(presence: RealtimePresence[]) => void>();
  private userId: string | null = null;
  private isInitialized = false;

  constructor() {
    this.startHealthMonitoring();
    this.setupConnectionEventListeners();
  }

  private setupConnectionEventListeners(): void {
    // Monitor online/offline status
    window.addEventListener('online', () => {
      debugService.log('realtime', 'Network back online');
      this.handleNetworkReconnect();
    });

    window.addEventListener('offline', () => {
      debugService.log('realtime', 'Network went offline');
      this.handleNetworkDisconnect();
    });
  }

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, 10000); // Check every 10 seconds
  }

  private checkConnectionHealth(): void {
    const now = Date.now();
    const timeSinceLastPing = now - this.lastPing;

    if (timeSinceLastPing > 60000) { // No ping in 60 seconds
      debugService.log('error', 'Connection unhealthy - no ping received', {
        timeSinceLastPing,
        channelCount: this.channels.size
      });
      this.handleConnectionIssue();
    }
  }

  async subscribe(channelName: string, config: any = {}): Promise<RealtimeChannel> {
    try {
      const channel = supabase.channel(channelName, config);

      // Set up ping/pong for health monitoring
      channel.on('system', { event: 'ping' }, () => {
        this.lastPing = Date.now();
        debugService.log('realtime', 'Ping received', { channel: channelName });
      });

      // Monitor connection state changes
      channel.subscribe((status) => {
        debugService.log('realtime', 'Channel subscription status changed', {
          channel: channelName,
          status,
          attempts: this.reconnectAttempts
        });

        if (status === 'SUBSCRIBED') {
          this.reconnectAttempts = 0;
          this.lastPing = Date.now();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.handleDisconnect(channelName);
        }
      });

      this.channels.set(channelName, channel);
      debugService.log('realtime', 'Channel subscribed', { channelName });

      return channel;
    } catch (error: any) {
      debugService.log('error', 'Failed to subscribe to channel', {
        channelName,
        error: error.message
      });
      throw error;
    }
  }

  async initialize(userId: string): Promise<void> {
    if (this.isInitialized && this.userId === userId) return;

    await this.cleanup();

    this.userId = userId;

    await this.subscribeAlertChannel(userId);
    await this.subscribePresenceChannel();

    this.isInitialized = true;
    debugService.log('realtime', 'Enhanced realtime initialized', { userId });
  }

  private async subscribeAlertChannel(userId: string): Promise<void> {
    const channelName = `alerts:${userId}`;
    const channel = await this.subscribe(channelName);
    channel.on('broadcast', { event: 'alert' }, (payload) => {
      this.handleAlert(payload.payload as RealtimeAlert);
    });
  }

  private async subscribePresenceChannel(): Promise<void> {
    const channel = await this.subscribe('presence');
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        this.handlePresenceUpdate(this.transformPresenceState(state));
      })
      .on('presence', { event: 'join' }, () => {
        const state = channel.presenceState();
        this.handlePresenceUpdate(this.transformPresenceState(state));
      })
      .on('presence', { event: 'leave' }, () => {
        const state = channel.presenceState();
        this.handlePresenceUpdate(this.transformPresenceState(state));
      });

    this.presenceChannel = channel;
  }

  private transformPresenceState(state: any): RealtimePresence[] {
    const presence: RealtimePresence[] = [];
    Object.keys(state).forEach((key) => {
      const userPresence = state[key];
      if (userPresence && userPresence.length > 0) {
        const latest = userPresence[0];
        presence.push({
          userId: latest.userId || key,
          userName: latest.userName || 'Anonymous',
          status: latest.status || 'online',
          lastSeen: latest.lastSeen || new Date().toISOString()
        });
      }
    });
    return presence;
  }

  async sendAlert(recipientIds: string[], alert: Omit<RealtimeAlert, 'id' | 'timestamp'>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fullAlert: RealtimeAlert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    await Promise.all(
      recipientIds.map((id) =>
        supabase.channel(`alerts:${id}`).send({ type: 'broadcast', event: 'alert', payload: fullAlert })
      )
    );

    this.lastPing = Date.now();
  }

  async sendCrisisAlert(message: string, location?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const [profileResult, contactsResult] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('support_contacts').select('id').eq('user_id', user.id)
    ]);

    if (profileResult.error || contactsResult.error) {
      throw new Error('Failed to fetch user data');
    }

    const profile = profileResult.data;
    const contacts = contactsResult.data || [];

    const recipientIds = contacts.map((c: any) => c.id);

    await this.sendAlert(recipientIds, {
      type: 'crisis',
      senderId: user.id,
      senderName: profile?.full_name || 'Unknown',
      message,
      urgency: 'high',
      location
    });

    if (this.presenceChannel) {
      await this.presenceChannel.track({
        userId: user.id,
        userName: profile?.full_name || 'Anonymous',
        status: 'in-crisis',
        lastSeen: new Date().toISOString()
      });
    }

    this.lastPing = Date.now();
  }

  async updateStatus(status: 'online' | 'away' | 'in-crisis'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !this.presenceChannel) return;

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    await this.presenceChannel.track({
      userId: user.id,
      userName: profile?.full_name || 'Anonymous',
      status,
      lastSeen: new Date().toISOString()
    });
    this.lastPing = Date.now();
  }

  onAlert(handler: (alert: RealtimeAlert) => void): () => void {
    const id = crypto.randomUUID();
    this.alertHandlers.set(id, handler);
    return () => {
      this.alertHandlers.delete(id);
    };
  }

  onPresenceUpdate(handler: (presence: RealtimePresence[]) => void): () => void {
    this.presenceHandlers.add(handler);
    return () => {
      this.presenceHandlers.delete(handler);
    };
  }

  getDebugInfo() {
    return {
      channelCount: this.channels.size,
      lastPing: this.lastPing,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  async cleanup(): Promise<void> {
    this.unsubscribeAll();
    if (this.presenceChannel) {
      try {
        await this.presenceChannel.untrack();
      } catch {
        // ignore
      }
      this.presenceChannel = null;
    }
    this.alertHandlers.clear();
    this.presenceHandlers.clear();
    this.isInitialized = false;
    this.userId = null;
  }

  private handleAlert(alert: RealtimeAlert): void {
    this.lastPing = Date.now();
    this.alertHandlers.forEach((handler) => {
      try {
        handler(alert);
      } catch (error) {
        debugService.log('error', 'Alert handler error', { error });
      }
    });
  }

  private handlePresenceUpdate(presence: RealtimePresence[]): void {
    this.lastPing = Date.now();
    this.presenceHandlers.forEach((handler) => {
      try {
        handler(presence);
      } catch (error) {
        debugService.log('error', 'Presence handler error', { error });
      }
    });
  }

  private async handleDisconnect(channelName?: string): Promise<void> {
    debugService.log('realtime', 'Handling disconnect', {
      channelName,
      attempts: this.reconnectAttempts
    });

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      debugService.log('critical', 'Max reconnection attempts reached');
      this.notifyUserOfConnectionIssue();
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(async () => {
      try {
        if (channelName) {
          await this.reconnectChannel(channelName);
        } else {
          await this.reconnectAllChannels();
        }
      } catch (error: any) {
        debugService.log('error', 'Reconnection failed', { error: error.message });
        this.handleDisconnect(channelName);
      }
    }, delay);
  }

  private async reconnectChannel(channelName: string): Promise<void> {
    const existingChannel = this.channels.get(channelName);
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
      this.channels.delete(channelName);
    }

    // Recreate channel with same configuration
    debugService.log('realtime', 'Attempting to reconnect channel', { channelName });
    // Note: In a real implementation, you'd store the original config
    await this.subscribe(channelName);
  }

  private async reconnectAllChannels(): Promise<void> {
    debugService.log('realtime', 'Reconnecting all channels');
    const channelNames = Array.from(this.channels.keys());

    for (const channelName of channelNames) {
      try {
        await this.reconnectChannel(channelName);
      } catch (error: any) {
        debugService.log('error', 'Failed to reconnect channel', {
          channelName,
          error: error.message
        });
      }
    }
  }

  private handleNetworkReconnect(): void {
    this.reconnectAttempts = 0;
    this.reconnectAllChannels();
  }

  private handleNetworkDisconnect(): void {
    // Pause reconnection attempts while offline
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private handleConnectionIssue(): void {
    this.handleDisconnect();
  }

  private notifyUserOfConnectionIssue(): void {
    debugService.log('critical', 'Persistent connection issues detected');

    // Show persistent notification about connection issues
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Connection Issue', {
        body: 'Having trouble staying connected. Some features may be limited.',
        icon: '/crisis-icon.png',
        requireInteraction: true,
        tag: 'connection-issue'
      });
    }

    // Dispatch custom event for UI components to handle
    window.dispatchEvent(new CustomEvent('connection-issue', {
      detail: {
        reconnectAttempts: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts
      }
    }));
  }

  getConnectionHealth(): ConnectionHealth {
    const now = Date.now();
    const timeSinceLastPing = now - this.lastPing;

    let connectionQuality: ConnectionHealth['connectionQuality'] = 'excellent';
    if (timeSinceLastPing > 30000) connectionQuality = 'poor';
    else if (timeSinceLastPing > 15000) connectionQuality = 'good';

    if (!navigator.onLine) connectionQuality = 'offline';

    return {
      isConnected: this.channels.size > 0 && timeSinceLastPing < 60000,
      lastPing: this.lastPing,
      reconnectAttempts: this.reconnectAttempts,
      connectionQuality
    };
  }

  unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
      debugService.log('realtime', 'Channel unsubscribed', { channelName });
    }
  }

  unsubscribeAll(): void {
    for (const [channelName, channel] of this.channels) {
      supabase.removeChannel(channel);
      debugService.log('realtime', 'Channel unsubscribed', { channelName });
    }
    this.channels.clear();

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
  }
}

export const subscribeToCrisisEvents = (userId: string, callback: (payload: any) => void): RealtimeChannel => {
  return supabase
    .channel('crisis_events')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'crisis_events',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

export const subscribeToMoodUpdates = (userId: string, callback: (payload: any) => void): RealtimeChannel => {
  return supabase
    .channel('daily_checkins')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'daily_checkins',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

export const unsubscribeFromChannel = (channel: RealtimeChannel): void => {
  supabase.removeChannel(channel);
};

export const subscribeToAllCheckInUpdates = (userId: string, callback: (payload: any) => void): RealtimeChannel => {
  return supabase
    .channel('all_checkins')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'daily_checkins',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

export const subscribeToEmergencyContactUpdates = (userId: string, callback: (payload: any) => void): RealtimeChannel => {
  return supabase
    .channel('emergency_contacts')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'emergency_contacts',
        filter: `user_id=eq.${userId}`
      },
      callback
    )
    .subscribe();
};

export const enhancedRealtimeService = new EnhancedRealtimeService();