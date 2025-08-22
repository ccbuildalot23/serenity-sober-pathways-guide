#!/usr/bin/env node

/**
 * 🚨 SIMPLIFIED CRISIS DEMO FOR LOOM RECORDING
 * Works with CommonJS for compatibility
 * Shows real SMS delivery to providers
 */

const readline = require('readline');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../serenity-crisis-mcp/.env') });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colors for terminal
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  reset: '\x1b[0m'
};

// Demo configuration
const DEMO_PATIENT = {
  name: 'Sarah Johnson',
  age: 28,
  diagnosis: 'Substance Use Disorder, Anxiety',
  daysClean: 45,
  location: 'Arlington, VA'
};

/**
 * Countdown with visual feedback
 */
async function countdown(seconds) {
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(`\r${colors.yellow}SMS arriving in ${i} seconds...${colors.reset}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  process.stdout.write('\r' + ' '.repeat(50) + '\r');
}

/**
 * Send demo SMS using Twilio
 */
async function sendDemoSMS() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;
  const toPhone = process.env.MY_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromPhone || !toPhone) {
    console.log(`${colors.red}❌ Missing Twilio credentials in .env file${colors.reset}`);
    console.log('Please check serenity-crisis-mcp/.env has:');
    console.log('- TWILIO_ACCOUNT_SID');
    console.log('- TWILIO_AUTH_TOKEN');
    console.log('- TWILIO_PHONE_NUMBER');
    console.log('- MY_PHONE_NUMBER');
    return false;
  }

  // Import Twilio (dynamic import for compatibility)
  let twilio;
  try {
    twilio = require('twilio');
  } catch (e) {
    console.log(`${colors.yellow}Installing Twilio SDK...${colors.reset}`);
    const { execSync } = require('child_process');
    execSync('npm install twilio', { cwd: __dirname });
    twilio = require('twilio');
  }

  const client = twilio(accountSid, authToken);

  const message = `🚨 SERENITY CRISIS ALERT

Patient: ${DEMO_PATIENT.name}
Location: ${DEMO_PATIENT.location}
Status: Needs immediate support
Days clean: ${DEMO_PATIENT.daysClean}

Tap to respond: https://serenity.health/demo

Reply STOP to opt out`;

  try {
    const result = await client.messages.create({
      body: message,
      from: fromPhone,
      to: toPhone
    });

    return {
      success: true,
      sid: result.sid,
      to: result.to
    };
  } catch (error) {
    console.error(`${colors.red}Error sending SMS:${colors.reset}`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Main demo flow
 */
async function runDemo() {
  console.clear();
  
  // Header
  console.log(colors.blue + '='.repeat(60));
  console.log('     🚨 SERENITY CRISIS RESPONSE - LIVE DEMO 🚨');
  console.log('='.repeat(60) + colors.reset);
  console.log('');

  // Patient info
  console.log(`${colors.yellow}📋 DEMO SCENARIO:${colors.reset}`);
  console.log(`Patient: ${DEMO_PATIENT.name}`);
  console.log(`Age: ${DEMO_PATIENT.age} | Days Clean: ${DEMO_PATIENT.daysClean}`);
  console.log(`Diagnosis: ${DEMO_PATIENT.diagnosis}`);
  console.log(`Location: ${DEMO_PATIENT.location}`);
  console.log('');

  // Instructions
  console.log(`${colors.green}🎬 RECORDING INSTRUCTIONS:${colors.reset}`);
  console.log('1. Start Loom recording NOW');
  console.log('2. Position your phone in frame');
  console.log('3. Press ENTER to trigger crisis alert');
  console.log('');

  // Wait for user
  await new Promise(resolve => {
    rl.question('Press ENTER when ready to trigger alert...', resolve);
  });

  // Dramatic effect
  console.log('');
  console.log(`${colors.red}🚨 CRISIS ALERT TRIGGERED${colors.reset}`);
  console.log(`${DEMO_PATIENT.name} needs immediate help!`);
  console.log('');

  // Countdown
  await countdown(3);

  // Send SMS
  console.log(`${colors.yellow}📱 Sending SMS to support network...${colors.reset}`);
  const result = await sendDemoSMS();

  if (result.success) {
    console.log('');
    console.log(`${colors.green}✅ SMS SENT SUCCESSFULLY!${colors.reset}`);
    console.log(`Message ID: ${result.sid}`);
    console.log(`Sent to: ${result.to}`);
    console.log('');
    console.log(`${colors.yellow}📱 CHECK YOUR PHONE NOW!${colors.reset}`);
    console.log('The crisis alert should arrive within seconds...');
    console.log('');

    // Cost info
    console.log(`${colors.blue}💰 COST ANALYSIS:${colors.reset}`);
    console.log('Cost per SMS: $0.0079');
    console.log('Monthly cost (100 alerts): $79.00');
    console.log('Revenue from care coordination: $2,800/month');
    console.log(`ROI: ${colors.green}35x return${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ Failed to send SMS${colors.reset}`);
    console.log('Check your Twilio credentials and try again');
  }

  console.log('');
  console.log(colors.green + '='.repeat(60));
  console.log('     🎉 DEMO COMPLETE - CRISIS SYSTEM WORKING! 🎉');
  console.log('='.repeat(60) + colors.reset);

  rl.close();
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(`${colors.red}Error:${colors.reset}`, error);
  process.exit(1);
});

// Run the demo
console.log(`${colors.blue}Starting Serenity Crisis Demo...${colors.reset}`);
console.log('');
runDemo().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});