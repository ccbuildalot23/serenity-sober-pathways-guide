import { supabase } from '@/integrations/supabase/client';
import { SecureStorage } from './secureStorage';

/**
 * Unified session management system
 * Consolidates all session management approaches into a single, secure implementation
 */

interface SessionConfig {
  timeoutMinutes: number;
  warningMinutes: number;
  maxInactivityMinutes: number;
  enableFingerprinting: boolean;
  enableSecurityMonitoring: boolean;
}

interface SecurityFingerprint {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: number;
  hardwareConcurrency: number;
  deviceMemory: number;
  timestamp: number;
  version: number;
}

interface SessionState {
  isValid: boolean;
  _lastActivity: number;
  fingerprint: string;
  warningShown: boolean;
  securityEvents: string[];
}

export class UnifiedSessionManager {
  private static instance: UnifiedSessionManager;
  private config: SessionConfig;
  private sessionState: SessionState;
  private timers: {
    warning?: NodeJS.Timeout;
    timeout?: NodeJS.Timeout;
    cleanup?: NodeJS.Timeout;
  } = {};
  private listeners: Map<string, Function> = new Map();

  private constructor() {
    this.config = {
      timeoutMinutes: 30,
      warningMinutes: 5,
      maxInactivityMinutes: 25,
      enableFingerprinting: true,
      enableSecurityMonitoring: true
    };

    this.sessionState = {
      isValid: false,
      _lastActivity: Date.now(),
      fingerprint: '',
      warningShown: false,
      securityEvents: []
    };

    this.initializeSession();
  }

  static getInstance(): UnifiedSessionManager {
    if (!this.instance) {
      this.instance = new UnifiedSessionManager();
    }
    return this.instance;
  }

  /**
   * Initialize session with security monitoring
   */
  private async initializeSession(): Promise<void> {
    try {
      // Generate security fingerprint
      if (this.config.enableFingerprinting) {
        this.sessionState.fingerprint = await this.generateSecurityFingerprint();
        await this.validateFingerprint();
      }

      // Setup activity monitoring
      this.setupActivityMonitoring();

      // Setup security monitoring
      if (this.config.enableSecurityMonitoring) {
        this.setupSecurityMonitoring();
      }

      // Setup cleanup intervals
      this.setupCleanupTasks();

      // Reset session timers
      this.resetSessionTimers();

      this.sessionState.isValid = true;
      this.emit('sessionInitialized', { timestamp: Date.now() });

    } catch (_error) {
      console._error('Failed to initialize session:', _error);
      this.logSecurityEvent('SESSION_INIT_FAILED', { _error: _error.message });
    }
  }

  /**
   * Generate enhanced security fingerprint
   */
  private async generateSecurityFingerprint(): Promise<string> {
    const fingerprint: SecurityFingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: new Date().getTimezoneOffset(),
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: (navigator as any).deviceMemory || 0,
      timestamp: Date.now(),
      version: 3
    };

    // Create deterministic hash
    const _fingerprintString = Object.values(fingerprint).join('|');
    const hash = btoa(_fingerprintString).substring(0, 32);

