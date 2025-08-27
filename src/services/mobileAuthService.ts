import { BiometricAuth } from 'capacitor-biometric-auth';
import { Storage } from '@capacitor/storage';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/integrations/supabase/client';
import { Geolocation } from '@capacitor/geolocation';
import logger from './loggerService';

/**
 * Mobile Authentication & Security Service
 * 
 * Features:
 * - Biometric authentication (Face ID/Touch ID/Fingerprint)
 * - Push notification registration
 * - Secure token storage
 * - Location-based safety checks
 * - Background session management
 */

export interface BiometricCredentials {
  userId: string;
  encryptedToken: string;
  biometricId: string;
  deviceId: string;
  lastAuthenticated: Date;
}

export interface PushTokenRegistration {
  userId: string;
  token: string;
  platform: 'ios' | 'android';
  deviceId: string;
  permissions: string[];
  registeredAt: Date;
}

export interface SafetyCheck {
  userId: string;
  location: { lat: number; lng: number };
  timestamp: Date;
  batteryLevel?: number;
  networkStatus?: string;
}

class MobileAuthService {
  private biometricEnabled: boolean = false;
  private pushToken: string | null = null;
  private deviceId: string | null = null;
  private backgroundCheckInterval: number | null = null;

  constructor() {
    this.initializeDevice();
  }

  /**
   * Initialize device-specific settings
   */
  private async initializeDevice() {
    // Generate or retrieve device ID
    const { value } = await Storage.get({ key: 'device_id' });
    if (value) {
      this.deviceId = value;
    } else {
      this.deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await Storage.set({ key: 'device_id', value: this.deviceId });
    }

    // Check biometric availability
    await this.checkBiometricAvailability();
    
    // Initialize push notifications
    await this.initializePushNotifications();
  }

  /**
   * Check if biometric authentication is available
   */
  async checkBiometricAvailability(): Promise<boolean> {
    try {
      const result = await BiometricAuth.isAvailable();
      this.biometricEnabled = result.isAvailable;
      return result.isAvailable;
    } catch (error) {
      console.error('Biometric check failed:', error);
      this.biometricEnabled = false;
      return false;
    }
  }

  /**
   * Enable biometric authentication for user
   */
  async enableBiometric(userId: string): Promise<void> {
    if (!this.biometricEnabled) {
      throw new Error('Biometric authentication not available on this device');
    }

    try {
      // Verify biometric
      const verified = await BiometricAuth.verify({
        reason: 'Enable biometric login for Serenity',
        title: 'Biometric Authentication',
        subtitle: 'Use your fingerprint or face to login',
        description: 'This adds an extra layer of security to your account',
        fallbackTitle: 'Use Passcode',
        cancelTitle: 'Cancel'
      });

      if (!verified.verified) {
        throw new Error('Biometric verification failed');
      }

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // Encrypt and store credentials
      const credentials: BiometricCredentials = {
        userId,
        encryptedToken: await this.encryptToken(session.access_token),
        biometricId: verified.biometryType || 'unknown',
        deviceId: this.deviceId!,
        lastAuthenticated: new Date()
      };

      await Storage.set({
        key: 'biometric_credentials',
        value: JSON.stringify(credentials)
      });

      // Update user preferences
      await supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          biometric_enabled: true,
          biometric_type: verified.biometryType,
          device_id: this.deviceId
        });

