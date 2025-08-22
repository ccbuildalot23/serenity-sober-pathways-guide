import CircuitBreaker from 'opossum';
import { EventEmitter } from 'events';
import { createLogger, performanceLogger } from '@utils/logger';
import { retryWithBackoff } from '@utils/helpers';
import { redisManager } from '@utils/redis';
import { CircuitBreakerConfig, ServiceInstance } from '@types/index';
import config from '@config/index';

const logger = createLogger('CircuitBreaker');

export interface CircuitBreakerMetrics {
  name: string;
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  successes: number;
  fallbackCount: number;
  totalRequests: number;
  errorRate: number;
  responseTime: number;
  lastStateChange: Date;
}

/**
 * Circuit Breaker Manager
 */
export class CircuitBreakerManager extends EventEmitter {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private metrics: Map<string, CircuitBreakerMetrics> = new Map();
  private fallbackHandlers: Map<string, Function> = new Map();

  constructor() {
    super();
    this.initializeBreakers();
  }

  /**
   * Initialize circuit breakers for all configured services
   */
  private initializeBreakers(): void {
    for (const [serviceName, serviceConfig] of Object.entries(config.services)) {
      this.createBreaker(serviceName, serviceConfig.circuit_breaker);
    }

    logger.info(`Initialized ${this.breakers.size} circuit breakers`);
  }

  /**
   * Create a circuit breaker for a service
   */
  createBreaker(serviceName: string, config: CircuitBreakerConfig): CircuitBreaker {
    const options = {
      timeout: config.timeout,
      errorThresholdPercentage: config.errorThresholdPercentage,
      resetTimeout: config.resetTimeout,
      rollingCountTimeout: config.monitoringPeriod,
      rollingCountBuckets: 10,
      volumeThreshold: config.halfOpenMaxCalls,
      capacity: 1000, // Maximum number of items in the cache
      errorFilter: (error: any) => {
        // Don't count certain errors as failures
        if (error && error.response) {
          const status = error.response.status;
          // Don't trip breaker for client errors (400-499)
          return status >= 500;
        }
        return true;
      }
    };

    const breaker = new CircuitBreaker(this.executeRequest.bind(this), options);

    // Set up event listeners
    this.setupBreakerEvents(serviceName, breaker);

    // Store breaker
    this.breakers.set(serviceName, breaker);

    // Initialize metrics
    this.metrics.set(serviceName, {
      name: serviceName,
      state: 'closed',
      failures: 0,
      successes: 0,
      fallbackCount: 0,
      totalRequests: 0,
      errorRate: 0,
      responseTime: 0,
      lastStateChange: new Date()
    });

    logger.info(`Created circuit breaker for service: ${serviceName}`);
    return breaker;
  }

  /**
   * Set up event listeners for a circuit breaker
   */
  private setupBreakerEvents(serviceName: string, breaker: CircuitBreaker): void {
    breaker.on('open', () => {
      logger.warn(`Circuit breaker opened for service: ${serviceName}`);
      this.updateMetrics(serviceName, { state: 'open', lastStateChange: new Date() });
      this.emit('breakerStateChanged', serviceName, 'open');
      
      // Store state in Redis for persistence
      this.persistBreakerState(serviceName, 'open');
    });

    breaker.on('halfOpen', () => {
      logger.info(`Circuit breaker half-opened for service: ${serviceName}`);
      this.updateMetrics(serviceName, { state: 'half-open', lastStateChange: new Date() });
      this.emit('breakerStateChanged', serviceName, 'half-open');
      
      this.persistBreakerState(serviceName, 'half-open');
    });

    breaker.on('close', () => {
      logger.info(`Circuit breaker closed for service: ${serviceName}`);
      this.updateMetrics(serviceName, { state: 'closed', lastStateChange: new Date() });
      this.emit('breakerStateChanged', serviceName, 'closed');
      
      this.persistBreakerState(serviceName, 'closed');
    });

    breaker.on('success', (result: any, latency: number) => {
      this.updateMetrics(serviceName, {
        successes: this.metrics.get(serviceName)!.successes + 1,
        totalRequests: this.metrics.get(serviceName)!.totalRequests + 1,
        responseTime: latency
      });

      performanceLogger.info('Circuit breaker success', {
        service: serviceName,
        latency,
        state: breaker.stats.state
      });
    });

    breaker.on('failure', (error: any) => {
      this.updateMetrics(serviceName, {
        failures: this.metrics.get(serviceName)!.failures + 1,
        totalRequests: this.metrics.get(serviceName)!.totalRequests + 1
      });

      logger.error(`Circuit breaker failure for service ${serviceName}:`, error);
    });

    breaker.on('fallback', (result: any) => {
      this.updateMetrics(serviceName, {
        fallbackCount: this.metrics.get(serviceName)!.fallbackCount + 1
      });

      logger.info(`Circuit breaker fallback executed for service: ${serviceName}`);
    });

    breaker.on('reject', () => {
      logger.warn(`Circuit breaker rejected request for service: ${serviceName}`);
    });

    breaker.on('timeout', () => {
      logger.warn(`Circuit breaker timeout for service: ${serviceName}`);
    });
  }

