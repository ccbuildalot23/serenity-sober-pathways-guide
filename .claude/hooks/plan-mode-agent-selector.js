#!/usr/bin/env node

/**
 * Plan Mode Agent Selector Hook
 * Automatically assesses task complexity and suggests appropriate agents, swarms, and frameworks
 */

// Plan Mode Agent Selector - ES Module

// Task complexity patterns
const COMPLEXITY_PATTERNS = {
  research: [
    /research/i,
    /analyze/i,
    /investigate/i,
    /explore/i,
    /find out/i,
    /understand/i,
    /documentation/i,
    /learn about/i
  ],
  development: [
    /implement/i,
    /create/i,
    /build/i,
    /develop/i,
    /code/i,
    /write.*function/i,
    /add.*feature/i,
    /refactor/i
  ],
  architecture: [
    /design/i,
    /architect/i,
    /structure/i,
    /plan.*system/i,
    /database.*schema/i,
    /api.*design/i
  ],
  security: [
    /security/i,
    /audit/i,
    /vulnerability/i,
    /compliance/i,
    /hipaa/i,
    /encryption/i,
    /authentication/i
  ],
  testing: [
    /test/i,
    /validate/i,
    /verify/i,
    /check/i,
    /qa/i,
    /quality/i,
    /coverage/i
  ],
  performance: [
    /optimize/i,
    /performance/i,
    /speed/i,
    /benchmark/i,
    /profile/i,
    /memory/i,
    /efficiency/i
  ],
  bugfix: [
    /fix/i,
    /bug/i,
    /issue/i,
    /error/i,
    /problem/i,
    /broken/i,
    /repair/i
  ]
};

// Agent configurations for each task type
const AGENT_CONFIGS = {
  research: {
    agents: ['researcher', 'deep-researcher'],
    mcp: ['mcp__exa', 'mcp__Ref'],
    swarm: 'mesh',
    framework: 'SPARC',
    message: '🔬 Research task detected. Initializing deep research agents with Exa MCP.'
  },
  development: {
    agents: ['coder', 'sparc-coder', 'tdd-london-swarm'],
    mcp: ['mcp__ruv-swarm'],
    swarm: 'hierarchical',
    framework: 'TDD',
    message: '💻 Development task detected. Spawning coding agents with TDD framework.'
  },
  architecture: {
    agents: ['system-architect', 'architecture', 'sparc-coord'],
    mcp: ['mcp__ruv-swarm'],
    swarm: 'adaptive',
    framework: 'SPARC',
    message: '🏗️ Architecture task detected. Initializing system design agents with SPARC methodology.'
  },
  security: {
    agents: ['security-manager', 'byzantine-coordinator'],
    mcp: ['mcp__ruv-swarm'],
    swarm: 'consensus',
    framework: 'Byzantine',
    message: '🔒 Security task detected. Deploying security agents with Byzantine consensus.'
  },
  testing: {
    agents: ['tester', 'reviewer', 'code-analyzer'],
    mcp: ['mcp__ruv-swarm'],
    swarm: 'mesh',
    framework: 'TDD',
    message: '✅ Testing task detected. Spawning test agents with comprehensive coverage.'
  },
  performance: {
    agents: ['perf-analyzer', 'performance-benchmarker'],
    mcp: ['mcp__ruv-swarm'],
    swarm: 'adaptive',
    framework: 'Benchmark',
    message: '⚡ Performance task detected. Initializing optimization agents with benchmarking.'
  },
  bugfix: {
    agents: ['coder', 'tester', 'reviewer'],
    mcp: ['mcp__ruv-swarm'],
    swarm: 'mesh',
    framework: 'RCA',
    message: '🐛 Bug fix task detected. Deploying debugging agents with root cause analysis.'
  }
};

// Analyze prompt to determine task type
function analyzePrompt(prompt) {
  const promptLower = prompt.toLowerCase();
  const detectedTypes = [];
  
  for (const [taskType, patterns] of Object.entries(COMPLEXITY_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(promptLower)) {
        detectedTypes.push(taskType);
        break;
      }
    }
  }
  
  // If no specific type detected, check for general complexity
  if (detectedTypes.length === 0) {
    const wordCount = prompt.split(/\s+/).length;
    if (wordCount > 50) {
      detectedTypes.push('research'); // Complex prompt likely needs research
    } else {
      detectedTypes.push('development'); // Default to development
    }
  }
  
  return detectedTypes;
}

