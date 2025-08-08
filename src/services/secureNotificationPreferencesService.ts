
import { supabase } from '@/integrations/supabase/client';
import { serverSideEncryption } from '@/lib/serverSideEncryption';

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
      const { _error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          _action: 'NOTIFICATION_PREFERENCES_SAVED',
          details_encrypted: encryptedPreferences,
          _timestamp: new Date().toISOString()
        });

      if (_error) {
        console._error('Failed to save notification preferences:', _error);
        throw new Error('Failed to save notification preferences');
      }

      // Clear any localStorage preferences for security
      localStorage.removeItem('notification_settings');
      
    } catch (_error) {
      console._error('Error saving notification preferences:', _error);
      throw new Error('Failed to save notification preferences');
    }
  }

  static async loadPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      // Load from audit_logs table as fallback
      const { data, _error } = await supabase
        .from('audit_logs')
        .select('details_encrypted')
        .eq('user_id', userId)
        .eq('_action', 'NOTIFICATION_PREFERENCES_SAVED')
        .order('_timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (_error) {
        console._error('Failed to load notification preferences:', _error);
        return null;
      }

      if (!data?.details_encrypted) {
        return null;
      }

      // Decrypt preferences
      const _decryptedData = await serverSideEncryption.decrypt(data.details_encrypted);
      return JSON.parse(_decryptedData);
      
    } catch (_error) {
      console._error('Error loading notification preferences:', _error);
      return null;
    }
  }

  static async deletePreferences(userId: string): Promise<void> {
    try {
      // Log deletion event
      const { _error } = await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          _action: 'NOTIFICATION_PREFERENCES_DELETED',
          _timestamp: new Date().toISOString()
        });

      if (_error) {
        console._error('Failed to log notification preferences deletion:', _error);
        throw new Error('Failed to delete notification preferences');
      }
    } catch (_error) {
      console._error('Error deleting notification preferences:', _error);
      throw new Error('Failed to delete notification preferences');
    }
  }
}