  /**
   * Execute a request through the circuit breaker
   */
  async executeRequest(requestConfig: {
    serviceName: string;
    requestFn: () => Promise<any>;
    fallbackFn?: () => Promise<any>;
  }): Promise<any> {
    const { serviceName, requestFn, fallbackFn } = requestConfig;
    const breaker = this.breakers.get(serviceName);

    if (!breaker) {
      throw new Error(`No circuit breaker found for service: ${serviceName}`);
    }

    // Set fallback if provided
    if (fallbackFn) {
      breaker.fallback(fallbackFn);
    } else {
      // Use default fallback
      const defaultFallback = this.fallbackHandlers.get(serviceName);
      if (defaultFallback) {
        breaker.fallback(defaultFallback);
      }
    }

    return breaker.fire(requestConfig);
  }

  /**
   * Execute with retry logic
   */
  async executeWithRetry(
    serviceName: string,
    requestFn: () => Promise<any>,
    retryConfig: {
      maxAttempts?: number;
      baseDelay?: number;
      maxDelay?: number;
    } = {}
  ): Promise<any> {
    const { maxAttempts = 3, baseDelay = 1000, maxDelay = 10000 } = retryConfig;

    return retryWithBackoff(async () => {
      return this.execute(serviceName, requestFn);
    }, maxAttempts, baseDelay, maxDelay);
  }

  /**
   * Execute a request through the circuit breaker (public method)
   */
  async execute(
    serviceName: string,
    requestFn: () => Promise<any>,
    fallbackFn?: () => Promise<any>
  ): Promise<any> {
    return this.executeRequest({
      serviceName,
      requestFn,
      fallbackFn
    });
  }

  /**
   * Register a default fallback handler for a service
   */
  registerFallback(serviceName: string, fallbackFn: Function): void {
    this.fallbackHandlers.set(serviceName, fallbackFn);
    logger.info(`Registered fallback handler for service: ${serviceName}`);
  }

  /**
   * Get circuit breaker for a service
   */
  getBreaker(serviceName: string): CircuitBreaker | undefined {
    return this.breakers.get(serviceName);
  }

  /**
   * Get metrics for a service
   */
  getMetrics(serviceName: string): CircuitBreakerMetrics | undefined {
    const metrics = this.metrics.get(serviceName);
    if (metrics) {
      // Calculate current error rate
      const { failures, totalRequests } = metrics;
      metrics.errorRate = totalRequests > 0 ? (failures / totalRequests) * 100 : 0;
    }
    return metrics;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Map<string, CircuitBreakerMetrics> {
    // Update error rates for all metrics
    for (const [serviceName, metrics] of this.metrics) {
      const { failures, totalRequests } = metrics;
      metrics.errorRate = totalRequests > 0 ? (failures / totalRequests) * 100 : 0;
    }
    return new Map(this.metrics);
  }

  /**
   * Reset circuit breaker for a service
   */
  reset(serviceName: string): void {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.close();
      
      // Reset metrics
      const metrics = this.metrics.get(serviceName);
      if (metrics) {
        metrics.failures = 0;
        metrics.successes = 0;
        metrics.fallbackCount = 0;
        metrics.totalRequests = 0;
        metrics.errorRate = 0;
        metrics.state = 'closed';
        metrics.lastStateChange = new Date();
      }

      logger.info(`Reset circuit breaker for service: ${serviceName}`);
    }
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    for (const serviceName of this.breakers.keys()) {
      this.reset(serviceName);
    }
    logger.info('Reset all circuit breakers');
  }

