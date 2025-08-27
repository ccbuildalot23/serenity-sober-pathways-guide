#!/usr/bin/env node

/**
 * 📊 PROVIDER CRM & TRACKING SYSTEM
 * Tracks all provider interactions through the sales funnel
 * Monitors conversion rates and schedules follow-ups
 */

import fs from 'fs/promises';
import { createReadStream, existsSync } from 'fs';
import csv from 'csv-parser';
import chalk from 'chalk';
import ora from 'ora';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

// CRM Database file
const CRM_FILE = 'provider-crm-database.json';
const ACTIVITY_LOG = 'provider-activity-log.json';

// Interaction types
const INTERACTIONS = {
  EMAIL_SENT: 'email_sent',
  EMAIL_OPENED: 'email_opened',
  EMAIL_CLICKED: 'email_clicked',
  EMAIL_REPLIED: 'email_replied',
  LINKEDIN_SENT: 'linkedin_sent',
  LINKEDIN_ACCEPTED: 'linkedin_accepted',
  LINKEDIN_MESSAGE: 'linkedin_message',
  TEXT_SENT: 'text_sent',
  TEXT_REPLIED: 'text_replied',
  CALL_MADE: 'call_made',
  CALL_CONNECTED: 'call_connected',
  DEMO_SCHEDULED: 'demo_scheduled',
  DEMO_COMPLETED: 'demo_completed',
  TRIAL_STARTED: 'trial_started',
  ONBOARDED: 'onboarded',
  ACTIVE: 'active'
};

// Pipeline stages
const STAGES = {
  COLD: 'cold',
  CONTACTED: 'contacted',
  ENGAGED: 'engaged',
  INTERESTED: 'interested',
  DEMO: 'demo',
  TRIAL: 'trial',
  ONBOARDING: 'onboarding',
  ACTIVE: 'active',
  LOST: 'lost'
};

