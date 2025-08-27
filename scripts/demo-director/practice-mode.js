#!/usr/bin/env node

/**
 * 🎭 PRACTICE MODE
 * Run through the entire demo without sending real SMS or spending money
 */

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class PracticeMode {
  constructor() {
    this.score = 0;
    this.feedback = [];
  }

  async start() {
    console.log('\n🎭 PRACTICE MODE - No SMS will be sent\n');
    console.log('This is a full rehearsal. I\'ll give you feedback at the end.\n');
    
    await this.countdown();
    await this.runPractice();
    await this.showFeedback();
  }

  async countdown() {
    console.log('Starting practice in...');
    for (let i = 3; i > 0; i--) {
      console.log(`${i}...`);
      await this.delay(1000);
    }
    console.log('GO!\n');
  }

  async runPractice() {
    const segments = [
      {
        time: 0,
        prompt: 'INTRODUCTION - Mention you\'re 33 days clean',
        check: 'Did you mention recovery?',
        points: 10
      },
      {
        time: 10,
        prompt: 'PROBLEM - State the $2,800/month loss',
        check: 'Did you mention specific dollar amount?',
        points: 10
      },
      {
        time: 30,
        prompt: 'CRISIS DEMO - Pretend to show phone',
        check: 'Did you show phone to camera?',
        points: 20
      },
      {
        time: 50,
        prompt: 'CASCADE - Explain the support tiers',
        check: 'Did you explain sponsor, family, therapist order?',
        points: 15
      },
      {
        time: 80,
        prompt: 'BILLING - Show CPT codes',
        check: 'Did you mention specific CPT codes?',
        points: 15
      },
      {
        time: 110,
        prompt: 'TIME SAVINGS - Emphasize 10 hours/week',
        check: 'Did you say "10 hours per week"?',
        points: 10
      },
      {
        time: 140,
        prompt: 'PILOT OFFER - Create urgency',
        check: 'Did you mention "only 5 spots"?',
        points: 10
      },
      {
        time: 165,
        prompt: 'CALL TO ACTION - Show phone number',
        check: 'Did you say 240-419-9375 clearly?',
        points: 10
      }
    ];

    for (const segment of segments) {
      await this.delay(segment.time * 100); // Speed up for practice
      
      console.log(`\n[${this.formatTime(segment.time)}] ${segment.prompt}`);
      
      // Simulate action
      if (segment.time === 30) {
        console.log('   📱 [SIMULATED SMS SENT]');
      }
      
      // Get feedback
      const response = await this.askQuestion(`   ${segment.check} (y/n): `);
      if (response.toLowerCase() === 'y') {
        this.score += segment.points;
        this.feedback.push(`✅ ${segment.prompt.split(' - ')[0]}`);
      } else {
        this.feedback.push(`❌ ${segment.prompt.split(' - ')[0]} - needs work`);
      }
    }
  }

  async showFeedback() {
    console.log('\n========================================');
    console.log('         PRACTICE COMPLETE');
    console.log('========================================\n');
    
    console.log(`SCORE: ${this.score}/100\n`);
    
    console.log('FEEDBACK:');
    this.feedback.forEach(item => console.log(`  ${item}`));
    
    console.log('\nOVERALL ASSESSMENT:');
    if (this.score >= 90) {
      console.log('🏆 EXCELLENT! You\'re ready to record!');
    } else if (this.score >= 70) {
      console.log('👍 GOOD! One more practice and you\'ll nail it.');
    } else if (this.score >= 50) {
      console.log('📈 GETTING THERE! Focus on the sections you missed.');
    } else {
      console.log('💪 KEEP PRACTICING! Review the script and try again.');
    }
    
    console.log('\nTIPS FOR IMPROVEMENT:');
    console.log('  • Speak clearly and slowly');
    console.log('  • Show enthusiasm about helping providers');
    console.log('  • Make the phone demo dramatic');
    console.log('  • Always end with the phone number');
    
    rl.close();
  }

  askQuestion(question) {
    return new Promise(resolve => {
      rl.question(question, resolve);
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }
}

// Run practice mode
const practice = new PracticeMode();
practice.start().catch(console.error);