
import { debugService } from './debugService';

export interface SMSMessage {
  to: string;
  message: string;
  type: 'crisis' | 'checkin' | 'milestone' | 'reminder';
  priority: 'low' | 'normal' | 'high' | 'critical';
  userId?: string;
}

export interface SMSDeliveryStatus {
  id: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  timestamp: Date;
  errorCode?: string;
  errorMessage?: string;
  retryCount?: number;
}

export interface PhoneNumberValidation {
  isValid: boolean;
  formatted: string;
  carrier?: string;
  type?: 'mobile' | 'landline' | 'voip';
  warnings: string[];
}

class EnhancedSMSService {
  private deliveryQueue: Map<string, SMSMessage> = new Map();
  private deliveryStatuses: Map<string, SMSDeliveryStatus> = new Map();
  private retryQueue: Map<string, { message: SMSMessage; attempts: number; nextRetry: Date }> = new Map();
  private readonly maxRetryAttempts = 3;
  private readonly baseRetryDelay = 1000; // 1 second

  constructor() {
    this.startRetryProcessor();
    this.startDeliveryMonitor();
  }

  async sendSMS(message: SMSMessage): Promise<string> {
    const messageId = this.generateMessageId();
    
    debugService.log('sms', 'Sending SMS', {
      messageId,
      to: this.maskPhoneNumber(message.to),
      type: message.type,
      priority: message.priority
    });

    // Validate phone number first
    const validation = this.validatePhoneNumber(message.to);
    if (!validation.isValid) {
      debugService.log('error', 'Invalid phone number', {
        messageId,
        to: this.maskPhoneNumber(message.to),
        warnings: validation.warnings
      });
      throw new Error(`Invalid phone number: ${validation.warnings.join(', ')}`);
    }

    // Use formatted number
    const formattedMessage = { ...message, to: validation.formatted };
    
    try {
      const status = await this.attemptSMSDelivery(messageId, formattedMessage);
      this.updateDeliveryStatus(messageId, status);
      return messageId;
    } catch (error) {
      debugService.log('error', 'SMS delivery failed', {
        messageId,
        error: error.message
      });
      
      // Add to retry queue if not a permanent failure
      if (this.isRetryableError(error)) {
        this.addToRetryQueue(messageId, formattedMessage);
      }
      
      throw error;
    }
  }

