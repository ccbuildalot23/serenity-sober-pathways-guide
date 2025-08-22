#!/usr/bin/env node

/**
 * 🎯 DEMO AUTOMATION
 * Coordinates all demo actions at precise timestamps
 */

const { exec } = require('child_process');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../serenity-crisis-mcp/.env') });

class DemoAutomation {
  constructor() {
    this.actions = {
      triggerCrisis: this.triggerCrisis.bind(this),
      showBilling: this.showBilling.bind(this),
      showROI: this.showROI.bind(this),
      showSignup: this.showSignup.bind(this),
      finalCTA: this.finalCTA.bind(this)
    };
    
    this.timeline = [
      { time: 45, action: 'triggerCrisis', description: 'Send crisis SMS' },
      { time: 90, action: 'showBilling', description: 'Display CPT codes' },
      { time: 120, action: 'showROI', description: 'Calculate savings' },
      { time: 150, action: 'showSignup', description: 'Provider signup link' },
      { time: 175, action: 'finalCTA', description: 'Book demo CTA' }
    ];
  }

  start() {
    console.log('🎬 Demo Automation Started');
    this.startTime = Date.now();
    
    // Schedule all actions
    this.timeline.forEach(item => {
      setTimeout(() => {
        console.log(`\n⚡ [${this.formatTime(item.time)}] ${item.description}`);
        this.actions[item.action]();
      }, item.time * 1000);
    });
  }

  async triggerCrisis() {
    console.log('📱 Triggering crisis alert...');
    
    // Use Twilio to send SMS
    try {
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      
      const message = await client.messages.create({
        body: `🚨 DEMO CRISIS ALERT

Patient: Sarah Johnson
Location: Arlington, VA  
Status: Immediate support needed
Days clean: 45

This is a demo for providers.
Tap to respond: https://serenity.health/demo`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.MY_PHONE_NUMBER
      });
      
      console.log('✅ SMS sent:', message.sid);
      
      // Flash screen border
      this.flashScreenBorder('#ff0000');
      
    } catch (error) {
      console.log('⚠️  SMS failed (practice mode?):', error.message);
    }
  }

  showBilling() {
    console.log('💰 Showing billing automation...');
    
    // Generate sample CPT codes
    const codes = [
      { code: '90834', desc: 'Individual Therapy 45min', amount: 120.00 },
      { code: '99490', desc: 'Care Coordination', amount: 42.00 },
      { code: '90785', desc: 'Interactive Complexity', amount: 15.52 },
      { code: 'G2061', desc: 'Brief Communication', amount: 48.00 }
    ];
    
    let total = 0;
    codes.forEach((item, index) => {
      setTimeout(() => {
        console.log(`  ✓ ${item.code}: ${item.desc} - $${item.amount}`);
        total += item.amount;
        if (index === codes.length - 1) {
          console.log(`  💵 Total: $${total.toFixed(2)}`);
        }
      }, index * 500);
    });
    
    this.flashScreenBorder('#00ff00');
  }

  showROI() {
    console.log('📊 Calculating ROI...');
    
    const calculations = {
      'Time saved per week': '10 hours',
      'Value at $150/hour': '$1,500',
      'Monthly care coordination': '$2,800',
      'Reduced patient churn': '$800',
      'Total monthly value': '$9,400',
      'Platform cost': '$299',
      'ROI': '31x'
    };
    
    Object.entries(calculations).forEach(([key, value], index) => {
      setTimeout(() => {
        console.log(`  ${key}: ${value}`);
      }, index * 300);
    });
    
    this.flashScreenBorder('#FFD700');
  }

  showSignup() {
    console.log('🎯 Displaying signup link...');
    console.log('  📱 Text: 240-419-9375');
    console.log('  🌐 Web: serenity-recovery.com/demo');
    console.log('  📅 Calendar: calendly.com/serenity-health');
    console.log('  ⏰ Only 5 spots remaining!');
    
    this.flashScreenBorder('#00ffff');
  }

  finalCTA() {
    console.log('📞 FINAL CALL TO ACTION');
    console.log('  🚨 3 spots already taken');
    console.log('  ⏰ 2 spots remaining');
    console.log('  📱 Text NOW: 240-419-9375');
    
    // Dramatic finish
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.flashScreenBorder('#ff00ff');
      }, i * 500);
    }
  }

  flashScreenBorder(color) {
    // In a real implementation, this would control screen borders
    // For now, just log it
    console.log(`  🎨 Screen border: ${color}`);
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }
}

// Export for use by director
module.exports = DemoAutomation;

// Run standalone if called directly
if (require.main === module) {
  const automation = new DemoAutomation();
  automation.start();
}