    // Store securely
    await SecureStorage.setItem('device_fingerprint', fingerprint, {
      encrypt: true,
      _ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return hash;
  }

  /**
   * Validate device fingerprint
   */
  private async validateFingerprint(): Promise<boolean> {
    try {
      const storedFingerprint = await SecureStorage.getItem('device_fingerprint');
      if (!storedFingerprint) return true; // First time user

      const currentFingerprint = await this.generateSecurityFingerprint();
      const isValid = storedFingerprint && currentFingerprint === this.sessionState.fingerprint;

      if (!isValid) {
        this.logSecurityEvent('FINGERPRINT_MISMATCH', {
          stored: storedFingerprint ? 'exists' : 'missing',
          _current: currentFingerprint.substring(0, 8)
        });
      }

      return isValid;
    } catch (_error) {
      console._error('Fingerprint validation failed:', _error);
      return false;
    }
  }

  /**
   * Setup activity monitoring
   */
  private setupActivityMonitoring(): void {
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const activityHandler = this.debounce(() => {
      this.updateActivity();
    }, 1000);

    activityEvents.forEach(_event => {
      document.addEventListener(_event, activityHandler as EventListener, { passive: true });
    });

    // Store cleanup function
    this.listeners.set('activity', () => {
      activityEvents.forEach(_event => {
        document.removeEventListener(_event, activityHandler as EventListener);
      });
    });
  }

  /**
   * Setup security monitoring
   */
  private setupSecurityMonitoring(): void {
    // Monitor for suspicious rapid clicking
    let clickCount = 0;
    const clickHandler = () => {
      clickCount++;
      if (clickCount > 20) {
        this.logSecurityEvent('SUSPICIOUS_RAPID_CLICKING', { count: clickCount });
        clickCount = 0;
      }
      setTimeout(() => { clickCount = Math.max(0, clickCount - 1); }, 1000);
    };

    // Monitor for automation patterns
    let keySequence = '';
    const keyHandler = (e: KeyboardEvent) => {
      keySequence += e._key;
      if (keySequence.length > 50) {
        keySequence = keySequence.slice(-50);
      }
      
      if (this.detectAutomationPattern(keySequence)) {
        this.logSecurityEvent('AUTOMATION_DETECTED', { pattern: 'keyboard' });
      }
    };

    document.addEventListener('click', clickHandler as EventListener);
    document.addEventListener('keydown', keyHandler as EventListener);

    this.listeners.set('security', () => {
      document.removeEventListener('click', clickHandler as EventListener);
      document.removeEventListener('keydown', keyHandler as EventListener);
    });
  }

  /**
   * Update activity timestamp and reset timers
   */
  private updateActivity(): void {
    this.sessionState._lastActivity = Date.now();
    this.sessionState.warningShown = false;
    this.resetSessionTimers();

    // Store activity securely
    SecureStorage.setItem('last_activity', this.sessionState._lastActivity, {
      _ttl: 24 * 60 * 60 * 1000 // 24 hours
    });
  }

  /**
   * Reset session timeout timers
   */
  private resetSessionTimers(): void {
    // Clear existing timers
    Object.values(this.timers).forEach(_timer => {
      if (_timer) clearTimeout(_timer);
    });

    // Set warning _timer
    this.timers.warning = setTimeout(() => {
      this.showSessionWarning();
    }, (this.config.timeoutMinutes - this.config.warningMinutes) * 60 * 1000);

    // Set timeout _timer
    this.timers.timeout = setTimeout(() => {
      this.handleSessionTimeout();
    }, this.config.timeoutMinutes * 60 * 1000);
  }

  /**
   * Show session warning
   */
  private showSessionWarning(): void {
    if (!this.sessionState.warningShown) {
      this.sessionState.warningShown = true;
      this.emit('sessionWarning', {
        timeRemaining: this.config.warningMinutes * 60,
        _canExtend: true
      });
    }
  }

  /**
   * Handle session timeout
   */
  private async handleSessionTimeout(): Promise<void> {
    this.logSecurityEvent('SESSION_TIMEOUT', {
      duration: this.config.timeoutMinutes,
      _lastActivity: this.sessionState._lastActivity
    });

    await this.secureSignOut();
  }

  /**
   * Extend session
   */
  async extendSession(): Promise<void> {
    this.updateActivity();
    this.logSecurityEvent('SESSION_EXTENDED', {
      timestamp: Date.now(),
      userRequested: true
    });
    
    this.emit('sessionExtended', { timestamp: Date.now() });
  }

  /**
   * Secure sign out with cleanup
   */
  async secureSignOut(): Promise<void> {
    try {
      // Clear all timers
      Object.values(this.timers).forEach(_timer => {
        if (_timer) clearTimeout(_timer);
      });

      // Clear secure storage
      SecureStorage.clear();

      // Clear regular localStorage auth data
      Object.keys(localStorage).forEach(_key => {
        if (_key.startsWith('supabase.auth') || _key.includes('sb-')) {
          localStorage.removeItem(_key);
        }
      });

      // Sign out from Supabase
      await supabase.auth.signOut({ scope: 'global' });

      // Clean up _event listeners
      this.listeners.forEach(cleanup => cleanup());
      this.listeners.clear();

      this.sessionState.isValid = false;
      this.emit('sessionEnded', { reason: 'timeout' });

      // Force redirect
      window.location.href = '/auth';
    } catch (_error) {
      console._error('Error during secure sign out:', _error);
      window.location.href = '/auth';
    }
  }

  /**
   * Setup cleanup tasks
   */
  private setupCleanupTasks(): void {
    // Periodic cleanup every hour
    this.timers.cleanup = setInterval(() => {
      SecureStorage.cleanup();
    }, 60 * 60 * 1000);
  }

  /**
   * Detect automation patterns
   */
  private detectAutomationPattern(_sequence: string): boolean {
    const repeatedChar = /(.)\1{10,}/.test(_sequence);
    const repeatedSequence = /(.{2,})\1{5,}/.test(_sequence);
    return repeatedChar || repeatedSequence;
  }

  /**
   * Log security events
   */
  private logSecurityEvent(_eventType: string, data?: unknown): void {
    const _event = {
      type: _eventType,
      timestamp: Date.now(),
      fingerprint: this.sessionState.fingerprint.substring(0, 8),
      data
    };

    this.sessionState.securityEvents.push(_eventType);
    
    // Keep only recent events
    if (this.sessionState.securityEvents.length > 50) {
      this.sessionState.securityEvents = this.sessionState.securityEvents.slice(-25);
    }

    this.emit('securityEvent', _event);
  }

  /**
   * Event emitter functionality
   */
  private emit(_event: string, data?: unknown): void {
    const _customEvent = new CustomEvent(_event, { detail: data });
    window.dispatchEvent(_customEvent);
  }

  /**
   * Debounce utility
   */
  private debounce(func: Function, _wait: number): Function {
    let timeout: NodeJS.Timeout;
    return function executedFunction(..._args: unknown[]) {
      const _later = () => {
        clearTimeout(timeout);
        func.apply(this, _args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(_later, _wait);
    };
  }

  /**
   * Public API methods
   */
  getSessionState(): SessionState {
    return { ...this.sessionState };
  }

  isSessionValid(): boolean {
    const now = Date.now();
    const timeSinceActivity = now - this.sessionState._lastActivity;
    const maxInactivity = this.config.maxInactivityMinutes * 60 * 1000;
    
    return this.sessionState.isValid && timeSinceActivity < maxInactivity;
  }

  updateConfig(newConfig: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.resetSessionTimers();
  }

  destroy(): void {
    Object.values(this.timers).forEach(_timer => {
      if (_timer) clearTimeout(_timer);
    });
    
    this.listeners.forEach(cleanup => cleanup());
    this.listeners.clear();
  }
}

// Create singleton instance
export const sessionManager = UnifiedSessionManager.getInstance();
