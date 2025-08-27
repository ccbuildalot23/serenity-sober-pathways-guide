#!/usr/bin/env node

/**
 * 📧 PROVIDER EMAIL OUTREACH AUTOMATION
 * Sends personalized emails to healthcare providers
 * Tracks opens, clicks, and responses
 */

import fs from 'fs/promises';
import csv from 'csv-parser';
import { createReadStream } from 'fs';
import chalk from 'chalk';
import ora from 'ora';

// Email templates with A/B variations
const EMAIL_TEMPLATES = {
  simplePractice: {
    subjectA: "Cut documentation time by 75% - Free pilot for 5 Virginia practices only",
    subjectB: "You're losing $2,800/month in billable services - here's the fix",
    subjectC: "Never take another 2 AM crisis call - automated support for your patients",
    body: (provider) => `Hi ${provider.firstName},

I noticed you use SimplePractice at ${provider.practice} for ${provider.specialty}.

Quick question: How much billable time do you lose to documentation each week?

Our HIPAA-compliant platform automates:
✅ Voice → Clinical notes in 60 seconds (no typing)
✅ CPT coding that captures ~$2,800/month in missed care coordination billing
✅ 24/7 crisis support for your patients (without you being on-call)
✅ SimplePractice integration (seamless, no double entry)

🎥 Watch 2-min demo: https://www.loom.com/share/YOUR_LOOM_VIDEO_ID

We're selecting just 5 Virginia practices for our free pilot program through December.

15-minute demo on Monday? Here's my calendar: https://calendly.com/serenity-health/demo

Best,
Christopher Caldwell
Founder, Serenity Health
240-419-9375

P.S. I'm 34 days into recovery and built this because therapists saved my life. Now I want to give them their time back.`
  },
  
  addiction: {
    subjectA: "Never miss another crisis call - Automated support network for your patients",
    subjectB: "Your addiction patients need 24/7 support - you need sleep",
    subjectC: "Free pilot: Crisis response system for addiction treatment centers",
    body: (provider) => `Hi ${provider.firstName},

I saw you specialize in addiction treatment at ${provider.practice}.

Your patients need support at 2 AM on Saturday. You need sleep.

Our platform provides:
🚨 24/7 crisis response system (average response: 30 seconds)
🤝 Automated support network coordination
📊 Real-time patient monitoring dashboard
💰 Automatic billing for H0004, H0015, and care coordination (99490)

Plus: Every documentation task automated. Save 10+ hours/week.

🎥 See it in action: https://www.loom.com/share/YOUR_LOOM_VIDEO_ID

5 Virginia practices get free access through our pilot. Interested?

Quick demo: https://calendly.com/serenity-health/demo

Christopher
(34 days clean, building tools for recovery)
240-419-9375`
  },
  
  teletherapy: {
    subjectA: "Your teletherapy patients are struggling between sessions - here's the fix",
    subjectB: "Add 24/7 crisis support to your virtual practice - free pilot",
    subjectC: "Remote patient monitoring that actually works - 5 free spots",
    body: (provider) => `${provider.firstName},

Between your weekly teletherapy sessions, your patients face crisis moments alone.

What if they had:
• One-tap crisis support that notifies their entire support network
• Daily check-ins that alert you to concerning patterns
• Peer support connections available 24/7
• All while you sleep soundly

Plus: Voice-to-note documentation saves you 2+ hours daily.

🎥 2-minute demo: https://www.loom.com/share/YOUR_LOOM_VIDEO_ID

We're onboarding 5 practices for free pilot. Takes 15 minutes to set up.

Tomorrow at 2 PM work? https://calendly.com/serenity-health/demo

Best,
Christopher
240-419-9375`
  }
};

// Load provider contacts
async function loadProviders() {
  const providers = [];
  
  return new Promise((resolve, reject) => {
    createReadStream('provider-contacts.csv')
      .pipe(csv())
      .on('data', (row) => {
        // Parse provider data
        const [firstName, ...lastNameParts] = row['Provider Name'].replace(/Dr\.|LCSW|LPC|PhD/, '').trim().split(' ');
        
        providers.push({
          practice: row['Practice Name'],
          firstName,
          lastName: lastNameParts.join(' '),
          email: row['Email'],
          phone: row['Phone'],
          specialty: row['Specialty'],
          simplePractice: row['SimplePractice User'] === 'Yes',
          priority: row['Priority'],
          city: row['City']
        });
      })
      .on('end', () => resolve(providers))
      .on('error', reject);
  });
}

