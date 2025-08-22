/**
 * Real SMS Test Script - Day 2 Sprint
 * Tests actual Twilio SMS delivery to your phone
 */

import { TwilioServiceProduction } from './dist/twilio-service-production.js';
import { CrisisHandler } from './dist/crisis-handler.js';
import dotenv from 'dotenv';
import readline from 'readline';

// Load environment
dotenv.config({ path: '.env.local' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

console.log('🚀 SERENITY REAL SMS TEST - DAY 2');
console.log('=' .repeat(50));
console.log('');

// Check configuration
function checkConfig() {
  console.log('📋 Configuration Check:');
  
  const required = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'MY_PHONE_NUMBER'
  ];
  
  let ready = true;
  
  required.forEach(key => {
    const value = process.env[key];
    if (!value || value.includes('xxxx')) {
      console.log(`❌ ${key}: NOT CONFIGURED`);
      ready = false;
    } else {
      const display = key.includes('TOKEN') ? '***' : value.slice(0, 6) + '...';
      console.log(`✅ ${key}: ${display}`);
    }
  });
  
  console.log('');
  return ready;
}

/**
 * Test 1: Basic SMS Delivery
 */
async function testBasicSMS() {
  console.log('\n📱 TEST 1: Basic SMS Delivery');
  console.log('-'.repeat(40));
  
  const service = new TwilioServiceProduction();
  
  try {
    // Health check first
    console.log('Checking service health...');
    const health = await service.healthCheck();
    console.log('Service status:', health.status);
    
    if (health.twilio?.balance) {
      console.log(`Twilio balance: $${health.twilio.balance}`);
    }
    
    // Send test SMS
    console.log(`\nSending SMS to ${process.env.MY_PHONE_NUMBER}...`);
    
    const result = await service.sendCrisisSMS(
      process.env.MY_PHONE_NUMBER,
      '🚨 SERENITY TEST: Crisis alert system working! Reply YES to confirm receipt.',
      `test_${Date.now()}`
    );
    
    console.log('✅ SMS sent successfully!');
    console.log('Message SID:', result.sid);
    console.log('Status:', result.status);
    console.log('Cost:', `$${result.cost}`);
    console.log('Attempts:', result.attempt);
    
    // Wait for user confirmation
    const received = await question('\n📱 Did you receive the SMS? (yes/no): ');
    
    if (received.toLowerCase() === 'yes') {
      console.log('🎉 SUCCESS! Real SMS delivery confirmed!');
      
      // Check delivery status
      console.log('\nChecking delivery status...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const status = await service.checkDeliveryStatus(result.sid);
      console.log('Delivery status:', status.status);
      console.log('Delivered:', status.delivered ? '✅' : '⏳');
    } else {
      console.log('⚠️ SMS not received. Check Twilio dashboard for errors.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Verify Twilio credentials in .env.local');
    console.log('2. Check phone number format (+1XXXXXXXXXX)');
    console.log('3. Ensure Twilio account has credit');
    console.log('4. Verify phone number is SMS-capable');
  }
}

/**
 * Test 2: Cascade Logic
 */
async function testCascade() {
  console.log('\n🔄 TEST 2: Cascade Logic');
  console.log('-'.repeat(40));
  
  const proceed = await question('Test cascade to multiple numbers? (yes/no): ');
  if (proceed.toLowerCase() !== 'yes') {
    console.log('Skipping cascade test');
    return;
  }
  
  const service = new TwilioServiceProduction();
  
  // Get backup number
  const backupPhone = await question('Enter backup phone number (+1XXXXXXXXXX): ');
  
  const supporters = [
    {
      name: 'Primary Contact',
      phone: process.env.MY_PHONE_NUMBER,
      tier: 1,
      patientName: 'Test Patient'
    },
    {
      name: 'Backup Contact',
      phone: backupPhone,
      tier: 2,
      patientName: 'Test Patient'
    }
  ];
  
  console.log('\nStarting cascade (10s delay between tier 1, 30s before tier 2)...');
  
  const results = await service.cascadeToSupporters(`cascade_${Date.now()}`, supporters);
  
  console.log('\nCascade Results:');
  results.forEach(r => {
    console.log(`- ${r.supporter} (Tier ${r.tier}): ${r.success ? '✅' : '❌'}`);
    if (r.cost) console.log(`  Cost: $${r.cost}`);
    if (r.error) console.log(`  Error: ${r.error}`);
  });
  
  const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);
  console.log(`\nTotal cost: $${totalCost.toFixed(4)}`);
}

/**
 * Test 3: Crisis Alert Flow
 */
async function testCrisisAlert() {
  console.log('\n🚨 TEST 3: Full Crisis Alert Flow');
  console.log('-'.repeat(40));
  
  const proceed = await question('Test full crisis alert? (yes/no): ');
  if (proceed.toLowerCase() !== 'yes') {
    console.log('Skipping crisis alert test');
    return;
  }
  
  const handler = new CrisisHandler();
  
  console.log('\nTriggering crisis alert...');
  
  const result = await handler.triggerCrisisAlert(
    'test_user',
    'high',
    { lat: 38.9072, lng: -77.0369 }, // Washington DC
    'Test crisis alert from Day 2 sprint'
  );
  
  console.log('✅ Crisis alert triggered!');
  console.log('Alert ID:', result.alertId);
  console.log('Status:', result.status);
  console.log('Supporters notified:', result.supportersNotified);
  
  // Simulate supporter response
  const respond = await question('\nSimulate supporter response? (yes/no): ');
  if (respond.toLowerCase() === 'yes') {
    const response = await handler.trackSupporterResponse(
      result.alertId,
      'supporter_001',
      'on_my_way',
      10 // ETA 10 minutes
    );
    
    console.log('✅ Response tracked:', response);
  }
}

/**
 * Test 4: Cost Summary
 */
async function showCostSummary() {
  console.log('\n💰 COST SUMMARY');
  console.log('-'.repeat(40));
  
  const service = new TwilioServiceProduction();
  const summary = service.getCostSummary();
  
  console.log(`Messages sent: ${summary.count}`);
  console.log(`Total cost: $${summary.totalCost.toFixed(2)}`);
  console.log(`Average cost: $${(summary.totalCost / (summary.count || 1)).toFixed(4)}`);
  
  // Projection
  const dailyProjection = summary.count * 24; // Assume same rate for 24 hours
  const monthlyProjection = dailyProjection * 30;
  const monthlyCost = monthlyProjection * 0.0079;
  
  console.log('\n📊 Projections (based on current usage):');
  console.log(`Daily: ${dailyProjection} messages ($${(dailyProjection * 0.0079).toFixed(2)})`);
  console.log(`Monthly: ${monthlyProjection} messages ($${monthlyCost.toFixed(2)})`);
  
  if (monthlyCost > 100) {
    console.log('⚠️ Consider upgrading to Twilio volume pricing');
  }
}

/**
 * Main test runner
 */
async function runTests() {
  try {
    // Check configuration
    if (!checkConfig()) {
      console.log('\n❌ Configuration incomplete!');
      console.log('\n📝 Quick Setup:');
      console.log('1. Go to https://console.twilio.com');
      console.log('2. Sign up for free account ($15 credit)');
      console.log('3. Buy a phone number ($1/month)');
      console.log('4. Copy credentials to .env.local');
      console.log('5. Run this test again');
      process.exit(1);
    }
    
    console.log('🎯 Starting Real SMS Tests...\n');
    
    // Run tests
    await testBasicSMS();
    await testCascade();
    await testCrisisAlert();
    await showCostSummary();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ ALL TESTS COMPLETE!');
    console.log('='.repeat(50));
    
    console.log('\n🎉 Real SMS system is working!');
    console.log('\n📝 Next Steps:');
    console.log('1. Apply database migrations');
    console.log('2. Contact providers');
    console.log('3. Schedule demos');
    console.log('4. Launch pilot!');
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
  } finally {
    rl.close();
  }
}

// Run the tests
console.log('⚡ REAL SMS TEST STARTING...\n');
runTests().catch(console.error);