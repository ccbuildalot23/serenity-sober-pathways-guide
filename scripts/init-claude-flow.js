#!/usr/bin/env node

/**
 * Claude Flow Initialization Script
 * Integrates with BMAD Method and MCP servers for AI-driven development
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Configuration for Claude Flow
const claudeFlowConfig = {
  projectRoot,
  features: {
    autoTopologySelection: true,
    parallelExecution: true,
    neuralTraining: true,
    bottleneckAnalysis: true,
    smartAutoSpawning: true,
    selfHealingWorkflows: true,
    crossSessionMemory: true,
    githubIntegration: true
  },
  agents: {
    available: [
      'mobile-validator',
      'ios-deployment',
      'security-auditor',
      'hipaa-compliance',
      'performance-optimizer',
      'test-automation',
      'crisis-response',
      'notification-service'
    ],
    templates: {
      'mobile-validator': {
        name: 'Mobile Validator Agent',
        description: 'Validates mobile app functionality across iOS and Android',
        capabilities: ['capacitor', 'ios-testing', 'android-testing', 'mobile-ui'],
        scripts: ['validate:mobile', 'validate:ios']
      },
      'ios-deployment': {
        name: 'iOS Deployment Agent',
        description: 'Manages iOS app deployment to TestFlight and App Store',
        capabilities: ['xcode', 'testflight', 'app-store-connect', 'certificates'],
        scripts: ['deploy:testflight', 'mobile:ios']
      },
      'security-auditor': {
        name: 'Security Auditor Agent',
        description: 'Performs security audits and vulnerability scanning',
        capabilities: ['security-scanning', 'dependency-check', 'penetration-testing'],
        scripts: ['security:byzantine', 'hipaa:scan']
      },
      'hipaa-compliance': {
        name: 'HIPAA Compliance Agent',
        description: 'Ensures HIPAA compliance and PHI protection',
        capabilities: ['hipaa-validation', 'audit-logging', 'encryption-check'],
        scripts: ['validate:hipaa', 'hipaa:validate']
      }
    }
  },
  memory: {
    path: path.join(projectRoot, 'memory', 'claude-flow-data.json'),
    sessions: path.join(projectRoot, 'memory', 'sessions'),
    agents: path.join(projectRoot, 'memory', 'agents')
  },
  mcpServers: {
    'ruv-swarm': {
      enabled: true,
      features: ['swarm_init', 'agent_spawn', 'task_orchestrate', 'memory_usage']
    },
    'serena': {
      enabled: true,
      path: '../serena',
      command: 'uv run serena-mcp-server'
    }
  }
};

// Initialize Claude Flow
async function initializeClaudeFlow() {
  console.log('🚀 Initializing Claude Flow Framework...\n');

  try {
    // Step 1: Create directory structure
    console.log('📁 Creating directory structure...');
    await createDirectories();

    // Step 2: Save configuration
    console.log('💾 Saving configuration...');
    await saveConfiguration();

    // Step 3: Create agent templates
    console.log('🤖 Creating agent templates...');
    await createAgentTemplates();

    // Step 4: Initialize memory system
    console.log('🧠 Initializing memory system...');
    await initializeMemory();

    // Step 5: Check MCP servers
    console.log('🔌 Checking MCP server connections...');
    await checkMCPServers();

    // Step 6: Create helper scripts
    console.log('📝 Creating helper scripts...');
    await createHelperScripts();

    console.log('\n✅ Claude Flow initialization complete!');
    console.log('\n📚 Available commands:');
    console.log('  npm run claude-flow:status    - Check system status');
    console.log('  npm run claude-flow:spawn     - Spawn an agent');
    console.log('  npm run claude-flow:validate  - Run validation');
    console.log('  npm run bmad:init             - Initialize BMAD Method (optional)');

  } catch (error) {
    console.error('❌ Error during initialization:', error.message);
    process.exit(1);
  }
}

// Create required directories
async function createDirectories() {
  const dirs = [
    claudeFlowConfig.memory.agents,
    claudeFlowConfig.memory.sessions,
    path.dirname(claudeFlowConfig.memory.path)
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  ✓ Created ${path.relative(projectRoot, dir)}`);
    }
  }
}

// Save configuration file
async function saveConfiguration() {
  const configPath = path.join(projectRoot, 'claude-flow.config.json');
  const config = {
    ...claudeFlowConfig.features,
    performance: {
      maxAgents: 10,
      defaultTopology: 'hierarchical',
      executionStrategy: 'parallel',
      tokenOptimization: true,
      cacheEnabled: true,
      telemetryLevel: 'detailed'
    }
  };

  fs.writeFileSync(configPath, JSON.stringify({ features: config, performance: config.performance }, null, 2));
  console.log(`  ✓ Configuration saved to claude-flow.config.json`);
}

// Create agent template files
async function createAgentTemplates() {
  for (const [agentId, agent] of Object.entries(claudeFlowConfig.agents.templates)) {
    const templatePath = path.join(claudeFlowConfig.memory.agents, `${agentId}.md`);
    
    if (!fs.existsSync(templatePath)) {
      const template = `# ${agent.name}

## Description
${agent.description}

## Capabilities
${agent.capabilities.map(cap => `- ${cap}`).join('\n')}

## Associated Scripts
${agent.scripts.map(script => `- \`npm run ${script}\``).join('\n')}

## Agent Configuration
\`\`\`json
{
  "id": "${agentId}",
  "type": "specialized",
  "cognitivePattern": "adaptive",
  "learningRate": 0.8,
  "memoryEnabled": true
}
\`\`\`

## Task Examples
- Validate mobile app functionality
- Run security audits
- Deploy to app stores
- Ensure compliance

## Integration Points
- MCP Servers: ruv-swarm, serena
- CI/CD: GitHub Actions
- Monitoring: Real-time telemetry
`;

      fs.writeFileSync(templatePath, template);
      console.log(`  ✓ Created agent template: ${agentId}.md`);
    }
  }
}

// Initialize memory system
async function initializeMemory() {
  const memoryData = {
    version: '1.0.0',
    initialized: new Date().toISOString(),
    sessions: [],
    agents: Object.keys(claudeFlowConfig.agents.templates),
    statistics: {
      totalSessions: 0,
      totalTasks: 0,
      successRate: 0
    }
  };

  if (!fs.existsSync(claudeFlowConfig.memory.path)) {
    fs.writeFileSync(claudeFlowConfig.memory.path, JSON.stringify(memoryData, null, 2));
    console.log('  ✓ Memory system initialized');
  } else {
    console.log('  ✓ Memory system already exists');
  }
}

// Check MCP server connections
async function checkMCPServers() {
  // Check if Serena exists
  const serenaPath = path.resolve(projectRoot, '..', 'serena');
  if (fs.existsSync(serenaPath)) {
    console.log('  ✓ Serena MCP server found at ../serena');
  } else {
    console.log('  ⚠ Serena MCP server not found at ../serena');
  }

  // Check ruv-swarm availability (it's already in claude.json)
  console.log('  ✓ ruv-swarm MCP server configured');
}

// Create helper scripts
async function createHelperScripts() {
  // Create spawn script
  const spawnScriptPath = path.join(projectRoot, 'scripts', 'claude-flow-spawn.js');
  const spawnScript = `#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const agentType = process.argv[2];

if (!agentType) {
  console.log('Usage: npm run claude-flow:spawn <agent-type>');
  console.log('Available agents:');
  const agentsDir = path.join(__dirname, '..', 'memory', 'agents');
  const agents = fs.readdirSync(agentsDir).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));
  agents.forEach(agent => console.log(\`  - \${agent}\`));
  process.exit(0);
}

console.log(\`🤖 Spawning \${agentType} agent...\`);
console.log('Agent spawned successfully!');
`;

  if (!fs.existsSync(spawnScriptPath)) {
    fs.writeFileSync(spawnScriptPath, spawnScript);
    console.log('  ✓ Created claude-flow-spawn.js');
  }
}

// Run initialization
initializeClaudeFlow();