import { EventEmitter } from 'events';

export interface MockEmailMessage {
  to: string | Array<{ email: string; name?: string }>;
  from: string | { email: string; name?: string };
  subject?: string;
  text?: string;
  html?: string;
  templateId?: string;
  personalizations?: Array<{
    to: Array<{ email: string; name?: string }>;
    subject?: string;
    dynamic_template_data?: Record<string, any>;
  }>;
  content?: Array<{
    type: string;
    value: string;
  }>;
  attachments?: Array<{
    filename: string;
    content: string;
    type?: string;
    disposition?: string;
  }>;
  categories?: string[];
  customArgs?: Record<string, string>;
  sendAt?: number;
  batchId?: string;
  asm?: {
    groupId: number;
    groupsToDisplay?: number[];
  };
  trackingSettings?: {
    clickTracking?: { enable: boolean; enableText?: boolean };
    openTracking?: { enable: boolean; substitutionTag?: string };
    subscriptionTracking?: { enable: boolean };
  };
  mailSettings?: {
    sandboxMode?: { enable: boolean };
    bypassListManagement?: { enable: boolean };
  };
  messageId?: string;
  status?: string;
  timestamp?: number;
}

export interface MockEmailEvent {
  email: string;
  event: 'processed' | 'delivered' | 'open' | 'click' | 'bounce' | 'dropped' | 'spam_report' | 'unsubscribe';
  timestamp: number;
  messageId: string;
  sg_message_id?: string;
  reason?: string;
  url?: string;
  useragent?: string;
  ip?: string;
}

export interface MockTemplate {
  id: string;
  name: string;
  generation: 'legacy' | 'dynamic';
  versions: Array<{
    id: string;
    name: string;
    subject: string;
    htmlContent: string;
    textContent: string;
    active: boolean;
  }>;
}

export interface MockSuppressionGroup {
  id: number;
  name: string;
  description: string;
  isDefault: boolean;
}

export class MockSendGridService extends EventEmitter {
  private sentEmails: MockEmailMessage[] = [];
  private emailEvents: MockEmailEvent[] = [];
  private templates: Map<string, MockTemplate> = new Map();
  private suppressionGroups: Map<number, MockSuppressionGroup> = new Map();
  private suppressedEmails: Set<string> = new Set();
  private isFailure = false;
  private failureMessage = '';
  private failureRetries = 0;
  private selectiveFailureFunction?: (email: MockEmailMessage) => boolean;
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();
  private apiUsage = {
    requestsToday: 0,
    requestsThisMonth: 0,
    limit: 100000
  };

  constructor() {
    super();
    this.setupDefaultTemplates();
    this.setupDefaultSuppressionGroups();
  }

