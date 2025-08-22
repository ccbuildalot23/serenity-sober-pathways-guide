import { createLogger } from '@utils/logger';
import { ServiceInstance, LoadBalancerConfig } from '@types/index';
import { serviceDiscovery } from './serviceDiscovery';

const logger = createLogger('LoadBalancer');

export interface LoadBalancingStrategy {
  selectInstance(instances: ServiceInstance[]): ServiceInstance | null;
  getName(): string;
}

/**
 * Round Robin Load Balancing Strategy
 */
export class RoundRobinStrategy implements LoadBalancingStrategy {
  private counters: Map<string, number> = new Map();

  selectInstance(instances: ServiceInstance[]): ServiceInstance | null {
    if (instances.length === 0) return null;

    const serviceName = instances[0].name;
    const currentCounter = this.counters.get(serviceName) || 0;
    const selectedIndex = currentCounter % instances.length;
    
    this.counters.set(serviceName, currentCounter + 1);
    return instances[selectedIndex];
  }

  getName(): string {
    return 'round_robin';
  }
}

/**
 * Weighted Round Robin Load Balancing Strategy
 */
export class WeightedRoundRobinStrategy implements LoadBalancingStrategy {
  private weights: Map<string, number>;
  private counters: Map<string, number> = new Map();

  constructor(weights: Record<string, number> = {}) {
    this.weights = new Map(Object.entries(weights));
  }

  selectInstance(instances: ServiceInstance[]): ServiceInstance | null {
    if (instances.length === 0) return null;

    const serviceName = instances[0].name;
    
    // Create weighted list
    const weightedInstances: ServiceInstance[] = [];
    
    for (const instance of instances) {
      const weight = this.weights.get(instance.id) || 1;
      for (let i = 0; i < weight; i++) {
        weightedInstances.push(instance);
      }
    }

    if (weightedInstances.length === 0) return instances[0];

    const currentCounter = this.counters.get(serviceName) || 0;
    const selectedIndex = currentCounter % weightedInstances.length;
    
    this.counters.set(serviceName, currentCounter + 1);
    return weightedInstances[selectedIndex];
  }

  getName(): string {
    return 'weighted_round_robin';
  }
}

/**
 * Least Connections Load Balancing Strategy
 */
export class LeastConnectionsStrategy implements LoadBalancingStrategy {
  private connectionCounts: Map<string, number> = new Map();

  selectInstance(instances: ServiceInstance[]): ServiceInstance | null {
    if (instances.length === 0) return null;

    let selectedInstance = instances[0];
    let minConnections = this.connectionCounts.get(selectedInstance.id) || 0;

    for (const instance of instances) {
      const connections = this.connectionCounts.get(instance.id) || 0;
      if (connections < minConnections) {
        selectedInstance = instance;
        minConnections = connections;
      }
    }

    return selectedInstance;
  }

  incrementConnections(instanceId: string): void {
    const current = this.connectionCounts.get(instanceId) || 0;
    this.connectionCounts.set(instanceId, current + 1);
  }

  decrementConnections(instanceId: string): void {
    const current = this.connectionCounts.get(instanceId) || 0;
    this.connectionCounts.set(instanceId, Math.max(0, current - 1));
  }

  getName(): string {
    return 'least_connections';
  }
}

/**
 * Random Load Balancing Strategy
 */
export class RandomStrategy implements LoadBalancingStrategy {
  selectInstance(instances: ServiceInstance[]): ServiceInstance | null {
    if (instances.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * instances.length);
    return instances[randomIndex];
  }

  getName(): string {
    return 'random';
  }
}

/**
 * Health-aware Load Balancing Strategy
 */
export class HealthAwareStrategy implements LoadBalancingStrategy {
  private baseStrategy: LoadBalancingStrategy;
  private healthScores: Map<string, number> = new Map();

  constructor(baseStrategy: LoadBalancingStrategy) {
    this.baseStrategy = baseStrategy;
  }

  selectInstance(instances: ServiceInstance[]): ServiceInstance | null {
    if (instances.length === 0) return null;

    // Filter instances by health status
    const healthyInstances = instances.filter(instance => instance.health === 'passing');
    
    if (healthyInstances.length === 0) {
      // Fallback to warning instances if no healthy ones
      const warningInstances = instances.filter(instance => instance.health === 'warning');
      if (warningInstances.length > 0) {
        logger.warn('No healthy instances available, using warning instances');
        return this.baseStrategy.selectInstance(warningInstances);
      }
      
      logger.error('No healthy instances available for service');
      return null;
    }

    return this.baseStrategy.selectInstance(healthyInstances);
  }

  updateHealthScore(instanceId: string, score: number): void {
    this.healthScores.set(instanceId, score);
  }

  getName(): string {
    return `health_aware_${this.baseStrategy.getName()}`;
  }
}

/**
 * Latency-aware Load Balancing Strategy
 */
export class LatencyAwareStrategy implements LoadBalancingStrategy {
  private latencyScores: Map<string, number> = new Map();
  private lastResponseTimes: Map<string, number[]> = new Map();
  private maxSamples: number = 10;

  selectInstance(instances: ServiceInstance[]): ServiceInstance | null {
    if (instances.length === 0) return null;

    // Sort instances by average latency (ascending)
    const sortedInstances = instances.sort((a, b) => {
      const latencyA = this.getAverageLatency(a.id);
      const latencyB = this.getAverageLatency(b.id);
      return latencyA - latencyB;
    });

    // Select the instance with lowest latency
    return sortedInstances[0];
  }

  recordResponseTime(instanceId: string, responseTime: number): void {
    if (!this.lastResponseTimes.has(instanceId)) {
      this.lastResponseTimes.set(instanceId, []);
    }

    const times = this.lastResponseTimes.get(instanceId)!;
    times.push(responseTime);

    // Keep only the last N samples
    if (times.length > this.maxSamples) {
      times.shift();
    }
  }

