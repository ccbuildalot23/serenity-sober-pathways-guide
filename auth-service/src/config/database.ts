import { Pool, PoolClient, PoolConfig } from 'pg';
import { logger } from './logger';

interface DatabaseConfig extends PoolConfig {
  connectionString?: string;
  ssl?: boolean | object;
  max?: number;
  min?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

class DatabaseManager {
  private pool: Pool;
  private isConnected = false;

  constructor() {
    const config: DatabaseConfig = {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false,
      max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
      min: parseInt(process.env.DATABASE_POOL_MIN || '2'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    this.pool = new Pool(config);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.pool.on('connect', (client: PoolClient) => {
      logger.info('New client connected to database', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount,
        waitingCount: this.pool.waitingCount
      });
    });

    this.pool.on('error', (err: Error, client: PoolClient) => {
      logger.error('Unexpected error on idle client', {
        error: err.message,
        stack: err.stack
      });
    });

    this.pool.on('remove', (client: PoolClient) => {
      logger.info('Client removed from pool', {
        totalCount: this.pool.totalCount,
        idleCount: this.pool.idleCount
      });
    });
  }

  async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isConnected = true;
      logger.info('Database connected successfully');
    } catch (error) {
      this.isConnected = false;
      logger.error('Failed to connect to database', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Database query executed', {
        query: text.substring(0, 100),
        duration,
        rowCount: result.rowCount
      });
      
      return result.rows;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Database query failed', {
        query: text.substring(0, 100),
        params: params?.length,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<{ status: string; responseTime: number }> {
    const start = Date.now();
    try {
      await this.query('SELECT 1');
      const responseTime = Date.now() - start;
      return { status: 'healthy', responseTime };
    } catch (error) {
      const responseTime = Date.now() - start;
      return { status: 'unhealthy', responseTime };
    }
  }

  getStatus(): {
    isConnected: boolean;
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    return {
      isConnected: this.isConnected,
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  async close(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database connection pool', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
}

// Export singleton instance
export const database = new DatabaseManager();

// Database schema setup
export const initializeDatabase = async (): Promise<void> => {
  logger.info('Initializing database schema...');
  
  const schemas = [
    // Users table
    `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone_number VARCHAR(20),
      is_email_verified BOOLEAN DEFAULT false,
      is_phone_verified BOOLEAN DEFAULT false,
      mfa_enabled BOOLEAN DEFAULT false,
      mfa_secret VARCHAR(255),
      password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      last_login_at TIMESTAMP WITH TIME ZONE,
      failed_login_attempts INTEGER DEFAULT 0,
      account_locked_until TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT true,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,
    
    // Roles table
    `
    CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(50) UNIQUE NOT NULL,
      description TEXT,
      permissions JSONB DEFAULT '[]',
      is_system BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,
    
    // User roles table
    `
    CREATE TABLE IF NOT EXISTS user_roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
      granted_by UUID REFERENCES users(id),
      granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE,
      is_active BOOLEAN DEFAULT true,
      UNIQUE(user_id, role_id)
    );
    `,
    
    // Sessions table
    `
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      device_id VARCHAR(255),
      device_info JSONB,
      ip_address INET NOT NULL,
      user_agent TEXT,
      issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      revoked_at TIMESTAMP WITH TIME ZONE,
      revoked_by UUID REFERENCES users(id),
      revoked_reason VARCHAR(255),
      metadata JSONB DEFAULT '{}'
    );
    `,
    
    // Refresh tokens table
    `
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      revoked_at TIMESTAMP WITH TIME ZONE,
      revoked_by UUID REFERENCES users(id),
      family VARCHAR(255) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,
    
    // Password reset tokens table
    `
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE,
      ip_address INET NOT NULL,
      user_agent TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,
    
    // Email verification tokens table
    `
    CREATE TABLE IF NOT EXISTS email_verification_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      token_hash VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      verified_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,
    
    // MFA backup codes table
    `
    CREATE TABLE IF NOT EXISTS mfa_backup_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      code_hash VARCHAR(255) NOT NULL,
      used_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `,
    
    // OAuth providers table
    `
    CREATE TABLE IF NOT EXISTS oauth_providers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(50) NOT NULL,
      provider_id VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      display_name VARCHAR(255),
      avatar VARCHAR(500),
      access_token TEXT,
      refresh_token TEXT,
      expires_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(provider, provider_id)
    );
    `,
    
    // Audit logs table
    `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
      action VARCHAR(100) NOT NULL,
      resource VARCHAR(100) NOT NULL,
      resource_id VARCHAR(255),
      details JSONB DEFAULT '{}',
      ip_address INET NOT NULL,
      user_agent TEXT,
      success BOOLEAN NOT NULL,
      error_message TEXT,
      risk_score INTEGER,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    `
  ];

  // Create indexes
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);',
    'CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);',
    'CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);',
    'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_refresh_tokens_family ON refresh_tokens(family);',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);',
    'CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);',
    'CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);'
  ];

  try {
    // Execute schema creation
    for (const schema of schemas) {
      await database.query(schema);
    }
    
    // Create indexes
    for (const index of indexes) {
      await database.query(index);
    }
    
    // Insert default roles
    await insertDefaultRoles();
    
    logger.info('Database schema initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database schema', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
};

const insertDefaultRoles = async (): Promise<void> => {
  const defaultRoles = [
    {
      name: 'admin',
      description: 'System administrator with full access',
      permissions: ['*:*'],
      isSystem: true
    },
    {
      name: 'provider',
      description: 'Healthcare provider with patient management access',
      permissions: [
        'patients:read',
        'patients:update',
        'assessments:create',
        'assessments:read',
        'assessments:update',
        'notes:create',
        'notes:read',
        'notes:update'
      ],
      isSystem: true
    },
    {
      name: 'patient',
      description: 'Patient with access to own data',
      permissions: [
        'profile:read',
        'profile:update',
        'checkins:create',
        'checkins:read',
        'support:read',
        'crisis:create'
      ],
      isSystem: true
    },
    {
      name: 'supporter',
      description: 'Support network member with limited access',
      permissions: [
        'support:read',
        'crisis:receive',
        'messages:read',
        'messages:create'
      ],
      isSystem: true
    }
  ];

  for (const role of defaultRoles) {
    await database.query(
      `
      INSERT INTO roles (name, description, permissions, is_system)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (name) DO NOTHING
      `,
      [role.name, role.description, JSON.stringify(role.permissions), role.isSystem]
    );
  }
};