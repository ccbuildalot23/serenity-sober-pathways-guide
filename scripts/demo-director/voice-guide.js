#!/usr/bin/env node

/**
 * 🎤 VOICE GUIDE
 * Audio cues and text-to-speech guidance for demo recording
 */

const { exec } = require('child_process');
const os = require('os');

class VoiceGuide {
  constructor() {
    this.platform = os.platform();
    this.cues = [
      { time: 0, message: 'Start speaking now', whisper: true },
      { time: 28, message: 'Get ready to show phone', whisper: true },
      { time: 30, message: 'Show phone to camera now', urgent: true },
      { time: 45, message: 'Point to the SMS', whisper: true },
      { time: 80, message: 'Click billing tab', whisper: true },
      { time: 110, message: 'Show documentation', whisper: true },
      { time: 140, message: 'Create urgency', whisper: true },
      { time: 165, message: 'Strong close', whisper: true },
      { time: 175, message: 'Show phone number', urgent: true },
      { time: 180, message: 'Demo complete. Stop recording', urgent: true }
    ];
    
    this.countdowns = [
      { time: 60, message: '2 minutes remaining' },
      { time: 120, message: '1 minute remaining' },
      { time: 150, message: '30 seconds left' },
      { time: 170, message: '10 seconds to finish' }
    ];
  }

  start() {
    console.log('🎤 Voice Guide Active');
    this.startTime = Date.now();
    
    // Initial breathing reminder
    this.speak('Take a deep breath. You got this, Christopher.', true);
    
    // Schedule all cues
    this.cues.forEach(cue => {
      setTimeout(() => {
        this.speak(cue.message, cue.whisper, cue.urgent);
      }, cue.time * 1000);
    });
    
    // Schedule countdowns
    this.countdowns.forEach(countdown => {
      setTimeout(() => {
        this.speak(countdown.message, true);
      }, countdown.time * 1000);
    });
  }

  speak(text, whisper = false, urgent = false) {
    const volume = whisper ? 30 : urgent ? 100 : 70;
    const rate = urgent ? 200 : 150;
    
    if (this.platform === 'darwin') {
      // macOS
      const voice = whisper ? 'Samantha' : 'Alex';
      exec(`say -v ${voice} -r ${rate} "${text}"`);
    } else if (this.platform === 'win32') {
      // Windows
      const script = `
        Add-Type -AssemblyName System.Speech
        $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
        $speak.Volume = ${volume}
        $speak.Rate = ${rate > 150 ? 2 : 0}
        $speak.Speak("${text}")
      `;
      exec(`powershell -Command "${script.replace(/\n/g, ' ')}"`);
    } else {
      // Linux - use espeak if available
      exec(`espeak "${text}" -s ${rate} -a ${volume} 2>/dev/null`);
    }
    
    // Also log to console
    const prefix = urgent ? '🚨' : whisper ? '🤫' : '🎤';
    console.log(`${prefix} ${text}`);
  }

  playSound(soundFile) {
    if (this.platform === 'darwin') {
      exec(`afplay assets/${soundFile}.mp3`);
    } else if (this.platform === 'win32') {
      exec(`powershell -c (New-Object Media.SoundPlayer "assets/${soundFile}.mp3").PlaySync()`);
    } else {
      exec(`play assets/${soundFile}.mp3 2>/dev/null`);
    }
  }

  sendNotification(title, message) {
    if (this.platform === 'darwin') {
      exec(`osascript -e 'display notification "${message}" with title "${title}" sound name "Hero"'`);
    } else if (this.platform === 'win32') {
      exec(`powershell -Command "New-BurntToastNotification -Text '${title}', '${message}'"`);
    } else {
      exec(`notify-send "${title}" "${message}"`);
    }
  }
}

// Export for use by director
module.exports = VoiceGuide;

// Run standalone if called directly
if (require.main === module) {
  const guide = new VoiceGuide();
  guide.start();
}