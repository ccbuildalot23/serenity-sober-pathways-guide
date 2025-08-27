#!/usr/bin/env node

/**
 * Automated Alert System for TestFlight Build 27 Monitoring
 * Sends notifications via multiple channels when important events occur
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawn } = require('child_process');

class AlertSystem {
  constructor(options = {}) {
    this.alertsEnabled = options.enabled !== false;
    this.channels = options.channels || ['console', 'file'];
    this.logFile = path.join(__dirname, '..', 'alerts.log');
    this.configFile = path.join(__dirname, '..', 'alert-config.json');
    this.alertHistory = [];
    
    // Load configuration
    this.loadConfig();
    
    this.log('🚨 Alert System initialized');
    this.log(`📢 Enabled channels: ${this.channels.join(', ')}`);
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configFile)) {
        const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
        this.config = {
          slack: config.slack || {},
          email: config.email || {},
          webhook: config.webhook || {},
          github: config.github || {},
          ...config
        };
      } else {
        this.config = {
          slack: { enabled: false },
          email: { enabled: false },
          webhook: { enabled: false },
          github: { enabled: false }
        };
        this.saveConfig();
      }
    } catch (error) {
      this.log(`⚠️ Failed to load config: ${error.message}`);
      this.config = {};
    }
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configFile, JSON.stringify(this.config, null, 2));
    } catch (error) {
      this.log(`⚠️ Failed to save config: ${error.message}`);
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    
    if (this.channels.includes('file')) {
      fs.appendFileSync(this.logFile, logEntry + '\n');
    }
  }

  async sendAlert(alert) {
    if (!this.alertsEnabled) {
      return { success: true, message: 'Alerts disabled' };
    }

    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const fullAlert = {
      id: alertId,
      timestamp: new Date().toISOString(),
      type: alert.type || 'info',
      title: alert.title || 'TestFlight Alert',
      message: alert.message || '',
      priority: alert.priority || 'normal',
      buildNumber: alert.buildNumber || 27,
      source: alert.source || 'TestFlight Monitor',
      data: alert.data || {}
    };

    this.log(`🚨 Sending ${fullAlert.type.toUpperCase()} alert: ${fullAlert.title}`);
    this.log(`   Message: ${fullAlert.message}`);

    // Store in history
    this.alertHistory.push(fullAlert);
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-50); // Keep last 50 alerts
    }

    const results = [];

    // Send to enabled channels
    if (this.channels.includes('console')) {
      results.push(await this.sendConsoleAlert(fullAlert));
    }
    
    if (this.channels.includes('file')) {
      results.push(await this.sendFileAlert(fullAlert));
    }

    if (this.config.slack?.enabled) {
      results.push(await this.sendSlackAlert(fullAlert));
    }

    if (this.config.email?.enabled) {
      results.push(await this.sendEmailAlert(fullAlert));
    }

    if (this.config.webhook?.enabled) {
      results.push(await this.sendWebhookAlert(fullAlert));
    }

    if (this.config.github?.enabled) {
      results.push(await this.sendGitHubAlert(fullAlert));
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    this.log(`✅ Alert sent to ${successCount}/${totalCount} channels`);

    return {
      success: successCount > 0,
      alertId,
      results,
      successCount,
      totalCount
    };
  }

  async sendConsoleAlert(alert) {
    try {
      const emoji = this.getEmojiForType(alert.type);
      const border = '='.repeat(60);
      
      console.log(`\n${border}`);
      console.log(`${emoji} ${alert.type.toUpperCase()}: ${alert.title}`);
      console.log(`⏰ Time: ${new Date(alert.timestamp).toLocaleString()}`);
      console.log(`📱 Build: ${alert.buildNumber}`);
      console.log(`📝 ${alert.message}`);
      if (Object.keys(alert.data).length > 0) {
        console.log(`📊 Data: ${JSON.stringify(alert.data, null, 2)}`);
      }
      console.log(`${border}\n`);

      return { success: true, channel: 'console' };
    } catch (error) {
      return { success: false, channel: 'console', error: error.message };
    }
  }

  async sendFileAlert(alert) {
    try {
      const alertData = {
        ...alert,
        humanTime: new Date(alert.timestamp).toLocaleString()
      };
      
      const alertLine = `${alert.timestamp} | ${alert.type.toUpperCase()} | ${alert.title} | ${alert.message}\n`;
      fs.appendFileSync(this.logFile, alertLine);
      
      // Also save detailed alert data
      const alertFile = path.join(__dirname, '..', `alert-${alert.id}.json`);
      fs.writeFileSync(alertFile, JSON.stringify(alertData, null, 2));

      return { success: true, channel: 'file', file: alertFile };
    } catch (error) {
      return { success: false, channel: 'file', error: error.message };
    }
  }

  async sendSlackAlert(alert) {
    try {
      const webhookUrl = this.config.slack.webhookUrl;
      if (!webhookUrl) {
        throw new Error('Slack webhook URL not configured');
      }

      const color = this.getSlackColorForType(alert.type);
      const emoji = this.getEmojiForType(alert.type);

      const payload = {
        text: `${emoji} TestFlight Build ${alert.buildNumber} Alert`,
        attachments: [{
          color: color,
          title: alert.title,
          text: alert.message,
          fields: [
            {
              title: 'Build Number',
              value: alert.buildNumber,
              short: true
            },
            {
              title: 'Type',
              value: alert.type.toUpperCase(),
              short: true
            },
            {
              title: 'Source',
              value: alert.source,
              short: true
            },
            {
              title: 'Time',
              value: new Date(alert.timestamp).toLocaleString(),
              short: true
            }
          ],
          footer: 'TestFlight Monitor',
          ts: Math.floor(new Date(alert.timestamp).getTime() / 1000)
        }]
      };

      const response = await this.makeHttpRequest(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      return { success: true, channel: 'slack', response: response.status };
    } catch (error) {
      return { success: false, channel: 'slack', error: error.message };
    }
  }

  async sendEmailAlert(alert) {
    try {
      // This would integrate with an email service like SendGrid, AWS SES, etc.
      // For now, just log the attempt
      this.log(`📧 Email alert would be sent: ${alert.title}`);
      
      return { success: true, channel: 'email', message: 'Email integration not implemented' };
    } catch (error) {
      return { success: false, channel: 'email', error: error.message };
    }
  }

  async sendWebhookAlert(alert) {
    try {
      const webhookUrl = this.config.webhook.url;
      if (!webhookUrl) {
        throw new Error('Webhook URL not configured');
      }

      const payload = {
        event: 'testflight_alert',
        alert: alert,
        metadata: {
          service: 'testflight-monitor',
          version: '1.0.0',
          environment: 'production'
        }
      };

      const response = await this.makeHttpRequest(webhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(this.config.webhook.headers || {})
        },
        body: JSON.stringify(payload)
      });

      return { success: true, channel: 'webhook', response: response.status };
    } catch (error) {
      return { success: false, channel: 'webhook', error: error.message };
    }
  }

  async sendGitHubAlert(alert) {
    try {
      // Create a GitHub issue comment or discussion post
      // This would require the GitHub API
      this.log(`🐙 GitHub alert would be posted: ${alert.title}`);
      
      return { success: true, channel: 'github', message: 'GitHub integration not implemented' };
    } catch (error) {
      return { success: false, channel: 'github', error: error.message };
    }
  }

  async makeHttpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };

      const protocol = urlObj.protocol === 'https:' ? https : require('http');
      
      const req = protocol.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (options.body) {
        req.write(options.body);
      }

      req.end();
    });
  }

  getEmojiForType(type) {
    const emojis = {
      success: '✅',
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      critical: '🚨',
      progress: '🔄',
      complete: '🎉'
    };
    return emojis[type] || 'ℹ️';
  }

  getSlackColorForType(type) {
    const colors = {
      success: 'good',
      info: '#36a64f',
      warning: 'warning',
      error: 'danger',
      critical: 'danger',
      progress: '#439FE0',
      complete: 'good'
    };
    return colors[type] || '#439FE0';
  }

  // Predefined alert templates for common TestFlight events
  async sendBuildUploadedAlert(buildNumber = 27) {
    return this.sendAlert({
      type: 'success',
      title: `Build ${buildNumber} Uploaded Successfully`,
      message: `Your iOS build has been uploaded to App Store Connect and is being processed.`,
      buildNumber,
      priority: 'normal',
      source: 'iOS Deploy Workflow'
    });
  }

  async sendProcessingCompleteAlert(buildNumber = 27, status = 'ready') {
    return this.sendAlert({
      type: status === 'ready' ? 'complete' : 'error',
      title: `Build ${buildNumber} Processing Complete`,
      message: status === 'ready' ? 
        'Your build is ready for TestFlight testing!' : 
        'Build processing failed - check App Store Connect for details',
      buildNumber,
      priority: 'high',
      source: 'TestFlight Monitor',
      data: { status }
    });
  }

  async sendWorkflowFailedAlert(workflowName, errorDetails = {}) {
    return this.sendAlert({
      type: 'error',
      title: 'iOS Deployment Workflow Failed',
      message: `The ${workflowName} workflow has failed. Please check the GitHub Actions logs for details.`,
      priority: 'high',
      source: 'GitHub Actions Monitor',
      data: errorDetails
    });
  }

  async sendStatusChangeAlert(oldStatus, newStatus, buildNumber = 27) {
    return this.sendAlert({
      type: 'progress',
      title: `Build ${buildNumber} Status Changed`,
      message: `Status changed from "${oldStatus}" to "${newStatus}"`,
      buildNumber,
      priority: 'normal',
      source: 'TestFlight Monitor',
      data: { oldStatus, newStatus }
    });
  }

  async sendTimeoutAlert(process, timeoutMinutes, buildNumber = 27) {
    return this.sendAlert({
      type: 'warning',
      title: `${process} Timeout Warning`,
      message: `${process} has been running for ${timeoutMinutes} minutes, which is longer than expected.`,
      buildNumber,
      priority: 'high',
      source: 'TestFlight Monitor',
      data: { process, timeoutMinutes }
    });
  }

  getAlertHistory(limit = 10) {
    return this.alertHistory.slice(-limit).reverse();
  }

  getAlertStats() {
    const total = this.alertHistory.length;
    const byType = this.alertHistory.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {});

    const last24h = this.alertHistory.filter(alert => 
      new Date() - new Date(alert.timestamp) < 24 * 60 * 60 * 1000
    ).length;

    return {
      total,
      byType,
      last24h,
      lastAlert: this.alertHistory[this.alertHistory.length - 1]
    };
  }

  // Configuration methods
  configureSlack(webhookUrl, options = {}) {
    this.config.slack = {
      enabled: true,
      webhookUrl,
      ...options
    };
    this.saveConfig();
    this.log('✅ Slack integration configured');
  }

  configureWebhook(url, options = {}) {
    this.config.webhook = {
      enabled: true,
      url,
      ...options
    };
    this.saveConfig();
    this.log('✅ Webhook integration configured');
  }

  disableChannel(channel) {
    if (this.config[channel]) {
      this.config[channel].enabled = false;
      this.saveConfig();
      this.log(`❌ ${channel} integration disabled`);
    }
  }

  enableChannel(channel) {
    if (this.config[channel]) {
      this.config[channel].enabled = true;
      this.saveConfig();
      this.log(`✅ ${channel} integration enabled`);
    }
  }
}

// CLI interface
if (require.main === module) {
  const alertSystem = new AlertSystem();
  
  const command = process.argv[2] || 'test';
  const message = process.argv.slice(3).join(' ') || 'Test alert from CLI';
  
  switch (command) {
    case 'test':
      alertSystem.sendAlert({
        type: 'info',
        title: 'Test Alert',
        message: message,
        buildNumber: 27,
        source: 'CLI Test'
      });
      break;
      
    case 'build-uploaded':
      alertSystem.sendBuildUploadedAlert(27);
      break;
      
    case 'processing-complete':
      alertSystem.sendProcessingCompleteAlert(27, 'ready');
      break;
      
    case 'workflow-failed':
      alertSystem.sendWorkflowFailedAlert('iOS App Store Deployment', {
        error: message || 'Unknown error'
      });
      break;
      
    case 'history':
      console.log('\n📋 Alert History:');
      console.log(JSON.stringify(alertSystem.getAlertHistory(), null, 2));
      break;
      
    case 'stats':
      console.log('\n📊 Alert Statistics:');
      console.log(JSON.stringify(alertSystem.getAlertStats(), null, 2));
      break;
      
    case 'config':
      if (process.argv[3] === 'slack' && process.argv[4]) {
        alertSystem.configureSlack(process.argv[4]);
      } else if (process.argv[3] === 'webhook' && process.argv[4]) {
        alertSystem.configureWebhook(process.argv[4]);
      } else {
        console.log('Current configuration:');
        console.log(JSON.stringify(alertSystem.config, null, 2));
      }
      break;
      
    default:
      console.log('Available commands:');
      console.log('  test [message]           - Send test alert');
      console.log('  build-uploaded          - Send build uploaded alert');
      console.log('  processing-complete     - Send processing complete alert');
      console.log('  workflow-failed [error] - Send workflow failed alert');
      console.log('  history                 - Show alert history');
      console.log('  stats                   - Show alert statistics');
      console.log('  config [slack|webhook] [url] - Configure integrations');
      break;
  }
}

module.exports = AlertSystem;