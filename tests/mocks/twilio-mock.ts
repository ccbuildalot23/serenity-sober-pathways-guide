import { EventEmitter } from 'events';

export interface MockSMSMessage {
  to: string;
  from?: string;
  body: string;
  messageSid?: string;
  status?: string;
  direction?: string;
  dateCreated?: string;
  dateSent?: string;
  dateUpdated?: string;
  price?: string;
  priceUnit?: string;
  apiVersion?: string;
  uri?: string;
  accountSid?: string;
  numSegments?: string;
  numMedia?: string;
  errorCode?: string;
  errorMessage?: string;
  priority?: string;
  mediaUrls?: string[];
}

export interface MockWhatsAppMessage {
  to: string;
  from?: string;
  body: string;
  contentSid?: string;
  messageSid?: string;
  status?: string;
  direction?: string;
  dateCreated?: string;
  dateSent?: string;
  price?: string;
  priceUnit?: string;
}

export interface MockIncomingMessage {
  from: string;
  to: string;
  body: string;
  messageSid?: string;
  accountSid?: string;
  mediaUrls?: string[];
}

export interface MockWebhookEvent {
  MessageSid: string;
  MessageStatus: 'queued' | 'sent' | 'delivered' | 'failed' | 'undelivered';
  To: string;
  From: string;
  ErrorCode?: string;
  ErrorMessage?: string;
}

