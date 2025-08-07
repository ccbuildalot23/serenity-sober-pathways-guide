import { CrisisAlertRequest, CrisisResponse, CrisisHandlerConfig, SupporterTier } from './types.js';

export class CrisisHandler {
  private config: CrisisHandlerConfig;

  constructor(config: Partial<CrisisHandlerConfig> = {}) {
    this.config = {
      enable_sms: true,
      enable_email: true,
      enable_push: true,
      escalation_delay_minutes: 5,
      max_retries: 3,
      ...config
    };
  }

  async handleCrisisAlert(request: CrisisAlertRequest): Promise<CrisisResponse> {
    try {
      console.log(`[CRISIS] Processing alert: ${request.severity} - ${request.message}`);
      
      const alertsSent = await this.sendAlerts(request);
      const escalationLevel = this.determineEscalationLevel(request.severity);
      
      const response: CrisisResponse = {
        success: true,
        message: `Crisis alert processed successfully. ${alertsSent} notifications sent.`,
        alerts_sent: alertsSent,
        timestamp: new Date().toISOString(),
        escalation_level: escalationLevel
      };

      console.log(`[CRISIS] Alert processed: ${response.message}`);
      return response;

    } catch (error) {
      console.error('[CRISIS] Error processing crisis alert:', error);
      
      return {
        success: false,
        message: `Failed to process crisis alert: ${error instanceof Error ? error.message : 'Unknown error'}`,
        alerts_sent: 0,
        timestamp: new Date().toISOString(),
        escalation_level: 'failed'
      };
    }
  }

  private async sendAlerts(request: CrisisAlertRequest): Promise<number> {
    let totalAlertsSent = 0;

    for (const tier of request.supporter_tiers) {
      const tierAlertsSent = await this.sendTierAlerts(tier, request);
      totalAlertsSent += tierAlertsSent;
      
      // Add delay between tiers for escalation
      if (tier.tier !== 'emergency') {
        await this.delay(this.config.escalation_delay_minutes * 60 * 1000);
      }
    }

    return totalAlertsSent;
  }

  private async sendTierAlerts(tier: SupporterTier, request: CrisisAlertRequest): Promise<number> {
    let alertsSent = 0;

    for (const contact of tier.contacts) {
      try {
        if (this.config.enable_sms && contact.phone) {
          await this.sendSMS(contact.phone, this.formatAlertMessage(request, contact, tier.tier));
          alertsSent++;
        }

        if (this.config.enable_email && contact.email) {
          await this.sendEmail(contact.email, this.formatAlertMessage(request, contact, tier.tier));
          alertsSent++;
        }

        if (this.config.enable_push) {
          await this.sendPushNotification(contact, this.formatAlertMessage(request, contact, tier.tier));
          alertsSent++;
        }

      } catch (error) {
        console.error(`[CRISIS] Failed to send alert to ${contact.name}:`, error);
      }
    }

    return alertsSent;
  }

  private formatAlertMessage(request: CrisisAlertRequest, contact: any, tier: string): string {
    const urgency = this.getUrgencyEmoji(request.severity);
    const tierLabel = this.getTierLabel(tier);
    
    return `${urgency} CRISIS ALERT - ${tierLabel.toUpperCase()}

${request.message}

Severity: ${request.severity.toUpperCase()}
Time: ${new Date().toLocaleString()}
Recipient: ${contact.name} (${contact.relationship})

This is an automated crisis alert from Serenity Sober Pathways. Please respond immediately if you can provide support.`;
  }

  private getUrgencyEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return '📢';
      default: return '📢';
    }
  }

  private getTierLabel(tier: string): string {
    switch (tier) {
      case 'emergency': return 'Emergency Contact';
      case 'primary': return 'Primary Supporter';
      case 'secondary': return 'Secondary Supporter';
      default: return 'Supporter';
    }
  }

  private determineEscalationLevel(severity: string): string {
    switch (severity) {
      case 'critical': return 'immediate';
      case 'high': return 'urgent';
      case 'medium': return 'standard';
      case 'low': return 'monitoring';
      default: return 'standard';
    }
  }

  // Mock notification methods - replace with actual implementations
  private async sendSMS(phone: string, message: string): Promise<void> {
    console.log(`[SMS] Sending to ${phone}: ${message.substring(0, 100)}...`);
    // TODO: Integrate with Twilio or other SMS service
    await this.delay(100); // Simulate API call
  }

  private async sendEmail(email: string, message: string): Promise<void> {
    console.log(`[EMAIL] Sending to ${email}: ${message.substring(0, 100)}...`);
    // TODO: Integrate with email service
    await this.delay(100); // Simulate API call
  }

  private async sendPushNotification(contact: any, message: string): Promise<void> {
    console.log(`[PUSH] Sending to ${contact.name}: ${message.substring(0, 100)}...`);
    // TODO: Integrate with push notification service
    await this.delay(100); // Simulate API call
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
