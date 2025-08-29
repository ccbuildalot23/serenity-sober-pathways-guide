// Enhanced Database Connection Pooling Configuration
// Optimized for HIPAA-compliant healthcare platform

import { Pool, PoolConfig } from 'pg';

export interface DatabasePoolConfig extends PoolConfig {
  // Connection pool settings
  max: number;                    // Maximum pool size
  min: number;                    // Minimum pool size
  idleTimeoutMillis: number;      // How long idle connection stays open
  connectionTimeoutMillis: number; // Connection timeout
  maxUses: number;                // Max uses before connection recycling
  
  // Performance settings
  statement_timeout?: number;      // Query timeout (ms)
  query_timeout?: number;          // Total query timeout
  application_name?: string;       // App identifier for monitoring
  
  // Security settings
  ssl?: {
    rejectUnauthorized: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
}

// Environment-specific pool configurations
export const poolConfigs: Record<string, DatabasePoolConfig> = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'serenity_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    
    // Pool settings optimized for development
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    maxUses: 7500,
    
    // Performance
    statement_timeout: 30000,
    query_timeout: 60000,
    application_name: 'serenity-dev',
  },
  
  production: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    
    // Pool settings optimized for production load
    max: 50,                         // Higher for production traffic
    min: 10,                         // Maintain minimum connections
    idleTimeoutMillis: 60000,        // Keep connections warm longer
    connectionTimeoutMillis: 10000,   // Allow more time for connection
    maxUses: 10000,                  // Recycle after more uses
    
    // Performance
    statement_timeout: 60000,         // 1 minute timeout
    query_timeout: 120000,            // 2 minute total timeout
    application_name: 'serenity-prod',
    
    // Security - Required for production
    ssl: {
      rejectUnauthorized: true,
      ca: process.env.DB_SSL_CA,
      cert: process.env.DB_SSL_CERT,
      key: process.env.DB_SSL_KEY,
    },
  },
  
  test: {
    host: 'localhost',
    port: 5432,
    database: 'serenity_test',
    user: 'postgres',
    password: 'test',
    
    // Minimal pool for testing
    max: 5,
    min: 1,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 2000,
    maxUses: 5000,
    
    statement_timeout: 10000,
    query_timeout: 20000,
    application_name: 'serenity-test',
  },
};

// Connection pool manager with health checks
export class DatabasePoolManager {
  private static instances: Map<string, Pool> = new Map();
  private static healthCheckInterval: NodeJS.Timeout;
  
  static getPool(environment: string = process.env.NODE_ENV || 'development'): Pool {
    if (!this.instances.has(environment)) {
      const config = poolConfigs[environment];
      if (!config) {
        throw new Error(`No pool configuration for environment: ${environment}`);
      }
      
      const pool = new Pool(config);
      
      // Set up error handling
      pool.on('error', (err, client) => {
        console.error('Unexpected database pool error', err);
        // Implement alerting here for production
      });
      
      // Set up connection monitoring
      pool.on('connect', (client) => {
        console.log(`New database connection established for ${environment}`);
      });
      
      pool.on('remove', (client) => {
        console.log(`Database connection removed from pool for ${environment}`);
      });
      
      this.instances.set(environment, pool);
    }
    
    return this.instances.get(environment)!;
  }
  
  // Health check for connection pools
  static async healthCheck(): Promise<{
    healthy: boolean;
    pools: Record<string, {
      totalCount: number;
      idleCount: number;
      waitingCount: number;
    }>;
  }> {
    const poolStats: any = {};
    let healthy = true;
    
    for (const [env, pool] of this.instances) {
      poolStats[env] = {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
      };
      
      // Check if pool is healthy
      try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
      } catch (error) {
        console.error(`Pool health check failed for ${env}:`, error);
        healthy = false;
      }
    }
    
    return { healthy, pools: poolStats };
  }
  
  // Start periodic health checks
  static startHealthChecks(intervalMs: number = 60000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.healthCheck();
      if (!health.healthy) {
        console.error('Database pool health check failed:', health);
        // Implement alerting for production
      }
    }, intervalMs);
  }
  
  // Graceful shutdown
  static async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    const shutdownPromises = [];
    for (const [env, pool] of this.instances) {
      console.log(`Shutting down database pool for ${env}`);
      shutdownPromises.push(pool.end());
    }
    
    await Promise.all(shutdownPromises);
    this.instances.clear();
    console.log('All database pools shut down successfully');
  }
}

// Query retry logic for resilience
export async function executeWithRetry<T>(
  pool: Pool,
  query: string,
  params: any[] = [],
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(query, params);
        return result.rows as T;
      } finally {
        client.release();
      }
    } catch (error: any) {
      lastError = error;
      console.error(`Query attempt ${attempt} failed:`, error.message);
      
      // Don't retry on certain errors
      if (error.code === '23505' || // Unique constraint violation
          error.code === '23503' || // Foreign key violation
          error.code === '22P02') { // Invalid text representation
        throw error;
      }
      
      if (attempt < maxRetries) {
        const delay = backoffMs * Math.pow(2, attempt - 1);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Query failed after max retries');
}

// Export for use in application
export default DatabasePoolManager;