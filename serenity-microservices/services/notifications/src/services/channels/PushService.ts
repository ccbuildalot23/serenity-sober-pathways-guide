import * as admin from 'firebase-admin';
import { config } from '@/config';
import { logger, auditLogger } from '@/utils/logger';
import { PushPayload, NotificationStatus } from '@/types';
import { EncryptionService } from '../EncryptionService';

export class PushService {
  private firebaseApp: admin.app.App;
  private encryptionService: EncryptionService;

  constructor() {
    this.encryptionService = new EncryptionService();
    this.initializeFirebase();
  }

  private initializeFirebase(): void {
    try {
      // Check if Firebase app is already initialized
      if (admin.apps.length === 0) {
        const serviceAccount = {
          projectId: config.push.firebase.projectId,
          privateKey: config.push.firebase.privateKey,
          clientEmail: config.push.firebase.clientEmail
        };

        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
          projectId: config.push.firebase.projectId
        });

        logger.info('Firebase Admin SDK initialized successfully');
      } else {
        this.firebaseApp = admin.apps[0]!;
        logger.info('Using existing Firebase Admin SDK instance');
      }
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK', { error });
      throw error;
    }
  }

  async sendPushNotification(payload: PushPayload, isHipaaCompliant: boolean = false): Promise<{
    success: boolean;
    messageId?: string;
    failureCount?: number;
    successCount?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();

      // Validate device tokens
      const validTokens = payload.deviceTokens.filter(token => this.isValidToken(token));
      if (validTokens.length === 0) {
        throw new Error('No valid device tokens provided');
      }

      // Encrypt content if HIPAA compliant
      let processedPayload = payload;
      if (isHipaaCompliant) {
        processedPayload = await this.encryptHipaaContent(payload);
      }

      // Prepare FCM message
      const message: admin.messaging.MulticastMessage = {
        tokens: validTokens,
        notification: {
          title: processedPayload.title,
          body: processedPayload.body
        },
        data: {
          ...processedPayload.data,
          isHipaaCompliant: isHipaaCompliant.toString(),
          timestamp: new Date().toISOString()
        },
        android: {
          notification: {
            icon: 'ic_notification',
            color: '#4A90E2',
            sound: processedPayload.sound || 'default',
            clickAction: processedPayload.clickAction,
            priority: isHipaaCompliant ? 'high' : 'normal',
            channelId: isHipaaCompliant ? 'hipaa_notifications' : 'general_notifications'
          },
          priority: isHipaaCompliant ? 'high' : 'normal'
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: processedPayload.title,
                body: processedPayload.body
              },
              badge: processedPayload.badge,
              sound: processedPayload.sound || 'default',
              contentAvailable: true,
              category: isHipaaCompliant ? 'HIPAA_CATEGORY' : 'GENERAL_CATEGORY'
            }
          },
          headers: {
            'apns-priority': isHipaaCompliant ? '10' : '5',
            'apns-push-type': 'alert'
          }
        },
        webpush: {
          notification: {
            title: processedPayload.title,
            body: processedPayload.body,
            icon: '/icon-192.png',
            badge: '/badge-72.png',
            requireInteraction: isHipaaCompliant,
            silent: false,
            tag: 'serenity-notification'
          },
          fcmOptions: {
            link: processedPayload.clickAction
          }
        }
      };

      // Add HIPAA-specific options
      if (isHipaaCompliant) {
        message.data = {
          ...message.data,
          encrypted: 'true',
          classification: 'PHI'
        };
      }

      const response = await admin.messaging(this.firebaseApp).sendMulticast(message);
      const deliveryTime = Date.now() - startTime;

      logger.info('Push notification sent', {
        totalTokens: validTokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
        deliveryTime,
        isHipaaCompliant
      });

      // Log failed tokens for debugging
      if (response.failureCount > 0) {
        const failedTokens = response.responses
          .map((resp, idx) => ({ token: validTokens[idx], error: resp.error }))
          .filter(item => item.error);

        logger.warn('Some push notifications failed', {
          failedCount: response.failureCount,
          failures: failedTokens.map(f => ({
            token: this.maskToken(f.token),
            errorCode: f.error?.code,
            errorMessage: f.error?.message
          }))
        });
      }

      // HIPAA audit logging
      if (isHipaaCompliant) {
        auditLogger.info('HIPAA push notification sent', {
          successCount: response.successCount,
          failureCount: response.failureCount,
          timestamp: new Date().toISOString(),
          deliveryTime,
          encryptionUsed: true
        });
      }

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        messageId: response.responses[0]?.messageId
      };

    } catch (error: any) {
      logger.error('Failed to send push notification', {
        tokenCount: payload.deviceTokens.length,
        title: payload.title,
        error: error.message,
        isHipaaCompliant
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendToTopic(
    topic: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    isHipaaCompliant: boolean = false
  ): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Encrypt content if HIPAA compliant
      let processedTitle = title;
      let processedBody = body;
      
      if (isHipaaCompliant) {
        processedTitle = await this.encryptionService.encryptHipaaData(title);
        processedBody = await this.encryptionService.encryptHipaaData(body);
      }

      const message: admin.messaging.Message = {
        topic,
        notification: {
          title: processedTitle,
          body: processedBody
        },
        data: {
          ...data,
          isHipaaCompliant: isHipaaCompliant.toString(),
          timestamp: new Date().toISOString()
        }
      };

      const messageId = await admin.messaging(this.firebaseApp).send(message);

      logger.info('Topic push notification sent', {
        topic,
        messageId,
        isHipaaCompliant
      });

      return {
        success: true,
        messageId
      };

    } catch (error: any) {
      logger.error('Failed to send topic push notification', {
        topic,
        title,
        error: error.message,
        isHipaaCompliant
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  async subscribeToTopic(tokens: string[], topic: string): Promise<{
    success: boolean;
    successCount: number;
    failureCount: number;
    errors?: Array<{ token: string; error: string }>;
  }> {
    try {
      const validTokens = tokens.filter(token => this.isValidToken(token));
      
      if (validTokens.length === 0) {
        throw new Error('No valid tokens provided');
      }

      const response = await admin.messaging(this.firebaseApp)
        .subscribeToTopic(validTokens, topic);

      logger.info('Subscribed tokens to topic', {
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount
      });

      const errors = response.errors?.map(error => ({
        token: this.maskToken(validTokens[error.index]),
        error: error.error.message
      }));

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors
      };

    } catch (error: any) {
      logger.error('Failed to subscribe to topic', { topic, error: error.message });
      return {
        success: false,
        successCount: 0,
        failureCount: tokens.length
      };
    }
  }

  async unsubscribeFromTopic(tokens: string[], topic: string): Promise<{
    success: boolean;
    successCount: number;
    failureCount: number;
  }> {
    try {
      const validTokens = tokens.filter(token => this.isValidToken(token));
      
      const response = await admin.messaging(this.firebaseApp)
        .unsubscribeFromTopic(validTokens, topic);

      logger.info('Unsubscribed tokens from topic', {
        topic,
        successCount: response.successCount,
        failureCount: response.failureCount
      });

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount
      };

    } catch (error: any) {
      logger.error('Failed to unsubscribe from topic', { topic, error: error.message });
      return {
        success: false,
        successCount: 0,
        failureCount: tokens.length
      };
    }
  }

  async validateTokens(tokens: string[]): Promise<{
    validTokens: string[];
    invalidTokens: string[];
  }> {
    const validTokens: string[] = [];
    const invalidTokens: string[] = [];

    for (const token of tokens) {
      if (this.isValidToken(token)) {
        validTokens.push(token);
      } else {
        invalidTokens.push(token);
      }
    }

    return { validTokens, invalidTokens };
  }

  async verifyConnection(): Promise<boolean> {
    try {
      // Test by getting project info
      await admin.messaging(this.firebaseApp).send({
        token: 'test-token',
        notification: { title: 'test', body: 'test' }
      }, true); // dry run
      return true;
    } catch (error: any) {
      // If it's a dry run error about invalid token, Firebase connection is working
      if (error.code === 'messaging/invalid-registration-token') {
        return true;
      }
      logger.error('Push service connection verification failed', { error });
      return false;
    }
  }

  private async encryptHipaaContent(payload: PushPayload): Promise<PushPayload> {
    try {
      const encryptedTitle = await this.encryptionService.encryptHipaaData(payload.title);
      const encryptedBody = await this.encryptionService.encryptHipaaData(payload.body);
      
      // For push notifications, we might want to keep titles shorter and less specific
      // for HIPAA compliance, moving sensitive details to encrypted data
      return {
        ...payload,
        title: 'Secure Message', // Generic title for HIPAA
        body: 'You have a secure message. Tap to view.', // Generic body
        data: {
          ...payload.data,
          encryptedTitle,
          encryptedBody,
          originalTitle: payload.title,
          originalBody: payload.body
        }
      };
    } catch (error) {
      logger.error('Failed to encrypt HIPAA push notification content', { error });
      throw error;
    }
  }

  private isValidToken(token: string): boolean {
    // FCM tokens are base64 encoded and typically 152+ characters
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
}

export const pushService = new PushService();