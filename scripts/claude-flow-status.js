#!/usr/bin/env node

/**
 * Claude Flow Status Script
 * Displays current system status and available agents
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

async function showStatus() {
  console.log('\n🚀 Claude Flow System Status\n');
  console.log('=' . repeat(50));

  // Check configuration
  console.log('\n⚙️ Configuration:');
  const configPath = path.join(projectRoot, 'claude-flow.config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('  ✓ Configuration loaded');
    console.log(`  • Topology: ${config.performance?.defaultTopology || 'hierarchical'}`);
    console.log(`  • Max Agents: ${config.performance?.maxAgents || 10}`);
    console.log(`  • Execution: ${config.performance?.executionStrategy || 'parallel'}`);
  } else {
    console.log('  ✗ Configuration not found');
  }

  // Check memory system
  console.log('\n🧠 Memory System:');
  const memoryPath = path.join(projectRoot, 'memory', 'claude-flow-data.json');
  if (fs.existsSync(memoryPath)) {
    const memory = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
    console.log('  ✓ Memory system active');
    console.log(`  • Sessions: ${memory.statistics?.totalSessions || 0}`);
    console.log(`  • Tasks: ${memory.statistics?.totalTasks || 0}`);
  } else {
    console.log('  ✗ Memory system not initialized');
  }

  // Check available agents
  console.log('\n🤖 Available Agents:');
  const agentsDir = path.join(projectRoot, 'memory', 'agents');
  if (fs.existsSync(agentsDir)) {
    const agents = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'));
    if (agents.length > 0) {
      agents.forEach(agent => {
        const agentName = agent.replace('.md', '');
        console.log(`  • ${agentName}`);
      });
    } else {
      console.log('  No agents found');
    }
  } else {
    console.log('  Agents directory not found');
  }

  // Check MCP servers
  console.log('\n🔌 MCP Servers:');
  const claudeJsonPath = path.join(projectRoot, '.claude', 'claude.json');
  if (fs.existsSync(claudeJsonPath)) {
    const claudeConfig = JSON.parse(fs.readFileSync(claudeJsonPath, 'utf8'));
    if (claudeConfig.mcpServers) {
      Object.keys(claudeConfig.mcpServers).forEach(server => {
        console.log(`  • ${server}: configured`);
      });
    }
  } else {
    console.log('  No MCP servers configured');
  }

  // Check BMAD Method
  console.log('\n🔧 BMAD Method:');
  const bmadFiles = ['.bmad-core', '.bmad'];
  let bmadInstalled = false;
  for (const file of bmadFiles) {
    if (fs.existsSync(path.join(projectRoot, file))) {
      bmadInstalled = true;
      break;
    }
  }
  
  if (bmadInstalled) {
    console.log('  ✓ BMAD Method installed');
    
    // Show BMAD agents
    const bmadAgentsDir = path.join(projectRoot, '.bmad-core', 'agents');
    if (fs.existsSync(bmadAgentsDir)) {
      const bmadAgents = fs.readdirSync(bmadAgentsDir).filter(f => f.endsWith('.md'));
      console.log(`  • BMAD Agents: ${bmadAgents.length}`);
    }
    
    // Check for expansion packs
    const expansionDir = path.join(projectRoot, '.bmad', 'expansion-packs');
    if (fs.existsSync(expansionDir)) {
      const expansions = fs.readdirSync(expansionDir).filter(f => f.endsWith('.json'));
      if (expansions.length > 0) {
        console.log(`  • Expansion Packs: ${expansions.map(e => e.replace('.json', '')).join(', ')}`);
      }
    }
  } else {
    console.log('  ✗ BMAD Method not installed (optional)');
  }

  console.log('\n' + '=' . repeat(50));
  console.log('\n📚 Quick Commands:');
  console.log('  npm run claude-flow:spawn <agent>  - Spawn an agent');
  console.log('  npm run claude-flow:validate       - Run validation');
  console.log('  npm run bmad:init                  - Install BMAD Method');
  console.log('  npm run validate:mobile:agent      - Validate mobile deployment');
  console.log('\n');
}

showStatus().catch(console.error);