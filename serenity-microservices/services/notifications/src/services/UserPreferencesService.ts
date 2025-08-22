import { database } from '@/models/database';
import { logger } from '@/utils/logger';
import { UserNotificationPreferences, NotificationType } from '@/types';

export class UserPreferencesService {
  async getUserPreferences(userId: string): Promise<UserNotificationPreferences | null> {
    try {
      const query = `
        SELECT * FROM user_notification_preferences 
        WHERE user_id = $1
      `;
      
      const result = await database.query(query, [userId]);
      
      if (result.rows.length === 0) {
        // Return default preferences if none exist
        return this.getDefaultPreferences(userId);
      }

      const row = result.rows[0];
      return this.mapToUserPreferences(row);

    } catch (error) {
      logger.error('Failed to get user preferences', { userId, error });
      return null;
    }
  }

  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserNotificationPreferences>
  ): Promise<boolean> {
    try {
      // Check if preferences exist
      const existing = await this.getUserPreferences(userId);
      
      if (!existing) {
        return await this.createUserPreferences(userId, preferences);
      }

      // Build update query dynamically
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (preferences.email !== undefined) {
        setClauses.push(`email_enabled = $${paramIndex++}`);
        values.push(preferences.email.enabled);
        
        if (preferences.email.address) {
          setClauses.push(`email_address = $${paramIndex++}`);
          values.push(preferences.email.address);
        }
        
        if (preferences.email.verified !== undefined) {
          setClauses.push(`email_verified = $${paramIndex++}`);
          values.push(preferences.email.verified);
        }
      }

      if (preferences.sms !== undefined) {
        setClauses.push(`sms_enabled = $${paramIndex++}`);
        values.push(preferences.sms.enabled);
        
        if (preferences.sms.phoneNumber) {
          setClauses.push(`sms_phone_number = $${paramIndex++}`);
          values.push(preferences.sms.phoneNumber);
        }
        
        if (preferences.sms.verified !== undefined) {
          setClauses.push(`sms_verified = $${paramIndex++}`);
          values.push(preferences.sms.verified);
        }
      }

      if (preferences.push !== undefined) {
        setClauses.push(`push_enabled = $${paramIndex++}`);
        values.push(preferences.push.enabled);
        
        if (preferences.push.deviceTokens) {
          setClauses.push(`push_device_tokens = $${paramIndex++}`);
          values.push(JSON.stringify(preferences.push.deviceTokens));
        }
      }

      if (preferences.inApp !== undefined) {
        setClauses.push(`in_app_enabled = $${paramIndex++}`);
        values.push(preferences.inApp.enabled);
      }

      if (preferences.quietHours !== undefined) {
        setClauses.push(`quiet_hours_enabled = $${paramIndex++}`);
        values.push(preferences.quietHours.enabled);
        
        if (preferences.quietHours.startTime) {
          setClauses.push(`quiet_hours_start = $${paramIndex++}`);
          values.push(preferences.quietHours.startTime);
        }
        
        if (preferences.quietHours.endTime) {
          setClauses.push(`quiet_hours_end = $${paramIndex++}`);
          values.push(preferences.quietHours.endTime);
        }
        
        if (preferences.quietHours.timezone) {
          setClauses.push(`quiet_hours_timezone = $${paramIndex++}`);
          values.push(preferences.quietHours.timezone);
        }
      }

      if (preferences.preferences !== undefined) {
        setClauses.push(`type_preferences = $${paramIndex++}`);
        values.push(JSON.stringify(preferences.preferences));
      }

      if (preferences.emergencyOverride !== undefined) {
        setClauses.push(`emergency_override = $${paramIndex++}`);
        values.push(preferences.emergencyOverride);
      }

      if (setClauses.length === 0) {
        logger.warn('No valid updates provided for user preferences', { userId });
        return false;
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(userId);

      const query = `
        UPDATE user_notification_preferences 
        SET ${setClauses.join(', ')}
        WHERE user_id = $${paramIndex}
        RETURNING id
      `;

      const result = await database.query(query, values);
      
      if (result.rowCount === 0) {
        logger.warn('User preferences not found for update', { userId });
        return false;
      }

      logger.info('User preferences updated successfully', { userId });
      return true;

    } catch (error) {
      logger.error('Failed to update user preferences', { userId, preferences, error });
      return false;
    }
  }

  async createUserPreferences(
    userId: string,
    preferences: Partial<UserNotificationPreferences>
  ): Promise<boolean> {
    try {
      const defaultPrefs = this.getDefaultPreferences(userId);
      const mergedPrefs = { ...defaultPrefs, ...preferences };

      const query = `
        INSERT INTO user_notification_preferences (
          user_id, email_enabled, email_address, email_verified,
          sms_enabled, sms_phone_number, sms_verified,
          push_enabled, push_device_tokens, in_app_enabled,
          quiet_hours_enabled, quiet_hours_start, quiet_hours_end, quiet_hours_timezone,
          type_preferences, emergency_override, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW())
        RETURNING id
      `;

      const values = [
        userId,
        mergedPrefs.email?.enabled || true,
        mergedPrefs.email?.address || null,
        mergedPrefs.email?.verified || false,
        mergedPrefs.sms?.enabled || true,
        mergedPrefs.sms?.phoneNumber || null,
        mergedPrefs.sms?.verified || false,
        mergedPrefs.push?.enabled || true,
        JSON.stringify(mergedPrefs.push?.deviceTokens || []),
        mergedPrefs.inApp?.enabled || true,
        mergedPrefs.quietHours?.enabled || false,
        mergedPrefs.quietHours?.startTime || null,
        mergedPrefs.quietHours?.endTime || null,
        mergedPrefs.quietHours?.timezone || 'UTC',
        JSON.stringify(mergedPrefs.preferences),
        mergedPrefs.emergencyOverride !== undefined ? mergedPrefs.emergencyOverride : true
      ];

      const result = await database.query(query, values);
      
      if (result.rows.length === 0) {
        return false;
      }

      logger.info('User preferences created successfully', { userId });
      return true;

    } catch (error) {
      logger.error('Failed to create user preferences', { userId, preferences, error });
      return false;
    }
  }

  async updateDeviceTokens(userId: string, deviceTokens: string[]): Promise<boolean> {
    try {
      // Validate device tokens
      const validTokens = deviceTokens.filter(token => this.isValidDeviceToken(token));
      
      if (validTokens.length !== deviceTokens.length) {
        logger.warn('Some device tokens are invalid', {
          userId,
          totalTokens: deviceTokens.length,
          validTokens: validTokens.length
        });
      }

      const query = `
        UPDATE user_notification_preferences 
        SET push_device_tokens = $1, updated_at = NOW()
        WHERE user_id = $2
        RETURNING id
      `;

      const result = await database.query(query, [JSON.stringify(validTokens), userId]);
      
      if (result.rowCount === 0) {
        // Create preferences if they don't exist
        return await this.createUserPreferences(userId, {
          push: {
            enabled: true,
            deviceTokens: validTokens
          }
        });
      }

      logger.info('Device tokens updated successfully', {
        userId,
        tokenCount: validTokens.length
      });
      
      return true;

    } catch (error) {
      logger.error('Failed to update device tokens', { userId, error });
      return false;
    }
  }

  async addDeviceToken(userId: string, deviceToken: string): Promise<boolean> {
    try {
      if (!this.isValidDeviceToken(deviceToken)) {
        logger.warn('Invalid device token provided', { userId, deviceToken: this.maskToken(deviceToken) });
        return false;
      }

      const preferences = await this.getUserPreferences(userId);
      if (!preferences) {
        return await this.createUserPreferences(userId, {
          push: {
            enabled: true,
            deviceTokens: [deviceToken]
          }
        });
      }

      const currentTokens = preferences.push?.deviceTokens || [];
      
      // Avoid duplicates
      if (currentTokens.includes(deviceToken)) {
        logger.debug('Device token already exists', { userId });
        return true;
      }

      const updatedTokens = [...currentTokens, deviceToken];
      
      return await this.updateDeviceTokens(userId, updatedTokens);

    } catch (error) {
      logger.error('Failed to add device token', { userId, error });
      return false;
    }
  }

  async removeDeviceToken(userId: string, deviceToken: string): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (!preferences?.push?.deviceTokens) {
        return true; // Nothing to remove
      }

      const updatedTokens = preferences.push.deviceTokens.filter(token => token !== deviceToken);
      
      return await this.updateDeviceTokens(userId, updatedTokens);

    } catch (error) {
      logger.error('Failed to remove device token', { userId, error });
      return false;
    }
  }

  async updateNotificationTypePreference(
    userId: string,
    notificationType: NotificationType,
    enabled: boolean
  ): Promise<boolean> {
    try {
      const preferences = await this.getUserPreferences(userId);
      if (!preferences) {
        const typePrefs = { [notificationType]: enabled };
        return await this.createUserPreferences(userId, { preferences: typePrefs });
      }

      const updatedTypePrefs = {
        ...preferences.preferences,
        [notificationType]: enabled
      };

      return await this.updateUserPreferences(userId, {
        preferences: updatedTypePrefs
      });

    } catch (error) {
      logger.error('Failed to update notification type preference', {
        userId,
        notificationType,
        enabled,
        error
      });
      return false;
    }
  }

  async verifyContactMethod(
    userId: string,
    method: 'email' | 'sms',
    verified: boolean
  ): Promise<boolean> {
    try {
      const updateData: Partial<UserNotificationPreferences> = {};
      
      if (method === 'email') {
        updateData.email = { enabled: true, verified, address: '' };
      } else if (method === 'sms') {
        updateData.sms = { enabled: true, verified, phoneNumber: '' };
      }

      return await this.updateUserPreferences(userId, updateData);

    } catch (error) {
      logger.error('Failed to verify contact method', { userId, method, error });
      return false;
    }
  }

  async deleteUserPreferences(userId: string): Promise<boolean> {
    try {
      const query = `
        DELETE FROM user_notification_preferences 
        WHERE user_id = $1
        RETURNING id
      `;

      const result = await database.query(query, [userId]);
      
      logger.info('User preferences deleted', {
        userId,
        deleted: result.rowCount > 0
      });

      return result.rowCount > 0;

    } catch (error) {
      logger.error('Failed to delete user preferences', { userId, error });
      return false;
    }
  }

  private mapToUserPreferences(row: any): UserNotificationPreferences {
    return {
      userId: row.user_id,
      email: {
        enabled: row.email_enabled,
        address: row.email_address,
        verified: row.email_verified
      },
      sms: {
        enabled: row.sms_enabled,
        phoneNumber: row.sms_phone_number,
        verified: row.sms_verified
      },
      push: {
        enabled: row.push_enabled,
        deviceTokens: Array.isArray(row.push_device_tokens) 
          ? row.push_device_tokens 
          : JSON.parse(row.push_device_tokens || '[]')
      },
      inApp: {
        enabled: row.in_app_enabled
      },
      quietHours: row.quiet_hours_enabled ? {
        enabled: row.quiet_hours_enabled,
        startTime: row.quiet_hours_start,
        endTime: row.quiet_hours_end,
        timezone: row.quiet_hours_timezone
      } : undefined,
      preferences: typeof row.type_preferences === 'string' 
        ? JSON.parse(row.type_preferences) 
        : row.type_preferences,
      emergencyOverride: row.emergency_override
    };
  }

  private getDefaultPreferences(userId: string): UserNotificationPreferences {
    return {
      userId,
      email: {
        enabled: true,
        address: '',
        verified: false
      },
      sms: {
        enabled: true,
        phoneNumber: '',
        verified: false
      },
      push: {
        enabled: true,
        deviceTokens: []
      },
      inApp: {
        enabled: true
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC'
      },
      preferences: {
        [NotificationType.CRISIS_ALERT]: true,
        [NotificationType.CHECKIN_REMINDER]: true,
        [NotificationType.APPOINTMENT_REMINDER]: true,
        [NotificationType.MEDICATION_REMINDER]: true,
        [NotificationType.MILESTONE_CELEBRATION]: true,
        [NotificationType.SUPPORT_MESSAGE]: true,
        [NotificationType.SYSTEM_NOTIFICATION]: true,
        [NotificationType.SECURITY_ALERT]: true,
        [NotificationType.BACKUP_NOTIFICATION]: false
      },
      emergencyOverride: true
    };
  }

  private isValidDeviceToken(token: string): boolean {
    // Basic validation for FCM tokens
    return typeof token === 'string' && 
           token.length >= 140 && 
           /^[A-Za-z0-9_-]+$/.test(token);
  }

  private maskToken(token: string): string {
    if (token.length <= 8) {
      return token.replace(/./g, '*');
    }
    return token.substring(0, 4) + '***' + token.substring(token.length - 4);
  }

  // Bulk operations for admin use
  async getBulkUserPreferences(userIds: string[]): Promise<Record<string, UserNotificationPreferences | null>> {
    try {
      const query = `
        SELECT * FROM user_notification_preferences 
        WHERE user_id = ANY($1)
      `;

      const result = await database.query(query, [userIds]);
      const preferencesMap: Record<string, UserNotificationPreferences | null> = {};

      // Initialize all users with null
      userIds.forEach(userId => {
        preferencesMap[userId] = null;
      });

      // Map found preferences
      result.rows.forEach(row => {
        preferencesMap[row.user_id] = this.mapToUserPreferences(row);
      });

      return preferencesMap;

    } catch (error) {
      logger.error('Failed to get bulk user preferences', { userIds, error });
      return {};
    }
  }
}

export const userPreferencesService = new UserPreferencesService();