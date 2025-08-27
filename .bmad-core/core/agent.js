/**
 * Base Agent Class for BMAD Method
 * Provides core functionality for all specialized agents
 */

import { EventEmitter } from 'events';

export class Agent extends EventEmitter {
  constructor(name, config = {}) {
    super();
    this.name = name;
    this.id = config.id || `${name}-${Date.now()}`;
    this.status = 'initialized';
    this.config = config;
    this.startTime = Date.now();
    this.results = [];
    this.logs = [];
  }

  /**
   * Start the agent
   */
  async start() {
    this.status = 'running';
    this.emit('start', { agent: this.name, time: new Date() });
    this.log('Agent started');
  }

  /**
   * Stop the agent
   */
  async stop() {
    this.status = 'stopped';
    this.emit('stop', { agent: this.name, time: new Date() });
    this.log('Agent stopped');
  }

  /**
   * Log a message
   */
  log(message, level = 'info') {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      agent: this.name
    };
    this.logs.push(logEntry);
    console.log(`[${this.name}] ${message}`);
  }

  /**
   * Add a result
   */
  addResult(result) {
    this.results.push({
      ...result,
      timestamp: new Date().toISOString(),
      agent: this.name
    });
    this.emit('result', result);
  }

  /**
   * Get agent summary
   */
  getSummary() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      runtime: Date.now() - this.startTime,
      resultsCount: this.results.length,
      logs: this.logs.length
    };
  }

  /**
   * Validate configuration
   */
  validateConfig() {
    // Override in subclasses
    return true;
  }

  /**
   * Execute main agent logic
   */
  async execute() {
    throw new Error('execute() must be implemented by subclass');
  }
}