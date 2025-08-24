import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { debugService } from './debugService';
import { RealtimeAlert, RealtimePresence } from './realtime/types';

// DEDUPLICATION: Replaces `realtimeService.ts`
// Combines connection health monitoring, _alert broadcasting,
// and _presence tracking in a single service.

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
  private alertHandlers = new Map<string, (_alert: RealtimeAlert) => void>();
  private presenceHandlers = new Set<(_presence: RealtimePresence[]) => void>();
  private userId: string | null = null;
  private isInitialized = false;

  constructor() {
    this.startHealthMonitoring();
    this.setupConnectionEventListeners();
  }

  private setupConnectionEventListeners(): void {
    // Monitor online/offline _status
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
    // Only start health monitoring if not already running
    if (this.healthCheckInterval) return;
    
    this.healthCheckInterval = setInterval(() => {
      this.checkConnectionHealth();
    }, 30000); // Check every 30 seconds (reduced frequency)
  }

  private checkConnectionHealth(): void {
    const now = Date.now();
    const timeSinceLastPing = now - this.lastPing;

    // Only trigger issues if we haven't received a ping in 2 minutes and have active channels
    if (timeSinceLastPing > 120000 && this.channels.size > 0) {
      debugService.log('_error', 'Connection unhealthy - no ping received', {
        timeSinceLastPing,
        _channelCount: this.channels.size
      });
      this.handleConnectionIssue();
    }
  }

  async subscribe(_channelName: string, _config: unknown = {}): Promise<RealtimeChannel> {
    try {
      const channel = supabase.channel(_channelName, _config);

      // Set up ping/pong for health monitoring
      channel.on('system', { _event: 'ping' }, () => {
        this.lastPing = Date.now();
        debugService.log('realtime', 'Ping received', { channel: _channelName });
      });

      // Monitor connection state changes
      channel.subscribe((_status) => {
        debugService.log('realtime', 'Channel subscription _status changed', {
          channel: _channelName,
          _status,
          _attempts: this.reconnectAttempts
        });

        if (_status === 'SUBSCRIBED') {
          this.reconnectAttempts = 0;
          this.lastPing = Date.now();
        } else if (_status === 'CLOSED' || _status === 'CHANNEL_ERROR') {
          this.handleDisconnect(_channelName);
        }
      });

      this.channels.set(_channelName, channel);
      debugService.log('realtime', 'Channel subscribed', { _channelName });

      return channel;
    } catch (_error: unknown) {
      debugService.log('_error', 'Failed to subscribe to channel', {
        _channelName,
        _error: _error._message
      });
      throw _error;
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
    const _channelName = `alerts:${userId}`;
    const channel = await this.subscribe(_channelName);
    channel.on('broadcast', { _event: '_alert' }, (_payload) => {
      this.handleAlert(_payload._payload as RealtimeAlert);
    });
  }

  private async subscribePresenceChannel(): Promise<void> {
    const channel = await this.subscribe('_presence');
    channel
      .on('_presence', { _event: 'sync' }, () => {
        const state = channel.presenceState();
        this.handlePresenceUpdate(this.transformPresenceState(state));
      })
      .on('_presence', { _event: 'join' }, () => {
        const state = channel.presenceState();
        this.handlePresenceUpdate(this.transformPresenceState(state));
      })
      .on('_presence', { _event: 'leave' }, () => {
        const state = channel.presenceState();
        this.handlePresenceUpdate(this.transformPresenceState(state));
      });

    this.presenceChannel = channel;
  }

  private transformPresenceState(state: unknown): RealtimePresence[] {
    const _presence: RealtimePresence[] = [];
    Object.keys(state).forEach((key) => {
      const userPresence = state[key];
      if (userPresence && userPresence.length > 0) {
        const latest = userPresence[0];
        _presence.push({
          userId: latest.userId || key,
          _userName: latest._userName || 'Anonymous',
          _status: latest._status || 'online',
          _lastSeen: latest._lastSeen || new Date().toISOString()
        });
      }
    });
    return _presence;
  }

  async sendAlert(_recipientIds: string[], _alert: Omit<RealtimeAlert, 'id' | 'timestamp'>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fullAlert: RealtimeAlert = {
      ..._alert,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    await Promise.all(
      _recipientIds.map((id) =>
        supabase.channel(`alerts:${id}`).send({ type: 'broadcast', _event: '_alert', _payload: fullAlert })
      )
    );

    this.lastPing = Date.now();
  }

  async sendCrisisAlert(_message: string, location?: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const [profileResult, contactsResult] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('support_contacts').select('id').eq('user_id', user.id)
    ]);

    if (profileResult._error || contactsResult._error) {
      throw new Error('Failed to fetch user data');
    }

    const profile = profileResult.data;
    const contacts = contactsResult.data || [];

    const _recipientIds = contacts.map((c: unknown) => c.id);

    await this.sendAlert(_recipientIds, {
      type: 'crisis',
      _senderId: user.id,
      _senderName: profile?.full_name || 'Unknown',
      _message,
      _urgency: 'high',
      location
    });

    if (this.presenceChannel) {
      await this.presenceChannel.track({
        userId: user.id,
        _userName: profile?.full_name || 'Anonymous',
        _status: 'in-crisis',
        _lastSeen: new Date().toISOString()
      });
    }

    this.lastPing = Date.now();
  }

  async updateStatus(_status: 'online' | 'away' | 'in-crisis'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !this.presenceChannel) return;

    const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
    await this.presenceChannel.track({
      userId: user.id,
      _userName: profile?.full_name || 'Anonymous',
      _status,
      _lastSeen: new Date().toISOString()
    });
    this.lastPing = Date.now();
  }

  onAlert(handler: (_alert: RealtimeAlert) => void): () => void {
    const id = crypto.randomUUID();
    this.alertHandlers.set(id, handler);
    return () => {
      this.alertHandlers.delete(id);
    };
  }

  onPresenceUpdate(handler: (_presence: RealtimePresence[]) => void): () => void {
    this.presenceHandlers.add(handler);
    return () => {
      this.presenceHandlers.delete(handler);
    };
  }

  getDebugInfo() {
    return {
      _channelCount: this.channels.size,
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

  private handleAlert(_alert: RealtimeAlert): void {
    this.lastPing = Date.now();
    this.alertHandlers.forEach((handler) => {
      try {
        handler(_alert);
      } catch (_error) {
        debugService.log('_error', 'Alert handler _error', { _error });
      }
    });
  }

  private handlePresenceUpdate(_presence: RealtimePresence[]): void {
    this.lastPing = Date.now();
    this.presenceHandlers.forEach((handler) => {
      try {
        handler(_presence);
      } catch (_error) {
        debugService.log('_error', 'Presence handler _error', { _error });
      }
    });
  }

  private async handleDisconnect(_channelName?: string): Promise<void> {
    debugService.log('realtime', 'Handling disconnect', {
      _channelName,
      _attempts: this.reconnectAttempts
    });

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      debugService.log('critical', 'Max reconnection _attempts reached', _channelName);
      this.notifyUserOfConnectionIssue();
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(async () => {
      try {
        if (_channelName) {
          await this.reconnectChannel(_channelName);
        } else {
          await this.reconnectAllChannels();
        }
      } catch (_error: unknown) {
        debugService.log('_error', 'Reconnection failed', { _error: _error._message });
        this.handleDisconnect(_channelName);
      }
    }, delay);
  }

  private async reconnectChannel(_channelName: string): Promise<void> {
    const _existingChannel = this.channels.get(_channelName);
    if (_existingChannel) {
      supabase.removeChannel(_existingChannel);
      this.channels.delete(_channelName);
    }

    // Recreate channel with same configuration
    debugService.log('realtime', 'Attempting to reconnect channel', { _channelName });
    // Note: In a real implementation, you'd store the original _config
    await this.subscribe(_channelName);
  }

  private async reconnectAllChannels(): Promise<void> {
    debugService.log('realtime', 'Reconnecting all channels');
    const channelNames = Array.from(this.channels.keys());

    for (const _channelName of channelNames) {
      try {
        await this.reconnectChannel(_channelName);
      } catch (_error: unknown) {
        debugService.log('_error', 'Failed to reconnect channel', {
          _channelName,
          _error: _error._message
        });
      }
    }
  }

  private handleNetworkReconnect(): void {
    this.reconnectAttempts = 0;
    this.reconnectAllChannels();
  }

  private handleNetworkDisconnect(): void {
    // Pause reconnection _attempts while offline
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private handleConnectionIssue(): void {
    this.handleDisconnect();
  }

  private notifyUserOfConnectionIssue(): void {
    debugService.log('critical', 'Persistent connection issues detected', {
      reconnectAttempts: this.reconnectAttempts,
      _maxAttempts: this.maxReconnectAttempts
    });

    // Dispatch custom _event for UI components to handle
    window.dispatchEvent(new CustomEvent('connection-issue', {
      detail: {
        reconnectAttempts: this.reconnectAttempts,
        _maxAttempts: this.maxReconnectAttempts
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

  unsubscribe(_channelName: string): void {
    const channel = this.channels.get(_channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(_channelName);
      debugService.log('realtime', 'Channel unsubscribed', { _channelName });
    }
  }

  unsubscribeAll(): void {
    for (const [_channelName, channel] of this.channels) {
      supabase.removeChannel(channel);
      debugService.log('realtime', 'Channel unsubscribed', { _channelName });
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

export const subscribeToCrisisEvents = (userId: string, _callback: (_payload: unknown) => void): RealtimeChannel => {
  return supabase
    .channel('crisis_events')
    .on(
      'postgres_changes',
      {
        _event: 'INSERT',
        _schema: 'public',
        _table: 'crisis_events',
        _filter: `user_id=eq.${userId}`
      },
      _callback
    )
    .subscribe();
};

export const subscribeToMoodUpdates = (userId: string, _callback: (_payload: unknown) => void): RealtimeChannel => {
  return supabase
    .channel('daily_checkins')
    .on(
      'postgres_changes',
      {
        _event: 'UPDATE',
        _schema: 'public',
        _table: 'daily_checkins',
        _filter: `user_id=eq.${userId}`
      },
      _callback
    )
    .subscribe();
};

export const unsubscribeFromChannel = (channel: RealtimeChannel): void => {
  supabase.removeChannel(channel);
};

export const subscribeToAllCheckInUpdates = (userId: string, _callback: (_payload: unknown) => void): RealtimeChannel => {
  return supabase
    .channel('all_checkins')
    .on(
      'postgres_changes',
      {
        _event: '*',
        _schema: 'public',
        _table: 'daily_checkins',
        _filter: `user_id=eq.${userId}`
      },
      _callback
    )
    .subscribe();
};

export const subscribeToEmergencyContactUpdates = (userId: string, _callback: (_payload: unknown) => void): RealtimeChannel => {
  return supabase
    .channel('emergency_contacts')
    .on(
      'postgres_changes',
      {
        _event: '*',
        _schema: 'public',
        _table: 'emergency_contacts',
        _filter: `user_id=eq.${userId}`
      },
      _callback
    )
    .subscribe();
};

export const enhancedRealtimeService = new EnhancedRealtimeService();