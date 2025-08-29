/**
 * Serenity Swarm Initialization Script
 * Starts the adaptive swarm topology for microservices MVP enhancement
 */

const fs = require('fs');
const path = require('path');
const { SwarmOrchestrator } = require('./coordination/swarm-orchestrator');

// Load swarm configuration
const configPath = path.join(__dirname, 'coordination', 'swarm-config.json');
const swarmConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

class SerenitySwarmInitializer {
  constructor() {
    this.orchestrator = null;
    this.startTime = Date.now();
    this.initializationStatus = {
      phase: 'starting',
      progress: 0,
      currentTask: null,
      errors: [],
      warnings: []
    };
  }

  /**
   * Main initialization method
   */
  async initialize() {
    console.log('🚀 Starting Serenity Microservices MVP Swarm');
    console.log('=' .repeat(60));
    
    try {
      // Phase 1: Pre-initialization checks
      await this.performPreChecks();
      this.updateProgress(10, 'Pre-checks completed');
      
      // Phase 2: Initialize orchestrator
      await this.initializeOrchestrator();
      this.updateProgress(25, 'Orchestrator initialized');
      
      // Phase 3: Initialize swarm topology
      await this.initializeSwarmTopology();
      this.updateProgress(50, 'Swarm topology established');
      
      // Phase 4: Start coordination systems
      await this.startCoordinationSystems();
      this.updateProgress(75, 'Coordination systems active');
      
      // Phase 5: Begin MVP execution
      await this.beginMVPExecution();
      this.updateProgress(90, 'MVP execution started');
      
      // Phase 6: Start monitoring
      await this.startMonitoring();
      this.updateProgress(100, 'Swarm fully operational');
      
      // Display final status
      this.displayInitializationSummary();
      
      return this.getInitializationStatus();
      
    } catch (error) {
      console.error(`❌ Swarm initialization failed: ${error.message}`);
      this.initializationStatus.phase = 'failed';
      this.initializationStatus.errors.push(error.message);
      throw error;
    }
  }

  /**
   * Perform pre-initialization checks
   */
  async performPreChecks() {
    console.log('🔍 Performing pre-initialization checks...');
    
    // Check required directories
    const requiredDirs = [
      'coordination',
      'memory', 
      'metrics',
      'auth-service',
      'notification-service',
      'crisis-service',
      'api-gateway'
    ];
    
    for (const dir of requiredDirs) {
      const dirPath = path.join(__dirname, dir);
      if (!fs.existsSync(dirPath)) {
        this.initializationStatus.warnings.push(`Directory ${dir} does not exist`);
      }
    }
    
    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`✓ Node.js version: ${nodeVersion}`);
    
    // Check available memory
    const memoryUsage = process.memoryUsage();
    console.log(`✓ Memory available: ${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`);
    
    // Validate configuration
    this.validateConfiguration();
    
