import { supabase } from '@/integrations/supabase/client';

export class EnhancedSessionSecurity {
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  private static readonly WARNING_TIME = 5 * 60 * 1000; // 5 minutes before timeout
  private static sessionTimer: NodeJS.Timeout | null = null;
  private static warningTimer: NodeJS.Timeout | null = null;

  /**
   * Generate a more secure device fingerprint
   */
  static generateSecureFingerprint(): string {
    const components = [
      navigator.userAgent,
      navigator.language,
      navigator.platform,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      navigator.hardwareConcurrency?.toString() || '0',
      navigator.deviceMemory?.toString() || '0'
    ];

    // Create hash of components
    const fingerprint = btoa(components.join('|')).substring(0, 32);
    
    // Store with timestamp
    const secureFingerprint = {
      fp: fingerprint,
      created: Date.now(),
      version: 2 // Track fingerprint version for future updates
    };

    localStorage.setItem('secure_device_fp', JSON.stringify(secureFingerprint));
    return fingerprint;
  }

  /**
   * Validate device fingerprint
   */
  static validateFingerprint(): boolean {
    try {
      const stored = localStorage.getItem('secure_device_fp');
      if (!stored) return false;

      const data = JSON.parse(stored);
      const currentFp = this.generateSecureFingerprint();
      
      // Allow for minor variations but flag major changes
      return data.fp === currentFp;
    } catch {
      return false;
    }
  }

  /**
   * Enhanced session management
   */
  static initializeSecureSession(): void {
    this.resetSessionTimer();
    this.setupSecurityMonitoring();
    
    // Validate device fingerprint
    if (!this.validateFingerprint()) {
      console.warn('Device fingerprint mismatch detected');
      this.logSecurityEvent('DEVICE_FINGERPRINT_MISMATCH');
    }
  }

  /**
   * Reset session timeout
   */
  static resetSessionTimer(): void {
    if (this.sessionTimer) clearTimeout(this.sessionTimer);
    if (this.warningTimer) clearTimeout(this.warningTimer);

    // Set warning timer
    this.warningTimer = setTimeout(() => {
      this.showSessionWarning();
    }, this.SESSION_TIMEOUT - this.WARNING_TIME);

    // Set session timeout
    this.sessionTimer = setTimeout(() => {
      this.handleSessionTimeout();
    }, this.SESSION_TIMEOUT);

    // Update last activity
    localStorage.setItem('session_last_activity', Date.now().toString());
  }

  /**
   * Show session warning
   */
  private static showSessionWarning(): void {
    const event = new CustomEvent('sessionWarning', {
      detail: { timeRemaining: this.WARNING_TIME / 1000 }
    });
    window.dispatchEvent(event);
  }

  /**
   * Handle session timeout
   */
  private static async handleSessionTimeout(): Promise<void> {
    this.logSecurityEvent('SESSION_TIMEOUT');
    await this.secureSignOut();
  }

  /**
   * Setup security monitoring for user activity
   */
  private static setupSecurityMonitoring(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const activityHandler = () => {
      this.resetSessionTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, activityHandler, { passive: true });
    });

    // Monitor for suspicious activity patterns
    let rapidClickCount = 0;
    const rapidClickReset = () => { rapidClickCount = 0; };
    
    document.addEventListener('click', () => {
      rapidClickCount++;
      
      if (rapidClickCount > 20) { // 20 clicks in quick succession
        this.logSecurityEvent('SUSPICIOUS_RAPID_CLICKING');
        rapidClickCount = 0;
      }
      
      setTimeout(rapidClickReset, 1000);
    });

    // Monitor for potential automation
    let keySequence = '';
    document.addEventListener('keydown', (e) => {
      keySequence += e.key;
      
      if (keySequence.length > 50) {
        keySequence = keySequence.slice(-50);
      }
      
      // Check for repetitive patterns that might indicate automation
      if (this.detectAutomationPattern(keySequence)) {
        this.logSecurityEvent('POTENTIAL_AUTOMATION_DETECTED');
      }
    });
  }

  /**
   * Detect automation patterns in key sequences
   */
  private static detectAutomationPattern(sequence: string): boolean {
    // Check for highly repetitive patterns
    const repeatedChar = /(.)\1{10,}/.test(sequence); // Same character 10+ times
    const repeatedSequence = /(.{2,})\1{5,}/.test(sequence); // Same sequence 5+ times
    
    return repeatedChar || repeatedSequence;
  }

  /**
   * Secure sign out with cleanup
   */
  static async secureSignOut(): Promise<void> {
    try {
      // Clear timers
      if (this.sessionTimer) clearTimeout(this.sessionTimer);
      if (this.warningTimer) clearTimeout(this.warningTimer);

      // Clear session data
      localStorage.removeItem('session_last_activity');
      localStorage.removeItem('secure_device_fp');
      
      // Clear all auth-related storage
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('supabase.auth') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });

      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' });
      
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error during secure sign out:', error);
      // Force redirect even if sign out fails
      window.location.href = '/auth';
    }
  }

  /**
   * Log security events
   */
  private static logSecurityEvent(eventType: string): void {
    const event = new CustomEvent('securityEvent', {
      detail: { 
        type: eventType, 
        timestamp: Date.now(),
        fingerprint: this.generateSecureFingerprint()
      }
    });
    window.dispatchEvent(event);
  }
}