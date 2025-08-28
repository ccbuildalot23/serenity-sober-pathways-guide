import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import CryptoJS from 'react-native-crypto-js';
import {Alert, AppState} from 'react-native';

export interface SecurityConfig {
  sessionTimeout: number; // in minutes
  maxFailedAttempts: number;
  lockoutDuration: number; // in minutes
  passwordMinLength: number;
  requireBiometric: boolean;
  enableAuditLogging: boolean;
}

export interface SecurityEvent {
  id: string;
  userId?: string;
  eventType: 'login' | 'logout' | 'failed_login' | 'session_timeout' | 'data_access' | 'security_violation';
  timestamp: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class SecurityService {
  private static readonly DEFAULT_CONFIG: SecurityConfig = {
    sessionTimeout: 15, // 15 minutes for PHI access
    maxFailedAttempts: 3,
    lockoutDuration: 30, // 30 minutes
    passwordMinLength: 8,
    requireBiometric: false,
    enableAuditLogging: true,
  };

  private static config: SecurityConfig = this.DEFAULT_CONFIG;
  private static sessionTimer: NodeJS.Timeout | null = null;
  private static isLocked: boolean = false;

  /**
   * Initialize security service
   */
  static async initialize(): Promise<void> {
    try {
      // Load security configuration
      const storedConfig = await AsyncStorage.getItem('security_config');
      if (storedConfig) {
        this.config = {...this.DEFAULT_CONFIG, ...JSON.parse(storedConfig)};
      }

      // Set up app state monitoring
      AppState.addEventListener('change', this.handleAppStateChange);

      // Start session monitoring
      this.startSessionMonitoring();

      console.log('Security service initialized');
    } catch (error) {
      console.error('Failed to initialize security service:', error);
    }
  }

  /**
   * Update security configuration
   */
  static async updateConfig(newConfig: Partial<SecurityConfig>): Promise<void> {
    try {
      this.config = {...this.config, ...newConfig};
      await AsyncStorage.setItem('security_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to update security config:', error);
    }
  }

  /**
   * Validate password strength
   */
  static validatePasswordStrength(password: string): boolean {
    if (password.length < this.config.passwordMinLength) return false;
    
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(password)) return false;
    
    // Check for at least one lowercase letter
    if (!/[a-z]/.test(password)) return false;
    
    // Check for at least one number
    if (!/\d/.test(password)) return false;
    
    // Check for at least one special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
    
    return true;
  }

