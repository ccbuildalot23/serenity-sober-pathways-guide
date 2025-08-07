import { CrisisAlertRequest, CrisisResponse, CrisisHandlerConfig, SupporterTier, StaggeredTimingConfig } from './types.js';

export class CrisisHandler {
  private config: CrisisHandlerConfig;
  private defaultStaggeredTiming: StaggeredTimingConfig = {
    tierDelays: {
      primary: 30000,     // 30 seconds
      secondary: 90000,   // 90 seconds
      emergency: 180000   // 180 seconds (3 minutes)
    },
    severityMultipliers: {
      critical: 0.5,      // Half the time (faster)
      high: 1.0,          // Standard timing
      medium: 2.0,        // Double the time
      low: 4.0            // Quadruple the time
    }
  };

  constructor(config: Partial<CrisisHandlerConfig> = {}) {
    this.config = {
      enable_sms: true,
      enable_email: true,
      enable_push: true,
      escalation_delay_minutes: 5,
      max_retries: 3,
      staggeredTiming: this.defaultStaggeredTiming,
      ...config
    };
  }

  async handleCrisisAlert(request: CrisisAlertRequest): Promise<CrisisResponse> {
    try {
      console.log(`[CRISIS] Processing alert: ${request.severity} - ${request.message}`);
      console.log(`[CRISIS] Using staggered timing with severity multiplier: ${this.getSeverityMultiplier(request.severity)}x`);
      
      const alertsSent = await this.sendAlerts(request);
      const escalationLevel = this.determineEscalationLevel(request.severity);
      
      const response: CrisisResponse = {
        success: true,
        message: `Crisis alert processed successfully. ${alertsSent} notifications sent with staggered timing.`,
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
    const startTime = Date.now();

    for (let i = 0; i < request.supporter_tiers.length; i++) {
      const tier = request.supporter_tiers[i];
      
      // Calculate staggered delay for this tier
      const delay = this.calculateStaggeredDelay(tier.tier, request.severity);
      
      if (i > 0) {
        console.log(`[CRISIS] Waiting ${delay / 1000} seconds before notifying ${tier.tier} tier...`);
        await this.delay(delay);
      } else {
        console.log(`[CRISIS] Notifying ${tier.tier} tier immediately (first tier)`);
      }
      
      const tierStartTime = Date.now();
      const tierAlertsSent = await this.sendTierAlertsConcurrently(tier, request);
      const tierDuration = Date.now() - tierStartTime;
      
      console.log(`[CRISIS] ${tier.tier} tier: ${tierAlertsSent} notifications sent in ${tierDuration}ms`);
      totalAlertsSent += tierAlertsSent;
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[CRISIS] Total notification time: ${totalDuration}ms`);
    
    return totalAlertsSent;
  }

  private calculateStaggeredDelay(tierType: string, severity: string): number {
    const timing = this.config.staggeredTiming || this.defaultStaggeredTiming;
    
    // Get base delay for tier
    let baseDelay: number;
    switch (tierType) {
      case 'primary':
        baseDelay = timing.tierDelays.primary;
        break;
      case 'secondary':
        baseDelay = timing.tierDelays.secondary;
        break;
      case 'emergency':
        baseDelay = timing.tierDelays.emergency;
        break;
      default:
        baseDelay = timing.tierDelays.secondary; // Default to secondary timing
    }
    
    // Apply severity multiplier
    const multiplier = this.getSeverityMultiplier(severity);
    const adjustedDelay = Math.round(baseDelay * multiplier);
    
    console.log(`[TIMING] Tier: ${tierType}, Severity: ${severity}, Base: ${baseDelay}ms, Multiplier: ${multiplier}x, Final: ${adjustedDelay}ms`);
    
    return adjustedDelay;
  }

  private getSeverityMultiplier(severity: string): number {
    const timing = this.config.staggeredTiming || this.defaultStaggeredTiming;
    
    switch (severity) {
      case 'critical':
        return timing.severityMultipliers.critical;
      case 'high':
        return timing.severityMultipliers.high;
      case 'medium':
        return timing.severityMultipliers.medium;
      case 'low':
        return timing.severityMultipliers.low;
      default:
        return timing.severityMultipliers.high; // Default to standard timing
    }
  }

  private async sendTierAlertsConcurrently(tier: SupporterTier, request: CrisisAlertRequest): Promise<number> {
    console.log(`[CRISIS] Sending concurrent notifications to ${tier.contacts.length} contacts in ${tier.tier} tier`);
    
    // Send all notifications for this tier concurrently
    const notificationPromises = tier.contacts.map(contact => 
      this.sendContactNotifications(contact, tier, request)
    );
    
    // Wait for all notifications to complete
    const results = await Promise.allSettled(notificationPromises);
    
    // Count successful notifications
    let successCount = 0;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value > 0) {
        successCount += result.value;
      } else if (result.status === 'rejected') {
        console.error(`[CRISIS] Failed to notify contact ${tier.contacts[index].name}:`, result.reason);
      }
    });
    
    return successCount;
  }

  private async sendContactNotifications(contact: any, tier: SupporterTier, request: CrisisAlertRequest): Promise<number> {
    let alertsSent = 0;
    
    try {
      const message = this.formatAlertMessage(request, contact, tier.tier);
      
      // Send notifications concurrently for each contact
      const promises = [];
      
      if (this.config.enable_sms && contact.phone) {
        promises.push(this.sendSMS(contact.phone, message));
      }
      
      if (this.config.enable_email && contact.email) {
        promises.push(this.sendEmail(contact.email, message));
      }
      
      if (this.config.enable_push) {
        promises.push(this.sendPushNotification(contact, message));
      }
      
      const results = await Promise.allSettled(promises);
      
      // Count successful sends
      results.forEach(result => {
        if (result.status === 'fulfilled') {
          alertsSent++;
        }
      });
      
    } catch (error) {
      console.error(`[CRISIS] Failed to send notifications to ${contact.name}:`, error);
    }
    
    return alertsSent;
  }

  // Keep original sendTierAlerts for backward compatibility
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
      case 'critical': return '=�';
      case 'high': return '�';
      case 'medium': return '�';
      case 'low': return '=�';
      default: return '=�';
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