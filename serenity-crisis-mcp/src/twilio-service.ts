import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

export interface SupporterInfo {
  name: string;
  phone: string;
  patientName: string;
  tier: number;
}

export class TwilioService {
  private client: twilio.Twilio;
  private supabase: any;
  private fromNumber: string;
  
  constructor() {
    // Initialize Twilio client
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    // Initialize Supabase client
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
    
    console.log('TwilioService initialized');
  }

  /**
   * Send a crisis SMS alert with HIPAA-compliant logging
   */
  async sendCrisisSMS(to: string, message: string, alertId: string): Promise<any> {
    try {
      console.log(`Sending SMS to ${to.slice(-4)}... Alert ID: ${alertId}`);
      
      // For development, if Twilio credentials not set, simulate
      if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_account_sid_here') {
        console.log('⚠️ Twilio not configured - SIMULATING SMS');
        console.log(`📱 TO: ${to}`);
        console.log(`📝 MESSAGE: ${message}`);
        
        // Still log to database for testing
        await this.logSMS(alertId, to, 'simulated', 'sim_' + Date.now());
        
        return { 
          success: true, 
          sid: 'sim_' + Date.now(),
          simulated: true 
        };
      }
      
      // Send actual SMS via Twilio
      const result = await this.client.messages.create({
        body: `🚨 CRISIS ALERT: ${message}\n\nReply HELP if responding, STOP to opt out`,
        from: this.fromNumber,
        to: to
      });
      
      console.log(`✅ SMS sent successfully: ${result.sid}`);
      
      // Log to database for HIPAA compliance
      await this.logSMS(alertId, to, 'sent', result.sid);
      
      return { 
        success: true, 
        sid: result.sid,
        status: result.status 
      };
      
    } catch (error: any) {
      console.error('❌ SMS failed:', error.message);
      
      // Log failure
      await this.logSMS(alertId, to, 'failed', null, error.message);
      
      return { 
        success: false, 
        error: error.message 
      };
    }
  }
  
  /**
   * Cascade alerts to support network with staggered timing
   */
  async cascadeToSupporters(alertId: string, supporters: SupporterInfo[]): Promise<any[]> {
    console.log(`Starting cascade for ${supporters.length} supporters`);
    const results = [];
    
    // Group supporters by tier
    const tiers = supporters.reduce((acc: any, supporter) => {
      const tier = supporter.tier || 1;
      if (!acc[tier]) acc[tier] = [];
      acc[tier].push(supporter);
      return acc;
    }, {});
    
    // Process each tier with delays
    for (const tier of Object.keys(tiers).sort()) {
      console.log(`Processing Tier ${tier} with ${tiers[tier].length} supporters`);
      
      for (const supporter of tiers[tier]) {
        // Stagger by 10 seconds within tier
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
        const message = `${supporter.name}, ${supporter.patientName} needs immediate support. This is a Tier ${tier} crisis alert.`;
        
        const result = await this.sendCrisisSMS(
          supporter.phone, 
          message, 
          alertId
        );
        
        results.push({
          ...result,
          supporter: supporter.name,
          tier: tier
        });
        
        // If someone responds successfully in high priority tier, consider stopping
        if (result.success && parseInt(tier) === 1) {
          console.log('Tier 1 responder notified, monitoring for response...');
        }
      }
      
      // Wait 30 seconds between tiers
      if (parseInt(tier) < 3) {
        console.log(`Waiting 30 seconds before Tier ${parseInt(tier) + 1}...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
    
    return results;
  }
  
  /**
   * Send voice call for critical alerts (fallback from SMS)
   */
  async makeEmergencyCall(to: string, message: string, alertId: string): Promise<any> {
    try {
      console.log(`📞 Initiating emergency call to ${to.slice(-4)}...`);
      
      // For development, simulate if not configured
      if (!process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_ACCOUNT_SID === 'your_account_sid_here') {
        console.log('⚠️ Twilio not configured - SIMULATING CALL');
        return { success: true, simulated: true };
      }
      
      const call = await this.client.calls.create({
        twiml: `<Response>
          <Say voice="alice">
            This is an emergency alert from Serenity Recovery Support.
            ${message}
            Press 1 to acknowledge, or 2 to transfer to emergency services.
          </Say>
          <Gather numDigits="1" action="/api/crisis/call-response">
            <Say>Please press 1 or 2.</Say>
          </Gather>
        </Response>`,
        to: to,
        from: this.fromNumber
      });
      
      console.log(`✅ Call initiated: ${call.sid}`);
      return { success: true, callSid: call.sid };
      
    } catch (error: any) {
      console.error('❌ Call failed:', error.message);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Log SMS to database for HIPAA compliance
   */
  private async logSMS(
    alertId: string, 
    phoneNumber: string, 
    status: string, 
    messageSid: string | null,
    errorMessage?: string
  ): Promise<void> {
    try {
      // Only store last 4 digits for privacy
      const maskedPhone = phoneNumber.slice(-4);
      
      await this.supabase
        .from('sms_logs')
        .insert({
          alert_id: alertId,
          phone_number: maskedPhone,
          status: status,
          message_sid: messageSid,
          sent_at: new Date().toISOString(),
          error_message: errorMessage
        });
        
      console.log(`📝 SMS logged to database (${maskedPhone})`);
    } catch (error) {
      console.error('Failed to log SMS:', error);
    }
  }
  
  /**
   * Check SMS delivery status
   */
  async checkDeliveryStatus(messageSid: string): Promise<any> {
    try {
      if (messageSid.startsWith('sim_')) {
        return { status: 'simulated', delivered: true };
      }
      
      const message = await this.client.messages(messageSid).fetch();
      return {
        status: message.status,
        delivered: message.status === 'delivered',
        errorCode: message.errorCode,
        errorMessage: message.errorMessage
      };
    } catch (error: any) {
      return { status: 'unknown', error: error.message };
    }
  }
}

// Export singleton instance
export const twilioService = new TwilioService();