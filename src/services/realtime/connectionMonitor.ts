
import { log } from './debugUtils';

export class ConnectionMonitor {
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private attempts = 0;
  private lastPingTime = Date.now();
  private monitorInterval: NodeJS.Timeout | null = null;
  private realtimeService: any; // Will be injected

  constructor(realtimeService: any) {
    this.realtimeService = realtimeService;
    // Make monitor available globally for WebSocket debugging
    (window as any).realtimeConnectionMonitor = this;
  }

  startMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    // Monitor connection health
    this.monitorInterval = setInterval(() => {
      const timeSinceLastPing = Date.now() - this.lastPingTime;
      
      if (timeSinceLastPing > 30000) { // 30 seconds
        log('monitor', 'Connection appears unhealthy', { timeSinceLastPing });
        this.handleReconnect();
      }
    }, 10000);

    log('monitor', 'Connection monitoring started');
  }

  stopMonitoring() {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
    log('monitor', 'Connection monitoring stopped');
  }

  handleReconnect() {
    if (this.attempts >= this.maxReconnectAttempts) {
      log('critical', 'Max reconnection attempts reached. Switching to polling mode...');
      this.realtimeService.enablePollingFallback();
      return;
    }

    this.attempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.attempts - 1);
    
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
      // Let the interval try again
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
      isHealthy: (Date.now() - this.lastPingTime) < 30000
    };
  }
}