export class MockTwilioService extends EventEmitter {
  private sentSMS: MockSMSMessage[] = [];
  private sentWhatsApp: MockWhatsAppMessage[] = [];
  private incomingMessages: MockIncomingMessage[] = [];
  private webhookEvents: MockWebhookEvent[] = [];
  private isFailure = false;
  private failureMessage = '';
  private failureRetries = 0;
  private permanentFailure = false;
  private selectiveFailureFunction?: (message: MockSMSMessage) => boolean;
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    super();
    this.setupDefaultBehavior();
  }

  private setupDefaultBehavior() {
    // Default successful behavior
    this.isFailure = false;
    this.failureMessage = '';
    this.failureRetries = 0;
    this.permanentFailure = false;
  }

  // Mock Twilio SMS API
  async sendSMS(message: Partial<MockSMSMessage>): Promise<MockSMSMessage> {
    const smsMessage: MockSMSMessage = {
      to: message.to!,
      from: message.from || process.env.TWILIO_PHONE_NUMBER || '+15551234567',
      body: message.body!,
      messageSid: `SM${this.generateRandomId()}`,
      status: 'queued',
      direction: 'outbound-api',
      dateCreated: new Date().toISOString(),
      price: '-0.0075',
      priceUnit: 'USD',
      apiVersion: '2010-04-01',
      numSegments: '1',
      numMedia: '0',
      accountSid: process.env.TWILIO_ACCOUNT_SID || 'ACtest123',
      uri: `/2010-04-01/Accounts/ACtest123/Messages/${this.generateRandomId()}.json`,
      priority: message.priority || 'normal',
      ...message
    };

    // Check for selective failures
    if (this.selectiveFailureFunction && this.selectiveFailureFunction(smsMessage)) {
      throw new Error(`Selective failure: ${this.failureMessage || 'Service error'}`);
    }

    // Check for general failures
    if (this.isFailure) {
      if (this.permanentFailure) {
        throw new Error(this.failureMessage || 'Permanent service failure');
      }
      
      if (this.failureRetries > 0) {
        this.failureRetries--;
        throw new Error(this.failureMessage || 'Temporary service failure');
      } else {
        // Clear failure after retries exhausted
        this.clearFailure();
      }
    }

    // Check rate limits
    await this.checkRateLimit(smsMessage.to);

    // Store sent message
    this.sentSMS.push(smsMessage);

    // Simulate processing delay
    setTimeout(() => {
      this.simulateStatusUpdate(smsMessage.messageSid!, 'sent');
      setTimeout(() => {
        this.simulateStatusUpdate(smsMessage.messageSid!, 'delivered');
      }, Math.random() * 2000 + 500); // 0.5-2.5 seconds
    }, Math.random() * 1000 + 100); // 0.1-1.1 seconds

    this.emit('messageSent', smsMessage);
    return smsMessage;
  }

  // Mock Twilio WhatsApp API
  async sendWhatsApp(message: Partial<MockWhatsAppMessage>): Promise<MockWhatsAppMessage> {
    const whatsappMessage: MockWhatsAppMessage = {
      to: `whatsapp:${message.to}`,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`,
      body: message.body!,
      messageSid: `SM${this.generateRandomId()}`,
      status: 'queued',
      direction: 'outbound-api',
      dateCreated: new Date().toISOString(),
      price: '-0.0050',
      priceUnit: 'USD',
      ...message
    };

    if (this.isFailure) {
      throw new Error(this.failureMessage || 'WhatsApp service failure');
    }

    this.sentWhatsApp.push(whatsappMessage);
    this.emit('whatsappSent', whatsappMessage);
    return whatsappMessage;
  }

  // Simulate incoming SMS/WhatsApp messages
  async simulateIncomingSMS(message: MockIncomingMessage): Promise<void> {
    const incomingMessage: MockIncomingMessage = {
      ...message,
      messageSid: `SM${this.generateRandomId()}`,
      accountSid: process.env.TWILIO_ACCOUNT_SID || 'ACtest123'
    };

    this.incomingMessages.push(incomingMessage);
    this.emit('incomingMessage', incomingMessage);

    // Simulate webhook processing delay
    setTimeout(() => {
      this.processIncomingMessage(incomingMessage);
    }, Math.random() * 500 + 100);
  }

  private async processIncomingMessage(message: MockIncomingMessage): Promise<void> {
    // Process opt-in/opt-out keywords for WhatsApp
    const body = message.body.trim().toUpperCase();
    
    if (body === 'START' || body === 'YES') {
      await this.handleOptIn(message);
    } else if (body === 'STOP' || body === 'UNSUBSCRIBE') {
      await this.handleOptOut(message);
    } else if (body === 'HELP' || body === 'INFO') {
      await this.handleHelp(message);
    }

    this.emit('messageProcessed', message);
  }

  private async handleOptIn(message: MockIncomingMessage): Promise<void> {
    const confirmationMessage = {
      to: message.from,
      body: 'WhatsApp notifications enabled! You will now receive recovery support messages. Reply STOP to opt out.'
    };

    // Send confirmation after small delay
    setTimeout(() => {
      this.sendSMS(confirmationMessage);
    }, 500);

    this.emit('optInCompleted', { phone: message.from, method: 'sms_reply' });
  }

  private async handleOptOut(message: MockIncomingMessage): Promise<void> {
    const confirmationMessage = {
      to: message.from,
      body: 'WhatsApp notifications disabled. You will no longer receive WhatsApp messages from Serenity. Reply START to re-enable.'
    };

    setTimeout(() => {
      this.sendSMS(confirmationMessage);
    }, 500);

    this.emit('optOutCompleted', { phone: message.from, method: 'sms_reply' });
  }

  private async handleHelp(message: MockIncomingMessage): Promise<void> {
    const helpMessage = {
      to: message.from,
      body: 'Serenity Recovery Support - Reply START to enable notifications, STOP to disable, or HELP for this message.'
    };

    setTimeout(() => {
      this.sendSMS(helpMessage);
    }, 500);
  }

  // Simulate webhook status updates
  simulateStatusUpdate(messageSid: string, status: MockWebhookEvent['MessageStatus']): void {
    const sentMessage = this.sentSMS.find(msg => msg.messageSid === messageSid) ||
                       this.sentWhatsApp.find(msg => msg.messageSid === messageSid);

    if (sentMessage) {
      sentMessage.status = status;
      sentMessage.dateUpdated = new Date().toISOString();
      
      if (status === 'sent') {
        sentMessage.dateSent = new Date().toISOString();
      }

      const webhookEvent: MockWebhookEvent = {
        MessageSid: messageSid,
        MessageStatus: status,
        To: sentMessage.to,
        From: sentMessage.from!
      };

      this.webhookEvents.push(webhookEvent);
      this.emit('statusUpdate', webhookEvent);
    }
  }

  // Rate limiting simulation
  private async checkRateLimit(phoneNumber: string): Promise<void> {
    const now = Date.now();
    const rateLimitKey = phoneNumber;
    const rateLimit = this.rateLimits.get(rateLimitKey);

    if (rateLimit) {
      if (now < rateLimit.resetTime) {
        if (rateLimit.count >= 1) { // 1 message per second limit
          throw new Error('Rate limit exceeded for phone number');
        }
        rateLimit.count++;
      } else {
        // Reset rate limit window
        this.rateLimits.set(rateLimitKey, { count: 1, resetTime: now + 1000 });
      }
    } else {
      this.rateLimits.set(rateLimitKey, { count: 1, resetTime: now + 1000 });
    }
  }

  // Mock failure scenarios
  mockFailure(message: string, retries: number = 0): void {
    this.isFailure = true;
    this.failureMessage = message;
    this.failureRetries = retries;
    this.permanentFailure = false;
  }

  mockPermanentFailure(message: string): void {
    this.isFailure = true;
    this.failureMessage = message;
    this.permanentFailure = true;
  }

  mockSelectiveFailure(failureFunction: (message: MockSMSMessage) => boolean): void {
    this.selectiveFailureFunction = failureFunction;
  }

  clearFailure(): void {
    this.isFailure = false;
    this.failureMessage = '';
    this.failureRetries = 0;
    this.permanentFailure = false;
    this.selectiveFailureFunction = undefined;
  }

  // Utility methods for testing
  getSentSMS(): MockSMSMessage[] {
    return [...this.sentSMS];
  }

  getSentWhatsApp(): MockWhatsAppMessage[] {
    return [...this.sentWhatsApp];
  }

  getIncomingMessages(): MockIncomingMessage[] {
    return [...this.incomingMessages];
  }

  getWebhookEvents(): MockWebhookEvent[] {
    return [...this.webhookEvents];
  }

  reset(): void {
    this.sentSMS = [];
    this.sentWhatsApp = [];
    this.incomingMessages = [];
    this.webhookEvents = [];
    this.rateLimits.clear();
    this.clearFailure();
    this.removeAllListeners();
  }

  // Simulate network latency
  async simulateLatency(min: number = 100, max: number = 500): Promise<void> {
    const delay = Math.random() * (max - min) + min;
    return new Promise(resolve => setTimeout(resolve, delay));
  }

  // Helper methods
  private generateRandomId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Mock Twilio lookup API
  async lookupPhoneNumber(phoneNumber: string): Promise<{
    phoneNumber: string;
    countryCode: string;
    nationalFormat: string;
    valid: boolean;
    type: string;
    carrier?: string;
  }> {
    // Simple validation logic for testing
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    const isValid = cleanNumber.length >= 10 && cleanNumber.length <= 15;
    
    return {
      phoneNumber: phoneNumber,
      countryCode: cleanNumber.startsWith('1') ? 'US' : 'UNKNOWN',
      nationalFormat: this.formatPhoneNumber(cleanNumber),
      valid: isValid,
      type: 'mobile',
      carrier: isValid ? 'Mock Carrier' : undefined
    };
  }

  private formatPhoneNumber(cleanNumber: string): string {
    if (cleanNumber.length === 11 && cleanNumber.startsWith('1')) {
      const areaCode = cleanNumber.substring(1, 4);
      const exchange = cleanNumber.substring(4, 7);
      const number = cleanNumber.substring(7);
      return `(${areaCode}) ${exchange}-${number}`;
    }
    return cleanNumber;
  }

  // Mock cost estimation
  estimateCost(messages: number, channel: 'sms' | 'whatsapp' = 'sms'): {
    messagesCount: number;
    estimatedCost: number;
    costPerMessage: number;
    currency: string;
  } {
    const costPerMessage = channel === 'sms' ? 0.0075 : 0.005;
    return {
      messagesCount: messages,
      estimatedCost: messages * costPerMessage,
      costPerMessage,
      currency: 'USD'
    };
  }

  // Analytics and insights mock
  getAnalytics(dateRange: { start: Date; end: Date }): {
    totalSent: number;
    delivered: number;
    failed: number;
    deliveryRate: number;
    avgDeliveryTime: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
  } {
    const totalSent = this.sentSMS.length + this.sentWhatsApp.length;
    const delivered = this.webhookEvents.filter(e => e.MessageStatus === 'delivered').length;
    const failed = this.webhookEvents.filter(e => e.MessageStatus === 'failed').length;
    
    return {
      totalSent,
      delivered,
      failed,
      deliveryRate: totalSent > 0 ? (delivered / totalSent) * 100 : 0,
      avgDeliveryTime: 2500, // Mock average delivery time in ms
      topFailureReasons: [
        { reason: 'Invalid phone number', count: Math.floor(failed * 0.4) },
        { reason: 'Network error', count: Math.floor(failed * 0.3) },
        { reason: 'Carrier blocked', count: Math.floor(failed * 0.3) }
      ]
    };
  }

  // Mock compliance features
  async exportMessagesForCompliance(dateRange: { start: Date; end: Date }): Promise<{
    exportId: string;
    status: 'pending' | 'completed';
    downloadUrl?: string;
    expiresAt?: Date;
  }> {
    return {
      exportId: `export_${this.generateRandomId()}`,
      status: 'completed',
      downloadUrl: 'https://mock-export-url.com/export.csv',
      expiresAt: new Date(Date.now() + 86400000) // 24 hours
    };
  }

  // Simulate webhook endpoint for testing
  createWebhookHandler(): (event: MockWebhookEvent) => void {
    return (event: MockWebhookEvent) => {
      this.webhookEvents.push(event);
      this.emit('webhookReceived', event);
      
      // Find and update corresponding message
      const message = this.sentSMS.find(msg => msg.messageSid === event.MessageSid) ||
                     this.sentWhatsApp.find(msg => msg.messageSid === event.MessageSid);
      
      if (message) {
        message.status = event.MessageStatus;
        message.dateUpdated = new Date().toISOString();
        
        if (event.ErrorCode) {
          message.errorCode = event.ErrorCode;
          message.errorMessage = event.ErrorMessage;
        }
      }
    };
  }
}