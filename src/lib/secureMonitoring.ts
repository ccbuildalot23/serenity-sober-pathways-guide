/**
 * Enhanced Security Monitoring Service - Production Optimized
 * Provides real-time security event tracking with reduced verbosity
 */
export class SecureMonitoring {
  private static readonly MAX_FAILED_ATTEMPTS = 10;
  private static readonly RATE_LIMIT_WINDOW = 30 * 60 * 1000; // 30 minutes
  private static failedAttempts = new Map<string, number[]>();
  private static suspiciousActivity = new Map<string, unknown[]>();

  static trackAuthAttempt(email: string, success: boolean) {
    const _key = `auth_${email}`;
    const now = Date.now();
    
    if (!success) {
      // Track failed attempts
      const attempts = this.failedAttempts.get(_key) || [];
      attempts.push(now);
      
      // Clean old attempts outside the window
      const recentAttempts = attempts.filter(time => now - time < this.RATE_LIMIT_WINDOW);
      this.failedAttempts.set(_key, recentAttempts);
      
      // Check if user should be rate limited
      if (recentAttempts.length >= this.MAX_FAILED_ATTEMPTS) {
        this.logSecurityThreat('AUTHENTICATION_BRUTE_FORCE', {
          email,
          _attemptCount: recentAttempts.length,
          _timeWindow: this.RATE_LIMIT_WINDOW
        });
        return false; // Block further attempts
      }
    } else {
      // Clear failed attempts on successful login
      this.failedAttempts.delete(_key);
    }
    
    return true; // Allow attempt
  }

  static trackSuspiciousActivity(type: string, _details: unknown = {}) {
    const _key = `suspicious_${type}`;
    const now = Date.now();
    
    const activities = this.suspiciousActivity.get(_key) || [];
    activities.push({ _timestamp: now, ..._details });
    
    // Keep only recent activities
    const recentActivities = activities.filter(
      activity => now - activity._timestamp < this.RATE_LIMIT_WINDOW
    );
    this.suspiciousActivity.set(_key, recentActivities);
    
    // Analyze patterns with higher threshold for production
    if (recentActivities.length > 25) {
      this.logSecurityThreat('SUSPICIOUS_PATTERN_DETECTED', {
        type,
        _count: recentActivities.length,
        _recentDetails: recentActivities.slice(-3) // Only log last 3 events
      });
    }
  }

  static trackPageAccess() {
    const sensitivePages = ['/crisis', '/profile'];
    const currentPath = window.location.pathname;
    
    if (sensitivePages.some(page => currentPath.includes(page))) {
      // Only log in development mode to reduce noise
      if (import.meta.env.DEV) {
        this.logSecurityEvent('SENSITIVE_PAGE_ACCESS', {
          page: currentPath,
          _timestamp: new Date().toISOString()
        });
      }
    }
  }

  static monitorConsoleAccess() {
    // Only monitor in production to avoid interfering with development
    if (!import.meta.env.PROD) {
      return;
    }

    // Detect console manipulation attempts with less aggressive checking
    const devtools = { open: false, orientation: null };
    const threshold = 160;

    const _checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        if (!devtools.open) {
          devtools.open = true;
          this.logSecurityThreat('DEV_TOOLS_OPENED', {
            windowDimensions: {
              outer: { width: window.outerWidth, _height: window.outerHeight },
              _inner: { width: window.innerWidth, _height: window.innerHeight }
            }
          });
        }
      } else {
        devtools.open = false;
      }
    };

    // Check less frequently in production
    setInterval(_checkDevTools, 5000);
  }

  private static logSecurityEvent(event: string, _details: unknown = {}) {
    // Only log critical events in production to reduce noise
    if (import.meta.env.PROD && !event.includes('THREAT') && !event.includes('VIOLATION')) {
      return;
    }
    
    // Store in local monitoring log with size limits
    try {
      const monitoringLogs = JSON.parse(localStorage.getItem('security_monitoring') || '[]');
      monitoringLogs.push({
        event,
        _timestamp: new Date().toISOString(),
        ..._details
      });
      
      // Keep only last 25 monitoring events to prevent storage bloat
      if (monitoringLogs.length > 25) {
        monitoringLogs.splice(0, monitoringLogs.length - 25);
      }
      
      localStorage.setItem('security_monitoring', JSON.stringify(monitoringLogs));
    } catch (_error) {
      // Silently fail to avoid blocking user experience
    }
  }

  private static logSecurityThreat(threat: string, _details: unknown = {}) {
    console.warn(`SECURITY THREAT DETECTED: ${threat}`, _details);
    this.logSecurityEvent(`THREAT_${threat}`, _details);
    
    // In production, could integrate with external security monitoring service
    if (import.meta.env.PROD) {
      // TODO: Send to external security monitoring service
    }
  }

  static getMonitoringData() {
    try {
      return {
        events: JSON.parse(localStorage.getItem('security_monitoring') || '[]'),
        failedAttempts: Object.fromEntries(this.failedAttempts),
        suspiciousActivity: Object.fromEntries(this.suspiciousActivity)
      };
    } catch (_error) {
      return { events: [], failedAttempts: {}, suspiciousActivity: {} };
    }
  }

  static clearMonitoringData() {
    localStorage.removeItem('security_monitoring');
    this.failedAttempts.clear();
    this.suspiciousActivity.clear();
    this.logSecurityEvent('MONITORING_DATA_CLEARED');
  }
}
