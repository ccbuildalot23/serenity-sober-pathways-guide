
import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { debugService } from './debugService';

// DEDUPLICATION: Candidate to replace `realtimeService.ts`
// Reason: provides connection health monitoring and reconnection logic.
// Missing features: alert broadcasting and presence updates currently in
// `realtimeService.ts`. Consumers using those features must be updated
// once functionality is merged.

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
    } catch (error) {
      debugService.log('error', 'Failed to subscribe to channel', { 
        channelName, 
        error: error.message 
      });
      throw error;
    }
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
      } catch (error) {
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
      } catch (error) {
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

export const enhancedRealtimeService = new EnhancedRealtimeService();
