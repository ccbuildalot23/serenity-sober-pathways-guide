import { Request, Response } from 'express';
import { AuthenticatedRequest } from '@/middleware/auth';
import { queueService } from '@/services/QueueService';
import { notificationModel } from '@/models/NotificationModel';
import { userPreferencesService } from '@/services/UserPreferencesService';
import { logger } from '@/utils/logger';
import { 
  NotificationRequest, 
  BulkNotificationRequest, 
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  APIResponse 
} from '@/types';

export class NotificationController {
  async sendNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const notificationData: NotificationRequest = {
        ...req.body,
        id: req.body.id || undefined,
        priority: req.body.priority || NotificationPriority.NORMAL,
        scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined
      };

      // Queue the notification for processing
      const queued = await queueService.queueNotification(notificationData);

      if (!queued) {
        res.status(503).json({
          success: false,
          error: {
            code: 'QUEUE_UNAVAILABLE',
            message: 'Unable to queue notification at this time'
          }
        });
        return;
      }

      logger.info('Notification queued for processing', {
        userId: notificationData.userId,
        type: notificationData.type,
        channel: notificationData.channel,
        priority: notificationData.priority,
        queuedBy: req.user?.id
      });

      const response: APIResponse = {
        success: true,
        data: {
          message: 'Notification queued successfully',
          notificationId: notificationData.id,
          estimatedDelivery: notificationData.scheduledAt || new Date()
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.status(202).json(response);

    } catch (error: any) {
      logger.error('Failed to send notification', {
        error: error.message,
        body: req.body,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'NOTIFICATION_SEND_ERROR',
          message: 'Failed to send notification'
        }
      });
    }
  }

  async sendBulkNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const bulkRequest: BulkNotificationRequest = {
        ...req.body,
        batchId: req.body.batchId || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // Queue the bulk notification for processing
      const queued = await queueService.queueBulkNotifications(bulkRequest);

      if (!queued) {
        res.status(503).json({
          success: false,
          error: {
            code: 'QUEUE_UNAVAILABLE',
            message: 'Unable to queue bulk notifications at this time'
          }
        });
        return;
      }

      logger.info('Bulk notifications queued for processing', {
        batchId: bulkRequest.batchId,
        count: bulkRequest.notifications.length,
        scheduleMode: bulkRequest.scheduleMode,
        queuedBy: req.user?.id
      });

      const response: APIResponse = {
        success: true,
        data: {
          message: 'Bulk notifications queued successfully',
          batchId: bulkRequest.batchId,
          notificationCount: bulkRequest.notifications.length,
          scheduleMode: bulkRequest.scheduleMode
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.status(202).json(response);

    } catch (error: any) {
      logger.error('Failed to send bulk notifications', {
        error: error.message,
        body: req.body,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'BULK_NOTIFICATION_ERROR',
          message: 'Failed to send bulk notifications'
        }
      });
    }
  }

  async getNotificationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const notification = await notificationModel.findById(id);

      if (!notification) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOTIFICATION_NOT_FOUND',
            message: 'Notification not found'
          }
        });
        return;
      }

      const response: APIResponse = {
        success: true,
        data: {
          id: notification.id,
          status: notification.status,
          type: notification.type,
          channel: notification.channel,
          priority: notification.priority,
          createdAt: notification.createdAt,
          scheduledAt: notification.scheduledAt,
          sentAt: notification.sentAt,
          deliveredAt: notification.deliveredAt,
          failedAt: notification.failedAt,
          errorMessage: notification.errorMessage,
          retryCount: notification.retryCount,
          maxRetries: notification.maxRetries,
          isHipaaCompliant: notification.isHipaaCompliant
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to get notification status', {
        id: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'STATUS_RETRIEVAL_ERROR',
          message: 'Failed to retrieve notification status'
        }
      });
    }
  }

  async getUserNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const {
        page = '1',
        limit = '20',
        type,
        channel,
        status,
        dateFrom,
        dateTo
      } = req.query;

      const filters: any = {};
      if (type) filters.type = type as NotificationType;
      if (channel) filters.channel = channel as NotificationChannel;
      if (status) filters.status = status as string;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);

      const result = await notificationModel.findByUserId(
        userId,
        parseInt(page as string),
        parseInt(limit as string),
        filters
      );

      if (!result.success) {
        res.status(500).json(result);
        return;
      }

      res.json(result);

    } catch (error: any) {
      logger.error('Failed to get user notifications', {
        userId: req.params.userId,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'USER_NOTIFICATIONS_ERROR',
          message: 'Failed to retrieve user notifications'
        }
      });
    }
  }

  async markNotificationAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'User authentication required'
          }
        });
        return;
      }

      const updated = await notificationModel.markAsRead(id, userId);

      if (!updated) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOTIFICATION_NOT_FOUND',
            message: 'Notification not found or not accessible'
          }
        });
        return;
      }

      logger.info('Notification marked as read', {
        notificationId: id,
        userId
      });

      const response: APIResponse = {
        success: true,
        data: {
          message: 'Notification marked as read',
          readAt: new Date()
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to mark notification as read', {
        id: req.params.id,
        userId: req.user?.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'MARK_READ_ERROR',
          message: 'Failed to mark notification as read'
        }
      });
    }
  }

  async getNotificationMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { dateFrom, dateTo, groupBy } = req.query;

      if (!dateFrom || !dateTo) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_DATE_RANGE',
            message: 'dateFrom and dateTo are required'
          }
        });
        return;
      }

      const metrics = await notificationModel.getMetrics(
        new Date(dateFrom as string),
        new Date(dateTo as string),
        groupBy as 'hour' | 'day' | 'type' | 'channel' | undefined
      );

      const response: APIResponse = {
        success: true,
        data: {
          metrics,
          dateRange: {
            from: dateFrom,
            to: dateTo
          },
          groupBy: groupBy || 'none'
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to get notification metrics', {
        query: req.query,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to retrieve notification metrics'
        }
      });
    }
  }

  async retryNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const notification = await notificationModel.findById(id);

      if (!notification) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOTIFICATION_NOT_FOUND',
            message: 'Notification not found'
          }
        });
        return;
      }

      if (notification.status !== 'failed') {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Only failed notifications can be retried'
          }
        });
        return;
      }

      if (notification.retryCount >= notification.maxRetries) {
        res.status(400).json({
          success: false,
          error: {
            code: 'MAX_RETRIES_EXCEEDED',
            message: 'Maximum retry attempts exceeded'
          }
        });
        return;
      }

      // Create a new notification request for retry
      const retryRequest: NotificationRequest = {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        channel: notification.channel,
        templateId: notification.templateId,
        data: notification.data,
        priority: notification.priority,
        retryCount: notification.retryCount,
        maxRetries: notification.maxRetries,
        metadata: {
          ...notification.metadata,
          retryBy: req.user?.id,
          retryAt: new Date().toISOString()
        }
      };

      const queued = await queueService.queueNotification(retryRequest);

      if (!queued) {
        res.status(503).json({
          success: false,
          error: {
            code: 'QUEUE_UNAVAILABLE',
            message: 'Unable to queue retry at this time'
          }
        });
        return;
      }

      logger.info('Notification retry queued', {
        notificationId: id,
        retryCount: notification.retryCount + 1,
        retriedBy: req.user?.id
      });

      const response: APIResponse = {
        success: true,
        data: {
          message: 'Notification retry queued successfully',
          notificationId: id,
          retryCount: notification.retryCount + 1
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to retry notification', {
        id: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'RETRY_ERROR',
          message: 'Failed to retry notification'
        }
      });
    }
  }

  async cancelNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const notification = await notificationModel.findById(id);

      if (!notification) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOTIFICATION_NOT_FOUND',
            message: 'Notification not found'
          }
        });
        return;
      }

      if (!['pending', 'queued', 'processing'].includes(notification.status)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: 'Only pending, queued, or processing notifications can be cancelled'
          }
        });
        return;
      }

      const updated = await notificationModel.updateStatus(
        id,
        'cancelled',
        `Cancelled by user ${req.user?.id}`
      );

      if (!updated) {
        res.status(500).json({
          success: false,
          error: {
            code: 'CANCEL_FAILED',
            message: 'Failed to cancel notification'
          }
        });
        return;
      }

      logger.info('Notification cancelled', {
        notificationId: id,
        cancelledBy: req.user?.id
      });

      const response: APIResponse = {
        success: true,
        data: {
          message: 'Notification cancelled successfully',
          notificationId: id,
          cancelledAt: new Date()
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.json(response);

    } catch (error: any) {
      logger.error('Failed to cancel notification', {
        id: req.params.id,
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'CANCEL_ERROR',
          message: 'Failed to cancel notification'
        }
      });
    }
  }
}

export const notificationController = new NotificationController();