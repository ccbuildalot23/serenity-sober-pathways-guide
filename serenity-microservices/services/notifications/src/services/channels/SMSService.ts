import { Twilio } from 'twilio';
import { config } from '@/config';
import { logger, auditLogger } from '@/utils/logger';
import { SMSPayload, NotificationStatus } from '@/types';
import { EncryptionService } from '../EncryptionService';

export class SMSService {
  private client: Twilio;
  private encryptionService: EncryptionService;
  private fromNumber: string;

  constructor() {
    this.client = new Twilio(
      config.sms.twilio.accountSid,
      config.sms.twilio.authToken
    );
    this.fromNumber = config.sms.twilio.phoneNumber;
    this.encryptionService = new EncryptionService();
  }

  async sendSMS(payload: SMSPayload, isHipaaCompliant: boolean = false): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const startTime = Date.now();

      // Validate phone number
      if (!this.isValidPhoneNumber(payload.to)) {
        throw new Error('Invalid phone number format');
      }

      // Check message length (Twilio limit is 1600 characters)
      if (payload.body.length > 1600) {
        throw new Error('Message too long. Maximum 1600 characters allowed.');
      }

      // Encrypt content if HIPAA compliant
      let processedPayload = payload;
      if (isHipaaCompliant) {
        processedPayload = await this.encryptHipaaContent(payload);
      }

      // Format phone number to E.164 format
      const formattedTo = this.formatPhoneNumber(processedPayload.to);
      const formattedFrom = this.formatPhoneNumber(processedPayload.from || this.fromNumber);

      const message = await this.client.messages.create({
        body: processedPayload.body,
        from: formattedFrom,
        to: formattedTo,
        statusCallback: `${process.env.BASE_URL}/webhooks/sms/status`, // Optional webhook for delivery status
      });

      const deliveryTime = Date.now() - startTime;

      logger.info('SMS sent successfully', {
        messageId: message.sid,
        to: this.maskPhoneNumber(formattedTo),
        bodyLength: payload.body.length,
        deliveryTime,
        isHipaaCompliant,
        status: message.status
      });

      // HIPAA audit logging
      if (isHipaaCompliant) {
        auditLogger.info('HIPAA SMS sent', {
          messageId: message.sid,
          to: this.maskPhoneNumber(formattedTo),
          timestamp: new Date().toISOString(),
          deliveryTime,
          encryptionUsed: true,
          status: message.status
        });
      }

