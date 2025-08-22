import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { userPreferencesService } from '@/services/UserPreferencesService';
import { logger } from '@/utils/logger';
import { NotificationType, APIResponse } from '@/types';

export class UserPreferencesController {
  async getUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const preferences = await userPreferencesService.getUserPreferences(userId);

      if (!preferences) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PREFERENCES_NOT_FOUND',
            message: 'User preferences not found'
          }
        });
        return;
      }

      // Mask sensitive information for non-admin users
      if (req.user?.role !== 'admin' && req.user?.id !== userId) {
        delete preferences.email?.address;
        delete preferences.sms?.phoneNumber;
        preferences.push!.deviceTokens = [];
      }

      const response: APIResponse = {
        success: true,
        data: preferences,
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to get user preferences', {
        userId: req.params.userId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PREFERENCES_RETRIEVAL_ERROR',
          message: 'Failed to retrieve user preferences'
        }
      });
    }
  }

  async updateUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const preferences = req.body;

      const updated = await userPreferencesService.updateUserPreferences(userId, preferences);

      if (!updated) {
        res.status(500).json({
          success: false,
          error: {
            code: 'PREFERENCES_UPDATE_FAILED',
            message: 'Failed to update user preferences'
          }
        });
        return;
      }

      logger.info('User preferences updated successfully', {
        userId,
        updatedFields: Object.keys(preferences),
        updatedBy: req.user?.id
      });

      const response: APIResponse = {
        success: true,
        data: {
          message: 'User preferences updated successfully',
          userId,
          updatedAt: new Date()
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to update user preferences', {
        userId: req.params.userId,
        preferences: req.body,
        error: error.message,
        updatedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PREFERENCES_UPDATE_ERROR',
          message: 'Failed to update user preferences'
        }
      });
    }
  }

  async addDeviceToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { deviceToken } = req.body;

      const added = await userPreferencesService.addDeviceToken(userId, deviceToken);

      if (!added) {
        res.status(400).json({
          success: false,
          error: {
            code: 'DEVICE_TOKEN_ADD_FAILED',
            message: 'Failed to add device token'
          }
        });
        return;
      }

      logger.info('Device token added successfully', {
        userId,
        tokenAdded: true,
        addedBy: req.user?.id
      });

      const response: APIResponse = {
        success: true,
        data: {
          message: 'Device token added successfully',
          userId
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to add device token', {
        userId: req.params.userId,
        error: error.message,
        addedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'DEVICE_TOKEN_ADD_ERROR',
          message: 'Failed to add device token'
        }
      });
    }
  }

  async removeDeviceToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { deviceToken } = req.body;

      const removed = await userPreferencesService.removeDeviceToken(userId, deviceToken);

      if (!removed) {
        res.status(400).json({
          success: false,
          error: {
            code: 'DEVICE_TOKEN_REMOVE_FAILED',
            message: 'Failed to remove device token'
          }
        });
        return;
      }

      logger.info('Device token removed successfully', {
        userId,
        tokenRemoved: true,
        removedBy: req.user?.id
      });

      const response: APIResponse = {
        success: true,
        data: {
          message: 'Device token removed successfully',
          userId
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to remove device token', {
        userId: req.params.userId,
        error: error.message,
        removedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'DEVICE_TOKEN_REMOVE_ERROR',
          message: 'Failed to remove device token'
        }
      });
    }
  }

  async updateNotificationTypePreference(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, type } = req.params;
      const { enabled } = req.body;

      if (typeof enabled !== 'boolean') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_ENABLED_VALUE',
            message: 'enabled must be a boolean value'
          }
        });
        return;
      }

      const updated = await userPreferencesService.updateNotificationTypePreference(
        userId,
        type as NotificationType,
        enabled
      );

      if (!updated) {
        res.status(500).json({
          success: false,
          error: {
            code: 'TYPE_PREFERENCE_UPDATE_FAILED',
            message: 'Failed to update notification type preference'
          }
        });
        return;
      }

      logger.info('Notification type preference updated', {
        userId,
        type,
        enabled,
        updatedBy: req.user?.id
      });

      const response: APIResponse = {
        success: true,
        data: {
          message: 'Notification type preference updated successfully',
          userId,
          type,
          enabled
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to update notification type preference', {
        userId: req.params.userId,
        type: req.params.type,
        enabled: req.body.enabled,
        error: error.message,
        updatedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'TYPE_PREFERENCE_UPDATE_ERROR',
          message: 'Failed to update notification type preference'
        }
      });
    }
  }

  async verifyContactMethod(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId, method } = req.params;
      const { verified } = req.body;

      if (!['email', 'sms'].includes(method)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_CONTACT_METHOD',
            message: 'method must be either email or sms'
          }
        });
        return;
      }

      if (typeof verified !== 'boolean') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_VERIFIED_VALUE',
            message: 'verified must be a boolean value'
          }
        });
        return;
      }

      const updated = await userPreferencesService.verifyContactMethod(
        userId,
        method as 'email' | 'sms',
        verified
      );

      if (!updated) {
        res.status(500).json({
          success: false,
          error: {
            code: 'CONTACT_VERIFICATION_FAILED',
            message: 'Failed to verify contact method'
          }
        });
        return;
      }

      logger.info('Contact method verification updated', {
        userId,
        method,
        verified,
        updatedBy: req.user?.id
      });

      const response: APIResponse = {
        success: true,
        data: {
          message: 'Contact method verification updated successfully',
          userId,
          method,
          verified
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to verify contact method', {
        userId: req.params.userId,
        method: req.params.method,
        verified: req.body.verified,
        error: error.message,
        updatedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'CONTACT_VERIFICATION_ERROR',
          message: 'Failed to verify contact method'
        }
      });
    }
  }

  async deleteUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const deleted = await userPreferencesService.deleteUserPreferences(userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PREFERENCES_NOT_FOUND',
            message: 'User preferences not found'
          }
        });
        return;
      }

      logger.info('User preferences deleted successfully', {
        userId,
        deletedBy: req.user?.id
      });

      const response: APIResponse = {
        success: true,
        data: {
          message: 'User preferences deleted successfully',
          userId
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to delete user preferences', {
        userId: req.params.userId,
        error: error.message,
        deletedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PREFERENCES_DELETE_ERROR',
          message: 'Failed to delete user preferences'
        }
      });
    }
  }

  async getBulkUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userIds } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_USER_IDS',
            message: 'userIds must be a non-empty array'
          }
        });
        return;
      }

      if (userIds.length > 100) {
        res.status(400).json({
          success: false,
          error: {
            code: 'TOO_MANY_USER_IDS',
            message: 'Maximum 100 user IDs allowed per request'
          }
        });
        return;
      }

      const preferencesMap = await userPreferencesService.getBulkUserPreferences(userIds);

      const response: APIResponse = {
        success: true,
        data: {
          preferences: preferencesMap,
          totalRequested: userIds.length,
          totalFound: Object.values(preferencesMap).filter(p => p !== null).length
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to get bulk user preferences', {
        userIds: req.body.userIds,
        error: error.message,
        requestedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_PREFERENCES_ERROR',
          message: 'Failed to retrieve bulk user preferences'
        }
      });
    }
  }

  async exportUserPreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { format = 'json' } = req.query;

      const preferences = await userPreferencesService.getUserPreferences(userId);

      if (!preferences) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PREFERENCES_NOT_FOUND',
            message: 'User preferences not found'
          }
        });
        return;
      }

      // Remove sensitive information
      const exportData = {
        ...preferences,
        email: preferences.email ? {
          enabled: preferences.email.enabled,
          verified: preferences.email.verified
        } : undefined,
        sms: preferences.sms ? {
          enabled: preferences.sms.enabled,
          verified: preferences.sms.verified
        } : undefined,
        push: preferences.push ? {
          enabled: preferences.push.enabled,
          deviceCount: preferences.push.deviceTokens?.length || 0
        } : undefined
      };

      logger.info('User preferences exported', {
        userId,
        format,
        exportedBy: req.user?.id
      });

      if (format === 'json') {
        res.json({
          success: true,
          data: exportData,
          meta: {
            timestamp: new Date(),
            requestId: req.headers['x-request-id'] as string || 'unknown',
            version: '1.0.0'
          }
        });
      } else {
        res.status(400).json({
          success: false,
          error: {
            code: 'UNSUPPORTED_FORMAT',
            message: 'Only JSON format is currently supported'
          }
        });
      }

    } catch (error: any) {
      logger.error('Failed to export user preferences', {
        userId: req.params.userId,
        format: req.query.format,
        error: error.message,
        exportedBy: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'PREFERENCES_EXPORT_ERROR',
          message: 'Failed to export user preferences'
        }
      });
    }
  }
}

export const userPreferencesController = new UserPreferencesController();