import { mcpIntegrationBridge } from '../McpIntegrationBridge';
import {
  CrisisManagementService,
  NotificationService,
  TelemetryService,
  AISupportService,
  DataSyncService
} from './services';

/**
 * MCP Service Registry
 * Central registry for all MCP (Model Context Protocol) integrations
 * Manages external service connections, authentication, and error handling
 */
export class McpServiceRegistry {
  private services: Map<string, McpServiceInterface> = new Map();
  private bridge: typeof mcpIntegrationBridge;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.bridge = mcpIntegrationBridge;
    this.initializeServices();
  }

  /**
   * Initialize all MCP services
   */
  private async initializeServices() {
    // Register core services
    await this.registerService('crisis', new CrisisManagementService());
    await this.registerService('notifications', new NotificationService());
    await this.registerService('telemetry', new TelemetryService());
    await this.registerService('aiSupport', new AISupportService());
    await this.registerService('dataSync', new DataSyncService());
    
    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Register a new MCP service
   */
  public async registerService(name: string, service: McpServiceInterface): Promise<void> {
    try {
      // Validate service interface
      if (!this.validateService(service)) {
        throw new Error(`Invalid service interface for ${name}`);
      }

      // Initialize service connection
      await service.initialize();
      
      // Store in registry
      this.services.set(name, service);
      
      console.log(`✓ MCP Service registered: ${name}`);
    } catch (error) {
      console.error(`Failed to register MCP service ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get a registered service
   */
  public getService<T extends McpServiceInterface>(name: string): T | undefined {
    return this.services.get(name) as T;
  }

  /**
   * Execute an MCP operation with error handling and retry logic
   */
  public async executeOperation<T>(
    serviceName: string,
    operation: string,
    params: Record<string, any>,
    options: McpOperationOptions = {}
  ): Promise<McpOperationResult<T>> {
    const service = this.services.get(serviceName);
    
    if (!service) {
      return {
        success: false,
        error: `Service ${serviceName} not found`,
        timestamp: new Date().toISOString()
      };
    }

    const { retries = 3, timeout = 30000, fallback } = options;
    let lastError: Error | null = null;

    // Attempt operation with retries
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Operation timeout')), timeout);
        });

        // Execute operation with timeout
        const result = await Promise.race([
          service.execute(operation, params),
          timeoutPromise
        ]) as T;

        // Record telemetry
        await this.recordTelemetry({
          service: serviceName,
          operation,
          success: true,
          duration: Date.now(),
          attempt
        });

        return {
          success: true,
          data: result,
          timestamp: new Date().toISOString()
        };

      } catch (error) {
        lastError = error as Error;
        console.warn(`MCP operation failed (attempt ${attempt}/${retries}):`, error);

        // Exponential backoff for retries
        if (attempt < retries) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    // All retries failed, use fallback if available
    if (fallback) {
      console.log('Using fallback for MCP operation');
      return {
        success: true,
        data: await fallback(),
        fallback: true,
        timestamp: new Date().toISOString()
      };
    }

    // Record failure telemetry
    await this.recordTelemetry({
      service: serviceName,
      operation,
      success: false,
      error: lastError?.message
    });

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Batch execute multiple MCP operations
   */
  public async batchExecute(
    operations: McpBatchOperation[]
  ): Promise<McpBatchResult> {
    const results = await Promise.allSettled(
      operations.map(op => 
        this.executeOperation(op.service, op.operation, op.params, op.options)
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      total: operations.length,
      successful,
      failed,
      results: results.map((r, i) => ({
        operation: operations[i],
        result: r.status === 'fulfilled' ? r.value : { success: false, error: r.reason }
      }))
    };
  }

  /**
   * Health monitoring for all services
   */
  private startHealthMonitoring() {
    this.healthCheckInterval = setInterval(async () => {
      for (const [name, service] of this.services.entries()) {
        try {
          const health = await service.healthCheck();
          
          if (!health.healthy) {
            console.warn(`MCP Service unhealthy: ${name}`, health.issues);
            
            // Attempt auto-recovery
            if (health.recoverable) {
              await this.attemptServiceRecovery(name, service);
            }
          }
        } catch (error) {
          console.error(`Health check failed for ${name}:`, error);
        }
      }
    }, 60000); // Check every minute
  }

  /**
   * Attempt to recover an unhealthy service
   */
  private async attemptServiceRecovery(name: string, service: McpServiceInterface) {
    try {
      console.log(`Attempting recovery for MCP service: ${name}`);
      
      // Disconnect and reconnect
      await service.disconnect();
      await this.delay(2000);
      await service.initialize();
      
      // Verify recovery
      const health = await service.healthCheck();
      if (health.healthy) {
        console.log(`✓ MCP Service recovered: ${name}`);
      } else {
        console.error(`Failed to recover MCP service: ${name}`);
      }
    } catch (error) {
      console.error(`Recovery failed for ${name}:`, error);
    }
  }

  /**
   * Validate service interface
   */
  private validateService(service: McpServiceInterface): boolean {
    return (
      typeof service.initialize === 'function' &&
      typeof service.execute === 'function' &&
      typeof service.healthCheck === 'function' &&
      typeof service.disconnect === 'function'
    );
  }

  /**
   * Record telemetry data
   */
  private async recordTelemetry(data: McpTelemetryData) {
    const telemetryService = this.services.get('telemetry');
    if (telemetryService) {
      await telemetryService.execute('record', data);
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup and disconnect all services
   */
  public async shutdown() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    for (const [name, service] of this.services.entries()) {
      try {
        await service.disconnect();
        console.log(`✓ MCP Service disconnected: ${name}`);
      } catch (error) {
        console.error(`Failed to disconnect ${name}:`, error);
      }
    }

    this.services.clear();
  }
}

// Service interfaces and types
export interface McpServiceInterface {
  initialize(): Promise<void>;
  execute(operation: string, params: Record<string, any>): Promise<any>;
  healthCheck(): Promise<McpHealthStatus>;
  disconnect(): Promise<void>;
}

export interface McpHealthStatus {
  healthy: boolean;
  issues?: string[];
  recoverable?: boolean;
  lastCheck: string;
}

export interface McpOperationOptions {
  retries?: number;
  timeout?: number;
  fallback?: () => Promise<any>;
  priority?: 'low' | 'normal' | 'high';
}

export interface McpOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  fallback?: boolean;
  timestamp: string;
}

export interface McpBatchOperation {
  service: string;
  operation: string;
  params: Record<string, any>;
  options?: McpOperationOptions;
}

export interface McpBatchResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    operation: McpBatchOperation;
    result: McpOperationResult;
  }>;
}

export interface McpTelemetryData {
  service: string;
  operation: string;
  success: boolean;
  duration?: number;
  error?: string;
  attempt?: number;
}

// Export singleton instance
export const mcpServiceRegistry = new McpServiceRegistry();