// Load or create CRM database
async function loadCRM() {
  try {
    if (existsSync(CRM_FILE)) {
      const data = await fs.readFile(CRM_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.log(chalk.yellow('Creating new CRM database...'));
  }
  
  // Initialize from CSV
  const providers = [];
  
  return new Promise((resolve) => {
    createReadStream('provider-contacts.csv')
      .pipe(csv())
      .on('data', (row) => {
        providers.push({
          id: `PRV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          practice: row['Practice Name'],
          provider: row['Provider Name'],
          email: row['Email'],
          phone: row['Phone'],
          city: row['City'],
          specialty: row['Specialty'],
          simplePractice: row['SimplePractice User'] === 'Yes',
          priority: row['Priority'],
          stage: STAGES.COLD,
          interactions: [],
          nextAction: null,
          score: calculateScore(row['Priority']),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      })
      .on('end', async () => {
        const crm = {
          providers,
          stats: calculateStats(providers),
          lastUpdated: new Date().toISOString()
        };
        await saveCRM(crm);
        resolve(crm);
      });
  });
}

// Calculate provider score
function calculateScore(priority) {
  const baseScore = priority === 'HIGH' ? 100 : priority === 'MEDIUM' ? 50 : 25;
  return baseScore;
}

// Save CRM database
async function saveCRM(crm) {
  await fs.writeFile(CRM_FILE, JSON.stringify(crm, null, 2));
}

// Log activity
async function logActivity(providerId, interaction, details) {
  let log = [];
  
  try {
    const existing = await fs.readFile(ACTIVITY_LOG, 'utf-8');
    log = JSON.parse(existing);
  } catch (e) {
    // New log file
  }
  
  log.push({
    timestamp: new Date().toISOString(),
    providerId,
    interaction,
    details
  });
  
  await fs.writeFile(ACTIVITY_LOG, JSON.stringify(log, null, 2));
}

// Update provider interaction
async function updateProvider(crm, providerId, interaction, details = {}) {
  const provider = crm.providers.find(p => p.id === providerId);
  if (!provider) return;
  
  // Add interaction
  provider.interactions.push({
    type: interaction,
    timestamp: new Date().toISOString(),
    details
  });
  
  // Update stage based on interaction
  provider.stage = determineStage(provider.interactions);
  
  // Update score
  provider.score = calculateProviderScore(provider);
  
  // Set next action
  provider.nextAction = determineNextAction(provider);
  
  provider.updatedAt = new Date().toISOString();
  
  // Log activity
  await logActivity(providerId, interaction, details);
  
  // Update stats
  crm.stats = calculateStats(crm.providers);
  crm.lastUpdated = new Date().toISOString();
  
  await saveCRM(crm);
}

// Determine stage from interactions
function determineStage(interactions) {
  const types = interactions.map(i => i.type);
  
  if (types.includes(INTERACTIONS.ACTIVE)) return STAGES.ACTIVE;
  if (types.includes(INTERACTIONS.ONBOARDED)) return STAGES.ONBOARDING;
  if (types.includes(INTERACTIONS.TRIAL_STARTED)) return STAGES.TRIAL;
  if (types.includes(INTERACTIONS.DEMO_COMPLETED)) return STAGES.DEMO;
  if (types.includes(INTERACTIONS.DEMO_SCHEDULED)) return STAGES.INTERESTED;
  if (types.includes(INTERACTIONS.EMAIL_REPLIED) || 
      types.includes(INTERACTIONS.TEXT_REPLIED)) return STAGES.ENGAGED;
  if (types.includes(INTERACTIONS.EMAIL_SENT)) return STAGES.CONTACTED;
  
  return STAGES.COLD;
}

// Calculate provider score
function calculateProviderScore(provider) {
  let score = provider.priority === 'HIGH' ? 100 : provider.priority === 'MEDIUM' ? 50 : 25;
  
  // Boost for engagement
  provider.interactions.forEach(i => {
    switch(i.type) {
      case INTERACTIONS.EMAIL_OPENED: score += 5; break;
      case INTERACTIONS.EMAIL_CLICKED: score += 10; break;
      case INTERACTIONS.EMAIL_REPLIED: score += 25; break;
      case INTERACTIONS.DEMO_SCHEDULED: score += 50; break;
      case INTERACTIONS.DEMO_COMPLETED: score += 75; break;
      case INTERACTIONS.TRIAL_STARTED: score += 100; break;
    }
  });
  
  // Penalty for time since last interaction
  if (provider.interactions.length > 0) {
    const lastInteraction = provider.interactions[provider.interactions.length - 1];
    const daysSince = (Date.now() - new Date(lastInteraction.timestamp)) / (1000 * 60 * 60 * 24);
    if (daysSince > 7) score -= 20;
    if (daysSince > 14) score -= 40;
  }
  
  return Math.max(0, score);
}

// Determine next action
function determineNextAction(provider) {
  const lastInteraction = provider.interactions[provider.interactions.length - 1];
  if (!lastInteraction) return { action: 'Send initial email', due: new Date() };
  
  const hoursSince = (Date.now() - new Date(lastInteraction.timestamp)) / (1000 * 60 * 60);
  
  switch(lastInteraction.type) {
    case INTERACTIONS.EMAIL_SENT:
      if (hoursSince > 2) return { action: 'Send text follow-up', due: new Date() };
      break;
    case INTERACTIONS.EMAIL_OPENED:
      if (hoursSince > 24) return { action: 'Send LinkedIn request', due: new Date() };
      break;
    case INTERACTIONS.EMAIL_REPLIED:
      return { action: 'Schedule demo immediately', due: new Date() };
    case INTERACTIONS.DEMO_SCHEDULED:
      return { action: 'Send reminder 1 hour before demo', due: new Date(lastInteraction.details.demoTime) };
    case INTERACTIONS.DEMO_COMPLETED:
      if (hoursSince > 24) return { action: 'Follow-up call', due: new Date() };
      break;
  }
  
  if (hoursSince > 72) {
    return { action: 'Re-engage with new angle', due: new Date() };
  }
  
  return null;
}

// Calculate stats
function calculateStats(providers) {
  const stages = {};
  Object.values(STAGES).forEach(stage => {
    stages[stage] = providers.filter(p => p.stage === stage).length;
  });
  
  const totalContacted = providers.filter(p => p.stage !== STAGES.COLD).length;
  const totalEngaged = providers.filter(p => 
    [STAGES.ENGAGED, STAGES.INTERESTED, STAGES.DEMO, STAGES.TRIAL, STAGES.ONBOARDING, STAGES.ACTIVE]
    .includes(p.stage)).length;
  const totalDemos = providers.filter(p => 
    p.interactions.some(i => i.type === INTERACTIONS.DEMO_COMPLETED)).length;
  const totalActive = providers.filter(p => p.stage === STAGES.ACTIVE).length;
  
  return {
    total: providers.length,
    stages,
    conversionRates: {
      contactToEngaged: totalContacted > 0 ? (totalEngaged / totalContacted * 100).toFixed(1) : 0,
      engagedToDemo: totalEngaged > 0 ? (totalDemos / totalEngaged * 100).toFixed(1) : 0,
      demoToActive: totalDemos > 0 ? (totalActive / totalDemos * 100).toFixed(1) : 0,
      overall: totalContacted > 0 ? (totalActive / totalContacted * 100).toFixed(1) : 0
    },
    totalContacted,
    totalEngaged,
    totalDemos,
    totalActive
  };
}

// Display dashboard
function displayDashboard(crm) {
  console.clear();
  console.log(chalk.cyan.bold(`
╔═══════════════════════════════════════════════════════════════╗
║                  📊 PROVIDER CRM DASHBOARD                   ║
╚═══════════════════════════════════════════════════════════════╝
  `));
  
  const stats = crm.stats;
  
  // Funnel visualization
  console.log(chalk.white('\n📈 SALES FUNNEL:'));
  console.log(chalk.gray('━'.repeat(60)));
  
  const maxWidth = 50;
  Object.entries(stats.stages).forEach(([stage, count]) => {
    const width = Math.floor((count / crm.providers.length) * maxWidth);
    const bar = '█'.repeat(width) + '░'.repeat(maxWidth - width);
    const color = stage === STAGES.ACTIVE ? chalk.green : 
                   stage === STAGES.LOST ? chalk.red : chalk.cyan;
    console.log(`${stage.padEnd(12)} ${color(bar)} ${count}`);
  });
  
  console.log(chalk.gray('━'.repeat(60)));
  
  // Conversion rates
  console.log(chalk.yellow('\n📊 CONVERSION RATES:'));
  console.log(`Contact → Engaged: ${chalk.green(stats.conversionRates.contactToEngaged + '%')}`);
  console.log(`Engaged → Demo: ${chalk.green(stats.conversionRates.engagedToDemo + '%')}`);
  console.log(`Demo → Active: ${chalk.green(stats.conversionRates.demoToActive + '%')}`);
  console.log(`Overall: ${chalk.bold.green(stats.conversionRates.overall + '%')}`);
  
  // Hot leads
  const hotLeads = crm.providers
    .filter(p => p.score > 100 && p.stage !== STAGES.ACTIVE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  
  if (hotLeads.length > 0) {
    console.log(chalk.red('\n🔥 HOT LEADS (Take Action Now):'));
    hotLeads.forEach(lead => {
      console.log(`${chalk.yellow('→')} ${lead.practice} (${lead.provider})`);
      if (lead.nextAction) {
        console.log(`   ${chalk.gray(lead.nextAction.action)}`);
      }
    });
  }
  
  // Upcoming actions
  const upcomingActions = crm.providers
    .filter(p => p.nextAction && p.stage !== STAGES.ACTIVE && p.stage !== STAGES.LOST)
    .sort((a, b) => new Date(a.nextAction.due) - new Date(b.nextAction.due))
    .slice(0, 5);
  
  if (upcomingActions.length > 0) {
    console.log(chalk.cyan('\n⏰ NEXT ACTIONS:'));
    upcomingActions.forEach(provider => {
      console.log(`${provider.practice}: ${provider.nextAction.action}`);
    });
  }
  
  // Success metrics
  console.log(chalk.green('\n✅ SUCCESS METRICS:'));
  console.log(`Providers Contacted: ${stats.totalContacted}/${crm.providers.length}`);
  console.log(`Currently Engaged: ${stats.totalEngaged}`);
  console.log(`Demos Completed: ${stats.totalDemos}`);
  console.log(`Active Providers: ${chalk.bold.green(stats.totalActive)}/5 target`);
  
  // Days until launch
  const launchDate = new Date('2025-08-31');
  const daysLeft = Math.ceil((launchDate - new Date()) / (1000 * 60 * 60 * 24));
  console.log(chalk.red(`\n⏳ Days until pilot launch: ${daysLeft}`));
}

// Interactive menu
async function interactiveMenu(crm) {
  while (true) {
    console.log(chalk.yellow('\n📝 ACTIONS:'));
    console.log('1. Log email sent');
    console.log('2. Log email opened');
    console.log('3. Log reply received');
    console.log('4. Schedule demo');
    console.log('5. Complete demo');
    console.log('6. Start trial');
    console.log('7. Mark as lost');
    console.log('8. View provider details');
    console.log('9. Export report');
    console.log('0. Exit');
    
    const choice = await question('\nSelect action: ');
    
    if (choice === '0') break;
    
    // Handle actions
    switch(choice) {
      case '1': // Log email sent
        const emailProvider = await selectProvider(crm, 'Select provider for email sent:');
        if (emailProvider) {
          await updateProvider(crm, emailProvider.id, INTERACTIONS.EMAIL_SENT);
          console.log(chalk.green('✅ Email sent logged'));
        }
        break;
        
      case '2': // Log email opened
        const openProvider = await selectProvider(crm, 'Select provider who opened email:');
        if (openProvider) {
          await updateProvider(crm, openProvider.id, INTERACTIONS.EMAIL_OPENED);
          console.log(chalk.green('✅ Email open logged'));
        }
        break;
        
      case '3': // Log reply
        const replyProvider = await selectProvider(crm, 'Select provider who replied:');
        if (replyProvider) {
          await updateProvider(crm, replyProvider.id, INTERACTIONS.EMAIL_REPLIED);
          console.log(chalk.green('✅ Reply logged - Schedule demo ASAP!'));
        }
        break;
        
      case '4': // Schedule demo
        const demoProvider = await selectProvider(crm, 'Select provider for demo:');
        if (demoProvider) {
          const demoTime = await question('Demo date/time (YYYY-MM-DD HH:MM): ');
          await updateProvider(crm, demoProvider.id, INTERACTIONS.DEMO_SCHEDULED, { demoTime });
          console.log(chalk.green('✅ Demo scheduled!'));
        }
        break;
        
      case '5': // Complete demo
        const completedProvider = await selectProvider(crm, 'Select provider who completed demo:');
        if (completedProvider) {
          await updateProvider(crm, completedProvider.id, INTERACTIONS.DEMO_COMPLETED);
          console.log(chalk.green('✅ Demo completed - Follow up within 24 hours!'));
        }
        break;
        
      case '9': // Export report
        await exportReport(crm);
        break;
    }
    
    // Refresh dashboard
    displayDashboard(crm);
  }
}

// Select provider helper
async function selectProvider(crm, prompt) {
  console.log(`\n${prompt}`);
  const filtered = crm.providers
    .filter(p => p.stage !== STAGES.ACTIVE && p.stage !== STAGES.LOST)
    .slice(0, 10);
  
  filtered.forEach((p, i) => {
    console.log(`${i + 1}. ${p.practice} (${p.stage})`);
  });
  
  const choice = await question('Select number: ');
  return filtered[parseInt(choice) - 1];
}

// Export report
async function exportReport(crm) {
  const report = {
    generated: new Date().toISOString(),
    summary: crm.stats,
    providers: crm.providers.map(p => ({
      practice: p.practice,
      provider: p.provider,
      stage: p.stage,
      score: p.score,
      lastInteraction: p.interactions[p.interactions.length - 1],
      nextAction: p.nextAction
    }))
  };
  
  await fs.writeFile('crm-report.json', JSON.stringify(report, null, 2));
  console.log(chalk.green('✅ Report exported to crm-report.json'));
}

// Main execution
async function main() {
  const spinner = ora('Loading CRM database...').start();
  
  try {
    const crm = await loadCRM();
    spinner.succeed('CRM loaded');
    
    displayDashboard(crm);
    await interactiveMenu(crm);
    
  } catch (error) {
    spinner.fail('Failed to load CRM');
    console.error(chalk.red('Error:'), error.message);
  } finally {
    rl.close();
  }
}

// Run CRM
main().catch(console.error);