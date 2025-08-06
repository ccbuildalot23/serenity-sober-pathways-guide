#!/usr/bin/env node

/**
 * Twilio Setup Script for Serenity Sober Pathways
 * This script helps configure Twilio credentials for the crisis support system
 * 
 * IMPORTANT: Run this script to set up SMS capabilities for emergency contacts
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

console.log('\n========================================');
console.log('🚨 SERENITY CRISIS SUPPORT - TWILIO SETUP 🚨');
console.log('========================================\n');
console.log('This will configure your Twilio credentials for real SMS support.\n');

async function setupTwilio() {
  try {
    // Check for existing .env file
    const envPath = path.join(__dirname, '..', '.env.local');
    let envContent = '';
    
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
      console.log('✓ Found existing .env.local file\n');
    }

    // Get Twilio credentials from user
    console.log('\n📱 TWILIO CREDENTIALS');
    console.log('Get these from https://console.twilio.com\n');
    
    const twilioSid = await question('Enter your Twilio Account SID: ');
    const twilioToken = await question('Enter your Twilio Auth Token: ');
    const twilioPhone = await question('Enter your Twilio Phone Number (with country code, e.g., +1234567890): ');
    
    // Validate phone number format
    if (!twilioPhone.startsWith('+')) {
      console.log('\n⚠️  Adding + to phone number...');
    }
    const formattedPhone = twilioPhone.startsWith('+') ? twilioPhone : `+${twilioPhone}`;

    // Update local .env.local for testing
    const twilioEnvVars = `
# Twilio Configuration (for local testing only)
# NEVER commit these to Git!
TWILIO_ACCOUNT_SID=${twilioSid}
TWILIO_AUTH_TOKEN=${twilioToken}
TWILIO_PHONE_NUMBER=${formattedPhone}
`;

    // Append to .env.local if not already present
    if (!envContent.includes('TWILIO_ACCOUNT_SID')) {
      fs.appendFileSync(envPath, twilioEnvVars);
      console.log('\n✓ Added Twilio credentials to .env.local');
    }

    // Create Supabase Edge Function secrets setup script
    const setupCommands = `
# Run these commands to set up Twilio in Supabase Edge Functions:

npx supabase secrets set TWILIO_ACCOUNT_SID="${twilioSid}"
npx supabase secrets set TWILIO_AUTH_TOKEN="${twilioToken}"
npx supabase secrets set TWILIO_PHONE_NUMBER="${formattedPhone}"

# Deploy the Edge Function with the new secrets:
npx supabase functions deploy send-crisis-sms

# Or if using Supabase CLI directly:
supabase secrets set TWILIO_ACCOUNT_SID="${twilioSid}" --project-ref YOUR_PROJECT_REF
supabase secrets set TWILIO_AUTH_TOKEN="${twilioToken}" --project-ref YOUR_PROJECT_REF
supabase secrets set TWILIO_PHONE_NUMBER="${formattedPhone}" --project-ref YOUR_PROJECT_REF
`;

    const commandsPath = path.join(__dirname, 'twilio-supabase-commands.txt');
    fs.writeFileSync(commandsPath, setupCommands);
    
    console.log('\n========================================');
    console.log('✅ SETUP COMPLETE!');
    console.log('========================================\n');
    console.log('Next Steps:');
    console.log('1. Run the commands in: ' + commandsPath);
    console.log('2. Test the SMS system using the app\'s emergency buttons');
    console.log('3. Add emergency contacts in the app\n');

    // Create a batch file for Windows users
    const batchCommands = `@echo off
echo Setting up Twilio for Supabase Edge Functions...
echo.
echo IMPORTANT: Make sure you have Supabase CLI installed
echo Run: npm install -g supabase
echo.
pause

npx supabase secrets set TWILIO_ACCOUNT_SID="${twilioSid}"
npx supabase secrets set TWILIO_AUTH_TOKEN="${twilioToken}"
npx supabase secrets set TWILIO_PHONE_NUMBER="${formattedPhone}"

echo.
echo Deploying Edge Function...
npx supabase functions deploy send-crisis-sms

echo.
echo ✅ Setup complete!
pause
`;

    const batchPath = path.join(__dirname, 'setup-twilio-supabase.bat');
    fs.writeFileSync(batchPath, batchCommands);
    console.log('Windows users: Run ' + batchPath + ' to configure Supabase\n');

    // Test SMS option
    const sendTest = await question('Would you like to send a test SMS now? (y/n): ');
    
    if (sendTest.toLowerCase() === 'y') {
      const testPhone = await question('Enter phone number to receive test SMS (with country code): ');
      console.log('\n📤 Sending test SMS...');
      
      // Create test message
      const testMessage = '🎉 SUCCESS! Serenity Crisis Support is configured. This is a test message. Reply STOP to unsubscribe.';
      
      try {
        // Using fetch to test Twilio directly
        const https = require('https');
        const authString = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
        
        const postData = new URLSearchParams({
          From: formattedPhone,
          To: testPhone.startsWith('+') ? testPhone : `+${testPhone}`,
          Body: testMessage
        }).toString();

        const options = {
          hostname: 'api.twilio.com',
          port: 443,
          path: `/2010-04-01/Accounts/${twilioSid}/Messages.json`,
          method: 'POST',
          headers: {
            'Authorization': `Basic ${authString}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
          }
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            if (res.statusCode === 201) {
              console.log('\n✅ TEST SMS SENT SUCCESSFULLY!');
              console.log('Check your phone for the message.\n');
            } else {
              console.log('\n❌ Test SMS failed:', data);
            }
            finishSetup();
          });
        });

        req.on('error', (error) => {
          console.log('\n❌ Test SMS error:', error.message);
          finishSetup();
        });

        req.write(postData);
        req.end();
        
      } catch (error) {
        console.log('\n❌ Test SMS error:', error.message);
        finishSetup();
      }
    } else {
      finishSetup();
    }

    function finishSetup() {
      console.log('\n========================================');
      console.log('🚀 Your crisis support system is ready!');
      console.log('========================================\n');
      rl.close();
    }
    
  } catch (error) {
    console.error('\n❌ Setup error:', error);
    rl.close();
  }
}

// Run setup
setupTwilio();