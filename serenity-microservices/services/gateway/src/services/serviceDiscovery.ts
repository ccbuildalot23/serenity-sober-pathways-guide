import consul from 'consul';
import axios from 'axios';
import { EventEmitter } from 'events';
import { createLogger } from '@utils/logger';
import { retryWithBackoff, sleep } from '@utils/helpers';
import { ServiceInstance, ServiceConfig, HealthCheckResult } from '@types/index';
import config from '@config/index';

const logger = createLogger('ServiceDiscovery');

export class ServiceDiscovery extends EventEmitter {
  private consulClient: consul.Consul;
  private services: Map<string, ServiceInstance[]> = new Map();
  private healthCheckInterval: NodeJS.Timer | null = null;
  private isRunning: boolean = false;

  constructor() {
    super();
    this.consulClient = consul({
      host: config.service_discovery.config.host,
      port: config.service_discovery.config.port,
      secure: config.service_discovery.config.secure || false
    });
  }

  /**
   * Start service discovery
   */
  async start(): Promise<void> {
    try {
      this.isRunning = true;
      logger.info('Starting service discovery...');

      // Initial service discovery
      await this.discoverServices();

      // Start watching for service changes
      this.watchServices();

      // Start health checks
      this.startHealthChecks();

      logger.info('Service discovery started successfully');
    } catch (error) {
      logger.error('Failed to start service discovery:', error);
      throw error;
    }
  }

  /**
   * Stop service discovery
   */
  async stop(): Promise<void> {
    try {
      this.isRunning = false;
      
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      this.services.clear();
      logger.info('Service discovery stopped');
    } catch (error) {
      logger.error('Error stopping service discovery:', error);
    }
  }

  /**
   * Register a service
   */
  async registerService(
    name: string,
    address: string,
    port: number,
    healthCheckPath: string = '/health',
    tags: string[] = [],
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const serviceId = `${name}-${address}-${port}`;
      
      await this.consulClient.agent.service.register({
        id: serviceId,
        name,
        address,
        port,
        tags,
        meta: metadata,
        check: {
          http: `http://${address}:${port}${healthCheckPath}`,
          interval: '10s',
          timeout: '5s',
          deregistercriticalserviceafter: '30s'
        }
      });

      logger.info(`Service registered: ${name} at ${address}:${port}`);
    } catch (error) {
      logger.error(`Failed to register service ${name}:`, error);
      throw error;
    }
  }

  /**
   * Deregister a service
   */
  async deregisterService(serviceId: string): Promise<void> {
    try {
      await this.consulClient.agent.service.deregister(serviceId);
      logger.info(`Service deregistered: ${serviceId}`);
    } catch (error) {
      logger.error(`Failed to deregister service ${serviceId}:`, error);
    }
  }

  /**
   * Discover services from Consul
   */
  private async discoverServices(): Promise<void> {
    try {
      const services = await this.consulClient.health.service({
        service: '', // Get all services
        passing: true // Only healthy services
      });

      // Group services by name
      const serviceMap = new Map<string, ServiceInstance[]>();
      
      for (const service of services) {
        const serviceName = service.Service.Service;
        
        if (!serviceMap.has(serviceName)) {
          serviceMap.set(serviceName, []);
        }

        const instance: ServiceInstance = {
          id: service.Service.ID,
          name: serviceName,
          address: service.Service.Address,
          port: service.Service.Port,
          tags: service.Service.Tags || [],
          health: this.mapConsulHealthToStatus(service.Checks),
          last_health_check: new Date(),
          metadata: service.Service.Meta || {}
        };

        serviceMap.get(serviceName)!.push(instance);
      }

      // Update internal service registry
      this.services = serviceMap;

      // Emit service discovery event
      this.emit('servicesUpdated', this.services);

      logger.info(`Discovered ${this.services.size} service types with ${this.getTotalInstances()} total instances`);
    } catch (error) {
      logger.error('Failed to discover services:', error);
    }
  }

  /**
   * Watch for service changes
   */
  private watchServices(): void {
    if (config.service_discovery.type !== 'consul') {
      return;
    }

    // Use Consul's watch functionality
    const watcher = this.consulClient.watch({
      method: this.consulClient.health.service,
      options: { service: '', passing: true }
    });

    watcher.on('change', (data: any) => {
      logger.info('Service registry changed, updating...');
      this.discoverServices();
    });

    watcher.on('error', (error: any) => {
      logger.error('Service watcher error:', error);
    });
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    const interval = 30000; // 30 seconds
    
    this.healthCheckInterval = setInterval(async () => {
      if (!this.isRunning) return;
      
      await this.performHealthChecks();
    }, interval);
  }

  /**
   * Perform health checks on all service instances
   */
  private async performHealthChecks(): Promise<void> {
    const healthPromises: Promise<void>[] = [];

    for (const [serviceName, instances] of this.services) {
      for (const instance of instances) {
        healthPromises.push(this.checkInstanceHealth(serviceName, instance));
      }
    }

    await Promise.allSettled(healthPromises);
  }

  /**
   * Check health of a specific service instance
   */
  private async checkInstanceHealth(serviceName: string, instance: ServiceInstance): Promise<void> {
    try {
      const serviceConfig = config.services[serviceName];
      const healthUrl = `http://${instance.address}:${instance.port}${serviceConfig?.health_check_path || '/health'}`;
      
      const startTime = Date.now();
      const response = await axios.get(healthUrl, {
        timeout: 5000,
        validateStatus: (status) => status === 200
      });
      const responseTime = Date.now() - startTime;

      const oldHealth = instance.health;
      instance.health = 'passing';
      instance.last_health_check = new Date();

      if (oldHealth !== 'passing') {
        logger.info(`Service instance recovered: ${serviceName} at ${instance.address}:${instance.port}`);
        this.emit('instanceRecovered', serviceName, instance);
      }

      // Update health metrics
      this.emit('healthCheck', {
        service: serviceName,
        status: 'healthy',
        response_time: responseTime,
        timestamp: new Date(),
        details: {
          instance_id: instance.id,
          address: `${instance.address}:${instance.port}`
        }
      } as HealthCheckResult);

    } catch (error) {
      const oldHealth = instance.health;
      instance.health = 'critical';
      instance.last_health_check = new Date();

      if (oldHealth !== 'critical') {
        logger.warn(`Service instance unhealthy: ${serviceName} at ${instance.address}:${instance.port}`, error);
        this.emit('instanceFailed', serviceName, instance);
      }

      // Update health metrics
      this.emit('healthCheck', {
        service: serviceName,
        status: 'unhealthy',
        response_time: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
        details: {
          instance_id: instance.id,
          address: `${instance.address}:${instance.port}`
        }
      } as HealthCheckResult);
    }
  }

  /**
   * Get healthy instances for a service
   */
  getHealthyInstances(serviceName: string): ServiceInstance[] {
    const instances = this.services.get(serviceName) || [];
    return instances.filter(instance => instance.health === 'passing');
  }

  /**
   * Get all instances for a service
   */
  getInstances(serviceName: string): ServiceInstance[] {
    return this.services.get(serviceName) || [];
  }

  /**
   * Get all discovered services
   */
  getAllServices(): Map<string, ServiceInstance[]> {
    return new Map(this.services);
  }

  /**
   * Check if a service is available
   */
  isServiceAvailable(serviceName: string): boolean {
    return this.getHealthyInstances(serviceName).length > 0;
  }

  /**
   * Wait for service to become available
   */
  async waitForService(serviceName: string, timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (this.isServiceAvailable(serviceName)) {
        return true;
      }
      
      await sleep(1000);
    }
    
    return false;
  }

  /**
   * Map Consul health status to our status
   */
  private mapConsulHealthToStatus(checks: any[]): 'passing' | 'warning' | 'critical' {
    if (!checks || checks.length === 0) {
      return 'critical';
    }
    
    const hasWarning = checks.some(check => check.Status === 'warning');
    const hasCritical = checks.some(check => check.Status === 'critical');
    
    if (hasCritical) return 'critical';
    if (hasWarning) return 'warning';
    return 'passing';
  }

  /**
   * Get total number of instances across all services
   */
  private getTotalInstances(): number {
    let total = 0;
    for (const instances of this.services.values()) {
      total += instances.length;
    }
    return total;
  }
}

