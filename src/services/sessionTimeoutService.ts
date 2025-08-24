/**
 * HIPAA-Compliant Session Timeout Service
 * Implements automatic session timeout after 15 minutes of inactivity
 * with PHI data protection and audit logging
 */

import { supabase } from '@/integrations/supabase/client';
import logger from './loggerService';
import { hipaaAuditService } from './hipaaAuditService';

interface SessionConfig {
  timeoutDuration: number; // in milliseconds
  warningDuration: number; // warning before timeout in milliseconds
  checkInterval: number; // how often to check for timeout
}

class SessionTimeoutService {
  private config: SessionConfig = {
    timeoutDuration: 15 * 60 * 1000, // 15 minutes for HIPAA compliance
    warningDuration: 2 * 60 * 1000, // 2 minute warning
    checkInterval: 30 * 1000, // Check every 30 seconds
  };

  private lastActivityTime: number = Date.now();
  private timeoutTimer: NodeJS.Timeout | null = null;
  private warningTimer: NodeJS.Timeout | null = null;
  private checkTimer: NodeJS.Timeout | null = null;
  private isWarningShown: boolean = false;
  private sessionId: string | null = null;
  private userId: string | null = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    // Generate unique session ID
    this.sessionId = this.generateSessionId();
    
    // Set up activity listeners
    this.setupActivityListeners();
    
    // Start monitoring
    this.startMonitoring();
    