  /**
   * Force open a circuit breaker
   */
  forceOpen(serviceName: string): void {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.open();
      logger.warn(`Forced circuit breaker open for service: ${serviceName}`);
    }
  }

  /**
   * Force close a circuit breaker
   */
  forceClose(serviceName: string): void {
    const breaker = this.breakers.get(serviceName);
    if (breaker) {
      breaker.close();
      logger.info(`Forced circuit breaker closed for service: ${serviceName}`);
    }
  }

  /**
   * Check if service is available (circuit breaker closed)
   */
  isServiceAvailable(serviceName: string): boolean {
    const breaker = this.breakers.get(serviceName);
    return breaker ? breaker.stats.state === 'closed' : false;
  }

  /**
   * Update metrics for a service
   */
  private updateMetrics(serviceName: string, updates: Partial<CircuitBreakerMetrics>): void {
    const metrics = this.metrics.get(serviceName);
    if (metrics) {
      Object.assign(metrics, updates);
    }
  }

  /**
   * Persist circuit breaker state to Redis
   */
  private async persistBreakerState(serviceName: string, state: string): Promise<void> {
    try {
      const key = `circuit_breaker:${serviceName}`;
      const data = {
        state,
        timestamp: new Date().toISOString(),
        metrics: this.metrics.get(serviceName)
      };
      
      await redisManager.setJSON(key, data, 3600); // Store for 1 hour
    } catch (error) {
      logger.error(`Failed to persist circuit breaker state for ${serviceName}:`, error);
    }
  }

  /**
   * Restore circuit breaker states from Redis
   */
  async restoreStates(): Promise<void> {
    try {
      for (const serviceName of this.breakers.keys()) {
        const key = `circuit_breaker:${serviceName}`;
        const data = await redisManager.getJSON(key);
        
        if (data && data.state) {
          const breaker = this.breakers.get(serviceName);
          if (breaker && data.state === 'open') {
            breaker.open();
            logger.info(`Restored circuit breaker state for ${serviceName}: ${data.state}`);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to restore circuit breaker states:', error);
    }
  }

  /**
   * Get health status of all circuit breakers
   */
  getHealthStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    for (const [serviceName, breaker] of this.breakers) {
      const metrics = this.getMetrics(serviceName);
      
      status[serviceName] = {
        state: breaker.stats.state,
        isAvailable: this.isServiceAvailable(serviceName),
        stats: breaker.stats,
        metrics: metrics
      };
    }
    
    return status;
  }

  /**
   * Shutdown all circuit breakers
   */
  shutdown(): void {
    for (const [serviceName, breaker] of this.breakers) {
      breaker.shutdown();
      logger.info(`Shutdown circuit breaker for service: ${serviceName}`);
    }
    
    this.breakers.clear();
    this.metrics.clear();
    this.fallbackHandlers.clear();
    
    logger.info('Circuit breaker manager shutdown complete');
  }
}

/**
 * Default fallback handlers for Serenity services
 */
export const defaultFallbacks = {
  'user-service': async () => ({
    error: 'User service temporarily unavailable',
    fallback: true,
    timestamp: new Date().toISOString()
  }),

  'checkin-service': async () => ({
    error: 'Check-in service temporarily unavailable',
    fallback: true,
    message: 'Your check-in will be saved when the service is restored',
    timestamp: new Date().toISOString()
  }),

  'crisis-service': async () => ({
    error: 'Crisis service temporarily unavailable',
    fallback: true,
    emergency_contact: '988', // Suicide & Crisis Lifeline
    message: 'For immediate crisis support, please call 988 or 911',
    timestamp: new Date().toISOString()
  }),

  'notification-service': async () => ({
    error: 'Notification service temporarily unavailable',
    fallback: true,
    message: 'Notifications will be delivered when service is restored',
    timestamp: new Date().toISOString()
  }),

  'clinical-service': async () => ({
    error: 'Clinical service temporarily unavailable',
    fallback: true,
    message: 'Clinical features will be available when service is restored',
    timestamp: new Date().toISOString()
  })
};

// Export singleton instance
export const circuitBreakerManager = new CircuitBreakerManager();

// Register default fallbacks
for (const [serviceName, fallbackFn] of Object.entries(defaultFallbacks)) {
  circuitBreakerManager.registerFallback(serviceName, fallbackFn);
}