  private getAverageLatency(instanceId: string): number {
    const times = this.lastResponseTimes.get(instanceId);
    if (!times || times.length === 0) {
      return 1000; // Default penalty for unknown latency
    }

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  getName(): string {
    return 'latency_aware';
  }
}

/**
 * Load Balancer Service
 */
export class LoadBalancer {
  private strategies: Map<string, LoadBalancingStrategy> = new Map();
  private serviceStrategies: Map<string, LoadBalancingStrategy> = new Map();
  private defaultStrategy: LoadBalancingStrategy;

  constructor() {
    // Initialize available strategies
    this.strategies.set('round_robin', new RoundRobinStrategy());
    this.strategies.set('weighted', new WeightedRoundRobinStrategy());
    this.strategies.set('least_connections', new LeastConnectionsStrategy());
    this.strategies.set('random', new RandomStrategy());
    
    // Health-aware versions
    this.strategies.set('health_aware_round_robin', 
      new HealthAwareStrategy(new RoundRobinStrategy()));
    this.strategies.set('health_aware_least_connections', 
      new HealthAwareStrategy(new LeastConnectionsStrategy()));
    
    this.strategies.set('latency_aware', new LatencyAwareStrategy());

    this.defaultStrategy = this.strategies.get('health_aware_round_robin')!;
  }

  /**
   * Select an instance for a service
   */
  selectInstance(serviceName: string): ServiceInstance | null {
    try {
      const instances = serviceDiscovery.getHealthyInstances(serviceName);
      
      if (instances.length === 0) {
        logger.warn(`No healthy instances available for service: ${serviceName}`);
        return null;
      }

      const strategy = this.getStrategyForService(serviceName);
      const selectedInstance = strategy.selectInstance(instances);

      if (selectedInstance) {
        logger.debug(`Selected instance ${selectedInstance.id} for service ${serviceName} using ${strategy.getName()}`);
        
        // Record connection for least connections strategy
        if (strategy instanceof LeastConnectionsStrategy) {
          strategy.incrementConnections(selectedInstance.id);
        }
      }

      return selectedInstance;
    } catch (error) {
      logger.error(`Error selecting instance for service ${serviceName}:`, error);
      return null;
    }
  }

  /**
   * Release a connection (for least connections strategy)
   */
  releaseConnection(serviceName: string, instanceId: string): void {
    try {
      const strategy = this.getStrategyForService(serviceName);
      
      if (strategy instanceof LeastConnectionsStrategy) {
        strategy.decrementConnections(instanceId);
      }
    } catch (error) {
      logger.error(`Error releasing connection for service ${serviceName}:`, error);
    }
  }

  /**
   * Record response time for latency-aware load balancing
   */
  recordResponseTime(serviceName: string, instanceId: string, responseTime: number): void {
    try {
      const strategy = this.getStrategyForService(serviceName);
      
      if (strategy instanceof LatencyAwareStrategy) {
        strategy.recordResponseTime(instanceId, responseTime);
      }
    } catch (error) {
      logger.error(`Error recording response time for service ${serviceName}:`, error);
    }
  }

  /**
   * Set strategy for a specific service
   */
  setServiceStrategy(serviceName: string, strategyName: string, config?: any): void {
    let strategy = this.strategies.get(strategyName);
    
    if (!strategy) {
      logger.warn(`Unknown strategy ${strategyName}, using default`);
      strategy = this.defaultStrategy;
    }

    // Handle weighted strategy configuration
    if (strategyName === 'weighted' && config?.weights) {
      strategy = new WeightedRoundRobinStrategy(config.weights);
    }

    this.serviceStrategies.set(serviceName, strategy);
    logger.info(`Set load balancing strategy for service ${serviceName}: ${strategy.getName()}`);
  }

  /**
   * Get strategy for a service
   */
  private getStrategyForService(serviceName: string): LoadBalancingStrategy {
    return this.serviceStrategies.get(serviceName) || this.defaultStrategy;
  }

  /**
   * Get load balancing statistics
   */
  getStats(): Record<string, any> {
    const stats: Record<string, any> = {};
    
    for (const [serviceName, strategy] of this.serviceStrategies) {
      const instances = serviceDiscovery.getHealthyInstances(serviceName);
      
      stats[serviceName] = {
        strategy: strategy.getName(),
        healthy_instances: instances.length,
        total_instances: serviceDiscovery.getInstances(serviceName).length
      };

      // Add strategy-specific stats
      if (strategy instanceof LeastConnectionsStrategy) {
        stats[serviceName].connection_counts = {};
        for (const instance of instances) {
          stats[serviceName].connection_counts[instance.id] = 
            (strategy as any).connectionCounts.get(instance.id) || 0;
        }
      }

      if (strategy instanceof LatencyAwareStrategy) {
        stats[serviceName].average_latencies = {};
        for (const instance of instances) {
          stats[serviceName].average_latencies[instance.id] = 
            (strategy as any).getAverageLatency(instance.id);
        }
      }
    }
    
    return stats;
  }

  /**
   * Reset all strategies
   */
  reset(): void {
    this.serviceStrategies.clear();
    
    // Reset strategy state
    for (const strategy of this.strategies.values()) {
      if (strategy instanceof RoundRobinStrategy) {
        (strategy as any).counters.clear();
      }
      if (strategy instanceof LeastConnectionsStrategy) {
        (strategy as any).connectionCounts.clear();
      }
    }
    
    logger.info('Load balancer reset');
  }
}

// Export singleton instance
export const loadBalancer = new LoadBalancer();