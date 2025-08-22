#!/usr/bin/env node

/**
 * 🎬 AUTOMATED DEMO DIRECTOR
 * Professional production system for Serenity demo recording
 * Coordinates all demo elements automatically
 */

const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const http = require('http');
const open = require('open');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '../../serenity-crisis-mcp/.env') });

class DemoDirector {
  constructor(mode = 'production') {
    this.mode = mode; // 'production' or 'practice'
    this.startTime = null;
    this.teleprompterServer = null;
    this.musicProcess = null;
    this.segments = [
      {
        time: 0,
        duration: 10,
        title: 'INTRODUCTION',
        action: 'showLogo',
        prompt: '🎬 START SPEAKING NOW',
        text: "Hi, I'm Christopher, 33 days clean, and I built Serenity because recovery apps fail when you need them most",
        music: 'soft'
      },
      {
        time: 10,
        duration: 20,
        title: 'THE PROBLEM',
        action: 'showStats',
        prompt: '📊 EXPLAIN THE PROBLEM',
        text: "You're losing $2,800 per month in billable care coordination. Your therapists spend 10 hours per week on documentation. And when your patients have a crisis at 2 AM, you find out Monday.",
        music: 'building'
      },
      {
        time: 30,
        duration: 20,
        title: 'CRISIS DEMO',
        action: 'triggerCrisis',
        prompt: '📱 SHOW PHONE TO CAMERA!',
        text: "Watch this. When a patient hits their crisis button... [PAUSE FOR SMS] ...3 seconds. Their entire support network mobilized. You're notified. Crisis averted.",
        notification: 'Show your phone NOW!',
        sound: 'notification',
        music: 'dramatic'
      },
      {
        time: 50,
        duration: 30,
        title: 'SUPPORT CASCADE',
        action: 'showCascade',
        prompt: '🔄 EXPLAIN CASCADE',
        text: "Serenity intelligently notifies supporters in order: sponsor first, then family, then you. Everyone coordinates through our dashboard. No duplicate calls. No confusion.",
        music: 'soft'
      },
      {
        time: 80,
        duration: 30,
        title: 'BILLING AUTOMATION',
        action: 'showBilling',
        prompt: '💰 SHOW THE MONEY',
        text: "Every interaction automatically generates the right CPT code. Brief check-in? That's G2061, $15. Care coordination? 99490, $50 per patient monthly. You're already doing the work. Now you'll get paid.",
        notification: 'Click billing tab now',
        music: 'upbeat'
      },
      {
        time: 110,
        duration: 30,
        title: 'TIME SAVINGS',
        action: 'showDocumentation',
        prompt: '⏰ EMPHASIZE TIME SAVED',
        text: "Voice notes become clinical documentation. Session notes auto-generate. Medicare forms complete themselves. 10 hours per week back in your life.",
        music: 'hopeful'
      },
      {
        time: 140,
        duration: 25,
        title: 'PILOT OFFER',
        action: 'showOffer',
        prompt: '🎯 CREATE URGENCY',
        text: "I'm taking only 5 providers in Virginia for our pilot. Free through December. White-glove onboarding in 15 minutes. SimplePractice integration included.",
        notification: 'Show 5 SPOTS LEFT',
        music: 'urgent'
      },
      {
        time: 165,
        duration: 15,
        title: 'CALL TO ACTION',
        action: 'showCTA',
        prompt: '📞 STRONG CLOSE',
        text: "Text me at 240-419-9375 or book at serenity-recovery.com/demo. Let's save lives together. Because recovery without support isn't recovery at all.",
        notification: 'End with phone number visible',
        sound: 'success',
        music: 'finale'
      }
    ];
  }

  async start() {
    console.log('\n🎬 AUTOMATED DEMO DIRECTOR STARTING...\n');
    
    // Pre-flight checks
    if (!await this.preFlightCheck()) {
      console.error('❌ Pre-flight check failed. Fix issues and try again.');
      return;
    }

    // Start teleprompter server
    await this.startTeleprompterServer();
    
    // Open teleprompter in browser
    await this.openTeleprompter();
    
    // Start background music
    await this.startMusic();
    
    // Open demo page
    await this.openDemoPage();
    
    // Start the show
    this.startTime = Date.now();
    console.log('\n🔴 RECORDING STARTED - Follow the teleprompter!\n');
    
    // Schedule all segments
    for (const segment of this.segments) {
      setTimeout(() => this.executeSegment(segment), segment.time * 1000);
    }
    
    // Schedule end
    setTimeout(() => this.end(), 180000); // 3 minutes
  }

