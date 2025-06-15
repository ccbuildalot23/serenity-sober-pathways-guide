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
  private maxReconnectAttempts = 5;
  private isInitialized = false;
  private userId: string | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private lastPing = Date.now();
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  private usePollingFallback = false;
  private pollingEnabled = false;
  private connectionMonitor: ConnectionMonitor;

  constructor() {
    this.connectionMonitor = new ConnectionMonitor(this);
    this.updateConnectionStatusDisplay();
    
    // Setup WebSocket debugging when service is created
    setupWebSocketDebugging();
  }

  private updateConnectionStatusDisplay() {
    const status = this.getConnectionStatus();
    showConnectionStatus(status as any);
  }

  /**
   * Initialize realtime connections for a user
   */
  async initialize(userId: string): Promise<void> {
    log('realtime', 'Initializing realtime service', { userId });
    
    try {
      // Check if already initialized
      if (this.isInitialized && this.userId === userId) {
        log('realtime', 'Already initialized for this user');
        return;
      }

      // Clean up existing connections
      if (this.isInitialized) {
        await this.cleanup();
      }

      this.userId = userId;
      this.connectionStatus = 'connecting';
      this.updateConnectionStatusDisplay();

      // Verify Supabase client is ready
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        throw new Error('No active session found');
      }
      log('realtime', 'Session verified', { userId: session.user.id });

      // Start with a simple test channel
      try {
        await this.createTestChannel();
        log('realtime', 'Test channel successful, proceeding with realtime');
        this.usePollingFallback = false;
      } catch (testError) {
        log('error', 'Test channel failed, enabling polling fallback', { error: testError.message });
        this.usePollingFallback = true;
        this.enablePollingFallback();
      }

      // If test successful, proceed with other channels
      if (!this.usePollingFallback) {
        await this.subscribeToAlerts(userId);
        await this.subscribeToPresence(userId);
        await this.subscribeToDbChanges(userId);

        // Start connection monitoring
        this.connectionMonitor.startMonitoring();
      }
      
      this.isInitialized = true;
      this.connectionStatus = this.usePollingFallback ? 'connected' : 'connected';
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
      
      // Fallback to polling
      log('realtime', 'Falling back to polling mode due to initialization failure');
      this.usePollingFallback = true;
      this.enablePollingFallback();
      
      throw error;
    }
  }

  /**
   * Enable polling fallback when realtime fails
   */
  enablePollingFallback(): void {
    if (this.pollingEnabled || !this.userId) return;

    log('realtime', 'Enabling polling fallback', { userId: this.userId });
    
    // Stop connection monitoring since we're switching to polling
    this.connectionMonitor.stopMonitoring();
    
    // Poll for crisis events
    pollingService.startCrisisEventPolling(this.userId, (events) => {
      events.forEach(event => this.handleCrisisEvent(event));
    });

    // Poll for contact changes
    pollingService.startContactPolling(this.userId, (contacts) => {
      log('realtime', 'Contact changes detected via polling', { count: contacts.length });
    });

    this.pollingEnabled = true;
    this.connectionStatus = 'connected';
    this.usePollingFallback = true;
    this.updateConnectionStatusDisplay();
  }

  /**
   * Force reconnect (called by ConnectionMonitor)
   */
  async forceReconnect(): Promise<void> {
    if (!this.userId) {
      throw new Error('No user ID available for reconnection');
    }

    log('realtime', 'Force reconnecting all channels');
    this.connectionStatus = 'connecting';
    this.updateConnectionStatusDisplay();
    
    // Clean up existing channels
    this.channels.forEach((channel, name) => {
      channel.unsubscribe();
    });
    this.channels.clear();
    
    if (this.presenceChannel) {
      this.presenceChannel.unsubscribe();
      this.presenceChannel = null;
    }

    // Stop polling if it was enabled
    if (this.pollingEnabled) {
      pollingService.stopAllPolling();
      this.pollingEnabled = false;
    }

    // Try to reinitialize
    this.isInitialized = false;
    this.usePollingFallback = false;
    await this.initialize(this.userId);
  }

  /**
   * Create a test channel to verify connection
   */
  private async createTestChannel(): Promise<void> {
    log('realtime', 'Creating test channel');
    
    return new Promise((resolve, reject) => {
      const testChannel = supabase.channel('test-connection', {
        config: {
          broadcast: { self: true }
        }
      });

      const timeout = setTimeout(() => {
        testChannel.unsubscribe();
        reject(new Error('Test channel subscription timeout'));
      }, 10000);

      testChannel
        .on('broadcast', { event: 'test' }, (payload) => {
          log('realtime', 'Test broadcast received', payload);
          this.connectionMonitor.updatePingTime();
        })
        .subscribe((status) => {
          log('realtime', 'Test channel status', { status });
          
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            this.connectionMonitor.updatePingTime();
            // Send a test message
            testChannel.send({
              type: 'broadcast',
              event: 'test',
              payload: { message: 'Connection test successful' }
            }).then(() => {
              log('realtime', 'Test message sent successfully');
              testChannel.unsubscribe();
              resolve();
            });
          } else if (status === 'CHANNEL_ERROR') {
            clearTimeout(timeout);
            testChannel.unsubscribe();
            reject(new Error('Channel subscription error'));
          }
        });
    });
  }

  /**
   * Subscribe to real-time alerts for a user
   */
  private async subscribeToAlerts(userId: string): Promise<void> {
    const channelName = `alerts:${userId}`;
    log('realtime', 'Subscribing to alerts channel', { channelName });
    
    if (this.channels.has(channelName)) {
      log('realtime', 'Already subscribed to alerts');
      return;
    }

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: userId }
      }
    });

    channel
      .on('broadcast', { event: 'alert' }, (payload) => {
        log('realtime', 'Alert received', payload);
        this.connectionMonitor.updatePingTime();
        const alert = payload.payload as RealtimeAlert;
        this.handleAlert(alert);
      })
      .on('presence', { event: 'sync' }, () => {
        log('realtime', 'Presence sync on alerts channel');
        this.connectionMonitor.updatePingTime();
      })
      .subscribe((status) => {
        log('realtime', 'Alerts channel status', { status, channelName });
        
        if (status === 'SUBSCRIBED') {
          this.channels.set(channelName, channel);
          this.connectionMonitor.updatePingTime();
        } else if (status === 'CHANNEL_ERROR') {
          log('error', 'Alerts channel error', { channelName });
          this.handleChannelError(channelName);
        }
      });
  }

  /**
   * Subscribe to support network presence
   */
  private async subscribeToPresence(userId: string): Promise<void> {
    log('realtime', 'Setting up presence channel', { userId });

    try {
      // Get user's support contacts
      const { data: contacts, error } = await supabase
        .from('support_contacts')
        .select('id')
        .eq('user_id', userId);

      if (error) {
        log('error', 'Failed to fetch support contacts', { error });
        return;
      }

      if (!contacts || contacts.length === 0) {
        log('realtime', 'No support contacts found');
        return;
      }

      const channelName = `presence:support-network:${userId}`;
      
      this.presenceChannel = supabase.channel(channelName, {
        config: {
          presence: { key: userId },
          broadcast: { self: false }
        }
      });

      this.presenceChannel
        .on('presence', { event: 'sync' }, () => {
          const state = this.presenceChannel?.presenceState() || {};
          // Convert presence state to our format
          const presenceList: RealtimePresence[] = [];
          Object.entries(state).forEach(([key, presences]) => {
            if (Array.isArray(presences)) {
              presences.forEach((presence: any) => {
                if (presence.userId && presence.userName && presence.status && presence.lastSeen) {
                  presenceList.push({
                    userId: presence.userId,
                    userName: presence.userName,
                    status: presence.status,
                    lastSeen: presence.lastSeen
                  });
                }
              });
            }
          });
          log('realtime', 'Presence sync', { count: presenceList.length });
          this.connectionMonitor.updatePingTime();
          this.handlePresenceUpdate(presenceList);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          log('realtime', 'User joined', { key, newPresences });
          this.connectionMonitor.updatePingTime();
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          log('realtime', 'User left', { key, leftPresences });
          this.connectionMonitor.updatePingTime();
        })
        .subscribe(async (status) => {
          log('realtime', 'Presence channel status', { status, channelName });
          
          if (status === 'SUBSCRIBED') {
            // Get user profile
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', userId)
              .single();

            // Track your presence
            const presenceData = {
              userId,
              userName: profile?.full_name || 'Anonymous',
              status: 'online' as const,
              lastSeen: new Date().toISOString()
            };
            
            await this.presenceChannel?.track(presenceData);
            log('realtime', 'Tracking presence', presenceData);
            this.connectionMonitor.updatePingTime();
          }
        });
    } catch (error) {
      log('error', 'Failed to setup presence', { error: error.message });
    }
  }

  /**
   * Subscribe to database changes
   */
  private async subscribeToDbChanges(userId: string): Promise<void> {
    log('realtime', 'Setting up database change subscriptions', { userId });

    // Subscribe to crisis events
    const crisisChannelName = 'db-crisis-events';
    const crisisChannel = supabase
      .channel(crisisChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crisis_events',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          log('realtime', 'Crisis event detected', payload);
          this.connectionMonitor.updatePingTime();
          this.handleCrisisEvent(payload.new);
        }
      )
      .subscribe((status) => {
        log('realtime', 'Crisis events channel status', { status });
        if (status === 'SUBSCRIBED') {
          this.channels.set(crisisChannelName, crisisChannel);
          this.connectionMonitor.updatePingTime();
        }
      });

    // Subscribe to support contact changes
    const contactsChannelName = 'db-support-contacts';
    const contactsChannel = supabase
      .channel(contactsChannelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_contacts',
          filter: `user_id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          log('realtime', 'Contact change detected', payload);
          this.connectionMonitor.updatePingTime();
          this.handleContactChange(payload);
        }
      )
      .subscribe((status) => {
        log('realtime', 'Contacts channel status', { status });
        if (status === 'SUBSCRIBED') {
          this.channels.set(contactsChannelName, contactsChannel);
          this.connectionMonitor.updatePingTime();
        }
      });
  }

  /**
   * Health monitoring
   */
  private startHealthMonitoring(): void {
    log('realtime', 'Starting health monitoring');
    
    // Clear existing interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Update last ping time
    this.lastPing = Date.now();

    // Monitor connection health
    this.healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastPing = now - this.lastPing;
      
      if (timeSinceLastPing > 60000) { // No activity for 60 seconds
        log('error', 'Connection unhealthy - no ping received', { 
          timeSinceLastPing,
          channelCount: this.channels.size 
        });
        
        if (this.connectionStatus === 'connected') {
          this.handleDisconnect();
        }
      } else {
        // Connection is healthy
        if (this.connectionStatus !== 'connected' && this.channels.size > 0) {
          this.connectionStatus = 'connected';
          this.reconnectAttempts = 0;
          log('realtime', 'Connection restored');
        }
      }
    }, 10000); // Check every 10 seconds
  }

  private updateLastPing(): void {
    this.lastPing = Date.now();
    this.connectionMonitor.updatePingTime();
  }

  private async handleDisconnect(): Promise<void> {
    log('realtime', 'Handling disconnect', { attempts: this.reconnectAttempts });
    
    this.connectionStatus = 'disconnected';
    this.updateConnectionStatusDisplay();
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      log('critical', 'Max reconnection attempts reached, switching to polling');
      
      // Switch to polling fallback
      if (this.userId && !this.usePollingFallback) {
        this.usePollingFallback = true;
        this.enablePollingFallback();
      }
      
      this.notifyUserOfConnectionIssue();
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    setTimeout(async () => {
      try {
        await this.reconnect();
      } catch (error) {
        log('error', 'Reconnection failed', { error: error.message });
        this.handleDisconnect();
      }
    }, delay);
  }

  private async reconnect(): Promise<void> {
    log('realtime', 'Reconnecting all channels');
    
    if (!this.userId) {
      throw new Error('No user ID available for reconnection');
    }

    // Clean up existing channels
    this.channels.forEach((channel, name) => {
      channel.unsubscribe();
    });
    this.channels.clear();
    
    if (this.presenceChannel) {
      this.presenceChannel.unsubscribe();
      this.presenceChannel = null;
    }

    // Reinitialize
    await this.initialize(this.userId);
  }

  private handleChannelError(channelName: string): void {
    log('error', 'Channel error', { channelName });
    
    // Remove the failed channel
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelName);
    }
    
    // Trigger reconnection if too many channels have failed
    if (this.channels.size === 0) {
      this.handleDisconnect();
    }
  }

  private notifyUserOfConnectionIssue(): void {
    log('critical', 'Persistent connection issues detected');
    
    // Try to show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Connection Issue', {
        body: 'Having trouble staying connected. Some features may be limited.',
        icon: '/icon-192x192.png',
        requireInteraction: true
      });
    }
    
    // Dispatch custom event for UI handling
    window.dispatchEvent(new CustomEvent('realtime-connection-issue', {
      detail: { attempts: this.reconnectAttempts, maxAttempts: this.maxReconnectAttempts }
    }));
  }

  /**
   * Send a real-time alert to specific users
   */
  async sendAlert(recipientIds: string[], alert: Omit<RealtimeAlert, 'id' | 'timestamp'>): Promise<void> {
    log('realtime', 'Sending alert', { recipientCount: recipientIds.length });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const fullAlert: RealtimeAlert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString()
    };

    // Send to each recipient's channel
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

  /**
   * Send crisis alert to all support contacts
   */
  async sendCrisisAlert(message: string, location?: string): Promise<void> {
    log('realtime', 'Sending crisis alert', { hasLocation: !!location });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get user profile and contacts
    const [profileResult, contactsResult] = await Promise.all([
      supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      supabase.from('support_contacts').select('id').eq('user_id', user.id)
    ]);

    if (profileResult.error || contactsResult.error) {
      throw new Error('Failed to fetch user data');
    }

    const profile = profileResult.data;
    const contacts = contactsResult.data || [];

    // In a real implementation, you'd map contact IDs to their user IDs
    const recipientIds = contacts.map(c => c.id);

    await this.sendAlert(recipientIds, {
      type: 'crisis',
      senderId: user.id,
      senderName: profile?.full_name || 'Unknown',
      message,
      urgency: 'high',
      location
    });

    // Update presence to show crisis status
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

  /**
   * Update user status
   */
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

  /**
   * Register alert handler
   */
  onAlert(handler: (alert: RealtimeAlert) => void): () => void {
    const id = crypto.randomUUID();
    this.alertHandlers.set(id, handler);
    log('realtime', 'Alert handler registered', { id });
    
    return () => {
      this.alertHandlers.delete(id);
      log('realtime', 'Alert handler unregistered', { id });
    };
  }

  /**
   * Register presence handler
   */
  onPresenceUpdate(handler: (presence: RealtimePresence[]) => void): () => void {
    this.presenceHandlers.add(handler);
    log('realtime', 'Presence handler registered');
    
    return () => {
      this.presenceHandlers.delete(handler);
      log('realtime', 'Presence handler unregistered');
    };
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): string {
    if (this.usePollingFallback) {
      return 'connected-polling';
    }
    return this.connectionStatus;
  }

  /**
   * Get debug info
   */
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
      monitor: {
        attempts: monitorStatus.attempts,
        lastPingTime: monitorStatus.lastPingTime,
        timeSinceLastPing: monitorStatus.timeSinceLastPing,
        isHealthy: monitorStatus.isHealthy
      }
    };
  }

  /**
   * Get channel count
   */
  getChannelCount(): number {
    return this.channels.size;
  }

  /**
   * Handle incoming alerts
   */
  private handleAlert(alert: RealtimeAlert): void {
    log('realtime', 'Processing alert', { alertId: alert.id, urgency: alert.urgency });
    
    this.connectionMonitor.updatePingTime();
    
    // Notify all registered handlers
    this.alertHandlers.forEach(handler => {
      try {
        handler(alert);
      } catch (error) {
        log('error', 'Alert handler error', { error: error.message });
      }
    });

    // Show notification if supported and high urgency
    if (alert.urgency === 'high' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(`Alert from ${alert.senderName}`, {
        body: alert.message,
        icon: '/icon-192x192.png',
        badge: '/icon-72x72.png',
        tag: alert.id,
        requireInteraction: true
      });
    }
  }

  /**
   * Handle presence updates
   */
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

  /**
   * Handle crisis events
   */
  private handleCrisisEvent(event: any): void {
    log('realtime', 'Processing crisis event', { eventId: event.id });
    this.connectionMonitor.updatePingTime();
    // Additional crisis event handling
  }

  /**
   * Handle contact changes
   */
  private handleContactChange(payload: RealtimePostgresChangesPayload<any>): void {
    log('realtime', 'Processing contact change', { 
      eventType: payload.eventType,
      table: payload.table 
    });
    this.connectionMonitor.updatePingTime();
    // Additional contact change handling
  }

  private handleChannelError(channelName: string): void {
    log('error', 'Channel error', { channelName });
    
    // Remove the failed channel
    const channel = this.channels.get(channelName);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(channelName);
    }
    
    // Trigger reconnection if too many channels have failed
    if (this.channels.size === 0) {
      this.handleDisconnect();
    }
  }

  private async handleDisconnect(): Promise<void> {
    log('realtime', 'Handling disconnect', { attempts: this.reconnectAttempts });
    
    this.connectionStatus = 'disconnected';
    this.updateConnectionStatusDisplay();
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      log('critical', 'Max reconnection attempts reached, switching to polling');
      
      // Switch to polling fallback
      if (this.userId && !this.usePollingFallback) {
        this.usePollingFallback = true;
        this.enablePollingFallback();
      }
      
      this.notifyUserOfConnectionIssue();
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    
    setTimeout(async () => {
      try {
        await this.reconnect();
      } catch (error) {
        log('error', 'Reconnection failed', { error: error.message });
        this.handleDisconnect();
      }
    }, delay);
  }

  private async reconnect(): Promise<void> {
    log('realtime', 'Reconnecting all channels');
    
    if (!this.userId) {
      throw new Error('No user ID available for reconnection');
    }

    // Clean up existing channels
    this.channels.forEach((channel, name) => {
      channel.unsubscribe();
    });
    this.channels.clear();
    
    if (this.presenceChannel) {
      this.presenceChannel.unsubscribe();
      this.presenceChannel = null;
    }

    // Reinitialize
    await this.initialize(this.userId);
  }

  private notifyUserOfConnectionIssue(): void {
    log('critical', 'Persistent connection issues detected');
    
    // Try to show notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Connection Issue', {
        body: 'Having trouble staying connected. Some features may be limited.',
        icon: '/icon-192x192.png',
        requireInteraction: true
      });
    }
    
    // Dispatch custom event for UI handling
    window.dispatchEvent(new CustomEvent('realtime-connection-issue', {
      detail: { attempts: this.reconnectAttempts, maxAttempts: this.maxReconnectAttempts }
    }));
  }

  /**
   * Cleanup all subscriptions
   */
  async cleanup(): Promise<void> {
    log('realtime', 'Cleaning up realtime service');
    
    // Stop connection monitoring
    this.connectionMonitor.stopMonitoring();

    // Clear health check interval
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Untrack presence
    if (this.presenceChannel) {
      await this.presenceChannel.untrack();
      this.presenceChannel.unsubscribe();
      this.presenceChannel = null;
    }

    // Unsubscribe from all channels
    this.channels.forEach((channel, name) => {
      log('realtime', 'Unsubscribing from channel', { name });
      channel.unsubscribe();
    });

    this.channels.clear();
    this.alertHandlers.clear();
    this.presenceHandlers.clear();
    this.isInitialized = false;
    this.connectionStatus = 'disconnected';
    this.updateConnectionStatusDisplay();
    
    // Stop polling
    pollingService.stopAllPolling();
    this.pollingEnabled = false;
    this.usePollingFallback = false;

    // Remove status display
    removeConnectionStatus();

    // Clean up global references
    delete (window as any).realtimeConnectionMonitor;

    log('realtime', 'Cleanup complete');
  }
}

// Create singleton instance with enhanced monitoring
export const realtimeService = new RealtimeService();

// Legacy functions for backward compatibility
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

// Monitor connection issues
let connectionMonitor: NodeJS.Timeout | null = null;

const startConnectionMonitor = () => {
  if (connectionMonitor) return;
  
  connectionMonitor = setInterval(() => {
    const status = realtimeService.getConnectionStatus();
    const channelCount = realtimeService.getChannelCount();
    
    if (status === 'disconnected' && channelCount === 0) {
      log('critical', 'Connection issue detected by monitor', {
        attempts: (realtimeService as any).reconnectAttempts,
        maxAttempts: (realtimeService as any).maxReconnectAttempts
      });
    }
  }, 5000);
};

// Start monitoring when service is used
startConnectionMonitor();

// Export the useRealtime hook
export { useRealtime } from './realtime/useRealtimeHook';
