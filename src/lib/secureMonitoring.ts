/**
 * Enhanced Security Monitoring Service - Production Optimized
 * Provides real-time security event tracking with reduced verbosity
 */
export class SecureMonitoring {
  private static readonly MAX_FAILED_ATTEMPTS = 10;
  private static readonly RATE_LIMIT_WINDOW = 30 * 60 * 1000; // 30 minutes
  private static failedAttempts = new Map<string, number[]>();
  private static suspiciousActivity = new Map<string, any[]>();

  static trackAuthAttempt(email: string, success: boolean) {
    const key = `auth_${email}`;
    const now = Date.now();
    
    if (!success) {
      // Track failed attempts
      const attempts = this.failedAttempts.get(key) || [];
      attempts.push(now);
      
      // Clean old attempts outside the window
      const recentAttempts = attempts.filter(time => now - time < this.RATE_LIMIT_WINDOW);
      this.failedAttempts.set(key, recentAttempts);
      
      // Check if user should be rate limited
      if (recentAttempts.length >= this.MAX_FAILED_ATTEMPTS) {
        this.logSecurityThreat('AUTHENTICATION_BRUTE_FORCE', {
          email,
          attemptCount: recentAttempts.length,
          timeWindow: this.RATE_LIMIT_WINDOW
        });
        return false; // Block further attempts
      }
    } else {
      // Clear failed attempts on successful login
      this.failedAttempts.delete(key);
    }
    
    return true; // Allow attempt
  }

  static trackSuspiciousActivity(type: string, details: any = {}) {
    const key = `suspicious_${type}`;
    const now = Date.now();
    
    const activities = this.suspiciousActivity.get(key) || [];
    activities.push({ timestamp: now, ...details });
    
    // Keep only recent activities
    const recentActivities = activities.filter(
      activity => now - activity.timestamp < this.RATE_LIMIT_WINDOW
    );
    this.suspiciousActivity.set(key, recentActivities);
    
    // Analyze patterns with higher threshold for production
    if (recentActivities.length > 25) {
      this.logSecurityThreat('SUSPICIOUS_PATTERN_DETECTED', {
        type,
        count: recentActivities.length,
        recentDetails: recentActivities.slice(-3) // Only log last 3 events
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
          timestamp: new Date().toISOString()
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
    let devtools = { open: false, orientation: null };
    const threshold = 160;

    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        if (!devtools.open) {
          devtools.open = true;
          this.logSecurityThreat('DEV_TOOLS_OPENED', {
            windowDimensions: {
              outer: { width: window.outerWidth, height: window.outerHeight },
              inner: { width: window.innerWidth, height: window.innerHeight }
            }
          });
        }
      } else {
        devtools.open = false;
      }
    };

    // Check less frequently in production
    setInterval(checkDevTools, 5000);
  }

  private static logSecurityEvent(event: string, details: any = {}) {
    // Only log critical events in production to reduce noise
    if (import.meta.env.PROD && !event.includes('THREAT') && !event.includes('VIOLATION')) {
      return;
    }
    
    // Store in local monitoring log with size limits
    try {
      const monitoringLogs = JSON.parse(localStorage.getItem('security_monitoring') || '[]');
      monitoringLogs.push({
        event,
        timestamp: new Date().toISOString(),
        ...details
      });
      
      // Keep only last 25 monitoring events to prevent storage bloat
      if (monitoringLogs.length > 25) {
        monitoringLogs.splice(0, monitoringLogs.length - 25);
      }
      
      localStorage.setItem('security_monitoring', JSON.stringify(monitoringLogs));
    } catch (error) {
      // Silently fail to avoid blocking user experience
    }
  }

  private static logSecurityThreat(threat: string, details: any = {}) {
    console.warn(`SECURITY THREAT DETECTED: ${threat}`, details);
    this.logSecurityEvent(`THREAT_${threat}`, details);
    
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
    } catch (error) {
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