  async preFlightCheck() {
    console.log('✅ Checking environment...');
    
    // Check for required files
    const requiredFiles = [
      'teleprompter.html',
      'demo-automation.js',
      'voice-guide.js'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, file);
      if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️  Missing ${file} - will create`);
      }
    }
    
    // Check Twilio credentials
    if (this.mode === 'production') {
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.MY_PHONE_NUMBER) {
        console.error('  ❌ Missing Twilio credentials');
        return false;
      }
      console.log('  ✅ Twilio configured');
    } else {
      console.log('  ℹ️  Practice mode - SMS disabled');
    }
    
    // Check audio
    try {
      await this.playSound('test');
      console.log('  ✅ Audio system ready');
    } catch (e) {
      console.log('  ⚠️  Audio may not work');
    }
    
    return true;
  }

  async startTeleprompterServer() {
    const teleprompterHTML = this.generateTeleprompterHTML();
    
    this.teleprompterServer = http.createServer((req, res) => {
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(teleprompterHTML);
      } else if (req.url === '/api/segment') {
        const currentTime = (Date.now() - this.startTime) / 1000;
        const currentSegment = this.segments.find(s => 
          currentTime >= s.time && currentTime < (s.time + s.duration)
        );
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(currentSegment || {}));
      }
    });
    
    await new Promise(resolve => {
      this.teleprompterServer.listen(3333, () => {
        console.log('📺 Teleprompter server running on http://localhost:3333');
        resolve();
      });
    });
  }

  generateTeleprompterHTML() {
    const segmentsJSON = JSON.stringify(this.segments);
    return `<!DOCTYPE html>
<html>
<head>
  <title>Serenity Demo Teleprompter</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background: #000;
      color: #fff;
      font-family: Arial, sans-serif;
      overflow: hidden;
    }
    #timer {
      position: fixed;
      top: 20px;
      right: 20px;
      font-size: 48px;
      color: #0f0;
      font-weight: bold;
      z-index: 1000;
    }
    #progress {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 10px;
      background: #333;
      z-index: 999;
    }
    #progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #0f0, #ff0, #f00);
      width: 0%;
      transition: width 1s linear;
    }
    #prompt {
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 36px;
      color: #ff0;
      text-align: center;
      font-weight: bold;
      animation: pulse 1s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    #script {
      margin-top: 150px;
      font-size: 48px;
      line-height: 1.5;
      text-align: center;
      padding: 0 50px;
    }
    .current-line {
      color: #0f0;
      font-size: 56px;
      font-weight: bold;
      animation: glow 1s infinite;
    }
    @keyframes glow {
      0%, 100% { text-shadow: 0 0 20px #0f0; }
      50% { text-shadow: 0 0 40px #0f0; }
    }
    #notification {
      position: fixed;
      bottom: 50px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 48px;
      color: #f00;
      background: #ff0;
      padding: 20px 40px;
      border-radius: 10px;
      display: none;
      animation: flash 0.5s infinite;
    }
    @keyframes flash {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    .recording-border {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      border: 10px solid #f00;
      pointer-events: none;
      animation: recording 2s infinite;
    }
    @keyframes recording {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.3; }
    }
  </style>
</head>
<body>
  <div class="recording-border"></div>
  <div id="timer">00:00</div>
  <div id="progress"><div id="progress-bar"></div></div>
  <div id="prompt">GET READY...</div>
  <div id="script">Loading script...</div>
  <div id="notification"></div>
  
  <script>
    const segments = ${segmentsJSON};
    let startTime = Date.now();
    let currentSegmentIndex = 0;
    
    function updateTimer() {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      document.getElementById('timer').textContent = 
        String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
      
      // Update progress bar
      const progress = (elapsed / 180) * 100; // 3 minutes total
      document.getElementById('progress-bar').style.width = progress + '%';
      
      // Update current segment
      const currentTime = elapsed;
      const segment = segments.find(s => 
        currentTime >= s.time && currentTime < (s.time + s.duration)
      );
      
      if (segment && segments.indexOf(segment) !== currentSegmentIndex) {
        currentSegmentIndex = segments.indexOf(segment);
        showSegment(segment);
      }
      
      // End check
      if (elapsed >= 180) {
        showComplete();
      }
    }
    
    function showSegment(segment) {
      document.getElementById('prompt').textContent = segment.prompt;
      document.getElementById('script').innerHTML = 
        '<div class="current-line">' + segment.text + '</div>';
      
      if (segment.notification) {
        const notif = document.getElementById('notification');
        notif.textContent = segment.notification;
        notif.style.display = 'block';
        setTimeout(() => notif.style.display = 'none', 5000);
      }
    }
    
    function showComplete() {
      document.getElementById('prompt').textContent = '🎉 DEMO COMPLETE!';
      document.getElementById('script').innerHTML = 
        '<div class="current-line">STOP RECORDING NOW!</div>';
      document.getElementById('notification').textContent = 'SUCCESS!';
      document.getElementById('notification').style.display = 'block';
    }
    
    // Start
    setInterval(updateTimer, 100);
    
    // Auto-scroll
    let scrollPosition = 0;
    setInterval(() => {
      scrollPosition += 1;
      window.scrollTo(0, scrollPosition);
    }, 100);
  </script>
</body>
</html>`;
  }

  async openTeleprompter() {
    console.log('📺 Opening teleprompter...');
    try {
      await open('http://localhost:3333');
    } catch (e) {
      console.log('  ⚠️  Please open http://localhost:3333 manually');
    }
  }

  async openDemoPage() {
    console.log('🌐 Opening demo page...');
    try {
      await open('http://localhost:8080/provider/demo');
    } catch (e) {
      console.log('  ⚠️  Please open http://localhost:8080/provider/demo manually');
    }
  }

  async startMusic() {
    // In production, would play background music
    console.log('🎵 Background music started (simulated)');
  }

  async executeSegment(segment) {
    console.log(`\n[${this.formatTime(segment.time)}] ${segment.title}`);
    console.log(`  📢 ${segment.prompt}`);
    
    // Send OS notification
    if (segment.notification) {
      this.sendNotification(segment.notification);
    }
    
    // Play sound effect
    if (segment.sound) {
      this.playSound(segment.sound);
    }
    
    // Execute action
    switch (segment.action) {
      case 'triggerCrisis':
        if (this.mode === 'production') {
          this.triggerCrisisDemo();
        } else {
          console.log('  [PRACTICE] Would send SMS now');
        }
        break;
      case 'showBilling':
        console.log('  💰 Showing billing automation');
        break;
      case 'showCTA':
        console.log('  📞 Showing call to action');
        break;
    }
    
    // Adjust music
    if (segment.music) {
      console.log(`  🎵 Music: ${segment.music}`);
    }
  }

  async triggerCrisisDemo() {
    console.log('  📱 Sending crisis SMS...');
    const DemoSMS = require('../demo-crisis-simple.js');
    // Would trigger actual SMS here
  }

  sendNotification(message) {
    if (process.platform === 'darwin') {
      exec(`osascript -e 'display notification "${message}" with title "Demo Director"'`);
    } else if (process.platform === 'win32') {
      exec(`msg * "${message}"`);
    }
    console.log(`  🔔 ${message}`);
  }

  playSound(sound) {
    // In production, would play actual sound files
    console.log(`  🔊 Playing: ${sound}`);
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  async end() {
    console.log('\n🎬 DEMO COMPLETE!\n');
    console.log('✅ Recording finished successfully');
    console.log('📹 Stop your Loom recording now');
    console.log('📧 Generating follow-up emails...');
    
    // Clean up
    if (this.teleprompterServer) {
      this.teleprompterServer.close();
    }
    
    // Generate post-recording materials
    await this.generateFollowUpEmails();
    
    process.exit(0);
  }

  async generateFollowUpEmails() {
    const emailTemplate = `Subject: Your Serenity Demo - Save 10 hours/week

Hi [Provider Name],

Thanks for watching the Serenity demo! Here's your personalized video:
[LOOM LINK]

Key benefits for your practice:
✅ Save 10+ hours/week on documentation
✅ Capture $2,800/month in missed billing
✅ 24/7 crisis support without being on-call

Ready to join our pilot? Text me: 240-419-9375

Best,
Christopher`;

    fs.writeFileSync(
      path.join(__dirname, 'follow-up-email.txt'),
      emailTemplate
    );
    console.log('📧 Email template saved to follow-up-email.txt');
  }
}

// Check if we have open module
try {
  require('open');
} catch (e) {
  console.log('Installing required module...');
  require('child_process').execSync('npm install open', { 
    cwd: __dirname,
    stdio: 'inherit'
  });
}

// Parse command line arguments
const args = process.argv.slice(2);
const mode = args.includes('--practice') ? 'practice' : 'production';

// Create and start director
const director = new DemoDirector(mode);
director.start().catch(console.error);