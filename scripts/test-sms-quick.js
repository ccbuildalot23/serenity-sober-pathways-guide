#!/usr/bin/env node

/**
 * Quick SMS test to verify Twilio is working
 * Run this before recording your Loom
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../serenity-crisis-mcp/.env') });

async function testSMS() {
  console.log('🔧 Testing SMS Configuration...\n');

  // Check environment variables
  const required = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER', 'MY_PHONE_NUMBER'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing environment variables:', missing.join(', '));
    console.log('\nPlease check serenity-crisis-mcp/.env file');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(`📱 Will send to: ${process.env.MY_PHONE_NUMBER}\n`);

  // Try to load Twilio
  let twilio;
  try {
    twilio = require('twilio');
    console.log('✅ Twilio SDK loaded');
  } catch (e) {
    console.log('📦 Installing Twilio SDK...');
    const { execSync } = require('child_process');
    try {
      execSync('npm install twilio', { cwd: __dirname, stdio: 'inherit' });
      twilio = require('twilio');
      console.log('✅ Twilio SDK installed');
    } catch (installError) {
      console.error('❌ Failed to install Twilio:', installError.message);
      process.exit(1);
    }
  }

  // Initialize client
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  // Send test message
  console.log('\n📤 Sending test SMS...');
  
  try {
    const message = await client.messages.create({
      body: '✅ Serenity SMS Test - Your crisis notification system is working! Reply STOP to opt out.',
      from: process.env.TWILIO_PHONE_NUMBER,
      to: process.env.MY_PHONE_NUMBER
    });

    console.log('\n🎉 SUCCESS!');
    console.log('Message SID:', message.sid);
    console.log('Status:', message.status);
    console.log('\n📱 Check your phone for the test message!');
    
    // Check balance
    try {
      const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
      console.log(`\n💰 Twilio Balance: ${account.balance} ${account.currency}`);
    } catch (e) {
      // Balance check is optional
    }

    console.log('\n✅ SMS system ready for demo!');
    console.log('You can now run: node demo-crisis-simple.js');

  } catch (error) {
    console.error('\n❌ Failed to send SMS:', error.message);
    
    if (error.code === 20003) {
      console.log('\n💡 Authentication failed. Check your Twilio credentials.');
    } else if (error.code === 21211) {
      console.log('\n💡 Invalid phone number. Check the format (+1XXXXXXXXXX).');
    } else if (error.code === 21608) {
      console.log('\n💡 The phone number is unverified. Add it in Twilio console.');
    }
    
    process.exit(1);
  }
}

// Run the test
console.log('🚀 Serenity SMS Test\n');
testSMS().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});