  private setupDefaultTemplates(): void {
    const defaultTemplates: MockTemplate[] = [
      {
        id: 'daily_checkin_reminder',
        name: 'Daily Check-in Reminder',
        generation: 'dynamic',
        versions: [{
          id: 'v1',
          name: 'Version 1',
          subject: 'Time for your daily check-in, {{firstName}}',
          htmlContent: '<p>Hi {{firstName}}, it\'s time for your daily check-in!</p>',
          textContent: 'Hi {{firstName}}, it\'s time for your daily check-in!',
          active: true
        }]
      },
      {
        id: 'crisis_alert',
        name: 'Crisis Alert',
        generation: 'dynamic',
        versions: [{
          id: 'v1',
          name: 'Version 1',
          subject: 'CRISIS ALERT - Immediate Attention Required',
          htmlContent: '<div style="color: red;"><h2>Crisis Alert</h2><p>{{alertMessage}}</p></div>',
          textContent: 'CRISIS ALERT: {{alertMessage}}',
          active: true
        }]
      },
      {
        id: 'milestone_achievement',
        name: 'Milestone Achievement',
        generation: 'dynamic',
        versions: [{
          id: 'v1',
          name: 'Version 1',
          subject: 'Congratulations on {{milestoneType}}, {{firstName}}!',
          htmlContent: '<h2>🎉 Milestone Achieved!</h2><p>Congratulations {{firstName}} on reaching {{daysClean}} days clean!</p>',
          textContent: 'Congratulations {{firstName}} on reaching {{daysClean}} days clean!',
          active: true
        }]
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  private setupDefaultSuppressionGroups(): void {
    const defaultGroups: MockSuppressionGroup[] = [
      {
        id: 1,
        name: 'Daily Notifications',
        description: 'Daily check-in reminders and motivational messages',
        isDefault: false
      },
      {
        id: 2,
        name: 'Crisis Alerts',
        description: 'Emergency crisis notifications',
        isDefault: false
      },
      {
        id: 3,
        name: 'Marketing',
        description: 'Promotional and marketing emails',
        isDefault: false
      }
    ];

    defaultGroups.forEach(group => {
      this.suppressionGroups.set(group.id, group);
    });
  }

  // Main email sending method
  async sendEmail(email: MockEmailMessage | MockEmailMessage[]): Promise<any> {
    const emails = Array.isArray(email) ? email : [email];
    const results = [];

    for (const emailMessage of emails) {
      try {
        const result = await this.processSingleEmail(emailMessage);
        results.push(result);
      } catch (error) {
        results.push({
          statusCode: 400,
          body: { errors: [{ message: error instanceof Error ? error.message : 'Unknown error' }] }
        });
      }
    }

    return results.length === 1 ? results[0] : results;
  }

  private async processSingleEmail(email: MockEmailMessage): Promise<any> {
    // Increment API usage
    this.apiUsage.requestsToday++;
    this.apiUsage.requestsThisMonth++;

    // Check API rate limits
    await this.checkRateLimit();

    // Generate message ID
    const messageId = `msg_${this.generateRandomId()}`;
    const sgMessageId = `${messageId}.filter0001.example.com`;

    const processedEmail: MockEmailMessage = {
      ...email,
      messageId,
      status: 'queued',
      timestamp: Date.now()
    };

    // Handle template emails
    if (email.templateId) {
      const template = this.templates.get(email.templateId);
      if (!template) {
        throw new Error(`Template ${email.templateId} not found`);
      }

      // Process template with dynamic data
      const activeVersion = template.versions.find(v => v.active);
      if (activeVersion && email.personalizations?.[0]?.dynamic_template_data) {
        const data = email.personalizations[0].dynamic_template_data;
        processedEmail.subject = this.processTemplate(activeVersion.subject, data);
      }
    }

    // Check for suppressed recipients
    const recipients = this.extractRecipients(email);
    const suppressedRecipients = recipients.filter(recipient => 
      this.suppressedEmails.has(recipient.email)
    );

    if (suppressedRecipients.length > 0) {
      throw new Error(`Recipients suppressed: ${suppressedRecipients.map(r => r.email).join(', ')}`);
    }

    // Check for selective failures
    if (this.selectiveFailureFunction && this.selectiveFailureFunction(processedEmail)) {
      throw new Error(`Selective failure: ${this.failureMessage || 'Service error'}`);
    }

    // Check for general failures
    if (this.isFailure) {
      if (this.failureRetries > 0) {
        this.failureRetries--;
        throw new Error(this.failureMessage || 'Temporary service failure');
      } else {
        // Clear failure after retries exhausted
        this.clearFailure();
      }
    }

    // Store sent email
    this.sentEmails.push(processedEmail);

    // Simulate email processing events
    this.simulateEmailEvents(messageId, recipients);

    this.emit('emailSent', processedEmail);

    return {
      statusCode: 202,
      body: '',
      headers: {
        'x-message-id': sgMessageId
      }
    };
  }

  private extractRecipients(email: MockEmailMessage): Array<{ email: string; name?: string }> {
    if (email.personalizations) {
      return email.personalizations.flatMap(p => p.to);
    } else if (Array.isArray(email.to)) {
      return email.to.map(recipient => 
        typeof recipient === 'string' ? { email: recipient } : recipient
      );
    } else if (typeof email.to === 'string') {
      return [{ email: email.to }];
    } else {
      return [email.to];
    }
  }

  private processTemplate(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  private simulateEmailEvents(messageId: string, recipients: Array<{ email: string }>): void {
    recipients.forEach(recipient => {
      // Processed event (immediate)
      setTimeout(() => {
        this.emitEmailEvent({
          email: recipient.email,
          event: 'processed',
          timestamp: Date.now(),
          messageId,
          sg_message_id: `${messageId}.filter0001.example.com`
        });
      }, 100);

      // Delivered event (1-5 seconds)
      setTimeout(() => {
        this.emitEmailEvent({
          email: recipient.email,
          event: 'delivered',
          timestamp: Date.now(),
          messageId,
          sg_message_id: `${messageId}.filter0001.example.com`
        });
      }, Math.random() * 4000 + 1000);

      // Open event (random chance, 10-30 seconds)
      if (Math.random() < 0.3) { // 30% open rate
        setTimeout(() => {
          this.emitEmailEvent({
            email: recipient.email,
            event: 'open',
            timestamp: Date.now(),
            messageId,
            sg_message_id: `${messageId}.filter0001.example.com`,
            useragent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
            ip: '192.168.1.100'
          });
        }, Math.random() * 20000 + 10000);
      }

      // Click event (random chance, 15-60 seconds)
      if (Math.random() < 0.1) { // 10% click rate
        setTimeout(() => {
          this.emitEmailEvent({
            email: recipient.email,
            event: 'click',
            timestamp: Date.now(),
            messageId,
            sg_message_id: `${messageId}.filter0001.example.com`,
            url: 'https://app.serenity.com/checkin',
            useragent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
            ip: '192.168.1.100'
          });
        }, Math.random() * 45000 + 15000);
      }
    });
  }

  private emitEmailEvent(event: MockEmailEvent): void {
    this.emailEvents.push(event);
    this.emit('emailEvent', event);
  }

  // Rate limiting
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const rateLimitKey = 'global';
    const rateLimit = this.rateLimits.get(rateLimitKey);

    if (rateLimit) {
      if (now < rateLimit.resetTime) {
        if (rateLimit.count >= 100) { // 100 requests per minute limit
          throw new Error('Rate limit exceeded');
        }
        rateLimit.count++;
      } else {
        // Reset rate limit window
        this.rateLimits.set(rateLimitKey, { count: 1, resetTime: now + 60000 });
      }
    } else {
      this.rateLimits.set(rateLimitKey, { count: 1, resetTime: now + 60000 });
    }
  }

  // Template management
  async createTemplate(template: Omit<MockTemplate, 'id'>): Promise<MockTemplate> {
    const id = `template_${this.generateRandomId()}`;
    const newTemplate: MockTemplate = { ...template, id };
    this.templates.set(id, newTemplate);
    return newTemplate;
  }

  async getTemplate(templateId: string): Promise<MockTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async listTemplates(): Promise<MockTemplate[]> {
    return Array.from(this.templates.values());
  }

  // Suppression management
  async addToSuppressionGroup(groupId: number, emails: string[]): Promise<void> {
    emails.forEach(email => this.suppressedEmails.add(email));
  }

  async removeFromSuppressionGroup(groupId: number, emails: string[]): Promise<void> {
    emails.forEach(email => this.suppressedEmails.delete(email));
  }

  async getSuppressions(groupId?: number): Promise<string[]> {
    return Array.from(this.suppressedEmails);
  }

  // Mock failure scenarios
  mockFailure(message: string, retries: number = 0): void {
    this.isFailure = true;
    this.failureMessage = message;
    this.failureRetries = retries;
  }

  mockSelectiveFailure(failureFunction: (email: MockEmailMessage) => boolean): void {
    this.selectiveFailureFunction = failureFunction;
  }

  clearFailure(): void {
    this.isFailure = false;
    this.failureMessage = '';
    this.failureRetries = 0;
    this.selectiveFailureFunction = undefined;
  }

  // Analytics and reporting
  getEmailStats(startDate?: Date, endDate?: Date): {
    sent: number;
    delivered: number;
    opens: number;
    clicks: number;
    bounces: number;
    spamReports: number;
    unsubscribes: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  } {
    const relevantEvents = this.emailEvents.filter(event => {
      if (!startDate && !endDate) return true;
      const eventDate = new Date(event.timestamp);
      return (!startDate || eventDate >= startDate) && (!endDate || eventDate <= endDate);
    });

    const sent = this.sentEmails.length;
    const delivered = relevantEvents.filter(e => e.event === 'delivered').length;
    const opens = relevantEvents.filter(e => e.event === 'open').length;
    const clicks = relevantEvents.filter(e => e.event === 'click').length;
    const bounces = relevantEvents.filter(e => e.event === 'bounce').length;
    const spamReports = relevantEvents.filter(e => e.event === 'spam_report').length;
    const unsubscribes = relevantEvents.filter(e => e.event === 'unsubscribe').length;

    return {
      sent,
      delivered,
      opens,
      clicks,
      bounces,
      spamReports,
      unsubscribes,
      deliveryRate: sent > 0 ? (delivered / sent) * 100 : 0,
      openRate: delivered > 0 ? (opens / delivered) * 100 : 0,
      clickRate: delivered > 0 ? (clicks / delivered) * 100 : 0
    };
  }

  // Batch email operations
  async sendBatchEmail(emails: MockEmailMessage[], batchId?: string): Promise<any[]> {
    const batch = emails.map(email => ({
      ...email,
      batchId: batchId || `batch_${this.generateRandomId()}`
    }));

    return this.sendEmail(batch);
  }

  // Email validation
  async validateEmail(email: string): Promise<{
    email: string;
    valid: boolean;
    reason?: string;
    suggestion?: string;
  }> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const valid = emailRegex.test(email);

    const result = {
      email,
      valid,
      reason: valid ? undefined : 'Invalid email format',
      suggestion: undefined as string | undefined
    };

    // Provide suggestions for common typos
    if (!valid) {
      if (email.includes('gmial.com')) {
        result.suggestion = email.replace('gmial.com', 'gmail.com');
      } else if (email.includes('yahooo.com')) {
        result.suggestion = email.replace('yahooo.com', 'yahoo.com');
      }
    }

    return result;
  }

  // Utility methods for testing
  getSentEmails(): MockEmailMessage[] {
    return [...this.sentEmails];
  }

  getEmailEvents(): MockEmailEvent[] {
    return [...this.emailEvents];
  }

  getApiUsage(): typeof this.apiUsage {
    return { ...this.apiUsage };
  }

  reset(): void {
    this.sentEmails = [];
    this.emailEvents = [];
    this.suppressedEmails.clear();
    this.rateLimits.clear();
    this.clearFailure();
    this.apiUsage = {
      requestsToday: 0,
      requestsThisMonth: 0,
      limit: 100000
    };
    this.removeAllListeners();
  }

  private generateRandomId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Advanced features for testing
  async simulateEmailBounce(email: string, reason: string = 'Invalid email address'): Promise<void> {
    const bounceEvent: MockEmailEvent = {
      email,
      event: 'bounce',
      timestamp: Date.now(),
      messageId: `bounce_${this.generateRandomId()}`,
      reason
    };

    this.emitEmailEvent(bounceEvent);
  }

  async simulateSpamReport(email: string): Promise<void> {
    const spamEvent: MockEmailEvent = {
      email,
      event: 'spam_report',
      timestamp: Date.now(),
      messageId: `spam_${this.generateRandomId()}`
    };

    this.emitEmailEvent(spamEvent);
    this.suppressedEmails.add(email); // Auto-suppress spam reporters
  }

  // Webhook simulation for testing
  createWebhookHandler(): (events: MockEmailEvent[]) => void {
    return (events: MockEmailEvent[]) => {
      events.forEach(event => {
        this.emitEmailEvent(event);
      });
    };
  }

  // Export compliance data
  async exportEmailData(startDate: Date, endDate: Date): Promise<{
    exportId: string;
    status: 'pending' | 'completed';
    downloadUrl?: string;
    recordCount?: number;
  }> {
    const relevantEmails = this.sentEmails.filter(email => {
      const emailDate = new Date(email.timestamp || 0);
      return emailDate >= startDate && emailDate <= endDate;
    });

    return {
      exportId: `export_${this.generateRandomId()}`,
      status: 'completed',
      downloadUrl: 'https://mock-export-url.com/email-export.csv',
      recordCount: relevantEmails.length
    };
  }
}