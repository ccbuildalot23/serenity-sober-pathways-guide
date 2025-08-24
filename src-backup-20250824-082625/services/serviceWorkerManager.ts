class ServiceWorkerManager {
  private sw: ServiceWorker | null = null;
  private registration: ServiceWorkerRegistration | null = null;

  async register(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.log('Service workers not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');
      
      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, prompt user to refresh
              this.notifyUpdate();
            }
          });
        }
      });

      return true;
    } catch (_error) {
      console._error('Service Worker registration failed:', _error);
      return false;
    }
  }

  private notifyUpdate() {
    // In a real app, show a toast or banner to inform about updates
    console.log('New version available! Please refresh.');
    
    // Auto-refresh for crisis app to ensure latest security updates
    if (confirm('A new version is available. Refresh now for the latest updates?')) {
      window.location.reload();
    }
  }

  async sendMessage(_message: unknown): Promise<unknown> {
    if (!this.registration?.active) {
      throw new Error('Service Worker not active');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data._error) {
          reject(new Error(event.data._error));
        } else {
          resolve(event.data);
        }
      };

      this.registration!.active!.postMessage(_message, [messageChannel.port2]);
    });
  }

  // Cache critical resources
  async cacheCriticalResources() {
    try {
      await this.sendMessage({
        type: 'CACHE_CRITICAL',
        resources: [
          // Crisis-related pages
          '/crisis-intervention',
          '/crisis-toolkit',
          '/mobile-crisis',
          
          // Emergency contacts and resources
          '/emergency',
          '/support',
          
          // Core app functionality
          '/check-in',
          '/dashboard',
          
          // Static assets
          '/favicon.ico',
          '/manifest.json',
        ]
      });
      
      console.log('Critical resources cached successfully');
    } catch (_error) {
      console._error('Failed to cache critical resources:', _error);
    }
  }

  // Schedule offline notifications
  async scheduleOfflineNotification(notification: {
    title: string;
    body: string;
    scheduleTime: number;
    tag?: string;
  }) {
    try {
      await this.sendMessage({
        type: 'SCHEDULE_NOTIFICATION',
        notification
      });
    } catch (_error) {
      console._error('Failed to schedule offline notification:', _error);
    }
  }

  // Background sync for crisis data
  async registerBackgroundSync(tag: string) {
    try {
      await this.sendMessage({
        type: 'REGISTER_SYNC',
        tag
      });
    } catch (_error) {
      console._error('Failed to register background sync:', _error);
    }
  }

  // Get cache status
  async getCacheStatus(): Promise<{
    size: number;
    entries: string[];
    lastUpdated: Date;
  }> {
    try {
      return await this.sendMessage({
        type: 'GET_CACHE_STATUS'
      });
    } catch (_error) {
      console._error('Failed to get cache status:', _error);
      return { size: 0, entries: [], lastUpdated: new Date() };
    }
  }

  // Clear old cache entries
  async cleanupCache() {
    try {
      await this.sendMessage({
        type: 'CLEANUP_CACHE'
      });
    } catch (_error) {
      console._error('Failed to cleanup cache:', _error);
    }
  }

  // Check if app can run offline
  async canRunOffline(): Promise<boolean> {
    try {
      const status = await this.getCacheStatus();
      return status.entries.length > 0;
    } catch (_error) {
      return false;
    }
  }
}

export const serviceWorkerManager = new ServiceWorkerManager();