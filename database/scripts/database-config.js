/**
 * Database Configuration and Connection Management
 * HIPAA-compliant connection pooling with monitoring and security
 */

const knex = require('knex');
const knexConfig = require('../knexfile');

class DatabaseConfig {
  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.config = knexConfig[this.environment];
    this.db = null;
    this.connectionMonitor = null;
    this.retryAttempts = 0;
    this.maxRetries = 5;
  }

  /**
   * Initialize database connection with monitoring
   */
  async initialize() {
    try {
      console.log(`🔧 Initializing database connection for ${this.environment} environment...`);
      
      // Validate required environment variables
      this.validateEnvironment();
      
      // Create Knex instance with enhanced configuration
      this.db = knex({
        ...this.config,
        pool: {
          ...this.config.pool,
          // Enhanced pool configuration for HIPAA compliance
          afterCreate: this.afterConnectionCreate.bind(this),
          beforeDestroy: this.beforeConnectionDestroy.bind(this),
          validate: this.validateConnection.bind(this),
          // Connection timeout settings
          acquireTimeoutMillis: this.config.pool.acquireTimeoutMillis || 30000,
          createTimeoutMillis: this.config.pool.createTimeoutMillis || 30000,
          destroyTimeoutMillis: this.config.pool.destroyTimeoutMillis || 5000,
          idleTimeoutMillis: this.config.pool.idleTimeoutMillis || 30000,
        },
        // Enhanced error handling
        asyncStackTraces: this.environment === 'development',
        log: {
          warn: this.logWarning.bind(this),
          error: this.logError.bind(this),
          deprecate: this.logDeprecation.bind(this),
          debug: this.environment === 'development' ? this.logDebug.bind(this) : () => {}
        }
      });

      // Test connection
      await this.testConnection();
      
      // Setup connection monitoring
      this.setupConnectionMonitoring();
      
      // Setup graceful shutdown
      this.setupGracefulShutdown();
      
      console.log('✅ Database connection initialized successfully');
      return this.db;
      
    } catch (error) {
      console.error('❌ Failed to initialize database connection:', error);
      await this.handleConnectionError(error);
      throw error;
    }
  }

  /**
   * Validate required environment variables
   */
  validateEnvironment() {
    const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate encryption key for HIPAA compliance
    if (!process.env.DB_ENCRYPTION_KEY || process.env.DB_ENCRYPTION_KEY.length < 32) {
      console.warn('⚠️  DB_ENCRYPTION_KEY not set or too short. PHI encryption may not work properly.');
    }
  }

  /**
   * Connection lifecycle callbacks
   */
  async afterConnectionCreate(connection, done) {
    try {
      // Set session parameters for HIPAA compliance
      await this.setSessionSecurity(connection);
      
      // Set application context
      if (process.env.APP_NAME) {
        await connection.query(`SET application_name = '${process.env.APP_NAME}';`);
      }
      
      // Set timezone
      await connection.query(`SET timezone = 'UTC';`);
      
      console.log('🔐 Database connection secured and configured');
      done();
    } catch (error) {
      console.error('❌ Failed to configure new connection:', error);
      done(error);
    }
  }

  async beforeConnectionDestroy(connection, done) {
    try {
      // Log connection destruction for audit
      console.log('🔚 Closing database connection');
      done();
    } catch (error) {
      done(error);
    }
  }

  async validateConnection(connection) {
    try {
      await connection.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('❌ Connection validation failed:', error);
      return false;
    }
  }

  /**
   * Set security parameters for each connection
   */
  async setSessionSecurity(connection) {
    // Set session timeout (15 minutes for HIPAA compliance)
    await connection.query(`SET statement_timeout = '900s';`);
    await connection.query(`SET idle_in_transaction_session_timeout = '900s';`);
    
    // Set encryption key for pgcrypto functions
    if (process.env.DB_ENCRYPTION_KEY) {
      await connection.query(`SET app.encryption_key = '${process.env.DB_ENCRYPTION_KEY}';`);
    }
    
    // Disable auto-commit for transaction safety
    await connection.query('SET autocommit = off;');
    
    // Set row level security context
    await connection.query(`SET row_security = on;`);
  }

  /**
   * Test database connection and permissions
   */
  async testConnection() {
    console.log('🔍 Testing database connection...');
    
    try {
      // Test basic connectivity
      const result = await this.db.raw('SELECT NOW() as server_time, version() as version');
      console.log(`📅 Connected to PostgreSQL: ${result.rows[0].version.split(' ')[1]}`);
      console.log(`⏰ Server time: ${result.rows[0].server_time}`);
      
      // Test migrations table access
      const migrationsExist = await this.db.schema.hasTable('knex_migrations');
      console.log(`📋 Migrations table exists: ${migrationsExist}`);
      
      // Test RLS functionality if in production
      if (this.environment === 'production') {
        await this.testRowLevelSecurity();
      }
      
    } catch (error) {
      throw new Error(`Database connection test failed: ${error.message}`);
    }
  }

  /**
   * Test Row Level Security policies
   */
  async testRowLevelSecurity() {
    try {
      const rlsStatus = await this.db.raw(`
        SELECT schemaname, tablename, rowsecurity 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = true
      `);
      
      console.log(`🔒 RLS enabled on ${rlsStatus.rows.length} tables`);
      
    } catch (error) {
      console.warn('⚠️  Could not verify RLS status:', error.message);
    }
  }

  /**
   * Setup connection pool monitoring
   */
  setupConnectionMonitoring() {
    const pool = this.db.client.pool;
    
    this.connectionMonitor = setInterval(() => {
      const stats = {
        size: pool.size,
        available: pool.available,
        borrowed: pool.borrowed,
        invalid: pool.invalid,
        pending: pool.pending
      };
      
      // Log connection pool statistics
      if (this.environment === 'development' || stats.pending > 0) {
        console.log('📊 Connection Pool Stats:', stats);
      }
      
      // Alert on pool exhaustion
      if (stats.available === 0 && stats.pending > 0) {
        console.warn('⚠️  Connection pool exhausted! Pending connections:', stats.pending);
      }
      
      // Alert on too many invalid connections
      if (stats.invalid > stats.size * 0.2) {
        console.warn('⚠️  High number of invalid connections:', stats.invalid);
      }
      
    }, 30000); // Check every 30 seconds
  }

  /**
   * Setup graceful shutdown handling
   */
  setupGracefulShutdown() {
    const gracefulShutdown = async (signal) => {
      console.log(`🛑 Received ${signal}. Shutting down gracefully...`);
      
      if (this.connectionMonitor) {
        clearInterval(this.connectionMonitor);
      }
      
      if (this.db) {
        await this.db.destroy();
        console.log('🔚 Database connections closed');
      }
      
      process.exit(0);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  }

  /**
   * Handle connection errors with retry logic
   */
  async handleConnectionError(error) {
    this.retryAttempts++;
    
    if (this.retryAttempts <= this.maxRetries) {
      console.log(`🔄 Retrying connection (${this.retryAttempts}/${this.maxRetries}) in 5 seconds...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return this.initialize();
    }
    
    console.error('💀 Max retry attempts reached. Database connection failed.');
    throw error;
  }

  /**
   * Logging methods with structured format
   */
  logWarning(message) {
    console.warn(`⚠️  [DB WARNING] ${new Date().toISOString()}: ${message}`);
  }

  logError(message) {
    console.error(`❌ [DB ERROR] ${new Date().toISOString()}: ${message}`);
  }

  logDeprecation(message) {
    console.warn(`🚫 [DB DEPRECATED] ${new Date().toISOString()}: ${message}`);
  }

  logDebug(message) {
    console.log(`🐛 [DB DEBUG] ${new Date().toISOString()}: ${message}`);
  }

  /**
   * Set user context for RLS and audit logging
   */
  async setUserContext(userId, sessionId = null, ipAddress = null, userAgent = null) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      await this.db.raw(`SELECT set_config('app.current_user_id', ?, false)`, [userId]);
      
      if (sessionId) {
        await this.db.raw(`SELECT set_config('app.session_id', ?, false)`, [sessionId]);
      }
      
      if (ipAddress) {
        await this.db.raw(`SELECT set_config('app.client_ip', ?, false)`, [ipAddress]);
      }
      
      if (userAgent) {
        await this.db.raw(`SELECT set_config('app.user_agent', ?, false)`, [userAgent]);
      }
      
    } catch (error) {
      console.error('Failed to set user context:', error);
      throw error;
    }
  }

  /**
   * Clear user context
   */
  async clearUserContext() {
    if (!this.db) return;
    
    try {
      await this.db.raw(`SELECT set_config('app.current_user_id', NULL, false)`);
      await this.db.raw(`SELECT set_config('app.session_id', NULL, false)`);
      await this.db.raw(`SELECT set_config('app.client_ip', NULL, false)`);
      await this.db.raw(`SELECT set_config('app.user_agent', NULL, false)`);
    } catch (error) {
      console.error('Failed to clear user context:', error);
    }
  }

  /**
   * Execute query with automatic user context
   */
  async executeWithContext(query, params = [], userContext = {}) {
    await this.setUserContext(
      userContext.userId,
      userContext.sessionId,
      userContext.ipAddress,
      userContext.userAgent
    );
    
    try {
      const result = await this.db.raw(query, params);
      return result;
    } finally {
      await this.clearUserContext();
    }
  }

  /**
   * Get database instance
   */
  getDatabase() {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    if (!this.db) return null;
    
    const pool = this.db.client.pool;
    return {
      size: pool.size,
      available: pool.available,
      borrowed: pool.borrowed,
      invalid: pool.invalid,
      pending: pool.pending
    };
  }
}

// Export singleton instance
const databaseConfig = new DatabaseConfig();

module.exports = {
  DatabaseConfig,
  databaseConfig,
  
  // Convenience method for quick initialization
  async initializeDatabase() {
    return await databaseConfig.initialize();
  },
  
  // Get database instance
  getDatabase() {
    return databaseConfig.getDatabase();
  }
};