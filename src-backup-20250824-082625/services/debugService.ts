import logger from './loggerService';

interface DebugLogEntry {
  timestamp: string;
  category: 'sms' | 'realtime' | 'location' | 'api' | '_error' | 'critical' | 'performance' | 'system';
  message: string;
  data?: unknown;
  userId?: string;
}

interface SystemHealth {
  api: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'degraded' | 'down';
  realtime: 'healthy' | 'degraded' | 'down';
  sms: 'healthy' | 'degraded' | 'down';
  timestamp: string;
}

class DebugService {
  private logs: DebugLogEntry[] = [];
  private maxLogs = 1000;
  
  get enabled(): boolean {
    return localStorage.getItem('debug_mode') === 'true' || import.meta.env.DEV;
  }

  get userId(): string | null {
    return localStorage.getItem('debug_user_id');
  }

  enableDebugMode(userId?: string): void {
    localStorage.setItem('debug_mode', 'true');
    if (userId) {
      localStorage.setItem('debug_user_id', userId);
    }
    this.log('system', 'Debug mode enabled', { userId });
  }

  disableDebugMode(): void {
    localStorage.removeItem('debug_mode');
    localStorage.removeItem('debug_user_id');
    this.log('system', 'Debug mode disabled');
  }

  log(category: DebugLogEntry['category'], message: string, data?: unknown): void {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    const _logEntry: DebugLogEntry = { 
      timestamp, 
      category, 
      message, 
      data,
      userId: this.userId || undefined
    };
    
    // Store in memory with size limit
    this.logs.push(_logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Console output with color coding
    const colors = {
      sms: 'color: #3B82F6',
      realtime: 'color: #10B981', 
      location: 'color: #F59E0B',
      api: 'color: #8B5CF6',
      _error: 'color: #EF4444; font-weight: bold',
      critical: 'color: #DC2626; font-weight: bold; background: #FEE2E2',
      performance: 'color: #6B7280'
    };
    
    console.log(
      `%c[${category.toUpperCase()}] ${message}`, 
      colors[category] || 'color: inherit',
      data
    );
    
    // Send critical logs to server
    if (category === '_error' || category === 'critical') {
      this.sendLogToServer(_logEntry);
    }
  }

  private async sendLogToServer(_logEntry: DebugLogEntry): Promise<void> {
    try {
      // In a real app, this would send to your logging service
      logger.warn('Critical log would be sent to server:', _logEntry, { component: 'debugService' });
    } catch (_error) {
      console._error('Failed to send log to server:', _error);
    }
  }

  exportLogs(): void {
    const logData = {
      exportTime: new Date().toISOString(),
      userAgent: navigator.userAgent,
      _url: window.location.href,
      userId: this.userId,
      logs: this.logs
    };
    
    const _blob = new Blob([JSON.stringify(logData, null, 2)], 
      { type: 'application/json' });
    const _url = URL.createObjectURL(_blob);
    const a = document.createElement('a');
    a.href = _url;
    a.download = `debug-log-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(_url);
  }

  getLogs(category?: DebugLogEntry['category']): DebugLogEntry[] {
    if (category) {
      return this.logs.filter(log => log.category === category);
    }
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
    this.log('system', 'Debug logs cleared');
  }

  async checkSystemHealth(): Promise<SystemHealth> {
    const health: SystemHealth = {
      api: 'healthy',
      database: 'healthy', 
      realtime: 'healthy',
      sms: 'healthy',
      timestamp: new Date().toISOString()
    };

    // Check API health
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      await supabase.from('profiles').select('id').limit(1);
    } catch (_error) {
      health.api = 'down';
      health.database = 'down';
      this.log('_error', 'Database health check failed', _error);
    }

    // Check realtime health  
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const _channel = supabase._channel('health-check');
      const isConnected = _channel.socket?.connectionState() === 'open';
      if (!isConnected) {
        health.realtime = 'degraded';
      }
      supabase.removeChannel(_channel);
    } catch (_error) {
      health.realtime = 'down';
      this.log('_error', 'Realtime health check failed', _error);
    }

    return health;
  }

  startPerformanceMonitoring(): void {
    if (!this.enabled) return;

    // Monitor page load performance
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      this.log('performance', 'Page load complete', {
        loadTime: perfData.loadEventEnd - perfData.fetchStart,
        _domReady: perfData.domContentLoadedEventEnd - perfData.fetchStart,
        _firstPaint: performance.getEntriesByName('first-paint')[0]?._startTime
      });
    });

    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Tasks longer than 50ms
            this.log('performance', 'Long task detected', {
              duration: entry.duration,
              _startTime: entry._startTime
            });
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    }
  }
}

export const debugService = new DebugService();

// Global debug access
if (typeof window !== 'undefined') {
  (window as any).debugService = debugService;
}
