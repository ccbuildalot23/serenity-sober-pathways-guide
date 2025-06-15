
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { pollingService } from './pollingService';
import { ConnectionMonitor } from './realtime/connectionMonitor';
import { setupWebSocketDebugging } from './realtime/webSocketDebugger';
import { showConnectionStatus, removeConnectionStatus } from './realtime/connectionStatusDisplay';
import { log } from './realtime/debugUtils';
import { RealtimeAlert, RealtimePresence } from './realtime/types';

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private presenceChannel: RealtimeChannel | null = null;
  private alertHandlers: Map<string, (alert: RealtimeAlert) => void> = new Map();
  private presenceHandlers: Set<(presence: RealtimePresence[]) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private isInitialized = false;
  private userId: string | null = null;
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  private usePollingFallback = false;
  private pollingEnabled = false;
  private connectionMonitor: ConnectionMonitor;
  private initializationInProgress = false;
  private authCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.connectionMonitor = new ConnectionMonitor(this);
    this.updateConnectionStatusDisplay();
    setupWebSocketDebugging();
    this.startAuthCheck();
  }

  private startAuthCheck() {
    // Check for authentication every 5 seconds
    this.authCheckInterval = setInterval(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !this.isInitialized) {
          log('realtime', 'User authenticated, initializing service', { userId: user.id });
          await this.initialize(user.id);
        } else if (!user && this.isInitialized) {
          log('realtime', 'User logged out, cleaning up service');
          await this.cleanup();
        }
      } catch (error) {
        log('error', 'Auth check failed', { error: error.message });
      }
    }, 5000);
  }

  private updateConnectionStatusDisplay() {
    const status = this.getConnectionStatus();
    showConnectionStatus(status as any);
  }

  async initialize(userId: string): Promise<void> {
    if (this.initializationInProgress) {
      log('realtime', 'Initialization already in progress, waiting...');
      return;
    }

    log('realtime', 'Initializing realtime service', { userId });
    
    try {
      if (this.isInitialized && this.userId === userId) {
        log('realtime', 'Already initialized for this user');
        return;
      }

      this.initializationInProgress = true;

      if (this.isInitialized) {
        await this.cleanup();
      }

      this.userId = userId;
      this.connectionStatus = 'connecting';
      this.updateConnectionStatusDisplay();

      // Verify session is active
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        throw new Error('No active session found');
      }
      log('realtime', 'Session verified', { userId: session.user.id });

      // Start with polling fallback for reliability
      log('realtime', 'Starting with polling fallback to ensure stability');
      this.usePollingFallback = true;
      this.enablePollingFallback();
      
      // Set up alert channel
      await this.setupAlertChannel(userId);
      
      // Set up presence channel
      await this.setupPresenceChannel();
      
      this.isInitialized = true;
      this.connectionStatus = 'connected';
      this.reconnectAttempts = 0;
      this.updateConnectionStatusDisplay();
      
      log('realtime', 'Initialization complete', { 
        channelCount: this.channels.size,
        status: this.connectionStatus,
        usingPolling: this.usePollingFallback
      });
    } catch (error) {
      log('error', 'Failed to initialize realtime', { error: error.message });
      this.connectionStatus = 'error';
      this.updateConnectionStatusDisplay();
      
      // Fallback to polling on initialization failure
      log('realtime', 'Falling back to polling mode due to initialization failure');
      this.usePollingFallback = true;
      this.enablePollingFallback();
    } finally {
      this.initializationInProgress = false;
    }
  }

  private async setupAlertChannel(userId: string): Promise<void> {
    const channelName = `alerts:${userId}`;
    
    try {
      const channel = supabase.channel(channelName)
        .on('broadcast', { event: 'alert' }, (payload) => {
          this.handleAlert(payload.payload);
        })
        .subscribe((status) => {
          log('realtime', 'Alert channel status', { channelName, status });
          if (status === 'SUBSCRIBED') {
            this.connectionMonitor.updatePingTime();
          }
        });

      this.channels.set(channelName, channel);
      log('realtime', 'Alert channel setup complete', { channelName });
    } catch (error) {
      log('error', 'Failed to setup alert channel', { error: error.message });
      throw error;
    }
  }

  private async setupPresenceChannel(): Promise<void> {
    if (!this.userId) return;

    try {
      const presenceChannel = supabase.channel('presence')
        .on('presence', { event: 'sync' }, () => {
          const state = presenceChannel.presenceState();
          const presence = this.transformPresenceState(state);
          this.handlePresenceUpdate(presence);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          log('realtime', 'User joined', { key, count: newPresences.length });
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          log('realtime', 'User left', { key, count: leftPresences.length });
        })
        .subscribe();

      this.presenceChannel = presenceChannel;
      log('realtime', 'Presence channel setup complete');
    } catch (error) {
      log('error', 'Failed to setup presence channel', { error: error.message });
    }
  }

  private transformPresenceState(state: any): RealtimePresence[] {
    const presence: RealtimePresence[] = [];
    
    Object.keys(state).forEach(key => {
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

  enablePollingFallback(): void {
    if (this.pollingEnabled || !this.userId) return;

    log('realtime', 'Enabling polling fallback', { userId: this.userId });
    
    this.connectionMonitor.stopMonitoring();
    
    try {
      pollingService.startCrisisEventPolling(this.userId, (events) => {
        events.forEach(event => this.handleCrisisEvent(event));
      });

      pollingService.startContactPolling(this.userId, (contacts) => {
        log('realtime', 'Contact changes detected via polling', { count: contacts.length });
      });

      this.pollingEnabled = true;
      this.connectionStatus = 'connected';
      this.usePollingFallback = true;
      this.updateConnectionStatusDisplay();
    } catch (error) {
      log('error', 'Failed to enable polling fallback', { error: error.message });
    }
  }

  async forceReconnect(): Promise<void> {
    if (!this.userId) {
      throw new Error('No user ID available for reconnection');
    }

    log('realtime', 'Force reconnecting - switching to polling mode for stability');
    this.connectionStatus = 'connecting';
    this.updateConnectionStatusDisplay();
    
    // Clean up existing channels
    this.channels.forEach((channel, name) => {
      try {
        channel.unsubscribe();
      } catch (error) {
        log('error', 'Error unsubscribing channel', { name, error: error.message });
      }
    });
    this.channels.clear();
    
    if (this.presenceChannel) {
      try {
        this.presenceChannel.unsubscribe();
      } catch (error) {
        log('error', 'Error unsubscribing presence channel', { error: error.message });
      }
      this.presenceChannel = null;
    }

    if (this.pollingEnabled) {
      pollingService.stopAllPolling();
      this.pollingEnabled = false;
    }

    this.isInitialized = false;
    this.usePollingFallback = true;
    await this.initialize(this.userId);
  }

  async sendAlert(recipientIds: string[], alert: Omit<RealtimeAlert, 'id' | 'timestamp'>): Promise<void> {
    log('realtime', 'Sending alert', { recipientCount: recipientIds.length });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fullAlert: RealtimeAlert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    const promises = recipientIds.map(recipientId => {
      const channelName = `alerts:${recipientId}`;
      log('realtime', 'Sending to channel', { channelName });
      
      return supabase.channel(channelName).send({
        type: 'broadcast',
        event: 'alert',
        payload: fullAlert
      });
    });

    await Promise.all(promises);
    this.connectionMonitor.updatePingTime();
  }

  async sendCrisisAlert(message: string, location?: string): Promise<void> {
    log('realtime', 'Sending crisis alert', { hasLocation: !!location });
    
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

    const recipientIds = contacts.map(c => c.id);

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
    
    this.connectionMonitor.updatePingTime();
  }

  async updateStatus(status: 'online' | 'away' | 'in-crisis'): Promise<void> {
    log('realtime', 'Updating status', { status });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !this.presenceChannel) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    await this.presenceChannel.track({
      userId: user.id,
      userName: profile?.full_name || 'Anonymous',
      status,
      lastSeen: new Date().toISOString()
    });
    
    this.connectionMonitor.updatePingTime();
  }

  onAlert(handler: (alert: RealtimeAlert) => void): () => void {
    const id = crypto.randomUUID();
    this.alertHandlers.set(id, handler);
    log('realtime', 'Alert handler registered', { id });
    
    return () => {
      this.alertHandlers.delete(id);
      log('realtime', 'Alert handler unregistered', { id });
    };
  }

  onPresenceUpdate(handler: (presence: RealtimePresence[]) => void): () => void {
    this.presenceHandlers.add(handler);
    log('realtime', 'Presence handler registered');
    
    return () => {
      this.presenceHandlers.delete(handler);
      log('realtime', 'Presence handler unregistered');
    };
  }

  getConnectionStatus(): string {
    if (this.usePollingFallback) {
      return 'connected-polling';
    }
    return this.connectionStatus;
  }

  getDebugInfo() {
    const monitorStatus = this.connectionMonitor.getStatus();
    
    return {
      connectionStatus: this.connectionStatus,
      channelCount: this.channels.size,
      usingPolling: this.usePollingFallback,
      pollingActive: pollingService.getActivePollingCount(),
      isInitialized: this.isInitialized,
      userId: this.userId,
      reconnectAttempts: this.reconnectAttempts,
      initializationInProgress: this.initializationInProgress,
      monitor: {
        attempts: monitorStatus.attempts,
        lastPingTime: monitorStatus.lastPingTime,
        timeSinceLastPing: monitorStatus.timeSinceLastPing,
        isHealthy: monitorStatus.isHealthy
      }
    };
  }

  getChannelCount(): number {
    return this.channels.size;
  }

  private handleAlert(alert: RealtimeAlert): void {
    log('realtime', 'Processing alert', { alertId: alert.id, urgency: alert.urgency });
    
    this.connectionMonitor.updatePingTime();
    
    this.alertHandlers.forEach(handler => {
      try {
        handler(alert);
      } catch (error) {
        log('error', 'Alert handler error', { error: error.message });
      }
    });

    if (alert.urgency === 'high' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`Alert from ${alert.senderName}`, {
        body: alert.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: alert.id,
        requireInteraction: true
      });
    }
  }

  private handlePresenceUpdate(presence: RealtimePresence[]): void {
    log('realtime', 'Processing presence update', { count: presence.length });
    
    this.connectionMonitor.updatePingTime();
    
    this.presenceHandlers.forEach(handler => {
      try {
        handler(presence);
      } catch (error) {
        log('error', 'Presence handler error', { error: error.message });
      }
    });
  }

  private handleCrisisEvent(event: any): void {
    log('realtime', 'Processing crisis event', { eventId: event.id });
    this.connectionMonitor.updatePingTime();
  }

  async cleanup(): Promise<void> {
    log('realtime', 'Cleaning up realtime service');
    
    if (this.authCheckInterval) {
      clearInterval(this.authCheckInterval);
      this.authCheckInterval = null;
    }
    
    this.connectionMonitor.stopMonitoring();

    if (this.presenceChannel) {
      try {
        await this.presenceChannel.untrack();
        this.presenceChannel.unsubscribe();
      } catch (error) {
        log('error', 'Error cleaning up presence channel', { error: error.message });
      }
      this.presenceChannel = null;
    }

    this.channels.forEach((channel, name) => {
      try {
        log('realtime', 'Unsubscribing from channel', { name });
        channel.unsubscribe();
      } catch (error) {
        log('error', 'Error unsubscribing from channel', { name, error: error.message });
      }
    });

    this.channels.clear();
    this.alertHandlers.clear();
    this.presenceHandlers.clear();
    this.isInitialized = false;
    this.initializationInProgress = false;
    this.connectionStatus = 'disconnected';
    this.updateConnectionStatusDisplay();
    
    pollingService.stopAllPolling();
    this.pollingEnabled = false;
    this.usePollingFallback = false;

    removeConnectionStatus();

    delete (window as any).realtimeConnectionMonitor;

    log('realtime', 'Cleanup complete');
  }
}

export const realtimeService = new RealtimeService();

// Legacy exports for backward compatibility
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

export { useRealtime } from './realtime/useRealtimeHook';