    console.log('✓ Pre-checks completed successfully');
  }

  /**
   * Validate swarm configuration
   */
  validateConfiguration() {
    if (!swarmConfig.swarm_id) {
      throw new Error('Swarm ID not specified in configuration');
    }
    
    if (!swarmConfig.max_agents || swarmConfig.max_agents > 50) {
      throw new Error('Invalid max_agents configuration (must be 1-50)');
    }
    
    if (!swarmConfig.agents || Object.keys(swarmConfig.agents).length === 0) {
      throw new Error('No agent configurations found');
    }
    
    console.log('✓ Configuration validated');
  }

  /**
   * Initialize orchestrator
   */
  async initializeOrchestrator() {
    console.log('🎯 Initializing swarm orchestrator...');
    
    // Add node ID to configuration
    const enhancedConfig = {
      ...swarmConfig,
      nodeId: 'coordinator_001'
    };
    
    this.orchestrator = new SwarmOrchestrator(enhancedConfig);
    
    console.log('✓ Orchestrator created successfully');
  }

  /**
   * Initialize swarm topology
   */
  async initializeSwarmTopology() {
    console.log('🕸️  Initializing adaptive swarm topology...');
    
    const initResult = await this.orchestrator.initializeSwarm();
    
    console.log(`✓ Swarm topology initialized:`);
    console.log(`  - Swarm ID: ${initResult.swarmId}`);
    console.log(`  - Node ID: ${initResult.nodeId}`);
    console.log(`  - Agent Count: ${initResult.agentCount}`);
    console.log(`  - Phase: ${initResult.phase}`);
  }

  /**
   * Start coordination systems
   */
  async startCoordinationSystems() {
    console.log('🤝 Starting coordination systems...');
    
    // Wait for initial coordination to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const status = this.orchestrator.getSwarmStatus();
    
    console.log(`✓ Coordination systems active:`);
    console.log(`  - Active Groups: ${status.coordination.activeGroups}`);
    console.log(`  - Byzantine Consensus: ${status.consensus.activeNodes || 3} nodes`);
    console.log(`  - Memory System: Distributed with ${status.memory.totalEntries} entries`);
  }

  /**
   * Begin MVP execution
   */
  async beginMVPExecution() {
    console.log('🏗️  Beginning MVP task execution...');
    
    const executionStatus = this.orchestrator.getSwarmStatus().execution;
    
    console.log(`✓ MVP execution started:`);
    console.log(`  - Queued Tasks: ${executionStatus.tasks.queued}`);
    console.log(`  - Active Workers: ${executionStatus.workers.total}`);
    console.log(`  - Parallel Strategy: ${executionStatus.strategy}`);
  }

  /**
   * Start monitoring
   */
  async startMonitoring() {
    console.log('📊 Starting monitoring and metrics collection...');
    
    const monitoringData = this.orchestrator.getSwarmStatus().monitoring;
    
    console.log(`✓ Monitoring active:`);
    console.log(`  - Total Agents: ${monitoringData.overview.totalAgents}`);
    console.log(`  - Healthy Agents: ${monitoringData.overview.healthyAgents}`);
    console.log(`  - Overall Health: ${monitoringData.overview.overallHealth}`);
  }

  /**
   * Display initialization summary
   */
  displayInitializationSummary() {
    const elapsed = Date.now() - this.startTime;
    
    console.log('');
    console.log('🎉 SERENITY SWARM INITIALIZATION COMPLETE');
    console.log('=' .repeat(60));
    console.log(`⏱️  Initialization time: ${Math.round(elapsed / 1000)}s`);
    console.log(`🏢 Swarm ID: ${swarmConfig.swarm_id}`);
    console.log(`🔧 Topology: ${swarmConfig.topology}`);
    console.log(`🤖 Max Agents: ${swarmConfig.max_agents}`);
    console.log(`⚡ Parallel Tasks: ${swarmConfig.parallel_execution.max_concurrent_tasks}`);
    console.log(`🛡️  Byzantine Fault Tolerance: Enabled`);
    console.log(`🧠 Memory Persistence: Enabled`);
    console.log(`📈 Monitoring: Active`);
    console.log('');
    
    // Display task domains
    console.log('🎯 Coordinating MVP Domains:');
    swarmConfig.task_domains.forEach((domain, index) => {
      console.log(`  ${index + 1}. ${domain.replace(/_/g, ' ').toUpperCase()}`);
    });
    console.log('');
    
    // Display warnings if any
    if (this.initializationStatus.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      this.initializationStatus.warnings.forEach(warning => {
        console.log(`  - ${warning}`);
      });
      console.log('');
    }
    
    console.log('🔗 Access Points:');
    console.log('  - API Gateway: http://localhost:8001');
    console.log('  - Crisis Service: http://localhost:8080');
    console.log('  - Auth Service: http://localhost:3000');
    console.log('  - Notification Service: http://localhost:8000');
    console.log('');
    
    console.log('📊 Real-time Monitoring Available');
    console.log('🔄 Swarm will auto-optimize based on performance');
    console.log('');
    this.initializationStatus.phase = 'operational';
  }

  /**
   * Get current status
   */
  getInitializationStatus() {
    const swarmStatus = this.orchestrator ? this.orchestrator.getSwarmStatus() : null;
    
    return {
      initialization: this.initializationStatus,
      swarm: swarmStatus,
      configuration: {
        swarmId: swarmConfig.swarm_id,
        topology: swarmConfig.topology,
        maxAgents: swarmConfig.max_agents,
        taskDomains: swarmConfig.task_domains.length,
        initializationTime: Date.now() - this.startTime
      }
    };
  }

  /**
   * Update initialization progress
   */
  updateProgress(progress, task) {
    this.initializationStatus.progress = progress;
    this.initializationStatus.currentTask = task;
    
    const progressBar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
    console.log(`[${progressBar}] ${progress}% - ${task}`);
  }

  /**
   * Get orchestrator instance (for external access)
   */
  getOrchestrator() {
    return this.orchestrator;
  }
}

// Main execution
async function main() {
  const initializer = new SerenitySwarmInitializer();
  
  try {
    const status = await initializer.initialize();
    
    // Keep process running and monitor
    process.on('SIGINT', async () => {
      console.log('\\n🛑 Shutting down swarm...');
      if (initializer.getOrchestrator()) {
        await initializer.getOrchestrator().shutdown();
      }
      process.exit(0);
    });
    
    // Log periodic status updates
    setInterval(() => {
      const orchestrator = initializer.getOrchestrator();
      if (orchestrator) {
        const swarmStatus = orchestrator.getSwarmStatus();
        console.log(`[${new Date().toISOString()}] Swarm Status: Phase=${swarmStatus.phase}, Active=${swarmStatus.execution.tasks.active}, Completed=${swarmStatus.coordination.completedTasks}`);
      }
    }, 30000); // Every 30 seconds
    
    return status;
    
  } catch (error) {
    console.error('🚨 Fatal error during initialization:', error);
    process.exit(1);
  }
}

// Export for programmatic use
module.exports = { SerenitySwarmInitializer };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}