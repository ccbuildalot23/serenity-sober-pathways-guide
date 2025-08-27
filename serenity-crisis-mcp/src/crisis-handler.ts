import { CrisisAlertRequest, CrisisResponse, CrisisHandlerConfig, SupporterTier } from './types.js';
import { TwilioService, SupporterInfo } from './twilio-service.js';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

export class CrisisHandler {
  private config: CrisisHandlerConfig;
  private twilioService: TwilioService;
  private supabase: any;

  constructor(config: Partial<CrisisHandlerConfig> = {}) {
    this.config = {
      enable_sms: true,
      enable_email: true,
      enable_push: true,
      escalation_delay_minutes: 0.5, // 30 seconds for testing
      max_retries: 3,
      ...config
    };
    
    // Initialize services
    this.twilioService = new TwilioService();
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
  }

  /**
   * Main crisis alert handler with Twilio SMS integration
   */
  async handleCrisisAlert(request: CrisisAlertRequest): Promise<CrisisResponse> {
    try {
      console.log(`[CRISIS] Processing alert: ${request.severity} - ${request.message}`);
      
      const alertId = await this.createAlertRecord(request);
      const alertsSent = await this.sendAlerts(request, alertId);
      const escalationLevel = this.determineEscalationLevel(request.severity);
      
      const response: CrisisResponse = {
        success: true,
        message: `Crisis alert processed successfully. ${alertsSent} notifications sent.`,
        alerts_sent: alertsSent,
        timestamp: new Date().toISOString(),
        escalation_level: escalationLevel,
        alert_id: alertId
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

  /**
   * Enhanced trigger function for direct SMS sending with improved cascade timing
   */
  async triggerCrisisAlert(
    userId: string, 
    severity: string, 
    location: any, 
    message: string
  ): Promise<any> {
    const alertId = `alert_${Date.now()}_${userId}`;
    const startTime = Date.now();
    console.log(`\n🚨 TRIGGERING CRISIS ALERT: ${alertId}`);
    console.log(`Severity: ${severity}, User: ${userId}`);
    
    try {
      // Store alert in database
      await this.supabase.from('crisis_alerts').insert({
        id: alertId,
        user_id: userId,
        severity: severity,
        message: message,
        location: location,
        status: 'active',
        created_at: new Date().toISOString()
      });
      
      // Get user's support network
      const supporters = await this.getSupportNetwork(userId);
      
      if (supporters.length === 0) {
        console.log('⚠️ No supporters found, using test number');
        // Use test number if no supporters
        const testNumber = process.env.TEST_PHONE_NUMBER;
        if (testNumber) {
          await this.twilioService.sendCrisisSMS(
            testNumber,
            `TEST ALERT: ${message}`,
            alertId
          );
        }
      } else {
        // Send to support network with cascade
        await this.twilioService.cascadeToSupporters(alertId, supporters);
      }
      
      // If critical, also try voice call
      if (severity === 'critical' || severity === 'emergency') {
        const primaryContact = supporters[0] || { phone: process.env.TEST_PHONE_NUMBER };
        if (primaryContact.phone) {
          await this.twilioService.makeEmergencyCall(
            primaryContact.phone,
            message,
            alertId
          );
        }
      }
      
      return { 
        alertId, 
        status: 'triggered', 
        timestamp: new Date().toISOString(),
        supportersNotified: supporters.length 
      };
      
    } catch (error) {
      console.error('❌ Failed to trigger alert:', error);
      throw error;
    }
  }

  /**
   * Get support network from database
   */
  private async getSupportNetwork(userId: string): Promise<SupporterInfo[]> {
    try {
      // For testing, return mock data
      if (userId === 'test_user_123') {
        const testPhone = process.env.TEST_PHONE_NUMBER;
        if (testPhone) {
          return [
            {
              name: 'Primary Contact',
              phone: testPhone,
              patientName: 'Test Patient',
              tier: 1
            }
          ];
        }
      }
      
      // Get real support network from database
      const { data } = await this.supabase
        .from('support_network_members')
        .select('*')
        .eq('user_id', userId)
        .order('priority', { ascending: true });
      
      if (data && data.length > 0) {
        return data.map((member: any) => ({
          name: member.supporter_name,
          phone: member.supporter_phone,
          patientName: member.patient_name || 'Your friend',
          tier: member.priority || 1
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get support network:', error);
      return [];
    }
  }

  /**
   * Create alert record in database
   */
  private async createAlertRecord(request: CrisisAlertRequest): Promise<string> {
    const alertId = `alert_${Date.now()}`;
    
    try {
      await this.supabase.from('crisis_alerts').insert({
        id: alertId,
        severity: request.severity,
        message: request.message,
        status: 'active',
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to create alert record:', error);
    }
    
    return alertId;
  }

  private async sendAlerts(request: CrisisAlertRequest, alertId: string): Promise<number> {
    let totalAlertsSent = 0;

    // Convert supporter tiers to SupporterInfo format
    const allSupporters: SupporterInfo[] = [];
    
    for (const tier of request.supporter_tiers) {
      const tierNumber = tier.tier === 'emergency' ? 1 : 
                        tier.tier === 'primary' ? 2 : 3;
      
      for (const contact of tier.contacts) {
        if (contact.phone) {
          allSupporters.push({
            name: contact.name,
            phone: contact.phone,
            patientName: 'Patient in crisis',
            tier: tierNumber
          });
        }
      }
    }
    
    if (allSupporters.length > 0) {
      const results = await this.twilioService.cascadeToSupporters(alertId, allSupporters);
      totalAlertsSent = results.filter(r => r.success).length;
    }

    return totalAlertsSent;
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

  /**
   * Generate contextual crisis message based on severity and supporter type
   */
  async generateCrisisMessage(
    context: {
      severity: string,
      location?: any,
      patientName: string,
      supporterType: string,
      urgency: string
    }
  ): Promise<string> {
    const emoji = this.getUrgencyEmoji(context.severity);
    const locationInfo = context.location ? 
      `\n📍 Location: ${context.location.lat}, ${context.location.lng}` : '';
    
    let template = '';
    
    switch (context.supporterType) {
      case 'emergency':
        template = `${emoji} IMMEDIATE ACTION NEEDED\n\n${context.patientName} is experiencing a ${context.severity} crisis and needs urgent support.${locationInfo}\n\nPlease respond IMMEDIATELY or call emergency services.\n\nReply with:\n- "YES" if you can help now\n- "NO" if unavailable\n- "911" to trigger emergency services`;
        break;
      
      case 'primary':
        template = `${emoji} CRISIS ALERT - PRIMARY SUPPORT\n\n${context.patientName} needs your help. They're experiencing a ${context.severity} situation.${locationInfo}\n\nAs their primary supporter, your response is critical.\n\nReply with:\n- "COMING" if on your way\n- "CALLING" to connect by phone\n- "HELP" if you need backup`;
        break;
      
      case 'secondary':
        template = `${emoji} SUPPORT NEEDED\n\n${context.patientName} is in crisis. Primary contacts have been notified but we need backup support.${locationInfo}\n\nCan you help?\n\nReply: YES/NO/LATER`;
        break;
      
      default:
        template = `${emoji} CRISIS NOTIFICATION\n\n${context.patientName} is experiencing difficulties and the support network has been activated.${locationInfo}\n\nYour awareness and potential support are appreciated.`;
    }
    
    return template;
  }

  /**
   * Cascade to supporters with intelligent timing (10s within tier, 30s between tiers)
   */
  async cascadeToSupportersWithTiming(
    alertId: string,
    supporters: SupporterInfo[]
  ): Promise<any[]> {
    const results: any[] = [];
    const tierGroups = this.groupSupportersByTier(supporters);
    
    for (const [tier, tierSupporters] of Object.entries(tierGroups)) {
      console.log(`\n📢 Notifying Tier ${tier} (${tierSupporters.length} supporters)`);
      
      // Notify all supporters in this tier with 10s delays between each
      for (let i = 0; i < tierSupporters.length; i++) {
        const supporter = tierSupporters[i];
        
        // Generate contextual message
        const message = await this.generateCrisisMessage({
          severity: 'high',
          patientName: supporter.patientName || 'Your patient',
          supporterType: tier === '1' ? 'emergency' : tier === '2' ? 'primary' : 'secondary',
          urgency: 'immediate'
        });
        
        // Send SMS
        const result = await this.twilioService.sendCrisisSMS(
          supporter.phone,
          message,
          alertId
        );
        
        results.push({
          supporter: supporter.name,
          tier,
          success: result.success,
          timestamp: new Date().toISOString()
        });
        
        // 10 second delay between supporters in same tier (except last one)
        if (i < tierSupporters.length - 1) {
          console.log('⏱️ Waiting 10 seconds before next supporter in tier...');
          await this.delay(10000);
        }
      }
      
      // 30 second delay between tiers (except after last tier)
      if (tier !== '3') {
        console.log('⏱️ Waiting 30 seconds before next tier...');
        await this.delay(30000);
      }
    }
    
    return results;
  }

  /**
   * Group supporters by tier for cascade logic
   */
  private groupSupportersByTier(supporters: SupporterInfo[]): Record<string, SupporterInfo[]> {
    const groups: Record<string, SupporterInfo[]> = {};
    
    supporters.forEach(supporter => {
      const tier = supporter.tier?.toString() || '3';
      if (!groups[tier]) {
        groups[tier] = [];
      }
      groups[tier].push(supporter);
    });
    
    // Sort by tier priority (1 = highest)
    return Object.keys(groups)
      .sort()
      .reduce((sorted, key) => {
        sorted[key] = groups[key];
        return sorted;
      }, {} as Record<string, SupporterInfo[]>);
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Track supporter response
   */
  async trackSupporterResponse(
    alertId: string, 
    supporterId: string, 
    responseType: string,
    eta?: number
  ): Promise<any> {
    try {
      const response = {
        alert_id: alertId,
        supporter_id: supporterId,
        response_type: responseType,
        responded_at: new Date().toISOString(),
        eta_minutes: eta
      };
      
      await this.supabase
        .from('supporter_responses')
        .insert(response);
      
      // Update alert status if someone is responding
      if (responseType === 'immediate' || responseType === 'on_my_way') {
        await this.supabase
          .from('crisis_alerts')
          .update({ 
            status: 'responded',
            first_response_at: new Date().toISOString()
          })
          .eq('id', alertId);
      }
      
      console.log(`✅ Response tracked: ${supporterId} - ${responseType}`);
      return { success: true, response };
      
    } catch (error) {
      console.error('Failed to track response:', error);
      return { success: false, error };
    }
  }

  /**
   * Escalate to emergency services
   */
  async escalateToEmergency(alertId: string, location: any, medicalInfo?: any): Promise<any> {
    console.log('🚨🚨 ESCALATING TO EMERGENCY SERVICES 🚨🚨');
    
    // In production, this would integrate with 911 API
    // For now, notify all tier 1 contacts immediately
    
    const message = `EMERGENCY ESCALATION: Immediate professional help needed. Location: ${JSON.stringify(location)}`;
    
    // Get test number for demo
    const emergencyNumber = process.env.TEST_PHONE_NUMBER;
    if (emergencyNumber) {
      await this.twilioService.makeEmergencyCall(
        emergencyNumber,
        message,
        alertId
      );
    }
    
    return { 
      success: true, 
      escalated: true,
      timestamp: new Date().toISOString()
    };
  }
}