  /**
   * Encrypt sensitive data
   */
  static encryptData(data: string, key?: string): string {
    try {
      const secretKey = key || 'serenity_default_key_2023';
      return CryptoJS.AES.encrypt(data, secretKey).toString();
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   */
  static decryptData(encryptedData: string, key?: string): string {
    try {
      const secretKey = key || 'serenity_default_key_2023';
      const bytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Store data securely in encrypted storage
   */
  static async storeSecureData(key: string, data: any): Promise<void> {
    try {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const encryptedData = this.encryptData(dataString);
      await EncryptedStorage.setItem(key, encryptedData);
    } catch (error) {
      console.error('Failed to store secure data:', error);
      throw new Error('Failed to store secure data');
    }
  }

  /**
   * Retrieve data from encrypted storage
   */
  static async getSecureData(key: string): Promise<any> {
    try {
      const encryptedData = await EncryptedStorage.getItem(key);
      if (!encryptedData) return null;
      
      const decryptedData = this.decryptData(encryptedData);
      
      // Try to parse as JSON, return as string if parsing fails
      try {
        return JSON.parse(decryptedData);
      } catch {
        return decryptedData;
      }
    } catch (error) {
      console.error('Failed to retrieve secure data:', error);
      return null;
    }
  }

  /**
   * Remove data from encrypted storage
   */
  static async removeSecureData(key: string): Promise<void> {
    try {
      await EncryptedStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove secure data:', error);
    }
  }

  /**
   * Clear all sensitive data
   */
  static async clearSensitiveData(): Promise<void> {
    try {
      await EncryptedStorage.clear();
      
      // Remove specific non-encrypted sensitive items
      const sensitiveKeys = [
        'user_profile',
        'session_data',
        'biometric_enabled',
        'failed_attempts',
        'lockout_until',
      ];
      
      await AsyncStorage.multiRemove(sensitiveKeys);
      
      console.log('Sensitive data cleared');
    } catch (error) {
      console.error('Failed to clear sensitive data:', error);
    }
  }

  /**
   * Handle failed authentication attempts
   */
  static async handleFailedAttempt(userId?: string): Promise<{locked: boolean; remainingAttempts: number}> {
    try {
      const key = `failed_attempts_${userId || 'unknown'}`;
      const attempts = await AsyncStorage.getItem(key);
      const currentAttempts = attempts ? parseInt(attempts, 10) : 0;
      const newAttempts = currentAttempts + 1;

      await AsyncStorage.setItem(key, newAttempts.toString());

      if (newAttempts >= this.config.maxFailedAttempts) {
        // Lock the account
        const lockoutUntil = Date.now() + (this.config.lockoutDuration * 60 * 1000);
        await AsyncStorage.setItem(`lockout_until_${userId || 'unknown'}`, lockoutUntil.toString());
        
        this.logSecurityEvent('account_locked', {
          userId,
          attempts: newAttempts,
          lockoutDuration: this.config.lockoutDuration,
        });

        return {locked: true, remainingAttempts: 0};
      }

      return {locked: false, remainingAttempts: this.config.maxFailedAttempts - newAttempts};
    } catch (error) {
      console.error('Failed to handle failed attempt:', error);
      return {locked: false, remainingAttempts: this.config.maxFailedAttempts};
    }
  }

  /**
   * Check if account is locked
   */
  static async isAccountLocked(userId?: string): Promise<{locked: boolean; remainingTime?: number}> {
    try {
      const lockoutUntil = await AsyncStorage.getItem(`lockout_until_${userId || 'unknown'}`);
      if (!lockoutUntil) return {locked: false};

      const lockoutTime = parseInt(lockoutUntil, 10);
      const now = Date.now();

      if (now < lockoutTime) {
        return {locked: true, remainingTime: lockoutTime - now};
      } else {
        // Lockout expired, clear it
        await this.clearFailedAttempts(userId);
        return {locked: false};
      }
    } catch (error) {
      console.error('Failed to check account lock:', error);
      return {locked: false};
    }
  }

  /**
   * Clear failed attempts after successful login
   */
  static async clearFailedAttempts(userId?: string): Promise<void> {
    try {
      const keys = [
        `failed_attempts_${userId || 'unknown'}`,
        `lockout_until_${userId || 'unknown'}`,
      ];
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      console.error('Failed to clear failed attempts:', error);
    }
  }

  /**
   * Start session monitoring
   */
  static startSessionMonitoring(): void {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }

    this.sessionTimer = setInterval(async () => {
      await this.checkSessionTimeout();
    }, 60000); // Check every minute
  }

  /**
   * Check session timeout
   */
  static async checkSessionTimeout(): Promise<boolean> {
    try {
      const lastActivity = await AsyncStorage.getItem('last_activity');
      if (!lastActivity) return false;

      const lastActivityTime = parseInt(lastActivity, 10);
      const now = Date.now();
      const timeoutMs = this.config.sessionTimeout * 60 * 1000;

      if (now - lastActivityTime > timeoutMs) {
        await this.handleSessionTimeout();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to check session timeout:', error);
      return false;
    }
  }

  /**
   * Handle session timeout
   */
  static async handleSessionTimeout(): Promise<void> {
    try {
      this.logSecurityEvent('session_timeout', {
        lastActivity: await AsyncStorage.getItem('last_activity'),
        timeoutMinutes: this.config.sessionTimeout,
      });

      await this.clearSensitiveData();
      
      Alert.alert(
        'Session Expired',
        'Your session has expired for security reasons. Please sign in again.',
        [{text: 'OK'}]
      );
    } catch (error) {
      console.error('Failed to handle session timeout:', error);
    }
  }

  /**
   * Update user activity
   */
  static async updateActivity(): Promise<void> {
    try {
      await AsyncStorage.setItem('last_activity', Date.now().toString());
    } catch (error) {
      console.error('Failed to update activity:', error);
    }
  }

  /**
   * Handle app state changes
   */
  static handleAppStateChange = async (nextAppState: string): Promise<void> => {
    if (nextAppState === 'background') {
      // App going to background - start security timer
      await AsyncStorage.setItem('background_time', Date.now().toString());
    } else if (nextAppState === 'active') {
      // App becoming active - check if security timeout exceeded
      const backgroundTime = await AsyncStorage.getItem('background_time');
      if (backgroundTime) {
        const timeInBackground = Date.now() - parseInt(backgroundTime, 10);
        const maxBackgroundTime = 5 * 60 * 1000; // 5 minutes

        if (timeInBackground > maxBackgroundTime) {
          await this.handleSessionTimeout();
        }
      }
    }
  };

  /**
   * Log security event
   */
  static async logSecurityEvent(eventType: SecurityEvent['eventType'], details: Record<string, any>): Promise<void> {
    if (!this.config.enableAuditLogging) return;

    try {
      const event: SecurityEvent = {
        id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventType,
        timestamp: new Date().toISOString(),
        details,
      };

      // Store locally
      const existingEvents = await this.getSecurityEvents();
      const updatedEvents = [event, ...existingEvents.slice(0, 99)]; // Keep last 100 events
      await EncryptedStorage.setItem('security_events', JSON.stringify(updatedEvents));

      // TODO: Send to audit service in production
      console.log('Security event logged:', event);
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get security events
   */
  static async getSecurityEvents(): Promise<SecurityEvent[]> {
    try {
      const events = await EncryptedStorage.getItem('security_events');
      return events ? JSON.parse(events) : [];
    } catch (error) {
      console.error('Failed to get security events:', error);
      return [];
    }
  }

  /**
   * Generate secure random token
   */
  static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Hash sensitive data
   */
  static hashData(data: string): string {
    return CryptoJS.SHA256(data).toString();
  }

  /**
   * Verify data integrity
   */
  static verifyDataIntegrity(data: string, hash: string): boolean {
    return this.hashData(data) === hash;
  }

  /**
   * Clean up security service
   */
  static cleanup(): void {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
      this.sessionTimer = null;
    }
    AppState.removeEventListener('change', this.handleAppStateChange);
  }

  /**
   * Get current security status
   */
  static async getSecurityStatus(): Promise<{
    sessionActive: boolean;
    timeUntilTimeout: number;
    biometricEnabled: boolean;
    recentSecurityEvents: SecurityEvent[];
  }> {
    try {
      const lastActivity = await AsyncStorage.getItem('last_activity');
      const biometricEnabled = await AsyncStorage.getItem('biometric_enabled') === 'true';
      const recentEvents = await this.getSecurityEvents();

      let sessionActive = false;
      let timeUntilTimeout = 0;

      if (lastActivity) {
        const lastActivityTime = parseInt(lastActivity, 10);
        const now = Date.now();
        const timeoutMs = this.config.sessionTimeout * 60 * 1000;
        const timeSinceActivity = now - lastActivityTime;

        sessionActive = timeSinceActivity < timeoutMs;
        timeUntilTimeout = Math.max(0, timeoutMs - timeSinceActivity);
      }

      return {
        sessionActive,
        timeUntilTimeout,
        biometricEnabled,
        recentSecurityEvents: recentEvents.slice(0, 10),
      };
    } catch (error) {
      console.error('Failed to get security status:', error);
      return {
        sessionActive: false,
        timeUntilTimeout: 0,
        biometricEnabled: false,
        recentSecurityEvents: [],
      };
    }
  }
}