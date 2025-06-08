
import { supabase } from '@/integrations/supabase/client';
import { serverSideEncryption } from '@/lib/serverSideEncryption';
import { InputValidator } from '@/lib/inputValidation';

interface NotificationPreferences {
  time: string;
  freq: number;
  toggles: {
    checkIn: boolean;
    affirm: boolean;
    support: boolean;
    spiritual: boolean;
  };
}

export class SecureNotificationPreferencesService {
  static async savePreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
    try {
      // Validate input
      const sanitizedPreferences = {
        time: InputValidator.sanitizeText(preferences.time),
        freq: Math.max(1, Math.min(7, preferences.freq)), // Clamp between 1-7
        toggles: {
          checkIn: Boolean(preferences.toggles.checkIn),
          affirm: Boolean(preferences.toggles.affirm),
          support: Boolean(preferences.toggles.support),
          spiritual: Boolean(preferences.toggles.spiritual)
        }
      };

      // Encrypt preferences
      const encryptedPreferences = await serverSideEncryption.encrypt(
        JSON.stringify(sanitizedPreferences)
      );

      // Store in audit_logs table as fallback until notification_preferences table is available
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action: 'NOTIFICATION_PREFERENCES_SAVED',
          details_encrypted: encryptedPreferences,
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to save notification preferences:', error);
        throw new Error('Failed to save notification preferences');
      }

      // Clear any localStorage preferences for security
      localStorage.removeItem('notification_settings');
      
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      throw new Error('Failed to save notification preferences');
    }
  }

  static async loadPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      // Load from audit_logs table as fallback
      const { data, error } = await supabase
        .from('audit_logs')
        .select('details_encrypted')
        .eq('user_id', userId)
        .eq('action', 'NOTIFICATION_PREFERENCES_SAVED')
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Failed to load notification preferences:', error);
        return null;
      }

      if (!data?.details_encrypted) {
        return null;
      }

      // Decrypt preferences
      const decryptedData = await serverSideEncryption.decrypt(data.details_encrypted);
      return JSON.parse(decryptedData);
      
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      return null;
    }
  }

  static async deletePreferences(userId: string): Promise<void> {
    try {
      // Log deletion event
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          action: 'NOTIFICATION_PREFERENCES_DELETED',
          timestamp: new Date().toISOString()
        });

      if (error) {
        console.error('Failed to log notification preferences deletion:', error);
        throw new Error('Failed to delete notification preferences');
      }
    } catch (error) {
      console.error('Error deleting notification preferences:', error);
      throw new Error('Failed to delete notification preferences');
    }
  }
}
