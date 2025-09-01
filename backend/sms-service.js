/**
 * SMS Service for Crisis Notifications
 * Can be configured with Twilio or other providers
 */

class SMSService {
  constructor() {
    this.enabled = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN;
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (this.enabled) {
      try {
        const twilio = require('twilio');
        this.client = twilio(this.accountSid, this.authToken);
        console.log('✅ SMS service enabled (Twilio)');
      } catch (err) {
        console.log('📝 Twilio not installed. Run: npm install twilio');
        this.enabled = false;
      }
    } else {
      console.log('📝 SMS service disabled (set TWILIO_* env vars to enable)');
    }
  }

  async sendCrisisAlert(phoneNumber, userName, message) {
    if (!this.enabled) {
      console.log(`[SMS Mock] Would send to ${phoneNumber}: Crisis alert from ${userName} - ${message}`);
      return { success: true, mock: true };
    }

    try {
      const result = await this.client.messages.create({
        body: `🚨 CRISIS ALERT: ${userName} needs immediate help. ${message || 'Please check on them immediately.'}`,
        from: this.fromNumber,
        to: phoneNumber
      });
      
      console.log(`✅ SMS sent to ${phoneNumber}: ${result.sid}`);
      return { success: true, sid: result.sid };
    } catch (error) {
      console.error('SMS send error:', error);
      return { success: false, error: error.message };
    }
  }

  async sendTestMessage(phoneNumber) {
    if (!this.enabled) {
      console.log(`[SMS Mock] Test message to ${phoneNumber}`);
      return { success: true, mock: true };
    }

    try {
      const result = await this.client.messages.create({
        body: 'Test message from Serenity. Your crisis alerts are configured correctly.',
        from: this.fromNumber,
        to: phoneNumber
      });
      
      return { success: true, sid: result.sid };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SMSService();