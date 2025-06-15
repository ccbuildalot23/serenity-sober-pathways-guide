
import { log } from './debugUtils';

export class ConnectionMonitor {
  private maxReconnectAttempts = 3; // Reduced from 5
  private reconnectDelay = 2000; // Increased delay
  private attempts = 0;
  private lastPingTime = Date.now();
  private monitorInterval: NodeJS.Timeout | null = null;
  private realtimeService: any;
  private isEnabled = true;

  constructor(realtimeService: any) {
    this.realtimeService = realtimeService;
    // Make monitor available globally for debugging
    (window as any).realtimeConnectionMonitor = this;
  }

  startMonitoring() {
    if (this.monitorInterval || !this.isEnabled) {
      return;
    }

    // Monitor connection health with increased thresholds
    this.monitorInterval = setInterval(() => {
      const timeSinceLastPing = Date.now() - this.lastPingTime;
      
      // Only trigger if we haven't pinged in over 2 minutes AND we have active channels
      const debugInfo = this.realtimeService.getDebugInfo();
      if (timeSinceLastPing > 120000 && debugInfo.channelCount > 0 && this.attempts < this.maxReconnectAttempts) {
        log('monitor', 'Connection appears unhealthy', { 
          timeSinceLastPing, 
          channelCount: debugInfo.channelCount,
          attempts: this.attempts 
        });
        this.handleReconnect();
      }
    }, 45000); // Check every 45 seconds

    log('monitor', 'Connection monitoring started');
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    this.attempts = 0;
    log('monitor', 'Connection monitoring stopped');
  }

  handleReconnect() {
    if (this.attempts >= this.maxReconnectAttempts) {
      log('monitor', 'Max reconnection attempts reached. Delegating to recovery service...');
      // Import recovery service dynamically to handle this
      import('../recoveryService').then(({ recoveryService }) => {
        recoveryService.manualRecovery();
      });
      this.stopMonitoring(); // Stop monitoring to prevent spam
      return;
    }

    this.attempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(1.5, this.attempts - 1), 30000);
    
    log('monitor', `Reconnection attempt ${this.attempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  async reconnect() {
    try {
      log('monitor', 'Attempting to reconnect...');
      await this.realtimeService.forceReconnect();
      
      // Reset attempts on successful connection
      this.attempts = 0;
      this.updatePingTime();
      log('monitor', 'Reconnection successful');
    } catch (error) {
      log('error', 'Reconnection failed', { error: error.message });
      // Don't immediately retry, let the interval handle it
    }
  }

  updatePingTime() {
    this.lastPingTime = Date.now();
  }

  getStatus() {
    return {
      attempts: this.attempts,
      lastPingTime: this.lastPingTime,
      timeSinceLastPing: Date.now() - this.lastPingTime,
      isHealthy: (Date.now() - this.lastPingTime) < 120000, // 2 minute threshold
      maxAttempts: this.maxReconnectAttempts,
      isEnabled: this.isEnabled
    };
  }

  // Reset the monitor state
  reset() {
    this.attempts = 0;
    this.updatePingTime();
    log('monitor', 'Monitor state reset');
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stopMonitoring();
    }
    log('monitor', `Monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }
}