// Count potential steps in task
function estimateComplexity(prompt) {
  const indicators = [
    /and/gi,
    /then/gi,
    /also/gi,
    /additionally/gi,
    /furthermore/gi,
    /\d+\./g, // numbered lists
    /•/g, // bullet points
    /,/g // commas often separate tasks
  ];
  
  let complexity = 1;
  indicators.forEach(pattern => {
    const matches = prompt.match(pattern);
    if (matches) {
      complexity += matches.length * 0.5;
    }
  });
  
  return Math.min(Math.ceil(complexity), 20); // Cap at 20
}

// Generate swarm configuration
function generateSwarmConfig(taskTypes, complexity) {
  let topology = 'mesh';
  let maxAgents = 5;
  
  if (complexity <= 3) {
    topology = 'star';
    maxAgents = 2;
  } else if (complexity <= 10) {
    topology = 'mesh';
    maxAgents = 5;
  } else {
    topology = 'hierarchical';
    maxAgents = 10;
  }
  
  // Override based on task type
  if (taskTypes.includes('architecture')) {
    topology = 'adaptive';
  } else if (taskTypes.includes('security')) {
    topology = 'consensus';
  }
  
  return {
    topology,
    maxAgents,
    strategy: 'balanced',
    enableCoordination: true,
    enableLearning: true,
    persistenceMode: 'memory'
  };
}

// Main execution
function main() {
  const input = process.argv.slice(2).join(' ') || '';
  
  // Check if we're in plan mode (look for keywords)
  const planModeIndicators = /plan|how|approach|strategy|steps|guide|help/i;
  const isLikelyPlanMode = planModeIndicators.test(input);
  
  if (!isLikelyPlanMode && input.length < 20) {
    // Simple command, no need for agents
    return;
  }
  
  const taskTypes = analyzePrompt(input);
  const complexity = estimateComplexity(input);
  const swarmConfig = generateSwarmConfig(taskTypes, complexity);
  
  // Build recommendation
  const recommendations = [];
  const agents = new Set();
  const mcpServers = new Set();
  const frameworks = new Set();
  
  taskTypes.forEach(taskType => {
    const config = AGENT_CONFIGS[taskType];
    if (config) {
      config.agents.forEach(agent => agents.add(agent));
      config.mcp.forEach(mcp => mcpServers.add(mcp));
      frameworks.add(config.framework);
      recommendations.push(config.message);
    }
  });
  
  // Output recommendations
  console.log('\n' + '='.repeat(60));
  console.log('🤖 AGENT & SWARM AUTO-CONFIGURATION');
  console.log('='.repeat(60));
  
  console.log(`\n📊 Task Analysis:`);
  console.log(`  - Types: ${taskTypes.join(', ')}`);
  console.log(`  - Complexity: ${complexity} (estimated steps)`);
  console.log(`  - Swarm: ${swarmConfig.topology} topology with ${swarmConfig.maxAgents} max agents`);
  
  if (agents.size > 0) {
    console.log(`\n🎯 Recommended Agents:`);
    Array.from(agents).forEach(agent => {
      console.log(`  - ${agent}`);
    });
  }
  
  if (mcpServers.size > 0) {
    console.log(`\n🔌 MCP Servers to Use:`);
    Array.from(mcpServers).forEach(mcp => {
      console.log(`  - ${mcp}`);
    });
  }
  
  if (frameworks.size > 0) {
    console.log(`\n📐 Frameworks:`);
    Array.from(frameworks).forEach(fw => {
      console.log(`  - ${fw}`);
    });
  }
  
  if (recommendations.length > 0) {
    console.log(`\n💡 Recommendations:`);
    recommendations.forEach(rec => {
      console.log(`  ${rec}`);
    });
  }
  
  // Suggest initialization commands
  if (complexity > 3) {
    console.log(`\n🚀 Suggested Initialization:`);
    console.log(`  mcp__ruv-swarm__swarm_init --topology ${swarmConfig.topology} --maxAgents ${swarmConfig.maxAgents}`);
    
    if (taskTypes.includes('research')) {
      console.log(`  mcp__exa__deep_researcher_start --instructions "<your research question>"`);
    }
    
    Array.from(agents).slice(0, 3).forEach(agent => {
      console.log(`  mcp__ruv-swarm__agent_spawn --type ${agent}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('💡 These agents will be automatically considered during plan execution.');
  console.log('📝 TodoWrite will be used to track all tasks.');
  console.log('='.repeat(60) + '\n');
}

// Error handling
try {
  main();
} catch (error) {
  console.error('Error in plan-mode-agent-selector:', error.message);
}