  async sendSMSWithRetry(message: SMSMessage, retries = 3): Promise<string> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.sendSMS(message);
      } catch (error) {
        debugService.log('sms', 'SMS attempt failed', {
          attempt: attempt + 1,
          maxAttempts: retries + 1,
          error: error.message
        });
        
        if (attempt === retries) {
          debugService.log('error', 'SMS failed after all retries', {
            totalAttempts: attempt + 1,
            error: error.message
          });
          throw error;
        }
        
        // Exponential backoff
        const delay = this.baseRetryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error('Unexpected end of retry loop');
  }

  private async attemptSMSDelivery(messageId: string, message: SMSMessage): Promise<SMSDeliveryStatus> {
    // Mock SMS service implementation
    debugService.log('sms', 'Attempting SMS delivery', {
      messageId,
      to: this.maskPhoneNumber(message.to)
    });
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Mock delivery with occasional failures for testing
    const shouldFail = Math.random() < 0.1; // 10% failure rate for testing
    
    if (shouldFail) {
      throw new Error('SMS delivery failed: Network timeout');
    }
    
    return {
      id: messageId,
      status: 'sent',
      timestamp: new Date()
    };
  }

  validatePhoneNumber(phone: string): PhoneNumberValidation {
    const warnings: string[] = [];
    
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    debugService.log('sms', 'Validating phone number', {
      original: this.maskPhoneNumber(phone),
      cleaned: this.maskPhoneNumber(cleaned)
    });
    
    // Check length
    if (cleaned.length < 10) {
      warnings.push('Phone number too short');
    }
    
    if (cleaned.length > 15) {
      warnings.push('Phone number too long');
    }
    
    // Check US format
    let formatted = cleaned;
    if (cleaned.length === 10) {
      formatted = `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      formatted = `+${cleaned}`;
    }
    
    // Check for obviously invalid numbers
    const invalidPatterns = [
      /^(\d)\1{9,}$/, // All same digits
      /^1234567890$/,  // Sequential
      /^0000000000$/   // All zeros
    ];
    
    for (const pattern of invalidPatterns) {
      if (pattern.test(cleaned)) {
        warnings.push('Phone number appears invalid');
        break;
      }
    }
    
    return {
      isValid: warnings.length === 0 && cleaned.length >= 10,
      formatted,
      warnings
    };
  }

  private async checkCarrierInfo(phone: string): Promise<{ carrier?: string; type?: string }> {
    try {
      // Mock carrier lookup - in production you'd use Twilio Lookup API
      debugService.log('sms', 'Checking carrier info', {
        phone: this.maskPhoneNumber(phone)
      });
      
      const carriers = ['Verizon', 'AT&T', 'T-Mobile', 'Sprint'];
      const types = ['mobile', 'landline', 'voip'];
      
      return {
        carrier: carriers[Math.floor(Math.random() * carriers.length)],
        type: types[Math.floor(Math.random() * types.length)] as any
      };
    } catch (error) {
      debugService.log('sms', 'Carrier lookup failed', { error: error.message });
      return {};
    }
  }

  private isRetryableError(error: Error): boolean {
    const retryableMessages = [
      'network timeout',
      'service unavailable', 
      'rate limit',
      'temporary failure'
    ];
    
    return retryableMessages.some(msg => 
      error.message.toLowerCase().includes(msg)
    );
  }

  private addToRetryQueue(messageId: string, message: SMSMessage): void {
    const nextRetry = new Date(Date.now() + this.baseRetryDelay);
    
    this.retryQueue.set(messageId, {
      message,
      attempts: 0,
      nextRetry
    });
    
    debugService.log('sms', 'Added to retry queue', {
      messageId,
      nextRetry: nextRetry.toISOString()
    });
  }

  private startRetryProcessor(): void {
    setInterval(() => {
      this.processRetryQueue();
    }, 5000); // Check every 5 seconds
  }

  private async processRetryQueue(): Promise<void> {
    const now = new Date();
    
    for (const [messageId, retryItem] of this.retryQueue) {
      if (now >= retryItem.nextRetry && retryItem.attempts < this.maxRetryAttempts) {
        try {
          debugService.log('sms', 'Retrying SMS delivery', {
            messageId,
            attempt: retryItem.attempts + 1
          });
          
          const status = await this.attemptSMSDelivery(messageId, retryItem.message);
          this.updateDeliveryStatus(messageId, status);
          this.retryQueue.delete(messageId);
          
        } catch (error) {
          retryItem.attempts++;
          
          if (retryItem.attempts >= this.maxRetryAttempts) {
            debugService.log('error', 'SMS retry attempts exhausted', {
              messageId,
              totalAttempts: retryItem.attempts
            });
            
            this.updateDeliveryStatus(messageId, {
              id: messageId,
              status: 'failed',
              timestamp: now,
              errorMessage: error.message,
              retryCount: retryItem.attempts
            });
            
            this.retryQueue.delete(messageId);
          } else {
            // Schedule next retry with exponential backoff
            const delay = this.baseRetryDelay * Math.pow(2, retryItem.attempts);
            retryItem.nextRetry = new Date(now.getTime() + delay);
          }
        }
      }
    }
  }

  private startDeliveryMonitor(): void {
    // Mock delivery status updates
    setInterval(() => {
      for (const [messageId, status] of this.deliveryStatuses) {
        if (status.status === 'sent' && Math.random() < 0.3) {
          // 30% chance to update to delivered
          this.updateDeliveryStatus(messageId, {
            ...status,
            status: 'delivered',
            timestamp: new Date()
          });
        }
      }
    }, 10000); // Check every 10 seconds
  }

  private updateDeliveryStatus(messageId: string, status: SMSDeliveryStatus): void {
    this.deliveryStatuses.set(messageId, status);
    
    debugService.log('sms', 'SMS status updated', {
      messageId,
      status: status.status,
      retryCount: status.retryCount
    });
  }

  private generateMessageId(): string {
    return `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private maskPhoneNumber(phone: string): string {
    if (phone.length <= 4) return phone;
    return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4);
  }

  getDeliveryStatus(messageId: string): SMSDeliveryStatus | null {
    return this.deliveryStatuses.get(messageId) || null;
  }

  getAllDeliveryStatuses(): SMSDeliveryStatus[] {
    return Array.from(this.deliveryStatuses.values());
  }

  getQueueStats(): { pending: number; retrying: number; failed: number; delivered: number } {
    const statuses = Array.from(this.deliveryStatuses.values());
    
    return {
      pending: statuses.filter(s => s.status === 'queued' || s.status === 'sent').length,
      retrying: this.retryQueue.size,
      failed: statuses.filter(s => s.status === 'failed').length,
      delivered: statuses.filter(s => s.status === 'delivered').length
    };
  }
}

export const enhancedSMSService = new EnhancedSMSService();