      // Show success notification
      await LocalNotifications.schedule({
        notifications: [{
          title: 'Biometric Login Enabled',
          body: 'You can now use biometric authentication to access Serenity',
          id: 1001,
          schedule: { at: new Date(Date.now() + 100) }
        }]
      });

    } catch (error) {
      console.error('Failed to enable biometric:', error);
      throw error;
    }
  }

  /**
   * Authenticate using biometrics
   */
  async authenticateWithBiometric(): Promise<{ userId: string; session: any }> {
    if (!this.biometricEnabled) {
      throw new Error('Biometric authentication not available');
    }

    try {
      // Verify biometric
      const verified = await BiometricAuth.verify({
        reason: 'Login to Serenity',
        title: 'Welcome Back',
        subtitle: 'Authenticate to access your account',
        description: 'Place your finger on the sensor or look at the camera',
        fallbackTitle: 'Use Passcode',
        cancelTitle: 'Cancel'
      });

      if (!verified.verified) {
        throw new Error('Biometric verification failed');
      }

      // Retrieve stored credentials
      const { value } = await Storage.get({ key: 'biometric_credentials' });
      if (!value) {
        throw new Error('No stored biometric credentials');
      }

      const credentials: BiometricCredentials = JSON.parse(value);
      
      // Decrypt token
      const accessToken = await this.decryptToken(credentials.encryptedToken);

      // Validate and refresh session
      const { data: { session }, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: '' // Will be refreshed automatically
      });

      if (error || !session) {
        // Token expired, need full re-authentication
        throw new Error('Session expired. Please login again.');
      }

      // Update last authenticated
      credentials.lastAuthenticated = new Date();
      await Storage.set({
        key: 'biometric_credentials',
        value: JSON.stringify(credentials)
      });

      // Log authentication event
      await supabase.from('auth_logs').insert({
        user_id: credentials.userId,
        auth_method: 'biometric',
        device_id: this.deviceId,
        success: true,
        timestamp: new Date().toISOString()
      });

      return {
        userId: credentials.userId,
        session
      };

    } catch (error) {
      console.error('Biometric authentication failed:', error);
      
      // Log failed attempt
      await supabase.from('auth_logs').insert({
        auth_method: 'biometric',
        device_id: this.deviceId,
        success: false,
        error_message: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * Initialize push notifications
   */
  async initializePushNotifications(): Promise<void> {
    try {
      // Request permission
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive !== 'granted') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        throw new Error('Push notification permission denied');
      }

      // Register for push notifications
      await PushNotifications.register();

      // Listen for registration success
      PushNotifications.addListener('registration', async (token) => {
        logger.debug('Push registration success:', token.value, { component: 'mobileAuthService' });
        this.pushToken = token.value;
        
        // Save token to backend
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await this.savePushToken(user.id, token.value);
        }
      });

      // Listen for registration errors
      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      });

      // Handle incoming notifications
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        logger.debug('Push received:', notification, { component: 'mobileAuthService' });
        this.handlePushNotification(notification);
      });

      // Handle notification actions
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        logger.debug('Push action performed:', notification, { component: 'mobileAuthService' });
        this.handleNotificationAction(notification);
      });

    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  /**
   * Save push token to backend
   */
  private async savePushToken(userId: string, token: string): Promise<void> {
    const registration: PushTokenRegistration = {
      userId,
      token,
      platform: this.getPlatform(),
      deviceId: this.deviceId!,
      permissions: ['alert', 'badge', 'sound'],
      registeredAt: new Date()
    };

    await supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        token,
        platform: registration.platform,
        device_id: this.deviceId,
        permissions: registration.permissions,
        registered_at: registration.registeredAt.toISOString()
      });
  }

  /**
   * Handle incoming push notification
   */
  private async handlePushNotification(notification: any): Promise<void> {
    // Check notification type
    if (notification.data?.type === 'crisis_alert') {
      // Handle crisis alert
      await this.handleCrisisAlert(notification.data);
    } else if (notification.data?.type === 'check_in_reminder') {
      // Show local notification for check-in
      await LocalNotifications.schedule({
        notifications: [{
          title: notification.title || 'Daily Check-in',
          body: notification.body || 'Time for your daily wellness check-in',
          id: Date.now(),
          schedule: { at: new Date(Date.now() + 100) }
        }]
      });
    } else if (notification.data?.type === 'medication_reminder') {
      // Handle medication reminder
      await this.handleMedicationReminder(notification.data);
    }
  }

  /**
   * Handle notification action
   */
  private async handleNotificationAction(action: any): Promise<void> {
    if (action.actionId === 'respond_crisis') {
      // Open crisis chat
      window.location.href = '/crisis-support';
    } else if (action.actionId === 'check_in') {
      // Open check-in form
      window.location.href = '/daily-checkin';
    } else if (action.actionId === 'call_support') {
      // Initiate call to support
      window.location.href = 'tel:988';
    }
  }

  /**
   * Handle crisis alert notification
   */
  private async handleCrisisAlert(data: any): Promise<void> {
    // Show urgent local notification
    await LocalNotifications.schedule({
      notifications: [{
        title: '⚠️ Crisis Alert',
        body: data.message || 'Someone needs immediate support',
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 100) },
        sound: 'urgent.wav',
        attachments: [],
        actionTypeId: 'CRISIS_ACTIONS',
        extra: data
      }]
    });

    // Vibrate device
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }

  /**
   * Handle medication reminder
   */
  private async handleMedicationReminder(data: any): Promise<void> {
    await LocalNotifications.schedule({
      notifications: [{
        title: '💊 Medication Reminder',
        body: data.medication || 'Time to take your medication',
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 100) },
        sound: 'reminder.wav'
      }]
    });
  }

  /**
   * Start location-based safety monitoring
   */
  async startSafetyMonitoring(userId: string, intervalMinutes: number = 30): Promise<void> {
    // Request location permission
    const permission = await Geolocation.requestPermissions();
    if (permission.location !== 'granted') {
      throw new Error('Location permission required for safety monitoring');
    }

    // Clear existing interval
    if (this.backgroundCheckInterval) {
      clearInterval(this.backgroundCheckInterval);
    }

    // Start monitoring
    this.backgroundCheckInterval = window.setInterval(async () => {
      await this.performSafetyCheck(userId);
    }, intervalMinutes * 60 * 1000);

    // Perform initial check
    await this.performSafetyCheck(userId);
  }

  /**
   * Perform safety check
   */
  private async performSafetyCheck(userId: string): Promise<void> {
    try {
      // Get current location
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });

      const safetyCheck: SafetyCheck = {
        userId,
        location: {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        },
        timestamp: new Date(),
        batteryLevel: (navigator as any).getBattery ? 
          await this.getBatteryLevel() : undefined,
        networkStatus: navigator.onLine ? 'online' : 'offline'
      };

      // Save safety check
      await supabase.from('safety_checks').insert({
        user_id: userId,
        location: `POINT(${position.coords.longitude} ${position.coords.latitude})`,
        timestamp: safetyCheck.timestamp.toISOString(),
        battery_level: safetyCheck.batteryLevel,
        network_status: safetyCheck.networkStatus
      });

      // Check for geofence violations
      await this.checkGeofences(userId, safetyCheck.location);

    } catch (error) {
      console.error('Safety check failed:', error);
    }
  }

  /**
   * Check geofence boundaries
   */
  private async checkGeofences(userId: string, location: { lat: number; lng: number }): Promise<void> {
    // Get user's geofences
    const { data: geofences } = await supabase
      .from('user_geofences')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    if (!geofences) return;

    for (const fence of geofences) {
      const distance = this.calculateDistance(
        location,
        { lat: fence.center_lat, lng: fence.center_lng }
      );

      if (fence.type === 'safe_zone' && distance > fence.radius_meters) {
        // Outside safe zone
        await this.triggerGeofenceAlert(userId, fence, 'exit');
      } else if (fence.type === 'danger_zone' && distance < fence.radius_meters) {
        // Inside danger zone
        await this.triggerGeofenceAlert(userId, fence, 'enter');
      }
    }
  }

  /**
   * Trigger geofence alert
   */
  private async triggerGeofenceAlert(userId: string, fence: any, event: 'enter' | 'exit'): Promise<void> {
    // Create alert
    await supabase.from('geofence_alerts').insert({
      user_id: userId,
      geofence_id: fence.id,
      event,
      timestamp: new Date().toISOString()
    });

    // Notify emergency contacts if configured
    if (fence.notify_contacts) {
      const { data: contacts } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('user_id', userId)
        .eq('priority', 1);

      if (contacts) {
        for (const contact of contacts) {
          // Send notification to contact
          await this.notifyEmergencyContact(contact, userId, fence, event);
        }
      }
    }

    // Show local notification
    await LocalNotifications.schedule({
      notifications: [{
        title: '📍 Location Alert',
        body: event === 'enter' ? 
          `Entered ${fence.name}` : 
          `Left ${fence.name}`,
        id: Date.now(),
        schedule: { at: new Date(Date.now() + 100) }
      }]
    });
  }

  /**
   * Notify emergency contact
   */
  private async notifyEmergencyContact(contact: any, userId: string, fence: any, event: string): Promise<void> {
    // Implementation would send SMS/email to contact
    logger.debug('Notifying contact:', contact, 'about geofence event:', event, { component: 'mobileAuthService' });
  }

  /**
   * Calculate distance between two points
   */
  private calculateDistance(point1: { lat: number; lng: number }, point2: { lat: number; lng: number }): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = point1.lat * Math.PI / 180;
    const φ2 = point2.lat * Math.PI / 180;
    const Δφ = (point2.lat - point1.lat) * Math.PI / 180;
    const Δλ = (point2.lng - point1.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  /**
   * Get battery level
   */
  private async getBatteryLevel(): Promise<number | undefined> {
    try {
      const battery = await (navigator as any).getBattery();
      return Math.round(battery.level * 100);
    } catch {
      return undefined;
    }
  }

  /**
   * Get platform
   */
  private getPlatform(): 'ios' | 'android' {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('android')) return 'android';
    return 'ios';
  }

  /**
   * Simple token encryption (should use proper encryption in production)
   */
  private async encryptToken(token: string): Promise<string> {
    // In production, use proper encryption library
    return btoa(token);
  }

  /**
   * Simple token decryption
   */
  private async decryptToken(encrypted: string): Promise<string> {
    // In production, use proper encryption library
    return atob(encrypted);
  }

  /**
   * Disable biometric authentication
   */
  async disableBiometric(userId: string): Promise<void> {
    await Storage.remove({ key: 'biometric_credentials' });
    
    await supabase
      .from('user_preferences')
      .update({ biometric_enabled: false })
      .eq('user_id', userId);
  }

  /**
   * Stop safety monitoring
   */
  stopSafetyMonitoring(): void {
    if (this.backgroundCheckInterval) {
      clearInterval(this.backgroundCheckInterval);
      this.backgroundCheckInterval = null;
    }
  }
}

// Export singleton instance
export const mobileAuthService = new MobileAuthService();