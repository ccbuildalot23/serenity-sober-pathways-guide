import cron from 'node-cron';
import { database } from '@/models/database';
import { notificationModel } from '@/models/NotificationModel';
import { emailService } from './channels/EmailService';
import { smsService } from './channels/SMSService';
import { pushService } from './channels/PushService';
import { logger, auditLogger } from '@/utils/logger';
import { 
  NotificationStatus, 
  NotificationChannel, 
  DeliveryStatus,
  NotificationLog 
} from '@/types';

export class DeliveryTracker {
  private isRunning = false;
  private cronJobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    this.setupCronJobs();
  }

  private setupCronJobs(): void {
    // Check delivery status every 5 minutes
    const deliveryCheckJob = cron.schedule('*/5 * * * *', async () => {
      if (!this.isRunning) {
        this.isRunning = true;
        try {
          await this.checkPendingDeliveries();
        } finally {
          this.isRunning = false;
        }
      }
    }, { scheduled: false });

    // Retry failed notifications every 10 minutes
    const retryJob = cron.schedule('*/10 * * * *', async () => {
      try {
        await this.processRetries();
      } catch (error) {
        logger.error('Error in retry job', { error });
      }
    }, { scheduled: false });

    // Clean up old delivery status records daily
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      try {
        await this.cleanupOldRecords();
      } catch (error) {
        logger.error('Error in cleanup job', { error });
      }
    }, { scheduled: false });

    this.cronJobs.set('deliveryCheck', deliveryCheckJob);
    this.cronJobs.set('retry', retryJob);
    this.cronJobs.set('cleanup', cleanupJob);

    logger.info('Delivery tracking cron jobs configured');
  }

  async start(): Promise<void> {
    this.cronJobs.forEach((job, name) => {
      job.start();
      logger.info(`Started cron job: ${name}`);
    });
  }

  async stop(): Promise<void> {
    this.cronJobs.forEach((job, name) => {
      job.stop();
      logger.info(`Stopped cron job: ${name}`);
    });
  }

  async trackDelivery(notificationId: string, channel: NotificationChannel): Promise<void> {
    try {
      const notification = await notificationModel.findById(notificationId);
      if (!notification) {
        logger.warn('Notification not found for delivery tracking', { notificationId });
        return;
      }

      // Create initial delivery status record
      await this.createDeliveryStatus(notification, channel);

      // Start tracking based on channel
      switch (channel) {
        case NotificationChannel.EMAIL:
          await this.trackEmailDelivery(notification);
          break;
        case NotificationChannel.SMS:
          await this.trackSMSDelivery(notification);
          break;
        case NotificationChannel.PUSH:
          await this.trackPushDelivery(notification);
          break;
        case NotificationChannel.IN_APP:
          // In-app notifications are delivered immediately
          await this.updateDeliveryStatus(notificationId, NotificationStatus.DELIVERED);
          break;
        default:
          logger.warn('Unknown channel for delivery tracking', { channel, notificationId });
      }

    } catch (error) {
      logger.error('Error tracking delivery', { notificationId, channel, error });
    }
  }

  private async createDeliveryStatus(
    notification: NotificationLog, 
    channel: NotificationChannel
  ): Promise<void> {
    const query = `
      INSERT INTO delivery_status (
        notification_log_id, status, channel, attempts, 
        last_attempt_at, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW(), NOW())
    `;

    const values = [
      notification.id,
      NotificationStatus.PROCESSING,
      channel,
      1
    ];

    try {
      await database.query(query, values);
      logger.debug('Delivery status record created', {
        notificationId: notification.id,
        channel
      });
    } catch (error) {
      logger.error('Failed to create delivery status', {
        notificationId: notification.id,
        channel,
        error
      });
    }
  }

  private async updateDeliveryStatus(
    notificationId: string,
    status: NotificationStatus,
    errorDetails?: any,
    deliveryMetrics?: any
  ): Promise<void> {
    const updateFields = ['status = $2', 'updated_at = NOW()'];
    const values = [notificationId, status];
    let paramIndex = 3;

    if (errorDetails) {
      updateFields.push(`error_details = $${paramIndex}`);
      values.push(JSON.stringify(errorDetails));
      paramIndex++;
    }

    if (deliveryMetrics) {
      updateFields.push(`delivery_metrics = $${paramIndex}`);
      values.push(JSON.stringify(deliveryMetrics));
      paramIndex++;
    }

    const query = `
      UPDATE delivery_status 
      SET ${updateFields.join(', ')}
      WHERE notification_log_id = $1
      RETURNING id
    `;

    try {
      const result = await database.query(query, values);
      if (result.rowCount > 0) {
        // Also update the main notification status
        await notificationModel.updateStatus(notificationId, status);
        
        logger.debug('Delivery status updated', {
          notificationId,
          status,
          hasError: !!errorDetails
        });
      }
    } catch (error) {
      logger.error('Failed to update delivery status', {
        notificationId,
        status,
        error
      });
    }
  }

  private async trackEmailDelivery(notification: NotificationLog): Promise<void> {
    try {
      // For email, we rely on webhooks or periodic status checks
      // This is a placeholder for actual email delivery tracking
      
      // Simulate delivery tracking with a timeout
      setTimeout(async () => {
        try {
          // Check if email was delivered (this would be real logic in production)
          const delivered = Math.random() > 0.1; // 90% success rate for simulation
          
          if (delivered) {
            await this.updateDeliveryStatus(
              notification.id, 
              NotificationStatus.DELIVERED,
              undefined,
              {
                deliveryTime: Date.now() - notification.createdAt.getTime(),
                provider: 'sendgrid'
              }
            );
          } else {
            await this.updateDeliveryStatus(
              notification.id,
              NotificationStatus.FAILED,
              { reason: 'Email delivery failed', code: 'DELIVERY_FAILURE' }
            );
          }
        } catch (error) {
          logger.error('Error in email delivery tracking timeout', { 
            notificationId: notification.id, 
            error 
          });
        }
      }, 30000); // Check after 30 seconds

    } catch (error) {
      logger.error('Error setting up email delivery tracking', {
        notificationId: notification.id,
        error
      });
    }
  }

  private async trackSMSDelivery(notification: NotificationLog): Promise<void> {
    try {
      // For SMS, we can use Twilio's status callbacks
      // This would typically be handled by webhooks, but we'll simulate it here
      
      setTimeout(async () => {
        try {
          // In real implementation, this would query Twilio's API
          const delivered = Math.random() > 0.05; // 95% success rate for simulation
          
          if (delivered) {
            await this.updateDeliveryStatus(
              notification.id,
              NotificationStatus.DELIVERED,
              undefined,
              {
                deliveryTime: Date.now() - notification.createdAt.getTime(),
                provider: 'twilio'
              }
            );
          } else {
            await this.updateDeliveryStatus(
              notification.id,
              NotificationStatus.FAILED,
              { reason: 'SMS delivery failed', code: 'DELIVERY_FAILURE' }
            );
          }
        } catch (error) {
          logger.error('Error in SMS delivery tracking timeout', {
            notificationId: notification.id,
            error
          });
        }
      }, 10000); // Check after 10 seconds

    } catch (error) {
      logger.error('Error setting up SMS delivery tracking', {
        notificationId: notification.id,
        error
      });
    }
  }

  private async trackPushDelivery(notification: NotificationLog): Promise<void> {
    try {
      // For push notifications, FCM provides delivery receipts
      // This would be handled by FCM callbacks in real implementation
      
      setTimeout(async () => {
        try {
          const delivered = Math.random() > 0.15; // 85% success rate for simulation
          
          if (delivered) {
            await this.updateDeliveryStatus(
              notification.id,
              NotificationStatus.DELIVERED,
              undefined,
              {
                deliveryTime: Date.now() - notification.createdAt.getTime(),
                provider: 'fcm'
              }
            );
          } else {
            await this.updateDeliveryStatus(
              notification.id,
              NotificationStatus.FAILED,
              { reason: 'Push delivery failed', code: 'DELIVERY_FAILURE' }
            );
          }
        } catch (error) {
          logger.error('Error in push delivery tracking timeout', {
            notificationId: notification.id,
            error
          });
        }
      }, 5000); // Check after 5 seconds

    } catch (error) {
      logger.error('Error setting up push delivery tracking', {
        notificationId: notification.id,
        error
      });
    }
  }

  private async checkPendingDeliveries(): Promise<void> {
    try {
      const query = `
        SELECT ds.*, nl.type, nl.channel, nl.created_at as notification_created_at
        FROM delivery_status ds
        JOIN notification_logs nl ON ds.notification_log_id = nl.id
        WHERE ds.status IN ('processing', 'sent')
          AND ds.last_attempt_at < NOW() - INTERVAL '10 minutes'
          AND ds.attempts < 5
        ORDER BY ds.created_at ASC
        LIMIT 100
      `;

      const result = await database.query(query);
      
      if (result.rows.length === 0) {
        return;
      }

      logger.info('Checking pending deliveries', { count: result.rows.length });

      for (const row of result.rows) {
        await this.recheckDeliveryStatus(row);
      }

    } catch (error) {
      logger.error('Error checking pending deliveries', { error });
    }
  }

  private async recheckDeliveryStatus(deliveryRow: any): Promise<void> {
    try {
      const notificationId = deliveryRow.notification_log_id;
      const channel = deliveryRow.channel;

      // Increment attempt count
      await database.query(`
        UPDATE delivery_status 
        SET attempts = attempts + 1, last_attempt_at = NOW()
        WHERE id = $1
      `, [deliveryRow.id]);

      // Check delivery status based on channel
      let isDelivered = false;
      let errorDetails: any = null;

      switch (channel) {
        case NotificationChannel.EMAIL:
          // Check email delivery status
          isDelivered = await this.checkEmailDeliveryStatus(notificationId);
          break;
        case NotificationChannel.SMS:
          // Check SMS delivery status
          const smsStatus = await this.checkSMSDeliveryStatus(notificationId);
          isDelivered = smsStatus.delivered;
          errorDetails = smsStatus.error;
          break;
        case NotificationChannel.PUSH:
          // Check push delivery status
          isDelivered = await this.checkPushDeliveryStatus(notificationId);
          break;
      }

      if (isDelivered) {
        await this.updateDeliveryStatus(
          notificationId,
          NotificationStatus.DELIVERED,
          undefined,
          {
            finalAttempt: deliveryRow.attempts + 1,
            recheckTime: new Date()
          }
        );
      } else if (deliveryRow.attempts >= 4) {
        // Max attempts reached
        await this.updateDeliveryStatus(
          notificationId,
          NotificationStatus.FAILED,
          errorDetails || { reason: 'Max delivery attempts exceeded' }
        );
      }

    } catch (error) {
      logger.error('Error rechecking delivery status', {
        deliveryId: deliveryRow.id,
        notificationId: deliveryRow.notification_log_id,
        error
      });
    }
  }

  private async checkEmailDeliveryStatus(notificationId: string): Promise<boolean> {
    try {
      // In real implementation, this would check with email provider
      // For now, we'll simulate it
      return Math.random() > 0.3; // 70% chance of being delivered on recheck
    } catch (error) {
      logger.error('Error checking email delivery status', { notificationId, error });
      return false;
    }
  }

  private async checkSMSDeliveryStatus(
    notificationId: string
  ): Promise<{ delivered: boolean; error?: any }> {
    try {
      // In real implementation, this would use Twilio's API
      const delivered = Math.random() > 0.2; // 80% chance of being delivered on recheck
      
      return {
        delivered,
        error: delivered ? undefined : { reason: 'SMS delivery confirmation failed' }
      };
    } catch (error) {
      logger.error('Error checking SMS delivery status', { notificationId, error });
      return { delivered: false, error: { reason: 'API error' } };
    }
  }

  private async checkPushDeliveryStatus(notificationId: string): Promise<boolean> {
    try {
      // In real implementation, this would check FCM delivery receipts
      return Math.random() > 0.4; // 60% chance of being delivered on recheck
    } catch (error) {
      logger.error('Error checking push delivery status', { notificationId, error });
      return false;
    }
  }

  private async processRetries(): Promise<void> {
    try {
      const query = `
        SELECT nl.*, ds.attempts, ds.next_retry_at
        FROM notification_logs nl
        JOIN delivery_status ds ON nl.id = ds.notification_log_id
        WHERE nl.status = 'failed'
          AND nl.retry_count < nl.max_retries
          AND (ds.next_retry_at IS NULL OR ds.next_retry_at <= NOW())
        ORDER BY nl.priority DESC, nl.created_at ASC
        LIMIT 50
      `;

      const result = await database.query(query);

      if (result.rows.length === 0) {
        return;
      }

      logger.info('Processing retries', { count: result.rows.length });

      for (const row of result.rows) {
        await this.scheduleRetry(row);
      }

    } catch (error) {
      logger.error('Error processing retries', { error });
    }
  }

  private async scheduleRetry(notificationRow: any): Promise<void> {
    try {
      const notificationId = notificationRow.id;
      const currentRetryCount = notificationRow.retry_count;
      
      // Calculate next retry delay (exponential backoff)
      const baseDelay = 60000; // 1 minute
      const maxDelay = 3600000; // 1 hour
      const delay = Math.min(baseDelay * Math.pow(2, currentRetryCount), maxDelay);
      const nextRetryAt = new Date(Date.now() + delay);

      // Update retry information
      await database.query(`
        UPDATE delivery_status 
        SET next_retry_at = $1, updated_at = NOW()
        WHERE notification_log_id = $2
      `, [nextRetryAt, notificationId]);

      await notificationModel.incrementRetryCount(notificationId);

      // Log retry scheduling
      auditLogger.info('Notification retry scheduled', {
        notificationId,
        retryCount: currentRetryCount + 1,
        nextRetryAt,
        delay
      });

      logger.info('Notification retry scheduled', {
        notificationId,
        retryCount: currentRetryCount + 1,
        delay
      });

    } catch (error) {
      logger.error('Error scheduling retry', {
        notificationId: notificationRow.id,
        error
      });
    }
  }

  private async cleanupOldRecords(): Promise<void> {
    try {
      const retentionDays = 30; // Keep delivery status for 30 days
      
      const result = await database.query(`
        DELETE FROM delivery_status 
        WHERE created_at < NOW() - INTERVAL '${retentionDays} days'
        RETURNING id
      `);

      logger.info('Cleaned up old delivery status records', {
        deletedCount: result.rowCount,
        retentionDays
      });

    } catch (error) {
      logger.error('Error cleaning up old records', { error });
    }
  }

  async getDeliveryStats(dateFrom: Date, dateTo: Date): Promise<any> {
    try {
      const query = `
        SELECT 
          ds.channel,
          ds.status,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (ds.updated_at - ds.created_at)) * 1000)::int as avg_delivery_time_ms,
          AVG(ds.attempts)::decimal(3,1) as avg_attempts
        FROM delivery_status ds
        WHERE ds.created_at >= $1 AND ds.created_at <= $2
        GROUP BY ds.channel, ds.status
        ORDER BY ds.channel, ds.status
      `;

      const result = await database.query(query, [dateFrom, dateTo]);
      
      return {
        stats: result.rows,
        dateRange: { from: dateFrom, to: dateTo },
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Error getting delivery stats', { dateFrom, dateTo, error });
      throw error;
    }
  }

  async getFailureAnalysis(dateFrom: Date, dateTo: Date): Promise<any> {
    try {
      const query = `
        SELECT 
          ds.channel,
          ds.error_details->>'reason' as failure_reason,
          ds.error_details->>'code' as error_code,
          COUNT(*) as failure_count,
          AVG(ds.attempts)::decimal(3,1) as avg_attempts_before_failure
        FROM delivery_status ds
        WHERE ds.status = 'failed'
          AND ds.created_at >= $1 AND ds.created_at <= $2
          AND ds.error_details IS NOT NULL
        GROUP BY ds.channel, ds.error_details->>'reason', ds.error_details->>'code'
        ORDER BY failure_count DESC
      `;

      const result = await database.query(query, [dateFrom, dateTo]);
      
      return {
        failures: result.rows,
        dateRange: { from: dateFrom, to: dateTo },
        generatedAt: new Date()
      };

    } catch (error) {
      logger.error('Error getting failure analysis', { dateFrom, dateTo, error });
      throw error;
    }
  }
}

export const deliveryTracker = new DeliveryTracker();