    // Get current user
    this.getCurrentUser();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private async getCurrentUser(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.userId = user.id;
        await this.logSessionStart();
      }
    } catch (error) {
      logger.error('Failed to get current user for session tracking', error);
    }
  }

  private setupActivityListeners(): void {
    // Track user activity
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ];

    events.forEach(event => {
      document.addEventListener(event, () => this.resetTimeout(), { passive: true });
    });

    // Track API calls as activity
    window.addEventListener('fetch', () => this.resetTimeout());
  }

  private resetTimeout(): void {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;
    
    // Only reset if significant time has passed (avoid excessive updates)
    if (timeSinceLastActivity > 1000) {
      this.lastActivityTime = now;
      this.isWarningShown = false;
      
      // Clear existing timers
      this.clearTimers();
      
      // Set new warning and timeout timers
      this.setTimers();
    }
  }

  private clearTimers(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  private setTimers(): void {
    // Set warning timer
    const warningTime = this.config.timeoutDuration - this.config.warningDuration;
    this.warningTimer = setTimeout(() => {
      this.showWarning();
    }, warningTime);

    // Set timeout timer
    this.timeoutTimer = setTimeout(() => {
      this.handleTimeout();
    }, this.config.timeoutDuration);
  }

  private startMonitoring(): void {
    // Initial timer setup
    this.setTimers();
    
    // Periodic check for edge cases
    this.checkTimer = setInterval(() => {
      const inactiveTime = Date.now() - this.lastActivityTime;
      
      if (inactiveTime >= this.config.timeoutDuration) {
        this.handleTimeout();
      } else if (inactiveTime >= this.config.timeoutDuration - this.config.warningDuration && !this.isWarningShown) {
        this.showWarning();
      }
    }, this.config.checkInterval);
  }

  private showWarning(): void {
    if (this.isWarningShown) return;
    
    this.isWarningShown = true;
    const remainingMinutes = Math.ceil(this.config.warningDuration / 60000);
    
    // Dispatch custom event for UI to handle
    const warningEvent = new (window as any).CustomEvent('session:warning', {
      detail: {
        message: `Your session will expire in ${remainingMinutes} minutes due to inactivity.`,
        remainingTime: this.config.warningDuration
      }
    });
    window.dispatchEvent(warningEvent);
    
    logger.info('Session timeout warning shown', {
      sessionId: this.sessionId,
      remainingMinutes
    });
  }

  private async handleTimeout(): Promise<void> {
    try {
      // Log the timeout event
      await this.logSessionTimeout();
      
      // Clear sensitive data from memory
      this.clearSensitiveData();
      
      // Sign out the user
      await this.performSecureSignOut();
      
      // Dispatch timeout event
      const timeoutEvent = new (window as any).CustomEvent('session:timeout', {
        detail: {
          message: 'Your session has expired due to inactivity. Please sign in again.',
          reason: 'inactivity_timeout'
        }
      });
      window.dispatchEvent(timeoutEvent);
      
    } catch (error) {
      logger.error('Error handling session timeout', error);
      // Force redirect even if there's an error
      window.location.href = '/auth?reason=session_timeout';
    }
  }

  private clearSensitiveData(): void {
    try {
      // Clear localStorage items containing PHI
      const phiKeys = [
        'patient_data',
        'medical_records',
        'prescriptions',
        'appointments',
        'clinical_notes'
      ];
      
      phiKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear any cached data in memory
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            if (name.includes('phi') || name.includes('patient')) {
              caches.delete(name);
            }
          });
        });
      }
      
      logger.security('Sensitive data cleared on session timeout', {
        sessionId: this.sessionId
      });
    } catch (error) {
      logger.error('Error clearing sensitive data', error);
    }
  }

  private async performSecureSignOut(): Promise<void> {
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Clear all auth tokens
      localStorage.removeItem('supabase.auth.token');
      
      // Redirect to login page
      window.location.href = '/auth?reason=session_timeout';
    } catch (error) {
      logger.error('Error during secure sign out', error);
      // Force redirect even on error
      window.location.href = '/auth?reason=session_timeout';
    }
  }

  private async logSessionStart(): Promise<void> {
    try {
      await hipaaAuditService.logAccess({
        action: 'SESSION_START',
        resourceType: 'session',
        resourceId: this.sessionId || 'unknown',
        details: {
          timestamp: new Date().toISOString(),
          timeoutDuration: this.config.timeoutDuration,
          userAgent: navigator.userAgent
        }
      });
    } catch (error) {
      logger.error('Failed to log session start', error);
    }
  }

  private async logSessionTimeout(): Promise<void> {
    try {
      const sessionDuration = Date.now() - (this.lastActivityTime - this.config.timeoutDuration);
      
      await hipaaAuditService.logAccess({
        action: 'SESSION_TIMEOUT',
        resourceType: 'session',
        resourceId: this.sessionId || 'unknown',
        details: {
          timestamp: new Date().toISOString(),
          reason: 'inactivity',
          sessionDuration,
          lastActivity: new Date(this.lastActivityTime).toISOString()
        }
      });
      
      logger.security('Session timed out due to inactivity', {
        sessionId: this.sessionId,
        userId: this.userId,
        duration: sessionDuration
      });
    } catch (error) {
      logger.error('Failed to log session timeout', error);
    }
  }

  // Public methods
  
  public extendSession(): void {
    this.resetTimeout();
    logger.info('Session extended by user action', {
      sessionId: this.sessionId
    });
  }

  public getSessionInfo(): {
    sessionId: string | null;
    lastActivity: Date;
    timeRemaining: number;
    isActive: boolean;
  } {
    const now = Date.now();
    const inactiveTime = now - this.lastActivityTime;
    const timeRemaining = Math.max(0, this.config.timeoutDuration - inactiveTime);
    
    return {
      sessionId: this.sessionId,
      lastActivity: new Date(this.lastActivityTime),
      timeRemaining,
      isActive: timeRemaining > 0
    };
  }

  public updateConfig(newConfig: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.clearTimers();
    this.setTimers();
    
    logger.info('Session timeout configuration updated', {
      sessionId: this.sessionId,
      newConfig
    });
  }

  public destroy(): void {
    // Clean up all timers and listeners
    this.clearTimers();
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }
    
    logger.info('Session timeout service destroyed', {
      sessionId: this.sessionId
    });
  }
}

// Export singleton instance
export const sessionTimeoutService = new SessionTimeoutService();

// Export for testing
export { SessionTimeoutService };