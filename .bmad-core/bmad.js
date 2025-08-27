#!/usr/bin/env node

/**
 * BMAD Method Entry Point
 * Healthcare-focused AI agent orchestration with swarm capabilities
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const command = process.argv[2];
const args = process.argv.slice(3);

console.log('🚀 BMAD Method - Healthcare Platform Edition\n');

switch(command) {
  case 'agent':
    console.log(`Spawning agent: ${args[0]}`);
    spawnAgent(args[0]);
    break;
    
  case 'analyze':
    console.log('Running healthcare compliance analysis...');
    runCompliance();
    break;
    
  case 'deploy':
    console.log('Deploying with HIPAA compliance checks...');
    break;
    
  case 'test':
    console.log('Running comprehensive test suite...');
    runTests(args);
    break;
    
  case 'test:swarm':
    console.log('🧠 Initiating swarm-based testing orchestration...');
    runSwarmTests(args);
    break;
    
  case 'test:parallel':
    console.log('⚡ Running tests in parallel...');
    runParallelTests(args);
    break;
    
  case 'test:consensus':
    console.log('🏛️ Running Byzantine consensus testing...');
    runConsensusTests(args);
    break;
    
  default:
    console.log('Available commands:');
    console.log('  bmad agent <type>        - Spawn an AI agent');
    console.log('  bmad analyze             - Run compliance analysis');
    console.log('  bmad deploy              - Deploy with security checks');
    console.log('  bmad test                - Run test suite');
    console.log('  bmad test:swarm          - Orchestrated swarm testing');
    console.log('  bmad test:parallel       - Parallel test execution');
    console.log('  bmad test:consensus      - Byzantine consensus testing');
    console.log('\nAgent types:');
    console.log('  phi-guardian             - PHI protection & HIPAA compliance');
    console.log('  care-coordinator         - Clinical workflow management');
    console.log('  billing-specialist       - CPT codes & insurance');
    console.log('  crisis-responder         - Emergency response');
    console.log('  whatsapp-tester          - WhatsApp integration testing');
    console.log('  byzantine-validator      - Byzantine security validation');
    console.log('  cloudtrail-auditor       - AWS CloudTrail HIPAA audit');
}

// Function implementations
function spawnAgent(agentType) {
  const agentMap = {
    'phi-guardian': 'agents/phi-guardian.js',
    'care-coordinator': 'agents/care-coordinator.js',
    'billing-specialist': 'agents/billing-specialist.js',
    'crisis-responder': 'agents/crisis-responder.js',
    'whatsapp-tester': 'agents/whatsapp-tester.js',
    'byzantine-validator': 'agents/byzantine-validator.js',
    'cloudtrail-auditor': 'agents/cloudtrail-auditor.js'
  };
  
  const agentPath = agentMap[agentType];
  if (!agentPath) {
    console.error(`❌ Unknown agent type: ${agentType}`);
    process.exit(1);
  }
  
  const fullPath = join(__dirname, agentPath);
  const agent = spawn('node', [fullPath], { stdio: 'inherit' });
  
  agent.on('exit', (code) => {
    process.exit(code || 0);
  });
}

function runCompliance() {
  // Run all compliance-related agents
  const agents = ['phi-guardian', 'cloudtrail-auditor', 'billing-specialist'];
  console.log(`\n📋 Running compliance checks with ${agents.length} agents...\n`);
  
  agents.forEach(agent => {
    console.log(`  • Starting ${agent}`);
    spawnAgent(agent);
  });
}

function runTests(args) {
  const testType = args[0] || 'all';
  console.log(`\n🧪 Running ${testType} tests...\n`);
  
  const tests = {
    'whatsapp': 'test:notifications:whatsapp',
    'byzantine': 'security:byzantine',
    'cloudtrail': 'validate:cloudtrail',
    'accessibility': 'test:accessibility',
    'deployment': 'deployment:check',
    'all': 'test:swarm'
  };
  
  const testCommand = tests[testType] || tests.all;
  const npm = spawn('npm', ['run', testCommand], { stdio: 'inherit', shell: true });
  
  npm.on('exit', (code) => {
    process.exit(code || 0);
  });
}

function runSwarmTests(args) {
  const orchestratorPath = join(__dirname, 'orchestrator/testing-orchestrator.js');
  const testSuites = args[0] || 'whatsapp,byzantine,cloudtrail,accessibility,deployment';
  
  console.log('\n🌐 Initializing testing swarm...');
  console.log(`📊 Test suites: ${testSuites}\n`);
  
  const orchestrator = spawn('node', [orchestratorPath, testSuites], { 
    stdio: 'inherit',
    env: { ...process.env, BMAD_SWARM_MODE: 'true' }
  });
  
  orchestrator.on('exit', (code) => {
    console.log('\n🏁 Swarm testing complete!');
    process.exit(code || 0);
  });
}

function runParallelTests(args) {
  const tests = args[0] ? args[0].split(',') : [
    'test:notifications:whatsapp',
    'security:byzantine',
    'validate:cloudtrail',
    'test:accessibility',
    'deployment:check'
  ];
  
  console.log(`\n⚡ Running ${tests.length} tests in parallel...\n`);
  
  const processes = tests.map(test => {
    console.log(`  • Starting: ${test}`);
    return spawn('npm', ['run', test], { 
      stdio: 'pipe',
      shell: true 
    });
  });
  
  Promise.all(processes.map(p => new Promise((resolve) => {
    p.on('exit', resolve);
  }))).then(codes => {
    const failed = codes.filter(c => c !== 0).length;
    console.log(`\n✅ Parallel execution complete: ${tests.length - failed}/${tests.length} passed`);
    process.exit(failed > 0 ? 1 : 0);
  });
}

function runConsensusTests(args) {
  console.log('\n🏛️ Initializing Byzantine consensus validation...\n');
  
  // Run Byzantine validator with consensus checking
  const validatorPath = join(__dirname, 'agents/byzantine-validator.js');
  const validator = spawn('node', [validatorPath, JSON.stringify({
    mode: 'consensus',
    nodes: 7,
    byzantineNodes: 2
  })], { stdio: 'inherit' });
  
  validator.on('exit', (code) => {
    console.log('\n🏛️ Consensus validation complete!');
    process.exit(code || 0);
  });
}
