/**
 * Production Twilio Service for Crisis Alerts
 * HIPAA-compliant SMS/Voice delivery with real-time tracking
 */

import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

export interface SupporterInfo {
  name: string;
  phone: string;
  patientName?: string;
  tier?: number;
}

interface SMSCost {
  count: number;
  totalCost: number;
  lastReset: Date;
}

export class TwilioServiceProduction {
  private client: any;
  private supabase: any;
  private fromNumber: string;
  private smsCost: SMSCost;
  private rateLimitCounter: Map<string, number>;
  private readonly SMS_COST = 0.0079;
  private readonly VOICE_COST_PER_MIN = 0.013;
  private readonly MAX_SMS_PER_MINUTE = 100;
  private readonly MAX_RETRIES = 3;

  constructor() {
    // Validate environment variables
    this.validateEnvironment();
    
    // Initialize Twilio client
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
    
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER!;
    
    // Initialize Supabase
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY!
    );
    
    // Initialize cost tracking
    this.smsCost = {
      count: 0,
      totalCost: 0,
      lastReset: new Date()
    };
    
    // Initialize rate limiting
    this.rateLimitCounter = new Map();
    this.startRateLimitReset();
    
    console.log('✅ Production Twilio Service initialized');
    console.log(`📱 Using phone number: ${this.fromNumber}`);
  }

  /**
   * Validate required environment variables
   */
  private validateEnvironment() {
    const required = [
      'TWILIO_ACCOUNT_SID',
      'TWILIO_AUTH_TOKEN', 
      'TWILIO_PHONE_NUMBER',
      'SUPABASE_URL'
    ];
    
    const missing = required.filter(key => !process.env[key] || process.env[key] === 'your_account_sid_here');
    
    if (missing.length > 0) {
      throw new Error(`CRITICAL: Missing required environment variables: ${missing.join(', ')}\nPlease configure in .env.local`);
    }
    
    // Validate Twilio credentials format
    if (!process.env.TWILIO_ACCOUNT_SID!.startsWith('AC')) {
      throw new Error('Invalid Twilio Account SID. Must start with "AC"');
    }
    
    if (process.env.TWILIO_AUTH_TOKEN!.length !== 32) {
      throw new Error('Invalid Twilio Auth Token. Must be 32 characters');
    }
  }

  /**
   * Send crisis SMS with retry logic and cost tracking
   */
  async sendCrisisSMS(to: string, message: string, alertId: string): Promise<any> {
    // Check rate limit
    await this.checkRateLimit('sms');
    
    // Attempt to send with retry logic
    let lastError: any;
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        console.log(`📱 Sending SMS (attempt ${attempt}/${this.MAX_RETRIES}) to ${to.slice(-4)}...`);
        
        // Send SMS via Twilio
        const result = await this.client.messages.create({
          body: message,
          from: this.fromNumber,
          to: to,
          statusCallback: process.env.WEBHOOK_BASE_URL ? 
            `${process.env.WEBHOOK_BASE_URL}/twilio/status` : undefined
        });
        
        console.log(`✅ SMS sent successfully: ${result.sid}`);
        
        // Track cost
        this.trackCost('sms');
        
        // Log to database
        await this.logSMS(alertId, to, 'sent', result.sid);
        
        return {
          success: true,
          sid: result.sid,
          status: result.status,
          cost: this.SMS_COST,
          attempt
        };
        
      } catch (error: any) {
        lastError = error;
        console.error(`❌ SMS attempt ${attempt} failed:`, error.message);
        
        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          break;
        }
        
        // Exponential backoff
        if (attempt < this.MAX_RETRIES) {
          const delay = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.delay(delay);
        }
      }
    }
    
    // All attempts failed
    await this.logSMS(alertId, to, 'failed', null, lastError?.message);
    
    // Try fallback number if primary fails
    if (process.env.EMERGENCY_CONTACT && to !== process.env.EMERGENCY_CONTACT) {
      console.log('📞 Attempting fallback to emergency contact...');
      return this.sendCrisisSMS(process.env.EMERGENCY_CONTACT, message, alertId);
    }
    
    throw new Error(`Failed to send SMS after ${this.MAX_RETRIES} attempts: ${lastError?.message}`);
  }

  /**
   * Make emergency voice call
   */
  async makeEmergencyCall(to: string, message: string, alertId: string): Promise<any> {
    // Check rate limit
    await this.checkRateLimit('voice');
    
    try {
      console.log(`📞 Making emergency call to ${to.slice(-4)}...`);
      
      // TwiML for voice message
      const twiml = `
        <Response>
          <Say voice="alice" language="en-US">
            This is an emergency alert from Serenity Recovery Support.
            ${message}
            Press 1 if you can help. Press 2 if you cannot help at this time.
          </Say>
          <Gather numDigits="1" action="${process.env.WEBHOOK_BASE_URL}/voice/response" method="POST">
            <Say>Please press 1 to confirm you can help, or press 2 if unavailable.</Say>
          </Gather>
          <Say>We did not receive a response. The alert will be escalated.</Say>
        </Response>
      `.trim();
      
      const call = await this.client.calls.create({
        twiml,
        to,
        from: this.fromNumber,
        statusCallback: process.env.WEBHOOK_BASE_URL ? 
          `${process.env.WEBHOOK_BASE_URL}/voice/status` : undefined,
        timeout: 60 // 60 second timeout
      });
      
      console.log(`✅ Call initiated: ${call.sid}`);
      
      // Track cost (minimum 1 minute)
      this.trackCost('voice', 1);
      
      return {
        success: true,
        sid: call.sid,
        status: call.status,
        cost: this.VOICE_COST_PER_MIN
      };
      
    } catch (error: any) {
      console.error('❌ Voice call failed:', error.message);
      throw error;
    }
  }

  /**
   * Cascade notifications to support network with timing
   */
  async cascadeToSupporters(alertId: string, supporters: SupporterInfo[]): Promise<any[]> {
    const results: any[] = [];
    const tierGroups = this.groupByTier(supporters);
    
    for (const [tier, tierSupporters] of Object.entries(tierGroups)) {
      console.log(`\n🔄 Cascading to Tier ${tier} (${tierSupporters.length} supporters)`);
      
      // Notify all in this tier with 10-second delays
      for (let i = 0; i < tierSupporters.length; i++) {
        const supporter = tierSupporters[i];
        
        try {
          const message = this.generateTierMessage(parseInt(tier), supporter);
          const result = await this.sendCrisisSMS(supporter.phone, message, alertId);
          
          results.push({
            supporter: supporter.name,
            tier,
            success: true,
            sid: result.sid,
            cost: result.cost
          });
          
        } catch (error: any) {
          results.push({
            supporter: supporter.name,
            tier,
            success: false,
            error: error.message
          });
        }
        
        // 10-second delay between supporters in same tier
        if (i < tierSupporters.length - 1) {
          console.log('⏱️ Waiting 10 seconds before next supporter...');
          await this.delay(10000);
        }
      }
      
      // 30-second delay between tiers
      if (tier !== '3') {
        console.log('⏱️ Waiting 30 seconds before next tier...');
        await this.delay(30000);
      }
    }
    
    return results;
  }

  /**
   * Check delivery status
   */
  async checkDeliveryStatus(messageSid: string): Promise<any> {
    try {
      const message = await this.client.messages(messageSid).fetch();
      
      return {
        sid: message.sid,
        status: message.status,
        delivered: message.status === 'delivered',
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
      
    } catch (error: any) {
      console.error('Failed to check status:', error.message);
      return { status: 'unknown', error: error.message };
    }
  }

  /**
   * Rate limiting
   */
  private async checkRateLimit(type: 'sms' | 'voice') {
    const key = `${type}_${new Date().getMinutes()}`;
    const count = this.rateLimitCounter.get(key) || 0;
    
    const limit = type === 'sms' ? this.MAX_SMS_PER_MINUTE : 10;
    
    if (count >= limit) {
      console.log(`⚠️ Rate limit reached for ${type}. Waiting...`);
      await this.delay(60000); // Wait 1 minute
      this.rateLimitCounter.set(key, 0);
    }
    
    this.rateLimitCounter.set(key, count + 1);
  }

  /**
   * Reset rate limit counters every minute
   */
  private startRateLimitReset() {
    setInterval(() => {
      const currentMinute = new Date().getMinutes();
      const keysToDelete: string[] = [];
      
      this.rateLimitCounter.forEach((_, key) => {
        const [, minute] = key.split('_');
        if (parseInt(minute) !== currentMinute) {
          keysToDelete.push(key);
        }
      });
      
      keysToDelete.forEach(key => this.rateLimitCounter.delete(key));
    }, 60000);
  }

  /**
   * Track costs
   */
  private trackCost(type: 'sms' | 'voice', minutes: number = 0) {
    const cost = type === 'sms' ? this.SMS_COST : this.VOICE_COST_PER_MIN * minutes;
    
    this.smsCost.count++;
    this.smsCost.totalCost += cost;
    
    // Log cost summary every 100 messages
    if (this.smsCost.count % 100 === 0) {
      console.log(`💰 Cost Summary: ${this.smsCost.count} messages, $${this.smsCost.totalCost.toFixed(2)} total`);
    }
    
    // Alert if spending exceeds threshold
    if (this.smsCost.totalCost > 50) {
      console.warn(`⚠️ HIGH SPEND ALERT: $${this.smsCost.totalCost.toFixed(2)} spent on messaging`);
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableCodes = [
      20429, // Too many requests
      30001, // Queue overflow
      30002, // Account suspended (temporary)
      30003, // Unreachable destination
      30005, // Unknown destination
      30006, // Landline or unreachable carrier
      30007, // Carrier violation
      30008, // Unknown error
      50001, // Service unavailable
      50002, // Gateway timeout
    ];
    
    return retryableCodes.includes(error.code) || 
           error.message?.includes('timeout') ||
           error.message?.includes('ETIMEDOUT');
  }

  /**
   * Generate tier-specific message
   */
  private generateTierMessage(tier: number, supporter: SupporterInfo): string {
    const patient = supporter.patientName || 'Someone';
    
    switch (tier) {
      case 1:
        return `🚨 URGENT: ${patient} needs immediate help. This is a crisis situation. Reply YES if you can respond now, NO if unavailable.`;
      case 2:
        return `⚠️ ESCALATION: ${patient} still needs help. Primary contacts unavailable. Can you respond? Reply YES/NO`;
      case 3:
        return `📢 CRITICAL: ${patient} in crisis, no response yet. You're in the final support tier. Please reply YES if you can help.`;
      default:
        return `🆘 ${patient} needs support. Reply YES if available to help.`;
    }
  }

  /**
   * Group supporters by tier
   */
  private groupByTier(supporters: SupporterInfo[]): Record<string, SupporterInfo[]> {
    const groups: Record<string, SupporterInfo[]> = {};
    
    supporters.forEach(supporter => {
      const tier = (supporter.tier || 3).toString();
      if (!groups[tier]) groups[tier] = [];
      groups[tier].push(supporter);
    });
    
    return groups;
  }

  /**
   * Log SMS to database for HIPAA compliance
   */
  private async logSMS(alertId: string, phone: string, status: string, sid: string | null, error?: string) {
    try {
      await this.supabase.from('sms_logs').insert({
        alert_id: alertId,
        phone_number: phone.slice(-4), // Only last 4 digits for HIPAA
        status,
        message_sid: sid,
        error_message: error,
        sent_at: new Date().toISOString()
      });
    } catch (dbError) {
      console.error('Failed to log SMS to database:', dbError);
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get cost summary
   */
  getCostSummary(): SMSCost {
    return { ...this.smsCost };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<any> {
    try {
      // Check Twilio connection
      const account = await this.client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      
      // Check database connection
      const { error } = await this.supabase.from('sms_logs').select('id').limit(1);
      
      return {
        status: 'healthy',
        twilio: {
          connected: true,
          accountStatus: account.status,
          balance: account.balance
        },
        database: {
          connected: !error
        },
        costs: this.getCostSummary(),
        timestamp: new Date().toISOString()
      };
      
    } catch (error: any) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Export singleton instance
export const twilioService = new TwilioServiceProduction();