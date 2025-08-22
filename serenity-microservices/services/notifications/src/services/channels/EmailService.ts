import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { config } from '@/config';
import { logger, auditLogger } from '@/utils/logger';
import { EmailPayload, NotificationStatus } from '@/types';
import { EncryptionService } from '../EncryptionService';

export class EmailService {
  private transporter: Transporter;
  private encryptionService: EncryptionService;

  constructor() {
    this.encryptionService = new EncryptionService();
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    if (config.email.sendgrid.apiKey) {
      // Use SendGrid SMTP
      this.transporter = nodemailer.createTransporter({
        host: 'smtp.sendgrid.net',
        port: 587,
        secure: false,
        auth: {
          user: 'apikey',
          pass: config.email.sendgrid.apiKey
        },
        pool: true,
        maxConnections: 10,
        maxMessages: 100,
        rateLimit: 14, // SendGrid limit: 14 emails per second
      });
    } else if (config.email.smtp.host) {
      // Use custom SMTP
      this.transporter = nodemailer.createTransporter({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure,
        auth: {
          user: config.email.smtp.user,
          pass: config.email.smtp.password
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 10,
      });
    } else {
      throw new Error('No email configuration provided');
    }

    // Verify transporter configuration
    this.transporter.verify((error, success) => {
      if (error) {
        logger.error('Email transporter verification failed', { error });
      } else {
        logger.info('Email transporter verified successfully');
      }
    });
  }

  async sendEmail(payload: EmailPayload, isHipaaCompliant: boolean = false): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      const startTime = Date.now();

      // Validate email address
      if (!this.isValidEmail(payload.to)) {
        throw new Error('Invalid email address');
      }

      // Encrypt content if HIPAA compliant
      let processedPayload = payload;
      if (isHipaaCompliant) {
        processedPayload = await this.encryptHipaaContent(payload);
      }

      const mailOptions: SendMailOptions = {
        from: {
          name: config.email.fromName,
          address: config.email.from
        },
        to: processedPayload.to,
        subject: processedPayload.subject,
        text: processedPayload.text,
        html: processedPayload.html,
        attachments: processedPayload.attachments,
        headers: {
          'X-Service': 'Serenity-Notifications',
          'X-Priority': '3',
          'X-HIPAA-Compliant': isHipaaCompliant.toString()
        }
      };

      // Add HIPAA-specific headers
      if (isHipaaCompliant) {
        mailOptions.headers = {
          ...mailOptions.headers,
          'X-Encryption': 'AES-256-GCM',
          'X-Data-Classification': 'PHI'
        };
      }

      const info = await this.transporter.sendMail(mailOptions);
      const deliveryTime = Date.now() - startTime;

      logger.info('Email sent successfully', {
        messageId: info.messageId,
        to: this.maskEmail(payload.to),
        subject: payload.subject,
        deliveryTime,
        isHipaaCompliant
      });

      // HIPAA audit logging
      if (isHipaaCompliant) {
        auditLogger.info('HIPAA email sent', {
          messageId: info.messageId,
          to: this.maskEmail(payload.to),
          timestamp: new Date().toISOString(),
          deliveryTime,
          encryptionUsed: true
        });
      }

      return {
        success: true,
        messageId: info.messageId
      };

    } catch (error: any) {
      logger.error('Failed to send email', {
        to: this.maskEmail(payload.to),
        subject: payload.subject,
        error: error.message,
        isHipaaCompliant
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendBulkEmails(payloads: EmailPayload[], isHipaaCompliant: boolean = false): Promise<{
    success: boolean;
    results: Array<{ success: boolean; messageId?: string; error?: string; }>;
    totalSent: number;
    totalFailed: number;
  }> {
    const results: Array<{ success: boolean; messageId?: string; error?: string; }> = [];
    let totalSent = 0;
    let totalFailed = 0;

    logger.info('Starting bulk email send', {
      count: payloads.length,
      isHipaaCompliant
    });

    // Process in batches to avoid overwhelming the SMTP server
    const batchSize = 10;
    for (let i = 0; i < payloads.length; i += batchSize) {
      const batch = payloads.slice(i, i + batchSize);
      const batchPromises = batch.map(payload => this.sendEmail(payload, isHipaaCompliant));
      
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

        // Small delay between batches to respect rate limits
        if (i + batchSize < payloads.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

      } catch (error: any) {
        logger.error('Batch email processing failed', {
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

    logger.info('Bulk email send completed', {
      totalEmails: payloads.length,
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

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error('Email service connection verification failed', { error });
      return false;
    }
  }

  async getQuota(): Promise<{ remaining?: number; resetTime?: Date } | null> {
    // This would depend on the email provider's API
    // For now, return null as most SMTP providers don't expose this
    return null;
  }

  private async encryptHipaaContent(payload: EmailPayload): Promise<EmailPayload> {
    try {
      const encryptedSubject = await this.encryptionService.encryptHipaaData(payload.subject);
      const encryptedText = await this.encryptionService.encryptHipaaData(payload.text);
      const encryptedHtml = payload.html 
        ? await this.encryptionService.encryptHipaaData(payload.html)
        : undefined;

      return {
        ...payload,
        subject: encryptedSubject,
        text: encryptedText,
        html: encryptedHtml
      };
    } catch (error) {
      logger.error('Failed to encrypt HIPAA email content', { error });
      throw error;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (local.length <= 2) {
      return `${local}***@${domain}`;
    }
    return `${local.substring(0, 2)}***@${domain}`;
  }

  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
      logger.info('Email transporter closed');
    }
  }
}

export const emailService = new EmailService();