      return {
        success: true,
        messageId: message.sid
      };

    } catch (error: any) {
      logger.error('Failed to send SMS', {
        to: this.maskPhoneNumber(payload.to),
        bodyLength: payload.body.length,
        error: error.message,
        code: error.code,
        moreInfo: error.moreInfo,
        isHipaaCompliant
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendBulkSMS(payloads: SMSPayload[], isHipaaCompliant: boolean = false): Promise<{
    success: boolean;
    results: Array<{ success: boolean; messageId?: string; error?: string; }>;
    totalSent: number;
    totalFailed: number;
  }> {
    const results: Array<{ success: boolean; messageId?: string; error?: string; }> = [];
    let totalSent = 0;
    let totalFailed = 0;

    logger.info('Starting bulk SMS send', {
      count: payloads.length,
      isHipaaCompliant
    });

    // Process in batches to respect Twilio rate limits
    const batchSize = 5; // Conservative batch size for SMS
    for (let i = 0; i < payloads.length; i += batchSize) {
      const batch = payloads.slice(i, i + batchSize);
      const batchPromises = batch.map(payload => this.sendSMS(payload, isHipaaCompliant));
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
            if (result.value.success) {
              totalSent++;
            } else {
              totalFailed++;
            }
          } else {
            results.push({
              success: false,
              error: result.reason?.message || 'Unknown error'
            });
            totalFailed++;
          }
        }

        // Delay between batches to respect rate limits (1 message per second)
        if (i + batchSize < payloads.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

      } catch (error: any) {
        logger.error('Batch SMS processing failed', {
          batchIndex: i / batchSize,
          error: error.message
        });
        
        // Add failed results for the entire batch
        for (let j = 0; j < batch.length; j++) {
          results.push({
            success: false,
            error: error.message
          });
          totalFailed++;
        }
      }
    }

    logger.info('Bulk SMS send completed', {
      totalMessages: payloads.length,
      totalSent,
      totalFailed,
      successRate: ((totalSent / payloads.length) * 100).toFixed(2) + '%'
    });

    return {
      success: totalSent > 0,
      results,
      totalSent,
      totalFailed
    };
  }

  async getMessageStatus(messageId: string): Promise<{
    status: string;
    errorCode?: string;
    errorMessage?: string;
    price?: string;
    priceUnit?: string;
  } | null> {
    try {
      const message = await this.client.messages(messageId).fetch();
      
      return {
        status: message.status,
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage || undefined,
        price: message.price || undefined,
        priceUnit: message.priceUnit || undefined
      };
    } catch (error: any) {
      logger.error('Failed to fetch SMS status', {
        messageId,
        error: error.message
      });
      return null;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      // Test connection by fetching account info
      await this.client.api.accounts(config.sms.twilio.accountSid).fetch();
      return true;
    } catch (error) {
      logger.error('SMS service connection verification failed', { error });
      return false;
    }
  }

  async getAccountBalance(): Promise<{ balance?: string; currency?: string } | null> {
    try {
      const account = await this.client.api.accounts(config.sms.twilio.accountSid).fetch();
      return {
        balance: account.balance,
        currency: account.currency
      };
    } catch (error) {
      logger.error('Failed to fetch account balance', { error });
      return null;
    }
  }

  private async encryptHipaaContent(payload: SMSPayload): Promise<SMSPayload> {
    try {
      const encryptedBody = await this.encryptionService.encryptHipaaData(payload.body);
      
      // For SMS, we might want to add a prefix indicating encrypted content
      // and provide instructions for decryption
      const encryptedMessage = `[SECURE MESSAGE] ${encryptedBody}`;
      
      if (encryptedMessage.length > 1600) {
        // If encrypted message is too long, we need to split or use a different approach
        logger.warn('Encrypted SMS message too long, using reference approach', {
          originalLength: payload.body.length,
          encryptedLength: encryptedMessage.length
        });
        
        // Alternative: Store encrypted content elsewhere and send a reference
        const reference = this.encryptionService.generateSecureToken(16);
        return {
          ...payload,
          body: `[SECURE MESSAGE] Reference: ${reference}. Please check your secure portal for the full message.`
        };
      }
      
      return {
        ...payload,
        body: encryptedMessage
      };
    } catch (error) {
      logger.error('Failed to encrypt HIPAA SMS content', { error });
      throw error;
    }
  }

  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');
    return phoneRegex.test(cleaned);
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // If it doesn't start with +, add +1 for US numbers
    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) {
        cleaned = '+1' + cleaned;
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = '+' + cleaned;
      }
    }
    
    return cleaned;
  }

  private maskPhoneNumber(phoneNumber: string): string {
    const cleaned = phoneNumber.replace(/[^\d]/g, '');
    if (cleaned.length >= 4) {
      return cleaned.substring(0, cleaned.length - 4).replace(/./g, '*') + 
             cleaned.substring(cleaned.length - 4);
    }
    return phoneNumber.replace(/./g, '*');
  }

  // Handle Twilio webhook for delivery status updates
  async handleStatusWebhook(webhookData: any): Promise<void> {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = webhookData;
      
      logger.info('SMS status update received', {
        messageId: MessageSid,
        status: MessageStatus,
        errorCode: ErrorCode,
        errorMessage: ErrorMessage
      });

      // Here you would typically update the notification status in your database
      // based on the webhook data
      
    } catch (error) {
      logger.error('Failed to process SMS status webhook', { webhookData, error });
    }
  }
}

export const smsService = new SMSService();