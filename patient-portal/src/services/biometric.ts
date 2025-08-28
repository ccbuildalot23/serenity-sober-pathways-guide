import ReactNativeBiometrics, {BiometryTypes} from 'react-native-biometrics';
import {Platform, Alert} from 'react-native';
import * as Keychain from 'react-native-keychain';

export interface BiometricResult {
  success: boolean;
  error?: string;
  biometryType?: BiometryTypes;
}

export class BiometricService {
  private static rnBiometrics = new ReactNativeBiometrics({allowDeviceCredentials: true});

  /**
   * Check if biometric authentication is available
   */
  static async isAvailable(): Promise<BiometricResult> {
    try {
      const {available, biometryType} = await this.rnBiometrics.isSensorAvailable();
      
      return {
        success: available,
        biometryType,
        error: available ? undefined : 'Biometric authentication not available',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to check biometric availability',
      };
    }
  }

  /**
   * Get available biometry type name for display
   */
  static getBiometryTypeName(biometryType?: BiometryTypes): string {
    switch (biometryType) {
      case BiometryTypes.TouchID:
        return 'Touch ID';
      case BiometryTypes.FaceID:
        return 'Face ID';
      case BiometryTypes.Biometrics:
        return Platform.OS === 'android' ? 'Fingerprint' : 'Biometrics';
      default:
        return 'Biometric Authentication';
    }
  }

  /**
   * Enable biometric authentication for the user
   */
  static async enableBiometrics(userId: string): Promise<BiometricResult> {
    try {
      // First check if biometrics are available
      const availabilityCheck = await this.isAvailable();
      if (!availabilityCheck.success) {
        return availabilityCheck;
      }

      // Check if keys already exist
      const {keysExist} = await this.rnBiometrics.biometricKeysExist();
      
      if (!keysExist) {
        // Create biometric keys
        const {success, error} = await this.rnBiometrics.createKeys();
        if (!success) {
          return {
            success: false,
            error: error || 'Failed to create biometric keys',
          };
        }
      }

      // Test biometric authentication
      const authResult = await this.authenticate();
      if (!authResult.success) {
        return authResult;
      }

      // Store biometric preference securely
      await Keychain.setInternetCredentials(
        `serenity_biometric_${userId}`,
        userId,
        'enabled',
        {
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY,
          accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }
      );

      return {
        success: true,
        biometryType: availabilityCheck.biometryType,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to enable biometric authentication',
      };
    }
  }

  /**
   * Disable biometric authentication
   */
  static async disableBiometrics(userId: string): Promise<BiometricResult> {
    try {
      // Remove stored biometric data
      await Keychain.resetInternetCredentials(`serenity_biometric_${userId}`);
      
      // Delete biometric keys
      const {success} = await this.rnBiometrics.deleteKeys();
      
      return {
        success,
        error: success ? undefined : 'Failed to disable biometric authentication',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to disable biometric authentication',
      };
    }
  }

  /**
   * Authenticate using biometrics
   */
  static async authenticate(): Promise<BiometricResult> {
    try {
      const availabilityCheck = await this.isAvailable();
      if (!availabilityCheck.success) {
        return availabilityCheck;
      }

      const biometryName = this.getBiometryTypeName(availabilityCheck.biometryType);
      
      const {success, error} = await this.rnBiometrics.simplePrompt({
        promptMessage: 'Authenticate with biometrics',
        fallbackPromptMessage: `Use ${biometryName} to access your Serenity account securely`,
      });

      return {
        success,
        error: success ? undefined : error || 'Biometric authentication failed',
        biometryType: availabilityCheck.biometryType,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Biometric authentication failed',
      };
    }
  }

  /**
   * Check if user has biometrics enabled
   */
  static async isBiometricEnabled(userId: string): Promise<boolean> {
    try {
      const credentials = await Keychain.getInternetCredentials(`serenity_biometric_${userId}`);
      return credentials && credentials.password === 'enabled';
    } catch (error) {
      return false;
    }
  }

  /**
   * Store sensitive data with biometric protection
   */
  static async storeSecureData(
    key: string,
    data: string,
    requireBiometric: boolean = false
  ): Promise<BiometricResult> {
    try {
      const options: Keychain.Options = {
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      };

      if (requireBiometric) {
        const availabilityCheck = await this.isAvailable();
        if (availabilityCheck.success) {
          options.accessControl = Keychain.ACCESS_CONTROL.BIOMETRY_ANY;
        }
      }

      await Keychain.setInternetCredentials(key, key, data, options);
      
      return {success: true};
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to store secure data',
      };
    }
  }

  /**
   * Retrieve secure data with optional biometric authentication
   */
  static async getSecureData(key: string): Promise<{success: boolean; data?: string; error?: string}> {
    try {
      const credentials = await Keychain.getInternetCredentials(key);
      
      if (credentials) {
        return {
          success: true,
          data: credentials.password,
        };
      } else {
        return {
          success: false,
          error: 'No secure data found for key',
        };
      }
    } catch (error: any) {
      // Handle biometric authentication cancellation or failure
      if (error.message?.includes('UserCancel') || error.message?.includes('UserFallback')) {
        return {
          success: false,
          error: 'Authentication cancelled',
        };
      }
      
      return {
        success: false,
        error: error.message || 'Failed to retrieve secure data',
      };
    }
  }

  /**
   * Remove secure data
   */
  static async removeSecureData(key: string): Promise<BiometricResult> {
    try {
      await Keychain.resetInternetCredentials(key);
      return {success: true};
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to remove secure data',
      };
    }
  }

  /**
   * Show biometric setup prompt
   */
  static showBiometricSetupDialog(biometryType?: BiometryTypes): Promise<boolean> {
    return new Promise((resolve) => {
      const biometryName = this.getBiometryTypeName(biometryType);
      
      Alert.alert(
        `Enable ${biometryName}?`,
        `Use ${biometryName} for quick and secure access to your Serenity account.`,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Enable',
            onPress: () => resolve(true),
          },
        ]
      );
    });
  }

  /**
   * Show biometric disabled warning
   */
  static showBiometricDisabledWarning(): void {
    Alert.alert(
      'Biometric Authentication Disabled',
      'Biometric authentication has been disabled. You can re-enable it in Security Settings.',
      [{text: 'OK'}]
    );
  }

  /**
   * Validate biometric authentication setup
   */
  static async validateBiometricSetup(): Promise<{
    available: boolean;
    configured: boolean;
    error?: string;
  }> {
    try {
      const availabilityCheck = await this.isAvailable();
      if (!availabilityCheck.success) {
        return {
          available: false,
          configured: false,
          error: availabilityCheck.error,
        };
      }

      const {keysExist} = await this.rnBiometrics.biometricKeysExist();
      
      return {
        available: true,
        configured: keysExist,
      };
    } catch (error: any) {
      return {
        available: false,
        configured: false,
        error: error.message || 'Failed to validate biometric setup',
      };
    }
  }
}