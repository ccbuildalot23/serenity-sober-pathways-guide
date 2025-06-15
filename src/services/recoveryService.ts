
// Add type declarations for global window properties
declare global {
  interface Window {
    realtimeConnectionMonitor?: {
      stopMonitoring: () => void;
    };
  }
}

class RecoveryService {
  private failureCount = 0;
  private readonly MAX_FAILURES = 3;
  private recoveryInProgress = false;
  
  constructor() {
    this.initializeRecoveryMonitoring();
  }

  private initializeRecoveryMonitoring() {
    window.addEventListener('error', (event) => {
      if (this.isConnectionError(event.message)) {
        this.handleConnectionFailure();
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      if (this.isConnectionError(event.reason?.message || '')) {
        this.handleConnectionFailure();
      }
    });

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
      if (window.realtimeConnectionMonitor) {
        window.realtimeConnectionMonitor.stopMonitoring();
      }
      
      this.clearProblematicStorage();
      
      await this.resetRealtimeService();
      
      this.showRecoveryNotification();
      
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
      const keysToRemove = Object.keys(localStorage).filter(key =>
        key.includes('realtime') || 
        key.includes('supabase') ||
        key.includes('websocket')
      );
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      sessionStorage.clear();
      
      console.log('Recovery: Cleared problematic storage');
    } catch (error) {
      console.error('Recovery: Failed to clear storage:', error);
    }
  }

  private async resetRealtimeService() {
    try {
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

  public manualRecovery() {
    console.log('Recovery: Manual recovery initiated');
    this.failureCount = this.MAX_FAILURES;
    this.initiateEmergencyRecovery();
  }

  public needsRecovery(): boolean {
    return this.failureCount >= this.MAX_FAILURES;
  }

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
