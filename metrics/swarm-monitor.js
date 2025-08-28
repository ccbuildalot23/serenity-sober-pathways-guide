/**
 * Swarm Monitoring and Metrics Collection System
 * Real-time monitoring of agent performance, health, and coordination
 */

class SwarmMonitor {
  constructor(config) {
    this.nodeId = config.nodeId;
    this.swarmId = config.swarmId;
    this.metricsInterval = config.metricsInterval || 5000; // 5 seconds
    this.alertThresholds = config.alertThresholds || {};
    
    // Metrics storage
    this.metrics = {
      agents: new Map(),
      consensus: {
        rounds: 0,
        failures: 0,
        averageLatency: 0,
        byzantineDetections: 0
      },
      memory: {
        usage: 0,
        syncs: 0,
        conflicts: 0,
        cacheHitRate: 0
      },
      performance: {
        tasksCompleted: 0,
        tasksActive: 0,
        tasksFailed: 0,
        averageExecutionTime: 0
      },
      network: {
        messagesPerSecond: 0,
        bandwidth: 0,
        latency: 0,
        drops: 0
      }
    };
    
    // Health status tracking
    this.healthStatus = {
      overall: 'healthy',
      agents: new Map(),
      lastHealthCheck: null
    };
    
    // Alert system
    this.alerts = {
      active: new Map(),
      history: [],
      suppressionRules: new Map()
    };
    
    // Event handlers
    this.eventHandlers = new Map();
    
    // Historical data (last 100 data points)
    this.history = {
      performance: [],
      consensus: [],
      memory: [],
      network: []
    };
    
    console.log(`Swarm monitor initialized for ${this.swarmId}`);
    this.startMonitoring();
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring() {
    // Metrics collection
    setInterval(() => {
      this.collectMetrics();
    }, this.metricsInterval);
    
    // Health checks
    setInterval(() => {
      this.performHealthChecks();
    }, 10000); // Every 10 seconds
    
    // Alert evaluation
    setInterval(() => {
      this.evaluateAlerts();
    }, 5000); // Every 5 seconds
    
    // Historical data cleanup
    setInterval(() => {
      this.cleanupHistory();
    }, 60000); // Every minute
  }

  /**
   * Collect metrics from all agents
   */
  async collectMetrics() {
    const timestamp = Date.now();
    
    try {
      // Collect agent metrics
      await this.collectAgentMetrics();
      
      // Collect consensus metrics
      await this.collectConsensusMetrics();
      
      // Collect memory metrics
      await this.collectMemoryMetrics();
      
      // Collect network metrics
      await this.collectNetworkMetrics();
      
      // Store historical data
      this.updateHistory(timestamp);
      
      // Emit metrics update event
      this.emit('metrics-updated', {
        timestamp,
        metrics: this.metrics,
        swarmId: this.swarmId
      });
      
    } catch (error) {
      console.error(`Metrics collection failed: ${error.message}`);
    }
  }

  /**
   * Collect metrics from individual agents
   */
  async collectAgentMetrics() {
    const agentMetrics = await this.queryAgents('getMetrics');
    
    for (const [agentId, metrics] of agentMetrics) {
      this.metrics.agents.set(agentId, {
        ...metrics,
        timestamp: Date.now(),
        status: metrics.status || 'unknown'
      });
    }
    
    // Calculate aggregate performance
    const activeAgents = Array.from(this.metrics.agents.values()).filter(a => a.status === 'active');
    this.metrics.performance.tasksActive = activeAgents.reduce((sum, a) => sum + (a.activeTasks || 0), 0);
    this.metrics.performance.tasksCompleted = activeAgents.reduce((sum, a) => sum + (a.completedTasks || 0), 0);
    this.metrics.performance.tasksFailed = activeAgents.reduce((sum, a) => sum + (a.failedTasks || 0), 0);
    
    // Calculate average execution time
    const executionTimes = activeAgents.map(a => a.averageExecutionTime).filter(t => t > 0);
    this.metrics.performance.averageExecutionTime = executionTimes.length > 0 
      ? executionTimes.reduce((sum, t) => sum + t, 0) / executionTimes.length 
      : 0;
  }

  /**
   * Collect consensus system metrics
   */
  async collectConsensusMetrics() {
    // Mock consensus metrics collection
    const consensusNodes = await this.queryConsensusNodes();
    
    if (consensusNodes.length > 0) {
      const totalRounds = consensusNodes.reduce((sum, node) => sum + node.consensusRounds, 0);
      const totalFailures = consensusNodes.reduce((sum, node) => sum + node.failures, 0);
      const totalByzantine = consensusNodes.reduce((sum, node) => sum + node.byzantineDetections, 0);
      
      this.metrics.consensus = {
        rounds: totalRounds,
        failures: totalFailures,
        averageLatency: this.calculateAverageLatency(consensusNodes),
        byzantineDetections: totalByzantine,
        activeNodes: consensusNodes.filter(n => n.status === 'active').length,
        totalNodes: consensusNodes.length
      };
    }
  }

  /**
   * Collect memory system metrics
   */
  async collectMemoryMetrics() {
    // Query distributed memory systems
    const memoryNodes = await this.queryMemoryNodes();
    
    if (memoryNodes.length > 0) {
      const totalEntries = memoryNodes.reduce((sum, node) => sum + node.entries, 0);
      const totalSyncs = memoryNodes.reduce((sum, node) => sum + node.syncs, 0);
      const totalConflicts = memoryNodes.reduce((sum, node) => sum + node.conflicts, 0);
      const totalHits = memoryNodes.reduce((sum, node) => sum + node.cacheHits, 0);
      const totalMisses = memoryNodes.reduce((sum, node) => sum + node.cacheMisses, 0);
      
      this.metrics.memory = {
        usage: totalEntries,
        syncs: totalSyncs,
        conflicts: totalConflicts,
        cacheHitRate: totalHits / (totalHits + totalMisses) || 0,
        memoryUtilization: this.calculateMemoryUtilization(memoryNodes)
      };
    }
  }

  /**
   * Collect network metrics
   */
  async collectNetworkMetrics() {
    // Simulate network metrics collection
    this.metrics.network = {
      messagesPerSecond: Math.floor(Math.random() * 1000) + 100,
      bandwidth: Math.floor(Math.random() * 100) + 50, // MB/s
      latency: Math.floor(Math.random() * 50) + 10, // ms
      drops: Math.floor(Math.random() * 10)
    };
  }

  /**
   * Perform health checks on all components
   */
  async performHealthChecks() {
    const timestamp = Date.now();
    
    try {
      // Check agent health
      await this.checkAgentHealth();
      
      // Check consensus health
      await this.checkConsensusHealth();
      
      // Check memory health
      await this.checkMemoryHealth();
      
      // Determine overall health
      this.determineOverallHealth();
      
      this.healthStatus.lastHealthCheck = timestamp;
      
      // Emit health update
      this.emit('health-updated', {
        timestamp,
        health: this.healthStatus,
        swarmId: this.swarmId
      });
      
    } catch (error) {
      console.error(`Health check failed: ${error.message}`);
      this.healthStatus.overall = 'degraded';
    }
  }

  /**
   * Check health of individual agents
   */
  async checkAgentHealth() {
    for (const [agentId, metrics] of this.metrics.agents) {
      const health = this.evaluateAgentHealth(metrics);
      this.healthStatus.agents.set(agentId, {
        status: health.status,
        issues: health.issues,
        lastSeen: metrics.timestamp
      });
    }
  }

  /**
   * Evaluate agent health based on metrics
   */
  evaluateAgentHealth(metrics) {
    const issues = [];
    let status = 'healthy';
    
    // Check if agent is responsive
    if (Date.now() - metrics.timestamp > 30000) {
      issues.push('Agent not responding');
      status = 'unhealthy';
    }
    
    // Check CPU usage
    if (metrics.cpuUsage > 90) {
      issues.push('High CPU usage');
      status = status === 'healthy' ? 'warning' : status;
    }
    
    // Check memory usage
    if (metrics.memoryUsage > 85) {
      issues.push('High memory usage');
      status = status === 'healthy' ? 'warning' : status;
    }
    
    // Check error rate
    if (metrics.errorRate > 5) {
      issues.push('High error rate');
      status = 'degraded';
    }
    
    return { status, issues };
  }

  /**
   * Evaluate and trigger alerts based on thresholds
   */
  evaluateAlerts() {
    const timestamp = Date.now();
    
    // Agent failure rate alert
    const failureRate = this.calculateAgentFailureRate();
    if (failureRate > (this.alertThresholds.agent_failure_rate || 0.1)) {
      this.triggerAlert('agent_failure_rate', {
        current: failureRate,
        threshold: this.alertThresholds.agent_failure_rate,
        severity: 'high'
      });
    }
    
    // Consensus timeout alert
    if (this.metrics.consensus.averageLatency > (this.alertThresholds.consensus_timeout || 5000)) {
      this.triggerAlert('consensus_timeout', {
        current: this.metrics.consensus.averageLatency,
        threshold: this.alertThresholds.consensus_timeout,
        severity: 'medium'
      });
    }
    
    // Memory usage alert
    if (this.metrics.memory.memoryUtilization > (this.alertThresholds.memory_usage || 0.8)) {
      this.triggerAlert('memory_usage', {
        current: this.metrics.memory.memoryUtilization,
        threshold: this.alertThresholds.memory_usage,
        severity: 'medium'
      });
    }
    
    // Byzantine behavior alert
    if (this.metrics.consensus.byzantineDetections > 0) {
      this.triggerAlert('byzantine_behavior', {
        detections: this.metrics.consensus.byzantineDetections,
        severity: 'critical'
      });
    }
  }

  /**
   * Trigger an alert
   */
  triggerAlert(type, data) {
    const alertId = `${type}_${Date.now()}`;
    
    // Check suppression rules
    if (this.isAlertSuppressed(type)) {
      return;
    }
    
    const alert = {
      id: alertId,
      type: type,
      severity: data.severity,
      timestamp: Date.now(),
      data: data,
      acknowledged: false,
      resolved: false
    };
    
    this.alerts.active.set(alertId, alert);
    this.alerts.history.push(alert);
    
    // Emit alert
    this.emit('alert-triggered', alert);
    
    console.warn(`Alert triggered: ${type} (${data.severity})`);
  }

  /**
   * Check if alert type is suppressed
   */
  isAlertSuppressed(type) {
    const suppression = this.alerts.suppressionRules.get(type);
    if (!suppression) return false;
    
    return Date.now() < suppression.until;
  }

  /**
   * Get real-time dashboard data
   */
  getDashboardData() {
    return {
      swarmId: this.swarmId,
      timestamp: Date.now(),
      overview: {
        totalAgents: this.metrics.agents.size,
        healthyAgents: Array.from(this.healthStatus.agents.values()).filter(a => a.status === 'healthy').length,
        activeTasks: this.metrics.performance.tasksActive,
        overallHealth: this.healthStatus.overall
      },
      metrics: this.metrics,
      health: this.healthStatus,
      alerts: {
        active: Array.from(this.alerts.active.values()),
        total: this.alerts.history.length
      },
      history: {
        performance: this.history.performance.slice(-20), // Last 20 data points
        consensus: this.history.consensus.slice(-20),
        memory: this.history.memory.slice(-20),
        network: this.history.network.slice(-20)
      }
    };
  }

  /**
   * Get detailed agent information
   */
  getAgentDetails(agentId) {
    const metrics = this.metrics.agents.get(agentId);
    const health = this.healthStatus.agents.get(agentId);
    
    if (!metrics) {
      return null;
    }
    
    return {
      id: agentId,
      metrics: metrics,
      health: health,
      history: this.getAgentHistory(agentId)
    };
  }

  /**
   * Utility methods
   */
  async queryAgents(method) {
    // Mock agent query - implement with actual agent communication
    return new Map([
      ['agent_1', { status: 'active', activeTasks: 2, completedTasks: 15, errorRate: 1, cpuUsage: 45, memoryUsage: 60 }],
      ['agent_2', { status: 'active', activeTasks: 1, completedTasks: 12, errorRate: 2, cpuUsage: 52, memoryUsage: 55 }],
      ['agent_3', { status: 'active', activeTasks: 3, completedTasks: 18, errorRate: 0, cpuUsage: 38, memoryUsage: 48 }]
    ]);
  }

  async queryConsensusNodes() {
    // Mock consensus query
    return [
      { nodeId: 1, consensusRounds: 45, failures: 2, byzantineDetections: 0, status: 'active', latency: 150 },
      { nodeId: 2, consensusRounds: 43, failures: 1, byzantineDetections: 0, status: 'active', latency: 180 },
      { nodeId: 3, consensusRounds: 44, failures: 3, byzantineDetections: 0, status: 'active', latency: 120 }
    ];
  }

  async queryMemoryNodes() {
    // Mock memory query
    return [
      { nodeId: 1, entries: 150, syncs: 20, conflicts: 2, cacheHits: 890, cacheMisses: 110 },
      { nodeId: 2, entries: 145, syncs: 18, conflicts: 1, cacheHits: 856, cacheMisses: 104 },
      { nodeId: 3, entries: 152, syncs: 22, conflicts: 0, cacheHits: 923, cacheMisses: 97 }
    ];
  }

  calculateAverageLatency(nodes) {
    const latencies = nodes.map(n => n.latency).filter(l => l > 0);
    return latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : 0;
  }

  calculateMemoryUtilization(nodes) {
    const totalEntries = nodes.reduce((sum, n) => sum + n.entries, 0);
    const maxCapacity = nodes.length * 1000; // Assume 1000 entries max per node
    return totalEntries / maxCapacity;
  }

  calculateAgentFailureRate() {
    const totalAgents = this.metrics.agents.size;
    const unhealthyAgents = Array.from(this.healthStatus.agents.values()).filter(a => a.status === 'unhealthy').length;
    return totalAgents > 0 ? unhealthyAgents / totalAgents : 0;
  }

  updateHistory(timestamp) {
    // Store historical snapshots
    const snapshot = {
      timestamp,
      performance: { ...this.metrics.performance },
      consensus: { ...this.metrics.consensus },
      memory: { ...this.metrics.memory },
      network: { ...this.metrics.network }
    };
    
    this.history.performance.push(snapshot.performance);
    this.history.consensus.push(snapshot.consensus);
    this.history.memory.push(snapshot.memory);
    this.history.network.push(snapshot.network);
  }

  cleanupHistory() {
    // Keep only last 100 entries
    const maxEntries = 100;
    Object.keys(this.history).forEach(key => {
      if (this.history[key].length > maxEntries) {
        this.history[key] = this.history[key].slice(-maxEntries);
      }
    });
    
    // Clean up old alerts
    if (this.alerts.history.length > 1000) {
      this.alerts.history = this.alerts.history.slice(-1000);
    }
  }

  determineOverallHealth() {
    const agentStatuses = Array.from(this.healthStatus.agents.values());
    const unhealthyCount = agentStatuses.filter(a => a.status === 'unhealthy').length;
    const warningCount = agentStatuses.filter(a => a.status === 'warning').length;
    
    if (unhealthyCount > agentStatuses.length * 0.3) {
      this.healthStatus.overall = 'unhealthy';
    } else if (unhealthyCount > 0 || warningCount > agentStatuses.length * 0.5) {
      this.healthStatus.overall = 'degraded';
    } else if (warningCount > 0) {
      this.healthStatus.overall = 'warning';
    } else {
      this.healthStatus.overall = 'healthy';
    }
  }

  getAgentHistory(agentId) {
    // Return historical data for specific agent
    return [];
  }

  /**
   * Event handling
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => handler(data));
    }
  }
}

module.exports = { SwarmMonitor };