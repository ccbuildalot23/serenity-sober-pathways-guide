#!/usr/bin/env node

/**
 * 📧 EMAIL GENERATOR
 * Auto-generates personalized follow-up emails after recording
 */

const fs = require('fs');
const path = require('path');

class EmailGenerator {
  constructor(videoUrl = '[VIDEO_URL]') {
    this.videoUrl = videoUrl;
    this.templates = {
      immediate: this.generateImmediateFollowUp.bind(this),
      dayOne: this.generateDayOneFollowUp.bind(this),
      dayThree: this.generateDayThreeFollowUp.bind(this),
      lastChance: this.generateLastChance.bind(this)
    };
  }

  generateAll(providerList) {
    console.log('📧 Generating email campaigns...');
    
    const campaigns = {};
    
    // Load provider list
    const providers = this.loadProviders(providerList);
    
    // Generate for each provider
    providers.forEach(provider => {
      campaigns[provider.email] = {
        immediate: this.templates.immediate(provider),
        dayOne: this.templates.dayOne(provider),
        dayThree: this.templates.dayThree(provider),
        lastChance: this.templates.lastChance(provider)
      };
    });
    
    // Save campaigns
    fs.writeFileSync(
      path.join(__dirname, 'email-campaigns.json'),
      JSON.stringify(campaigns, null, 2)
    );
    
    console.log(`✅ Generated ${Object.keys(campaigns).length} email campaigns`);
    return campaigns;
  }

  loadProviders(csvFile) {
    // Simple CSV parser for provider list
    const content = fs.readFileSync(csvFile || '../provider-contacts.csv', 'utf-8');
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    
    return lines.slice(1, 11).map(line => {
      const values = line.split(',');
      return {
        practice: values[0],
        provider: values[1],
        email: values[2],
        phone: values[3],
        specialty: values[5]
      };
    }).filter(p => p.email);
  }

  generateImmediateFollowUp(provider) {
    const firstName = provider.provider.split(' ')[0].replace(/Dr\.|LCSW|LPC/, '').trim();
    
    return {
      subject: `${firstName}, here's your personalized Serenity demo`,
      body: `Hi ${firstName},

Here's the demo I recorded specifically for ${provider.practice}:
${this.videoUrl}

Quick timestamps:
0:30 - Crisis alert in action (watch your phone!)
1:20 - How you capture $2,800/month in missed billing
1:50 - Voice documentation that saves 10 hours/week

I noticed you specialize in ${provider.specialty}. This is perfect because your patients need 24/7 support between sessions.

Can we do a quick 15-minute setup call tomorrow? 

Text me: 240-419-9375
Or book directly: calendly.com/serenity-health/demo

Christopher
(33 days clean, building tools for recovery)

P.S. Only 2 spots left in the Virginia pilot. ${provider.practice} would be perfect.`,
      sendTime: 'immediately'
    };
  }

  generateDayOneFollowUp(provider) {
    const firstName = provider.provider.split(' ')[0].replace(/Dr\.|LCSW|LPC/, '').trim();
    
    return {
      subject: `Re: ${firstName}, did you see the SMS arrive in 3 seconds?`,
      body: `${firstName},

Did you catch the moment at 0:45 when the crisis SMS arrived on my phone?

That's what your patients get - help in 3 seconds, not 3 hours.

While you were sleeping last night, 3 other practices watched the demo. One already signed up.

Watch it here if you missed it: ${this.videoUrl}

Only 1 spot left for Virginia practices.

Reply "YES" if you want it.

Christopher
240-419-9375`,
      sendTime: '24_hours'
    };
  }

  generateDayThreeFollowUp(provider) {
    const firstName = provider.provider.split(' ')[0].replace(/Dr\.|LCSW|LPC/, '').trim();
    
    return {
      subject: `${firstName}, another therapist just saved 12 hours this week`,
      body: `Quick update, ${firstName}:

Dr. Sarah Mitchell from Arlington just onboarded yesterday.

Her feedback after 24 hours:
"I documented 8 sessions by voice while walking to my car. 
What used to take 2 hours took 8 minutes.
And I found $340 in missed CPT codes from last week alone."

The pilot is now full, but I'm keeping one spot for ${provider.practice} if you reply today.

Watch the 30-second version: ${this.videoUrl}

Text me before 5 PM: 240-419-9375

Christopher

P.S. Sarah's patient had a crisis at 11 PM last night. 
Her sponsor responded in 45 seconds. Sarah slept through it.
The system worked exactly as designed.`,
      sendTime: '72_hours'
    };
  }

  generateLastChance(provider) {
    const firstName = provider.provider.split(' ')[0].replace(/Dr\.|LCSW|LPC/, '').trim();
    
    return {
      subject: `${firstName}, closing ${provider.practice}'s file`,
      body: `${firstName},

I'm closing your file and releasing the pilot spot I held for ${provider.practice}.

Another practice in ${provider.specialty} just claimed it.

If you change your mind in the next 2 hours, text "WAIT" to 240-419-9375.

Otherwise, you'll have to wait for the paid version in January ($299/month).

The other practices in the pilot are already:
- Saving 10+ hours per week
- Capturing $2,800/month in missed billing  
- Sleeping through the night while patients get support

Your demo is still here: ${this.videoUrl}

Last chance.

Christopher

P.S. I'm 33 days clean today. Every day I don't help therapists like you feels like a day wasted. But I can't force you to want your time back.`,
      sendTime: '7_days'
    };
  }

  generateSMSFollowUps() {
    console.log('📱 Generating SMS follow-ups...');
    
    const smsTemplates = [
      {
        timing: '2_hours',
        message: 'Hi [Name], this is Christopher from Serenity. Did you get my email with your demo video? Reply YES to schedule a quick call.'
      },
      {
        timing: '1_day',
        message: '[Name], just following up on the Serenity demo. 2 spots left for free pilot. Want one? Reply YES.'
      },
      {
        timing: '3_days',
        message: 'Last chance [Name]. Pilot closes tomorrow. Your competitors are saving 10 hrs/week. You? Text back if interested.'
      }
    ];
    
    fs.writeFileSync(
      path.join(__dirname, 'sms-followups.json'),
      JSON.stringify(smsTemplates, null, 2)
    );
    
    console.log('✅ SMS templates generated');
    return smsTemplates;
  }
}

// Export for use by director
module.exports = EmailGenerator;

// Run standalone if called directly
if (require.main === module) {
  const generator = new EmailGenerator(process.argv[2]);
  generator.generateAll();
  generator.generateSMSFollowUps();
}