// Select appropriate template
function selectTemplate(provider) {
  if (provider.specialty.toLowerCase().includes('addiction') || 
      provider.specialty.toLowerCase().includes('substance')) {
    return EMAIL_TEMPLATES.addiction;
  } else if (provider.specialty.toLowerCase().includes('teletherapy') ||
             provider.specialty.toLowerCase().includes('virtual')) {
    return EMAIL_TEMPLATES.teletherapy;
  } else if (provider.simplePractice) {
    return EMAIL_TEMPLATES.simplePractice;
  }
  return EMAIL_TEMPLATES.simplePractice; // Default
}

// A/B test subject lines
function selectSubject(template, index) {
  const subjects = [template.subjectA, template.subjectB, template.subjectC];
  return subjects[index % 3]; // Rotate through A/B/C
}

// Generate email HTML
function generateEmailHTML(provider, template) {
  const plainText = template.body(provider);
  
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 10px 10px; }
    .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .ps { background: #f7f7f7; padding: 15px; border-left: 4px solid #667eea; margin-top: 20px; font-style: italic; }
    .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; }
    .emoji { font-size: 1.2em; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Serenity Health</h1>
      <p>Save 10 hours/week. Capture $2,800/month. Never miss a crisis.</p>
    </div>
    <div class="content">
      ${plainText.split('\n').map(line => {
        if (line.startsWith('✅') || line.startsWith('🚨') || line.startsWith('🤝') || 
            line.startsWith('📊') || line.startsWith('💰') || line.startsWith('•')) {
          return `<p class="emoji">${line}</p>`;
        } else if (line.includes('https://')) {
          const url = line.match(/(https:\/\/[^\s]+)/)[1];
          if (line.includes('🎥')) {
            return `<p>${line.replace(url, `<a href="${url}" style="color: #667eea; font-weight: bold;">Watch Demo Video →</a>`)}</p>`;
          } else {
            return `<p>${line.replace(url, `<a href="${url}" class="cta-button">Book Your Demo</a>`)}</p>`;
          }
        } else if (line.startsWith('P.S.')) {
          return `<div class="ps">${line}</div>`;
        } else if (line) {
          return `<p>${line}</p>`;
        }
        return '';
      }).join('')}
    </div>
    <div class="footer">
      <p>Serenity Health | HIPAA Compliant | Built in Virginia</p>
      <p>240-419-9375 | christopher@serenity.health</p>
      <p><a href="%unsubscribe_url%">Unsubscribe</a></p>
    </div>
  </div>
  <img src="https://serenity.health/track/open?email=${provider.email}" width="1" height="1" style="display:none;">
</body>
</html>`;
}

// Save email for sending
async function saveEmail(provider, subject, html, text) {
  const emailData = {
    to: provider.email,
    subject,
    html,
    text,
    provider: provider.practice,
    timestamp: new Date().toISOString(),
    status: 'queued'
  };
  
  // Save to outbox
  const outboxFile = 'email-outbox.json';
  let outbox = [];
  
  try {
    const existing = await fs.readFile(outboxFile, 'utf-8');
    outbox = JSON.parse(existing);
  } catch (e) {
    // File doesn't exist yet
  }
  
  outbox.push(emailData);
  await fs.writeFile(outboxFile, JSON.stringify(outbox, null, 2));
  
  return emailData;
}

// Main execution
async function main() {
  console.clear();
  console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║          📧 PROVIDER EMAIL OUTREACH CAMPAIGN 📧              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `));

  const spinner = ora('Loading provider contacts...').start();
  
  try {
    const providers = await loadProviders();
    spinner.succeed(`Loaded ${providers.length} provider contacts`);
    
    // Filter high priority providers
    const highPriority = providers.filter(p => p.priority === 'HIGH');
    const mediumPriority = providers.filter(p => p.priority === 'MEDIUM');
    
    console.log(chalk.yellow(`\n📊 Provider Breakdown:`));
    console.log(`  HIGH Priority: ${highPriority.length}`);
    console.log(`  MEDIUM Priority: ${mediumPriority.length}`);
    console.log(`  SimplePractice Users: ${providers.filter(p => p.simplePractice).length}`);
    
    // Process first batch (10 high priority)
    const batch = highPriority.slice(0, 10);
    
    console.log(chalk.cyan(`\n📤 Preparing emails for first ${batch.length} providers...`));
    
    const emails = [];
    for (let i = 0; i < batch.length; i++) {
      const provider = batch[i];
      const template = selectTemplate(provider);
      const subject = selectSubject(template, i);
      const html = generateEmailHTML(provider, template);
      const text = template.body(provider);
      
      const email = await saveEmail(provider, subject, html, text);
      emails.push(email);
      
      console.log(chalk.green(`✅ ${provider.practice} - ${subject.substring(0, 40)}...`));
    }
    
    console.log(chalk.green(`\n✨ ${emails.length} emails prepared and saved to email-outbox.json`));
    
    // Generate send script
    const sendScript = `
# Email Sending Instructions

## Option 1: Gmail (Recommended)
1. Install "Mail Merge" Chrome extension
2. Import email-outbox.json
3. Use your Gmail account to send
4. Tracking pixels will record opens

## Option 2: SendGrid (Professional)
1. Sign up at sendgrid.com (free tier: 100/day)
2. Get API key
3. Run: npm install @sendgrid/mail
4. Use send-with-sendgrid.js

## Option 3: Manual Send (Quick Start)
Copy/paste from email-outbox.json into your email client

## A/B Testing Distribution:
- Subject A: ${batch.filter((_, i) => i % 3 === 0).length} emails
- Subject B: ${batch.filter((_, i) => i % 3 === 1).length} emails  
- Subject C: ${batch.filter((_, i) => i % 3 === 2).length} emails

## Follow-up Schedule:
- Hour 2: Text non-openers
- Day 1: LinkedIn connection
- Day 2: Second email
- Day 3: Call if opened but didn't reply
`;
    
    await fs.writeFile('email-send-instructions.md', sendScript);
    
    // Generate tracking dashboard
    const dashboard = {
      campaign: 'Serenity Pilot Launch',
      date: new Date().toISOString(),
      totalSent: emails.length,
      providers: batch.map(p => ({
        practice: p.practice,
        email: p.email,
        priority: p.priority,
        sent: false,
        opened: false,
        clicked: false,
        replied: false,
        demo: false
      }))
    };
    
    await fs.writeFile('email-tracking.json', JSON.stringify(dashboard, null, 2));
    
    console.log(chalk.cyan('\n📊 Tracking Dashboard created: email-tracking.json'));
    console.log(chalk.cyan('📧 Send instructions: email-send-instructions.md'));
    
    // LinkedIn messages
    console.log(chalk.yellow('\n🔗 LinkedIn Connection Requests:'));
    for (const provider of batch.slice(0, 5)) {
      console.log(chalk.gray(`\n${provider.practice}:`));
      console.log(`"Hi ${provider.firstName}, I saw you use SimplePractice. Built a tool that saves therapists 10+ hrs/week on documentation. Worth a quick chat? Only taking 5 VA providers for free pilot."`);
    }
    
    console.log(chalk.green('\n' + '═'.repeat(60)));
    console.log(chalk.green.bold('       ✅ EMAIL CAMPAIGN READY TO LAUNCH!'));
    console.log(chalk.green('═'.repeat(60)));
    
    console.log(chalk.white('\n📋 NEXT STEPS:'));
    console.log('1. Record Loom video using trigger-demo-crisis.js');
    console.log('2. Replace YOUR_LOOM_VIDEO_ID in emails');
    console.log('3. Send emails using instructions');
    console.log('4. Set 2-hour timer for text follow-up');
    console.log('5. Track responses in email-tracking.json');
    
  } catch (error) {
    spinner.fail('Failed to process emails');
    console.error(chalk.red('Error:'), error.message);
  }
}

// Run the campaign
main().catch(console.error);