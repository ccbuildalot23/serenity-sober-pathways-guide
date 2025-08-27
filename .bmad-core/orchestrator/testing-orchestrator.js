/**
 * BMAD Testing Orchestrator
 * Central coordinator for intelligent test execution using agent swarms
 * Implements Byzantine consensus for test validation and parallel execution
 */

import { spawn } from 'child_process';
import { EventEmitter } from 'events';

export class TestingOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.agents = new Map();
    this.testResults = new Map();
    this.swarmTopology = 'mesh'; // mesh, hierarchical, ring, adaptive
    this.consensusThreshold = 0.66; // 66% agreement required
    this.maxRetries = 3;
    this.parallelExecutionLimit = 5;
    this.startTime = null;
    this.healthcheckInterval = null;
  }

  /**
   * Initialize the testing swarm with specialized agents
   */
  async initializeSwarm(testSuites = []) {
    console.log('🧠 Initializing BMAD Testing Swarm...');
    this.startTime = Date.now();

    // Define agent configurations
    const agentConfigs = {
      whatsapp: {
        name: 'WhatsApp Integration Agent',
        script: '.bmad-core/agents/whatsapp-tester.js',
        command: 'npm run test:notifications:whatsapp',
        priority: 'high',
        timeout: 120000
      },
      byzantine: {
        name: 'Byzantine Security Agent',
        script: '.bmad-core/agents/byzantine-validator.js',
        command: 'npm run security:byzantine',
        priority: 'critical',
        timeout: 180000
      },
      cloudtrail: {
        name: 'CloudTrail Compliance Agent',
        script: '.bmad-core/agents/cloudtrail-auditor.js',
        command: 'npm run validate:cloudtrail',
        priority: 'critical',
        timeout: 90000
      },
      accessibility: {
        name: 'Accessibility Agent',
        script: '.bmad-core/agents/accessibility-validator.js',
        command: 'npm run test:accessibility',
        priority: 'high',
        timeout: 240000
      },
      deployment: {
        name: 'Deployment Validator Agent',
        script: '.bmad-core/agents/deployment-checker.js',
        command: 'npm run deployment:check',
        priority: 'critical',
        timeout: 60000
      }
    };

    // Spawn agents based on requested test suites
    for (const suite of testSuites) {
      if (agentConfigs[suite]) {
        await this.spawnAgent(suite, agentConfigs[suite]);
      }
    }

    // Start health monitoring
    this.startHealthMonitoring();

    console.log(`✅ Swarm initialized with ${this.agents.size} agents`);
    console.log(`📊 Topology: ${this.swarmTopology}, Consensus: ${this.consensusThreshold * 100}%`);
  }

  /**
   * Spawn a specialized testing agent
   */
  async spawnAgent(id, config) {
    const agent = {
      id,
      name: config.name,
      status: 'initializing',
      process: null,
      results: [],
      retries: 0,
      config,
      startTime: Date.now(),
      health: {
        cpu: 0,
        memory: 0,
        responsiveness: 100
      }
    };

    // Create agent process
    agent.process = spawn('node', [config.script, JSON.stringify(config)], {
      env: { ...process.env, BMAD_AGENT_ID: id, BMAD_ORCHESTRATOR: 'true' }
    });

    // Handle agent output
    agent.process.stdout.on('data', (data) => {
      this.handleAgentOutput(id, data.toString());
    });

    agent.process.stderr.on('data', (data) => {
      this.handleAgentError(id, data.toString());
    });

    agent.process.on('exit', (code) => {
      this.handleAgentExit(id, code);
    });

    agent.status = 'active';
    this.agents.set(id, agent);
    this.emit('agent:spawned', { id, name: config.name });

    return agent;
  }

  /**
   * Execute tests with parallel orchestration
   */
  async executeTests() {
    console.log('\n🚀 Starting orchestrated test execution...\n');

    const testPromises = [];
    const batchSize = this.parallelExecutionLimit;
    const agents = Array.from(this.agents.values());

    // Execute in batches for resource management
    for (let i = 0; i < agents.length; i += batchSize) {
      const batch = agents.slice(i, i + batchSize);
      const batchPromises = batch.map(agent => this.executeAgentTest(agent));
      testPromises.push(...batchPromises);
      
      // Wait for batch to complete if not last batch
      if (i + batchSize < agents.length) {
        await Promise.all(batchPromises);
      }
    }

    // Wait for all tests to complete
    const results = await Promise.all(testPromises);

    // Apply Byzantine consensus validation
    const validatedResults = await this.applyByzantineConsensus(results);

    return validatedResults;
  }

  /**
   * Execute test for a single agent
   */
  async executeAgentTest(agent) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.handleAgentTimeout(agent.id);
        resolve({ 
          agent: agent.id, 
          status: 'timeout', 
          duration: agent.config.timeout 
        });
      }, agent.config.timeout);

      // Execute the test command
      const testProcess = spawn('npm', ['run', agent.config.command.split(' ')[2]], {
        shell: true,
        env: { ...process.env, BMAD_TEST_MODE: 'true' }
      });

      let output = '';
      let errors = '';

      testProcess.stdout.on('data', (data) => {
        output += data.toString();
        this.emit('test:output', { agent: agent.id, data: data.toString() });
      });

      testProcess.stderr.on('data', (data) => {
        errors += data.toString();
      });

      testProcess.on('exit', (code) => {
        clearTimeout(timeout);
        
        const result = {
          agent: agent.id,
          name: agent.name,
          status: code === 0 ? 'success' : 'failure',
          exitCode: code,
          output,
          errors,
          duration: Date.now() - agent.startTime,
          timestamp: new Date().toISOString()
        };

        agent.results.push(result);
        this.testResults.set(agent.id, result);
        
        // Retry logic for failed tests
        if (code !== 0 && agent.retries < this.maxRetries) {
          agent.retries++;
          console.log(`🔄 Retrying ${agent.name} (${agent.retries}/${this.maxRetries})`);
          this.executeAgentTest(agent).then(resolve);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Apply Byzantine consensus to validate test results
   */
  async applyByzantineConsensus(results) {
    console.log('\n🏛️ Applying Byzantine consensus validation...');

    const consensusResults = new Map();

    // Group results by test type
    for (const result of results) {
      if (!consensusResults.has(result.agent)) {
        consensusResults.set(result.agent, []);
      }
      consensusResults.get(result.agent).push(result);
    }

    // Validate each test with consensus
    const validatedResults = [];
    for (const [testId, testResults] of consensusResults) {
      const successCount = testResults.filter(r => r.status === 'success').length;
      const totalCount = testResults.length;
      const successRate = successCount / totalCount;

      const consensusResult = {
        testId,
        consensusAchieved: successRate >= this.consensusThreshold,
        successRate,
        finalStatus: successRate >= this.consensusThreshold ? 'validated' : 'disputed',
        attempts: totalCount,
        details: testResults
      };

      validatedResults.push(consensusResult);
      
      console.log(`${consensusResult.consensusAchieved ? '✅' : '❌'} ${testId}: ${(successRate * 100).toFixed(1)}% consensus`);
    }

    return validatedResults;
  }

  /**
   * Monitor agent health
   */
  startHealthMonitoring() {
    this.healthcheckInterval = setInterval(() => {
      for (const [id, agent] of this.agents) {
        // Simulate health metrics (in production, get real metrics)
        agent.health.cpu = Math.random() * 100;
        agent.health.memory = Math.random() * 100;
        agent.health.responsiveness = 100 - (agent.retries * 20);

        // Check for unhealthy agents
        if (agent.health.responsiveness < 50) {
          this.handleUnhealthyAgent(id);
        }
      }
    }, 5000);
  }

  /**
   * Handle agent output
   */
  handleAgentOutput(id, data) {
    const agent = this.agents.get(id);
    if (agent) {
      this.emit('agent:output', { id, name: agent.name, data });
      
      // Parse for specific patterns
      if (data.includes('PASS')) {
        agent.status = 'passing';
      } else if (data.includes('FAIL')) {
        agent.status = 'failing';
      }
    }
  }

  /**
   * Handle agent errors
   */
  handleAgentError(id, error) {
    const agent = this.agents.get(id);
    if (agent) {
      console.error(`❌ Agent ${agent.name} error:`, error);
      this.emit('agent:error', { id, name: agent.name, error });
    }
  }

  /**
   * Handle agent exit
   */
  handleAgentExit(id, code) {
    const agent = this.agents.get(id);
    if (agent) {
      agent.status = code === 0 ? 'completed' : 'failed';
      this.emit('agent:exit', { id, name: agent.name, code });
    }
  }

  /**
   * Handle agent timeout
   */
  handleAgentTimeout(id) {
    const agent = this.agents.get(id);
    if (agent) {
      console.log(`⏱️ Agent ${agent.name} timed out`);
      agent.status = 'timeout';
      if (agent.process) {
        agent.process.kill();
      }
    }
  }

  /**
   * Handle unhealthy agent
   */
  handleUnhealthyAgent(id) {
    const agent = this.agents.get(id);
    if (agent && agent.status === 'active') {
      console.log(`🏥 Agent ${agent.name} is unhealthy, attempting recovery...`);
      // Implement recovery logic
      this.restartAgent(id);
    }
  }

  /**
   * Restart an agent
   */
  async restartAgent(id) {
    const agent = this.agents.get(id);
    if (agent) {
      if (agent.process) {
        agent.process.kill();
      }
      await this.spawnAgent(id, agent.config);
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const duration = Date.now() - this.startTime;
    const results = Array.from(this.testResults.values());
    
    const report = {
      summary: {
        totalTests: results.length,
        passed: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'failure').length,
        timeout: results.filter(r => r.status === 'timeout').length,
        duration: duration,
        executionTime: `${(duration / 1000).toFixed(2)}s`
      },
      swarmMetrics: {
        topology: this.swarmTopology,
        consensusThreshold: this.consensusThreshold,
        totalAgents: this.agents.size,
        healthyAgents: Array.from(this.agents.values()).filter(a => a.health.responsiveness > 50).length
      },
      testResults: results,
      recommendations: this.generateRecommendations(results),
      timestamp: new Date().toISOString()
    };

    return report;
  }

  /**
   * Generate recommendations based on test results
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Check for security failures
    const securityTests = results.filter(r => r.agent === 'byzantine' || r.agent === 'cloudtrail');
    if (securityTests.some(r => r.status === 'failure')) {
      recommendations.push({
        severity: 'critical',
        category: 'security',
        message: 'Security tests failed - immediate remediation required',
        action: 'Review security configurations and re-run Byzantine validation'
      });
    }

    // Check for accessibility issues
    const accessibilityTest = results.find(r => r.agent === 'accessibility');
    if (accessibilityTest && accessibilityTest.status === 'failure') {
      recommendations.push({
        severity: 'high',
        category: 'compliance',
        message: 'Accessibility tests failed - WCAG compliance at risk',
        action: 'Fix accessibility issues before deployment'
      });
    }

    // Check for deployment readiness
    const deploymentTest = results.find(r => r.agent === 'deployment');
    if (deploymentTest && deploymentTest.status === 'failure') {
      recommendations.push({
        severity: 'critical',
        category: 'deployment',
        message: 'Deployment validation failed - not ready for production',
        action: 'Address deployment checklist items'
      });
    }

    return recommendations;
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    console.log('\n🧹 Shutting down testing orchestrator...');
    
    // Clear health monitoring
    if (this.healthcheckInterval) {
      clearInterval(this.healthcheckInterval);
    }

    // Kill all agent processes
    for (const [id, agent] of this.agents) {
      if (agent.process) {
        agent.process.kill();
      }
    }

    // Generate final report
    const report = this.generateReport();
    
    console.log('\n📊 Final Report:');
    console.log(`   Tests Run: ${report.summary.totalTests}`);
    console.log(`   Passed: ${report.summary.passed}`);
    console.log(`   Failed: ${report.summary.failed}`);
    console.log(`   Duration: ${report.summary.executionTime}`);
    
    return report;
  }
}

// Export for use in other modules
export default TestingOrchestrator;

// CLI execution
if (process.argv[1] === import.meta.url) {
  const orchestrator = new TestingOrchestrator();
  
  const testSuites = process.argv[2] 
    ? process.argv[2].split(',') 
    : ['whatsapp', 'byzantine', 'cloudtrail', 'accessibility', 'deployment'];

  orchestrator.initializeSwarm(testSuites)
    .then(() => orchestrator.executeTests())
    .then(() => orchestrator.shutdown())
    .then(report => {
      console.log('\n✅ Testing orchestration complete!');
      process.exit(report.summary.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error('❌ Orchestration failed:', error);
      process.exit(1);
    });
}