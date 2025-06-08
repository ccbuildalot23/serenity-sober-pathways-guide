
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

      // Store in database
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          preferences_encrypted: encryptedPreferences,
          updated_at: new Date().toISOString()
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
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('preferences_encrypted')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Failed to load notification preferences:', error);
        return null;
      }

      if (!data?.preferences_encrypted) {
        return null;
      }

      // Decrypt preferences
      const decryptedData = await serverSideEncryption.decrypt(data.preferences_encrypted);
      return JSON.parse(decryptedData);
      
    } catch (error) {
      console.error('Error loading notification preferences:', error);
      return null;
    }
  }

  static async deletePreferences(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Failed to delete notification preferences:', error);
        throw new Error('Failed to delete notification preferences');
      }
    } catch (error) {
      console.error('Error deleting notification preferences:', error);
      throw new Error('Failed to delete notification preferences');
    }
  }
}
