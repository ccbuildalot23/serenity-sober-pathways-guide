import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '@/config/config';
import logger from '@/utils/logger';

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;

  private constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      connectionString: config.database.url,
      
      // Connection pool settings
      min: 2,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      
      // SSL configuration for production
      ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
    });

    // Handle pool events
    this.pool.on('connect', (client: PoolClient) => {
      logger.debug('New client connected to database', {
        processId: client.processID,
        timestamp: new Date().toISOString(),
      });
    });

    this.pool.on('error', (err: Error) => {
      logger.error('Database pool error', {
        error: err.message,
        stack: err.stack,
        timestamp: new Date().toISOString(),
      });
    });

    // Test connection on startup
    this.testConnection();
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const client = await this.pool.connect();
    try {
      const start = Date.now();
      const result = await client.query<T>(text, params);
      const duration = Date.now() - start;

      logger.debug('Database query executed', {
        query: text.substring(0, 100),
        duration,
        rowCount: result.rowCount,
        timestamp: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      logger.error('Database query error', {
        query: text.substring(0, 100),
        error: error instanceof Error ? error.message : 'Unknown error',
        params: params ? JSON.stringify(params) : undefined,
        timestamp: new Date().toISOString(),
      });
      throw error;
    } finally {
      client.release();
    }
  }

  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction rolled back', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    } finally {
      client.release();
    }
  }

  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  private async testConnection(): Promise<void> {
    try {
      await this.query('SELECT NOW() as current_time');
      logger.info('Database connection established successfully');
    } catch (error) {
      logger.error('Failed to connect to database', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      throw error;
    }
  }

  public async healthCheck(): Promise<{ status: string; latency: number }> {
    const start = Date.now();
    try {
      await this.query('SELECT 1');
      const latency = Date.now() - start;
      return { status: 'healthy', latency };
    } catch (error) {
      logger.error('Database health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return { status: 'unhealthy', latency: Date.now() - start };
    }
  }

  public async close(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database pool', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Utility method for parameterized queries with logging
  public async safeQuery<T = any>(
    text: string,
    params: any[] = [],
    logLevel: 'debug' | 'info' = 'debug'
  ): Promise<QueryResult<T>> {
    try {
      const result = await this.query<T>(text, params);
      
      if (logLevel === 'info') {
        logger.info('Database query completed', {
          affectedRows: result.rowCount,
          timestamp: new Date().toISOString(),
        });
      }

      return result;
    } catch (error) {
      logger.error('Safe query failed', {
        query: text.substring(0, 100),
        paramCount: params.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  // Check if database is ready for operations
  public async isReady(): Promise<boolean> {
    try {
      const result = await this.query('SELECT COUNT(*) FROM information_schema.tables WHERE table_name = $1', ['audit_logs']);
      return result.rows.length > 0;
    } catch (error) {
      logger.warn('Database readiness check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

export const db = DatabaseConnection.getInstance();