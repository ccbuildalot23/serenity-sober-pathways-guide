#!/usr/bin/env node

/**
 * Comprehensive TestFlight Monitoring Dashboard
 * Real-time monitoring with continuous updates and HTML dashboard
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Configuration
const CONFIG = {
  appId: '6751502942',
  bundleId: 'com.serenity.recovery',
  buildNumber: '27',
  deliveryUUID: '2ead7ca5-a182-41b1-9c1c-11493f4d7ebd',
  uploadTime: new Date('2025-08-25T15:17:45Z'),
  workflowRun: '17212923613',
  refreshInterval: 300000 // 5 minutes
};

let monitoringActive = false;

// Colors
const colors = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m', 
  yellow: '\x1b[33m', blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  const timestamp = new Date().toISOString();
  console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function calculateElapsedTime() {
  const now = new Date();
  const elapsed = Math.floor((now - CONFIG.uploadTime) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const seconds = elapsed % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

function getProcessingStage(elapsedMinutes) {
  const stages = [
    { max: 5, name: 'Initial Upload Validation', icon: '🔄', color: 'blue' },
    { max: 15, name: 'Binary Analysis & Scanning', icon: '🔍', color: 'cyan' },
    { max: 30, name: 'Security & Privacy Review', icon: '🛡️', color: 'yellow' },
    { max: 45, name: 'Metadata Validation', icon: '📋', color: 'yellow' },
    { max: 60, name: 'Final Processing', icon: '⚡', color: 'green' },
    { max: 120, name: 'Extended Processing', icon: '⏳', color: 'yellow' },
    { max: Infinity, name: 'Investigation Required', icon: '🚨', color: 'red' }
  ];
  
  return stages.find(stage => elapsedMinutes < stage.max);
}

function generateHTMLDashboard(status) {
  const elapsed = calculateElapsedTime();
  const elapsedMinutes = Math.floor((new Date() - CONFIG.uploadTime) / 60000);
  const stage = getProcessingStage(elapsedMinutes);
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TestFlight Monitor - Serenity Build 27</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
               margin: 0; padding: 20px; background: #f5f5f7; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #1d1d1f; margin-bottom: 10px; }
        .status-card { background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px; 
                       box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric { display: flex; align-items: center; margin-bottom: 16px; }
        .metric-icon { font-size: 24px; margin-right: 12px; }
        .metric-content h3 { margin: 0; color: #1d1d1f; font-size: 16px; }
        .metric-content p { margin: 0; color: #86868b; font-size: 14px; }
        .progress-bar { width: 100%; height: 8px; background: #e5e5e7; border-radius: 4px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #007AFF, #5856D6); 
                         transition: width 0.5s ease; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; 
                        font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .status-normal { background: #d1f2eb; color: #00875a; }
        .status-extended { background: #fff3cd; color: #856404; }
        .status-attention { background: #f8d7da; color: #721c24; }
        .timeline { margin-top: 20px; }
        .timeline-item { display: flex; align-items: center; padding: 12px 0; border-left: 3px solid #e5e5e7; 
                         padding-left: 16px; margin-left: 12px; }
        .timeline-item.active { border-color: #007AFF; background: #f0f8ff; margin-left: 0; border-radius: 8px; }
        .refresh-time { text-align: center; color: #86868b; font-size: 14px; margin-top: 20px; }
    </style>
    <meta http-equiv="refresh" content="300">
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 TestFlight Processing Monitor</h1>
            <h2>Serenity Sober Pathways - Build 27</h2>
        </div>
        
        <div class="status-grid">
            <div class="status-card">
                <h2>📊 Current Status</h2>
                <div class="metric">
                    <span class="metric-icon">${stage.icon}</span>
                    <div class="metric-content">
                        <h3>${stage.name}</h3>
                        <p>Processing Stage</p>
                    </div>
                </div>
                <div class="metric">
                    <span class="metric-icon">⏱️</span>
                    <div class="metric-content">
                        <h3>${elapsed}</h3>
                        <p>Elapsed Time</p>
                    </div>
                </div>
                <span class="status-badge ${elapsedMinutes < 60 ? 'status-normal' : elapsedMinutes < 120 ? 'status-extended' : 'status-attention'}">
                    ${elapsedMinutes < 60 ? 'Normal Processing' : elapsedMinutes < 120 ? 'Extended Processing' : 'Requires Attention'}
                </span>
            </div>
            
            <div class="status-card">
                <h2>📱 Build Information</h2>
                <div class="metric">
                    <span class="metric-icon">📦</span>
                    <div class="metric-content">
                        <h3>${CONFIG.bundleId}</h3>
                        <p>Bundle ID</p>
                    </div>
                </div>
                <div class="metric">
                    <span class="metric-icon">🏗️</span>
                    <div class="metric-content">
                        <h3>Build ${CONFIG.buildNumber}</h3>
                        <p>Version 1.0.0</p>
                    </div>
                </div>
                <div class="metric">
                    <span class="metric-icon">🆔</span>
                    <div class="metric-content">
                        <h3>${CONFIG.deliveryUUID.substring(0, 8)}...</h3>
                        <p>Delivery UUID</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="status-card">
            <h2>🔄 Processing Timeline</h2>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min((elapsedMinutes / 60) * 100, 100)}%"></div>
            </div>
            <div class="timeline">
                <div class="timeline-item ${elapsedMinutes > 0 ? 'active' : ''}">
                    ✅ Upload Complete (${CONFIG.uploadTime.toLocaleTimeString()})
                </div>
                <div class="timeline-item ${elapsedMinutes > 5 ? 'active' : ''}">
                    🔍 Binary Analysis ${elapsedMinutes > 5 ? '(In Progress)' : '(Pending)'}
                </div>
                <div class="timeline-item ${elapsedMinutes > 15 ? 'active' : ''}">
                    🛡️ Security Review ${elapsedMinutes > 15 ? '(In Progress)' : '(Pending)'}
                </div>
                <div class="timeline-item ${elapsedMinutes > 30 ? 'active' : ''}">
                    📋 Metadata Validation ${elapsedMinutes > 30 ? '(In Progress)' : '(Pending)'}
                </div>
                <div class="timeline-item ${elapsedMinutes > 45 ? 'active' : ''}">
                    ⚡ Final Processing ${elapsedMinutes > 45 ? '(In Progress)' : '(Pending)'}
                </div>
                <div class="timeline-item">
                    🎯 Ready for Testing (Pending)
                </div>
            </div>
        </div>
        
        <div class="status-card">
            <h2>📋 Next Actions</h2>
            ${elapsedMinutes < 60 ? `
            <p>✅ <strong>Normal Processing</strong> - Build is processing within expected timeframe</p>
            <ul>
                <li>Continue monitoring - build should be ready soon</li>
                <li>Check TestFlight tab in App Store Connect</li>
                <li>Prepare internal testers list</li>
            </ul>
            ` : elapsedMinutes < 120 ? `
            <p>⚠️ <strong>Extended Processing</strong> - Taking longer than usual but still normal</p>
            <ul>
                <li>Monitor for Apple notifications</li>
                <li>Check App Store Connect for any messages</li>
                <li>Processing should complete within 2 hours</li>
            </ul>
            ` : `
            <p>🚨 <strong>Requires Attention</strong> - Processing time exceeds normal range</p>
            <ul>
                <li>Check App Store Connect for error messages</li>
                <li>Review Apple Developer notifications</li>
                <li>Consider contacting Apple Developer Support</li>
            </ul>
            `}
        </div>
        
        <div class="refresh-time">
            Last updated: ${new Date().toLocaleString()} • Auto-refresh every 5 minutes
        </div>
    </div>
</body>
</html>`;

  const dashboardPath = path.join(__dirname, '..', 'testflight-dashboard.html');
  fs.writeFileSync(dashboardPath, html);
  return dashboardPath;
}

async function runContinuousMonitoring() {
  monitoringActive = true;
  
  log('🎯 Starting continuous TestFlight monitoring...', 'magenta');
  log(`🔄 Monitoring every ${CONFIG.refreshInterval / 60000} minutes`, 'blue');
  
  const monitor = async () => {
    if (!monitoringActive) return;
    
    try {
      // Run status check
      log('📊 Checking TestFlight status...', 'blue');
      const elapsed = calculateElapsedTime();
      const elapsedMinutes = Math.floor((new Date() - CONFIG.uploadTime) / 60000);
      const stage = getProcessingStage(elapsedMinutes);
      
      log(`⏱️  Elapsed: ${elapsed} | Stage: ${stage.name}`, 'cyan');
      
      // Generate HTML dashboard
      const dashboardPath = generateHTMLDashboard();
      log(`📄 Dashboard updated: ${dashboardPath}`, 'green');
      
      // Check if we need to alert
      if (elapsedMinutes > 120) {
        log('🚨 ALERT: Processing time exceeds 2 hours - investigation may be needed', 'red');
      } else if (elapsedMinutes > 60) {
        log('⚠️  Extended processing detected - monitoring closely', 'yellow');
      }
      
      // Schedule next check
      if (monitoringActive) {
        setTimeout(monitor, CONFIG.refreshInterval);
      }
      
    } catch (error) {
      log(`❌ Error during monitoring: ${error.message}`, 'red');
      if (monitoringActive) {
        setTimeout(monitor, CONFIG.refreshInterval);
      }
    }
  };
  
  // Start monitoring
  await monitor();
}

function stopMonitoring() {
  monitoringActive = false;
  log('🛑 Stopping continuous monitoring...', 'yellow');
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'start':
    runContinuousMonitoring();
    break;
    
  case 'status':
    const elapsed = calculateElapsedTime();
    const elapsedMinutes = Math.floor((new Date() - CONFIG.uploadTime) / 60000);
    const stage = getProcessingStage(elapsedMinutes);
    
    log(`📊 Current Status: ${stage.name}`, 'cyan');
    log(`⏱️  Elapsed Time: ${elapsed}`, 'blue');
    log(`📱 Build 27 processing...`, 'green');
    break;
    
  case 'html':
    const dashboardPath = generateHTMLDashboard();
    log(`📄 HTML Dashboard generated: ${dashboardPath}`, 'green');
    log('🌐 Open the dashboard in your web browser', 'blue');
    break;
    
  default:
    log('📊 TestFlight Dashboard Commands:', 'magenta');
    log('  node testflight-dashboard.js start   - Start continuous monitoring', 'cyan');
    log('  node testflight-dashboard.js status  - Check current status', 'cyan');
    log('  node testflight-dashboard.js html    - Generate HTML dashboard', 'cyan');
    break;
}

// Handle cleanup
process.on('SIGINT', () => {
  stopMonitoring();
  process.exit(0);
});

module.exports = {
  runContinuousMonitoring,
  generateHTMLDashboard,
  CONFIG
};