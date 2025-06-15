
import { log } from './debugUtils';

export class ConnectionMonitor {
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private attempts = 0;
  private lastPingTime = Date.now();
  private monitorInterval: NodeJS.Timeout | null = null;
  private realtimeService: any;

  constructor(realtimeService: any) {
    this.realtimeService = realtimeService;
    // Make monitor available globally for WebSocket debugging
    (window as any).realtimeConnectionMonitor = this;
  }

  startMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    // Monitor connection health with reduced frequency to prevent log spam
    this.monitorInterval = setInterval(() => {
      const timeSinceLastPing = Date.now() - this.lastPingTime;
      
      // Only log critical issues if we haven't already reached max attempts
      if (timeSinceLastPing > 60000 && this.attempts < this.maxReconnectAttempts) { // Increased to 60 seconds
        log('monitor', 'Connection appears unhealthy', { timeSinceLastPing });
        this.handleReconnect();
      }
    }, 30000); // Reduced frequency to 30 seconds

    log('monitor', 'Connection monitoring started');
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    // Reset attempts when stopping
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
      return;
    }

    this.attempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.attempts - 1), 30000);
    
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
      isHealthy: (Date.now() - this.lastPingTime) < 60000, // Increased threshold
      maxAttempts: this.maxReconnectAttempts
    };
  }

  // Reset the monitor state
  reset() {
    this.attempts = 0;
    this.updatePingTime();
    log('monitor', 'Monitor state reset');
  }
}
