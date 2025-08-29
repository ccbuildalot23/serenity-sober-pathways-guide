import {Platform} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

export type HapticType = 'selection' | 'impactLight' | 'impactMedium' | 'impactHeavy' | 'notificationSuccess' | 'notificationWarning' | 'notificationError';

export class HapticService {
  private static isEnabled = true;

  /**
   * Initialize haptic feedback service
   */
  static initialize(): void {
    // Haptic feedback is initialized by default
    console.log('Haptic service initialized');
  }

  /**
   * Enable or disable haptic feedback
   */
  static setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Check if haptic feedback is enabled
   */
  static isHapticEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Trigger selection haptic feedback
   */
  static selection(): void {
    if (!this.isEnabled) return;
    
    try {
      ReactNativeHapticFeedback.trigger('selection', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    } catch (error) {
      console.log('Haptic selection feedback not available:', error);
    }
  }

  /**
   * Trigger impact haptic feedback
   */
  static impact(intensity: 'light' | 'medium' | 'heavy' = 'medium'): void {
    if (!this.isEnabled) return;
    
    try {
      let hapticType: HapticType;
      
      switch (intensity) {
        case 'light':
          hapticType = 'impactLight';
          break;
        case 'medium':
          hapticType = 'impactMedium';
          break;
        case 'heavy':
          hapticType = 'impactHeavy';
          break;
        default:
          hapticType = 'impactMedium';
      }

      ReactNativeHapticFeedback.trigger(hapticType, {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    } catch (error) {
      console.log('Haptic impact feedback not available:', error);
    }
  }

  /**
   * Trigger notification haptic feedback
   */
  static notification(type: 'success' | 'warning' | 'error' = 'success'): void {
    if (!this.isEnabled) return;
    
    try {
      let hapticType: HapticType;
      
      switch (type) {
        case 'success':
          hapticType = 'notificationSuccess';
          break;
        case 'warning':
          hapticType = 'notificationWarning';
          break;
        case 'error':
          hapticType = 'notificationError';
          break;
        default:
          hapticType = 'notificationSuccess';
      }

      ReactNativeHapticFeedback.trigger(hapticType, {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
    } catch (error) {
      console.log('Haptic notification feedback not available:', error);
    }
  }

  /**
   * Trigger success haptic feedback
   */
  static success(): void {
    this.notification('success');
  }

  /**
   * Trigger warning haptic feedback
   */
  static warning(): void {
    this.notification('warning');
  }

  /**
   * Trigger error haptic feedback
   */
  static error(): void {
    this.notification('error');
  }

  /**
   * Trigger button press haptic feedback
   */
  static buttonPress(): void {
    this.impact('light');
  }

  /**
   * Trigger toggle switch haptic feedback
   */
  static toggleSwitch(): void {
    this.selection();
  }

  /**
   * Trigger long press haptic feedback
   */
  static longPress(): void {
    this.impact('heavy');
  }

  /**
   * Trigger scroll/swipe haptic feedback
   */
  static scroll(): void {
    this.selection();
  }

  /**
   * Trigger custom haptic pattern (Android only)
   */
  static customPattern(pattern: number[]): void {
    if (!this.isEnabled || Platform.OS !== 'android') return;
    
    try {
      // Note: This would require additional native implementation
      // For now, fall back to medium impact
      this.impact('medium');
    } catch (error) {
      console.log('Custom haptic pattern not available:', error);
    }
  }

  /**
   * Check if haptic feedback is supported
   */
  static async isSupported(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // iOS devices generally support haptic feedback from iPhone 6S onwards
        return true;
      } else if (Platform.OS === 'android') {
        // Android support varies by device and API level
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available haptic types for the current platform
   */
  static getAvailableTypes(): HapticType[] {
    if (Platform.OS === 'ios') {
      return [
        'selection',
        'impactLight',
        'impactMedium',
        'impactHeavy',
        'notificationSuccess',
        'notificationWarning',
        'notificationError',
      ];
    } else {
      // Android has more limited haptic feedback options
      return [
        'impactLight',
        'impactMedium',
        'impactHeavy',
      ];
    }
  }

  /**
   * Test haptic feedback with all available types
   */
  static async testAllHaptics(): Promise<void> {
    const types = this.getAvailableTypes();
    
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      
      setTimeout(() => {
        console.log(`Testing haptic: ${type}`);
        ReactNativeHapticFeedback.trigger(type, {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      }, i * 1000);
    }
  }

  /**
   * Context-specific haptic feedback for healthcare app
   */
  static medicationTaken(): void {
    this.success();
  }

  static medicationSkipped(): void {
    this.warning();
  }

  static emergencyActivated(): void {
    // Strong haptic for emergency situations
    this.impact('heavy');
    setTimeout(() => this.impact('heavy'), 100);
    setTimeout(() => this.impact('heavy'), 200);
  }

  static checkinCompleted(): void {
    this.success();
  }

  static appointmentScheduled(): void {
    this.success();
  }

  static messageReceived(): void {
    this.impact('light');
  }

  static messageSent(): void {
    this.selection();
  }

  static settingChanged(): void {
    this.selection();
  }

  static navigationChange(): void {
    this.selection();
  }

  static dataLoaded(): void {
    this.impact('light');
  }

  static actionCompleted(): void {
    this.success();
  }

  static actionFailed(): void {
    this.error();
  }

  static voiceRecognitionStart(): void {
    this.impact('light');
  }

  static voiceRecognitionEnd(): void {
    this.impact('light');
  }

  static biometricSuccess(): void {
    this.success();
  }

  static biometricFailure(): void {
    this.error();
  }
}