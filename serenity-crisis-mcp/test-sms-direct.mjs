import twilio from 'twilio';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🚀 Serenity Crisis SMS Direct Test');
console.log('=====================================\n');

// Initialize services
const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_ACCOUNT_SID !== 'your_account_sid_here'
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

/**
 * Send a test SMS
 */
async function sendTestSMS() {
  const testPhone = process.env.TEST_PHONE_NUMBER;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;
  
  console.log('📱 Sending test SMS...');
  console.log('To:', testPhone || 'NOT SET');
  console.log('From:', fromPhone || 'NOT SET');
  
  if (!twilioClient) {
    console.log('\n⚠️ Twilio not configured - SIMULATING SMS');
    console.log('📱 SIMULATED SMS:');
    console.log('  To:', testPhone || '+1234567890');
    console.log('  Message: 🚨 CRISIS ALERT: Test from Serenity system');
    console.log('  Status: Simulated delivery successful');
    
    // Still log to database
    const alertId = `test_${Date.now()}`;
    const { error } = await supabase
      .from('sms_logs')
      .insert({
        alert_id: alertId,
        phone_number: testPhone ? testPhone.slice(-4) : '7890',
        status: 'simulated',
        message_sid: `sim_${Date.now()}`,
        sent_at: new Date().toISOString()
      });
    
    if (error) {
      console.log('⚠️ Could not log to database:', error.message);
    } else {
      console.log('✅ Logged to database');
    }
    
    return { success: true, simulated: true };
  }
  
  try {
    const message = await twilioClient.messages.create({
      body: '🚨 CRISIS ALERT TEST: This is a test from Serenity Recovery Support. Reply HELP if you need assistance.',
      from: fromPhone,
      to: testPhone
    });
    
    console.log('✅ SMS sent successfully!');
    console.log('Message SID:', message.sid);
    console.log('Status:', message.status);
    
    // Log to database
    const { error } = await supabase
      .from('sms_logs')
      .insert({
        alert_id: `test_${Date.now()}`,
        phone_number: testPhone.slice(-4),
        status: 'sent',
        message_sid: message.sid,
        sent_at: new Date().toISOString()
      });
    
    if (error) {
      console.log('⚠️ Could not log to database:', error.message);
    } else {
      console.log('✅ Logged to database');
    }
    
    return { success: true, sid: message.sid };
    
  } catch (error) {
    console.error('❌ SMS failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test database connection
 */
async function testDatabase() {
  console.log('\n📊 Testing database connection...');
  
  try {
    // Try to read from crisis_alerts table
    const { data, error } = await supabase
      .from('crisis_alerts')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Database error:', error.message);
      return false;
    }
    
    console.log('✅ Database connected successfully');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTest() {
  console.log('Environment check:');
  console.log('- Twilio:', twilioClient ? '✅ Configured' : '⚠️ Not configured (will simulate)');
  console.log('- Supabase:', process.env.SUPABASE_URL ? '✅ Configured' : '❌ Not configured');
  console.log('- Test phone:', process.env.TEST_PHONE_NUMBER || '❌ Not set');
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test database
  const dbConnected = await testDatabase();
  
  if (!dbConnected) {
    console.log('\n⚠️ Database not connected, but continuing with SMS test...\n');
  }
  
  // Test SMS
  const smsResult = await sendTestSMS();
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST RESULTS:');
  console.log('='.repeat(50));
  
  if (smsResult.success) {
    if (smsResult.simulated) {
      console.log('✅ SMS system: WORKING (simulated mode)');
      console.log('ℹ️  To send real SMS, add Twilio credentials to .env');
    } else {
      console.log('✅ SMS system: WORKING (real SMS sent!)');
      console.log('📱 Check your phone for the message!');
    }
  } else {
    console.log('❌ SMS system: FAILED');
    console.log('Error:', smsResult.error);
  }
  
  console.log('✅ Database:', dbConnected ? 'CONNECTED' : 'NOT CONNECTED');
  
  console.log('\n🎯 Crisis SMS system is ready for testing!');
  console.log('Next steps:');
  console.log('1. Add your Twilio credentials to .env');
  console.log('2. Set TEST_PHONE_NUMBER to your phone');
  console.log('3. Run this test again to send real SMS');
}

// Run the test
runTest().catch(console.error);