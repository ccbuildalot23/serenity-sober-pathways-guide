/**
 * Enhanced Security Monitoring Service
 * Provides real-time security event tracking and analysis
 */
export class SecureMonitoring {
  private static readonly MAX_FAILED_ATTEMPTS = 5;
  private static readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
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
      
      // Check if user is under attack
      if (recentAttempts.length >= this.MAX_FAILED_ATTEMPTS) {
        this.logSecurityThreat('BRUTE_FORCE_ATTEMPT', {
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
    
    // Analyze patterns
    if (recentActivities.length > 10) {
      this.logSecurityThreat('SUSPICIOUS_PATTERN_DETECTED', {
        type,
        count: recentActivities.length,
        recentDetails: recentActivities.slice(-5)
      });
    }
  }

  static trackPageAccess() {
    const sensitivePages = ['/auth', '/crisis', '/profile'];
    const currentPath = window.location.pathname;
    
    if (sensitivePages.some(page => currentPath.includes(page))) {
      this.logSecurityEvent('SENSITIVE_PAGE_ACCESS', {
        page: currentPath,
        timestamp: new Date().toISOString()
      });
    }
  }

  static monitorConsoleAccess() {
    // Detect console manipulation attempts
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

    if (import.meta.env.PROD) {
      setInterval(checkDevTools, 500);
    }
  }

  private static logSecurityEvent(event: string, details: any = {}) {
    console.log(`Security Monitor: ${event}`, details);
    
    // Store in local monitoring log
    try {
      const monitoringLogs = JSON.parse(localStorage.getItem('security_monitoring') || '[]');
      monitoringLogs.push({
        event,
        timestamp: new Date().toISOString(),
        ...details
      });
      
      // Keep only last 100 monitoring events
      if (monitoringLogs.length > 100) {
        monitoringLogs.splice(0, monitoringLogs.length - 100);
      }
      
      localStorage.setItem('security_monitoring', JSON.stringify(monitoringLogs));
    } catch (error) {
      console.warn('Could not store monitoring event:', error);
    }
  }

  private static logSecurityThreat(threat: string, details: any = {}) {
    console.warn(`SECURITY THREAT DETECTED: ${threat}`, details);
    this.logSecurityEvent(`THREAT_${threat}`, details);
    
    // Additional threat response could be implemented here
    // such as temporarily blocking IP, showing CAPTCHA, etc.
  }

  static getMonitoringData() {
    try {
      return {
        events: JSON.parse(localStorage.getItem('security_monitoring') || '[]'),
        failedAttempts: Object.fromEntries(this.failedAttempts),
        suspiciousActivity: Object.fromEntries(this.suspiciousActivity)
      };
    } catch (error) {
      console.warn('Could not retrieve monitoring data:', error);
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
