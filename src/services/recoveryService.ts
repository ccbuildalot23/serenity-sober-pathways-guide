
class RecoveryService {
  private failureCount = 0;
  private readonly MAX_FAILURES = 3;
  private recoveryInProgress = false;
  
  constructor() {
    this.initializeRecoveryMonitoring();
  }

  private initializeRecoveryMonitoring() {
    // Monitor for connection failures
    window.addEventListener('error', (event) => {
      if (this.isConnectionError(event.message)) {
        this.handleConnectionFailure();
      }
    });

    // Monitor for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      if (this.isConnectionError(event.reason?.message || '')) {
        this.handleConnectionFailure();
      }
    });

    // Reset failure count periodically if online
    setInterval(() => {
      if (navigator.onLine && this.failureCount > 0) {
        this.failureCount = Math.max(0, this.failureCount - 1);
        console.log('Recovery: Decremented failure count to', this.failureCount);
      }
    }, 30000);
  }

  private isConnectionError(message: string): boolean {
    const connectionKeywords = [
      'websocket', 'connection', 'realtime', 'supabase',
      'network', 'fetch', 'timeout', 'refused'
    ];
    
    return connectionKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  private handleConnectionFailure() {
    if (this.recoveryInProgress) return;
    
    this.failureCount++;
    console.warn(`Recovery: Connection failure detected (${this.failureCount}/${this.MAX_FAILURES})`);
    
    if (this.failureCount >= this.MAX_FAILURES) {
      this.initiateEmergencyRecovery();
    }
  }

  private async initiateEmergencyRecovery() {
    if (this.recoveryInProgress) return;
    
    this.recoveryInProgress = true;
    console.warn('Recovery: Initiating emergency recovery procedure...');
    
    try {
      // Stop all realtime services
      if (window.realtimeConnectionMonitor) {
        window.realtimeConnectionMonitor.stopMonitoring();
      }
      
      // Clear problematic storage
      this.clearProblematicStorage();
      
      // Reset realtime service
      await this.resetRealtimeService();
      
      // Show user notification
      this.showRecoveryNotification();
      
      // Reset failure count
      this.failureCount = 0;
      
    } catch (error) {
      console.error('Recovery: Emergency recovery failed:', error);
      this.showFailedRecoveryNotification();
    } finally {
      this.recoveryInProgress = false;
    }
  }

  private clearProblematicStorage() {
    try {
      // Clear specific realtime-related items
      const keysToRemove = Object.keys(localStorage).filter(key =>
        key.includes('realtime') || 
        key.includes('supabase') ||
        key.includes('websocket')
      );
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Clear session storage
      sessionStorage.clear();
      
      console.log('Recovery: Cleared problematic storage');
    } catch (error) {
      console.error('Recovery: Failed to clear storage:', error);
    }
  }

  private async resetRealtimeService() {
    try {
      // Dynamic import to avoid circular dependencies
      const { realtimeService } = await import('./realtimeService');
      await realtimeService.cleanup();
      console.log('Recovery: Realtime service reset');
    } catch (error) {
      console.error('Recovery: Failed to reset realtime service:', error);
    }
  }

  private showRecoveryNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Connection Recovered', {
        body: 'We\'ve automatically fixed connection issues. The app should work normally now.',
        icon: '/favicon.ico',
        tag: 'recovery-success'
      });
    }
  }

  private showFailedRecoveryNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Recovery Failed', {
        body: 'Unable to automatically fix connection issues. Please refresh the page.',
        icon: '/favicon.ico',
        requireInteraction: true,
        tag: 'recovery-failed'
      });
    }
  }

  // Public method to manually trigger recovery
  public manualRecovery() {
    console.log('Recovery: Manual recovery initiated');
    this.failureCount = this.MAX_FAILURES;
    this.initiateEmergencyRecovery();
  }

  // Check if recovery is needed
  public needsRecovery(): boolean {
    return this.failureCount >= this.MAX_FAILURES;
  }

  // Get recovery status
  public getStatus() {
    return {
      failureCount: this.failureCount,
      maxFailures: this.MAX_FAILURES,
      recoveryInProgress: this.recoveryInProgress,
      needsRecovery: this.needsRecovery()
    };
  }
}

export const recoveryService = new RecoveryService();
