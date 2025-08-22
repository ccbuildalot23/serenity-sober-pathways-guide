import { 
  NotificationRequest, 
  BulkNotificationRequest, 
  NotificationChannel, 
  NotificationStatus,
  NotificationType,
  EmailPayload,
  SMSPayload,
  PushPayload,
  InAppPayload
} from '@/types';
import { logger } from '@/utils/logger';
import { notificationModel } from '@/models/NotificationModel';
import { EmailService } from './channels/EmailService';
import { SMSService } from './channels/SMSService';
import { PushService } from './channels/PushService';
import { InAppService } from './channels/InAppService';
import { TemplateService } from './TemplateService';
import { UserPreferencesService } from './UserPreferencesService';

export class NotificationProcessor {
  private emailService: EmailService;
  private smsService: SMSService;
  private pushService: PushService;
  private inAppService: InAppService;
  private templateService: TemplateService;
  private userPreferencesService: UserPreferencesService;

  constructor() {
    this.emailService = new EmailService();
    this.smsService = new SMSService();
    this.pushService = new PushService();
    this.inAppService = new InAppService();
    this.templateService = new TemplateService();
    this.userPreferencesService = new UserPreferencesService();
  }

  async processNotification(notification: NotificationRequest): Promise<boolean> {
    try {
      // Create notification record
      const notificationLog = await notificationModel.create(notification);
      
      // Update status to processing
      await notificationModel.updateStatus(notificationLog.id, NotificationStatus.PROCESSING);

      logger.info('Processing notification', {
        id: notificationLog.id,
        userId: notification.userId,
        type: notification.type,
        channel: notification.channel
      });

      // Check user preferences and quiet hours
      const canSend = await this.checkUserPreferences(notification);
      if (!canSend.allowed) {
        logger.info('Notification blocked by user preferences', {
          id: notificationLog.id,
          reason: canSend.reason
        });
        
        await notificationModel.updateStatus(
          notificationLog.id, 
          NotificationStatus.CANCELLED,
          canSend.reason
        );
        return true; // Return true as this is expected behavior
      }

      // Get and render template
      const template = await this.templateService.getTemplate(notification.templateId);
      if (!template) {
        throw new Error(`Template not found: ${notification.templateId}`);
      }

      const renderedContent = await this.templateService.renderTemplate(
        template,
        notification.data
      );

      // Determine if this is HIPAA compliant
      const isHipaaCompliant = this.isHipaaCompliantType(notification.type);

      // Send notification based on channel
      let success = false;
      let errorMessage: string | undefined;

      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          const emailResult = await this.sendEmail(notification, renderedContent, isHipaaCompliant);
          success = emailResult.success;
          errorMessage = emailResult.error;
          break;

        case NotificationChannel.SMS:
          const smsResult = await this.sendSMS(notification, renderedContent, isHipaaCompliant);
          success = smsResult.success;
          errorMessage = smsResult.error;
          break;

        case NotificationChannel.PUSH:
          const pushResult = await this.sendPush(notification, renderedContent, isHipaaCompliant);
          success = pushResult.success;
          errorMessage = pushResult.error;
          break;

        case NotificationChannel.IN_APP:
          const inAppResult = await this.sendInApp(notification, renderedContent, isHipaaCompliant);
          success = inAppResult.success;
          errorMessage = inAppResult.error;
          break;

        default:
          throw new Error(`Unsupported notification channel: ${notification.channel}`);
      }

      // Update notification status
      if (success) {
        await notificationModel.updateStatus(notificationLog.id, NotificationStatus.SENT);
        
        // For some channels, we might want to wait for delivery confirmation
        // This would be handled by webhooks or polling mechanisms
        
        logger.info('Notification sent successfully', {
          id: notificationLog.id,
          channel: notification.channel
        });
      } else {
        await notificationModel.updateStatus(
          notificationLog.id, 
          NotificationStatus.FAILED,
          errorMessage
        );
        
        logger.error('Notification failed to send', {
          id: notificationLog.id,
          channel: notification.channel,
          error: errorMessage
        });
      }

      return success;

    } catch (error: any) {
      logger.error('Error processing notification', {
        notification,
        error: error.message
      });
      
      // Try to update status if we have an ID
      if (notification.id) {
        try {
          await notificationModel.updateStatus(
            notification.id,
            NotificationStatus.FAILED,
            error.message
          );
        } catch (updateError) {
          logger.error('Failed to update notification status after error', { updateError });
        }
      }

      return false;
    }
  }

  async processBulkNotification(bulkRequest: BulkNotificationRequest): Promise<boolean> {
    try {
      logger.info('Processing bulk notification', {
        batchId: bulkRequest.batchId,
        count: bulkRequest.notifications.length,
        scheduleMode: bulkRequest.scheduleMode
      });

      let successCount = 0;
      let failureCount = 0;

      switch (bulkRequest.scheduleMode) {
        case 'immediate':
          // Process all notifications immediately in parallel
          const results = await Promise.allSettled(
            bulkRequest.notifications.map(notification => 
              this.processNotification(notification)
            )
          );

          results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
              successCount++;
            } else {
              failureCount++;
              logger.error('Bulk notification item failed', {
                index,
                batchId: bulkRequest.batchId,
                error: result.status === 'rejected' ? result.reason : 'Processing failed'
              });
            }
          });
          break;

        case 'staggered':
          // Process notifications with delays between them
          const delay = bulkRequest.staggerDelayMs || 1000;
          
          for (let i = 0; i < bulkRequest.notifications.length; i++) {
            try {
              const success = await this.processNotification(bulkRequest.notifications[i]);
              if (success) {
                successCount++;
              } else {
                failureCount++;
              }
              
              // Add delay between notifications (except for the last one)
              if (i < bulkRequest.notifications.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            } catch (error) {
              logger.error('Staggered bulk notification item failed', {
                index: i,
                batchId: bulkRequest.batchId,
                error
              });
              failureCount++;
            }
          }
          break;

        case 'scheduled':
          // For scheduled mode, we would typically queue each notification
          // with its individual scheduled time
          for (const notification of bulkRequest.notifications) {
            try {
              const success = await this.processNotification(notification);
              if (success) {
                successCount++;
              } else {
                failureCount++;
              }
            } catch (error) {
              logger.error('Scheduled bulk notification item failed', {
                batchId: bulkRequest.batchId,
                error
              });
              failureCount++;
            }
          }
          break;

        default:
          throw new Error(`Invalid schedule mode: ${bulkRequest.scheduleMode}`);
      }

      logger.info('Bulk notification processing completed', {
        batchId: bulkRequest.batchId,
        totalCount: bulkRequest.notifications.length,
        successCount,
        failureCount,
        successRate: `${((successCount / bulkRequest.notifications.length) * 100).toFixed(2)}%`
      });

      return successCount > 0;

    } catch (error: any) {
      logger.error('Error processing bulk notification', {
        batchId: bulkRequest.batchId,
        error: error.message
      });
      return false;
    }
  }

  private async sendEmail(
    notification: NotificationRequest,
    content: { subject: string; body: string; htmlBody?: string },
    isHipaaCompliant: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user email from preferences
      const userPrefs = await this.userPreferencesService.getUserPreferences(notification.userId);
      if (!userPrefs?.email?.address || !userPrefs.email.enabled) {
        return { success: false, error: 'User email not available or disabled' };
      }

      const emailPayload: EmailPayload = {
        to: userPrefs.email.address,
        from: '', // Will be set by EmailService
        subject: content.subject,
        text: content.body,
        html: content.htmlBody
      };

      return await this.emailService.sendEmail(emailPayload, isHipaaCompliant);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async sendSMS(
    notification: NotificationRequest,
    content: { body: string },
    isHipaaCompliant: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user phone from preferences
      const userPrefs = await this.userPreferencesService.getUserPreferences(notification.userId);
      if (!userPrefs?.sms?.phoneNumber || !userPrefs.sms.enabled) {
        return { success: false, error: 'User phone number not available or SMS disabled' };
      }

      const smsPayload: SMSPayload = {
        to: userPrefs.sms.phoneNumber,
        from: '', // Will be set by SMSService
        body: content.body
      };

      return await this.smsService.sendSMS(smsPayload, isHipaaCompliant);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async sendPush(
    notification: NotificationRequest,
    content: { subject?: string; body: string },
    isHipaaCompliant: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user device tokens from preferences
      const userPrefs = await this.userPreferencesService.getUserPreferences(notification.userId);
      if (!userPrefs?.push?.deviceTokens?.length || !userPrefs.push.enabled) {
        return { success: false, error: 'User device tokens not available or push disabled' };
      }

      const pushPayload: PushPayload = {
        deviceTokens: userPrefs.push.deviceTokens,
        title: content.subject || 'Serenity Notification',
        body: content.body,
        data: notification.data
      };

      return await this.pushService.sendPushNotification(pushPayload, isHipaaCompliant);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async sendInApp(
    notification: NotificationRequest,
    content: { subject?: string; body: string },
    isHipaaCompliant: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const inAppPayload: InAppPayload = {
        userId: notification.userId,
        title: content.subject || 'Serenity Notification',
        message: content.body,
        data: {
          ...notification.data,
          notificationId: notification.id
        }
      };

      return await this.inAppService.sendInAppNotification(inAppPayload, isHipaaCompliant);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  private async checkUserPreferences(notification: NotificationRequest): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    try {
      const userPrefs = await this.userPreferencesService.getUserPreferences(notification.userId);
      
      if (!userPrefs) {
        return { allowed: true }; // Default to allow if no preferences set
      }

      // Check if notification type is enabled
      if (!userPrefs.preferences[notification.type]) {
        return { 
          allowed: false, 
          reason: `Notification type ${notification.type} disabled by user` 
        };
      }

      // Check quiet hours (unless emergency override is enabled)
      if (userPrefs.quietHours?.enabled && !userPrefs.emergencyOverride) {
        const now = new Date();
        const currentTime = now.toTimeString().substring(0, 5); // HH:MM format
        
        if (userPrefs.quietHours.startTime && userPrefs.quietHours.endTime) {
          const isInQuietHours = this.isTimeInRange(
            currentTime,
            userPrefs.quietHours.startTime,
            userPrefs.quietHours.endTime
          );
          
          if (isInQuietHours && !this.isEmergencyType(notification.type)) {
            return { 
              allowed: false, 
              reason: 'User is in quiet hours and notification is not emergency' 
            };
          }
        }
      }

      // Check channel-specific preferences
      switch (notification.channel) {
        case NotificationChannel.EMAIL:
          if (!userPrefs.email?.enabled) {
            return { allowed: false, reason: 'Email notifications disabled' };
          }
          break;
        case NotificationChannel.SMS:
          if (!userPrefs.sms?.enabled) {
            return { allowed: false, reason: 'SMS notifications disabled' };
          }
          break;
        case NotificationChannel.PUSH:
          if (!userPrefs.push?.enabled) {
            return { allowed: false, reason: 'Push notifications disabled' };
          }
          break;
        case NotificationChannel.IN_APP:
          if (!userPrefs.inApp?.enabled) {
            return { allowed: false, reason: 'In-app notifications disabled' };
          }
          break;
      }

      return { allowed: true };

    } catch (error) {
      logger.error('Error checking user preferences', { 
        userId: notification.userId, 
        error 
      });
      
      // Default to allow on error to ensure critical notifications get through
      return { allowed: true };
    }
  }

  private isTimeInRange(currentTime: string, startTime: string, endTime: string): boolean {
    const current = this.timeToMinutes(currentTime);
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);

    if (start <= end) {
      // Same day range (e.g., 09:00 - 17:00)
      return current >= start && current <= end;
    } else {
      // Overnight range (e.g., 22:00 - 06:00)
      return current >= start || current <= end;
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private isEmergencyType(type: NotificationType): boolean {
    return type === NotificationType.CRISIS_ALERT || 
           type === NotificationType.SECURITY_ALERT;
  }

  private isHipaaCompliantType(type: NotificationType): boolean {
    const hipaaTypes = [
      NotificationType.CRISIS_ALERT,
      NotificationType.APPOINTMENT_REMINDER,
      NotificationType.MEDICATION_REMINDER,
      NotificationType.SECURITY_ALERT
    ];
    return hipaaTypes.includes(type);
  }
}

export const notificationProcessor = new NotificationProcessor();