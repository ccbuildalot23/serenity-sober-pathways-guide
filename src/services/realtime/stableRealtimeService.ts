import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Stable realtime service with improved connection management
 * Fixes the connection instability issues
 */
export class StableRealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private backoffDelay = 1000; // Start with 1 second

  async createChannel(channelName: string, _config: unknown = {}): Promise<RealtimeChannel> {
    try {
      // Remove existing channel if it exists
      const _existingChannel = this.channels.get(channelName);
      if (_existingChannel) {
        supabase.removeChannel(_existingChannel);
        this.channels.delete(channelName);
      }

      const channel = supabase.channel(channelName, _config);
      
      // Set up connection monitoring
      channel.subscribe((status) => {
        console.log(`Channel ${channelName} status:`, status);
        
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.backoffDelay = 1000; // Reset backoff
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          this.isConnected = false;
          this.handleDisconnection(channelName);
        }
      });

      this.channels.set(channelName, channel);
      return channel;

    } catch (error) {
      console.error(`Failed to create channel ${channelName}:`, error);
      throw error;
    }
  }

  private async handleDisconnection(channelName: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn(`Max reconnection attempts reached for ${channelName}`);
      return;
    }

    this.reconnectAttempts++;
    
    setTimeout(async () => {
      try {
        console.log(`Attempting to reconnect ${channelName} (attempt ${this.reconnectAttempts})`);
        
        // Try to recreate the channel
        const _existingChannel = this.channels.get(channelName);
        if (_existingChannel) {
          supabase.removeChannel(_existingChannel);
          this.channels.delete(channelName);
        }

        // Create a simple test channel to check connectivity
        await this.createChannel(channelName);
        
      } catch (error) {
        console.error(`Reconnection failed for ${channelName}:`, error);
        // Exponential backoff
        this.backoffDelay = Math.min(this.backoffDelay * 2, 30000);
      }
    }, this.backoffDelay);
  }

  removeChannel(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  removeAllChannels() {
    this.channels.forEach((channel, _name) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.isConnected = false;
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      channelCount: this.channels.size,
      reconnectAttempts: this.reconnectAttempts
    };
  }

  // Simplified presence tracking
  async trackPresence(channelName: string, _data: unknown) {
    try {
      const channel = await this.createChannel(channelName);
      await channel.track(_data);
      return channel;
    } catch (error) {
      console.error('Failed to track presence:', error);
      throw error;
    }
  }

  // Simplified broadcasting
  async broadcast(channelName: string, _event: string, payload: unknown) {
    try {
      const channel = this.channels.get(channelName);
      if (!channel) {
        throw new Error(`Channel ${channelName} not found`);
      }
      
      await channel.send({
        type: 'broadcast',
        _event,
        payload
      });
    } catch (error) {
      console.error('Failed to broadcast:', error);
      throw error;
    }
  }
}

export const stableRealtimeService = new StableRealtimeService();