/**
 * Static service discovery (for development/testing)
 */
export class StaticServiceDiscovery extends EventEmitter {
  private services: Map<string, ServiceInstance[]> = new Map();

  constructor() {
    super();
    this.initializeStaticServices();
  }

  async start(): Promise<void> {
    logger.info('Starting static service discovery...');
    this.emit('servicesUpdated', this.services);
    logger.info('Static service discovery started');
  }

  async stop(): Promise<void> {
    this.services.clear();
    logger.info('Static service discovery stopped');
  }

  private initializeStaticServices(): void {
    // Initialize with configured services
    for (const [serviceName, serviceConfig] of Object.entries(config.services)) {
      const url = new URL(serviceConfig.url);
      
      const instance: ServiceInstance = {
        id: `${serviceName}-static`,
        name: serviceName,
        address: url.hostname,
        port: parseInt(url.port) || (url.protocol === 'https:' ? 443 : 80),
        tags: ['static'],
        health: 'passing',
        last_health_check: new Date(),
        metadata: { version: serviceConfig.version }
      };

      this.services.set(serviceName, [instance]);
    }
  }

  getHealthyInstances(serviceName: string): ServiceInstance[] {
    return this.services.get(serviceName) || [];
  }

  getInstances(serviceName: string): ServiceInstance[] {
    return this.services.get(serviceName) || [];
  }

  getAllServices(): Map<string, ServiceInstance[]> {
    return new Map(this.services);
  }

  isServiceAvailable(serviceName: string): boolean {
    return this.getHealthyInstances(serviceName).length > 0;
  }

  async waitForService(serviceName: string, timeout: number = 30000): Promise<boolean> {
    return this.isServiceAvailable(serviceName);
  }
}

// Export singleton instance
export const serviceDiscovery = config.service_discovery.type === 'consul' 
  ? new ServiceDiscovery()
  : new StaticServiceDiscovery();