import dotenv from 'dotenv';
import { SecurityConfig } from '@/types';

// Load environment variables
dotenv.config();

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value || defaultValue!;
}

function getEnvVarAsNumber(name: string, defaultValue?: number): number {
  const value = process.env[name];
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required`);
  }
  const numValue = value ? parseInt(value, 10) : defaultValue!;
  if (isNaN(numValue)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }
  return numValue;
}

function getEnvVarAsBoolean(name: string, defaultValue: boolean = false): boolean {
  const value = process.env[name];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

export const config = {
  // Server Configuration
  port: getEnvVarAsNumber('PORT', 3001),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  apiVersion: getEnvVar('API_VERSION', 'v1'),
  serviceName: getEnvVar('SERVICE_NAME', 'security-service'),
  serviceVersion: getEnvVar('SERVICE_VERSION', '1.0.0'),

  // Database Configuration
  database: {
    url: getEnvVar('DATABASE_URL', ''),
    host: getEnvVar('DATABASE_HOST', 'localhost'),
    port: getEnvVarAsNumber('DATABASE_PORT', 5432),
    name: getEnvVar('DATABASE_NAME', 'serenity_security'),
    user: getEnvVar('DATABASE_USER', 'security_user'),
    password: getEnvVar('DATABASE_PASSWORD', ''),
  },

  // Security Configuration
  security: {
    jwtSecret: getEnvVar('JWT_SECRET'),
    apiKeySecret: getEnvVar('API_KEY_SECRET'),
    encryptionKey: getEnvVar('ENCRYPTION_KEY'),
    saltRounds: getEnvVarAsNumber('SALT_ROUNDS', 12),
  },

  // Rate Limiting Configuration
  rateLimiting: {
    windowMs: getEnvVarAsNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    maxRequests: getEnvVarAsNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  },

  // Logging Configuration
  logging: {
    level: getEnvVar('LOG_LEVEL', 'info'),
    format: getEnvVar('LOG_FORMAT', 'json'),
  },

  // HIPAA Compliance Configuration
  hipaa: {
    auditRetentionDays: getEnvVarAsNumber('AUDIT_RETENTION_DAYS', 2555), // 7 years
    enableAuditEncryption: getEnvVarAsBoolean('ENABLE_AUDIT_ENCRYPTION', true),
    auditLogLevel: getEnvVar('AUDIT_LOG_LEVEL', 'info'),
  },

  // Health Check Configuration
  healthCheck: {
    interval: getEnvVarAsNumber('HEALTH_CHECK_INTERVAL', 30000), // 30 seconds
  },

  // External Services
  externalServices: {
    notificationService: getEnvVar('NOTIFICATION_SERVICE_URL', 'http://localhost:3003'),
    identityService: getEnvVar('IDENTITY_SERVICE_URL', 'http://localhost:3002'),
  },

  // Performance Configuration
  performance: {
    requestTimeout: getEnvVarAsNumber('REQUEST_TIMEOUT', 30000), // 30 seconds
    maxRequestSize: getEnvVar('MAX_REQUEST_SIZE', '10mb'),
  },
} as const;

// Security configuration object that matches our types
export const securityConfig: SecurityConfig = {
  encryption: {
    algorithm: 'aes-256-gcm',
    key_length: 32,
    iv_length: 16,
  },
  rate_limiting: {
    window_ms: config.rateLimiting.windowMs,
    max_requests: config.rateLimiting.maxRequests,
  },
  authentication: {
    jwt_expiry: '1h',
    api_key_length: 32,
  },
  audit: {
    retention_days: config.hipaa.auditRetentionDays,
    encryption_enabled: config.hipaa.enableAuditEncryption,
    log_level: config.hipaa.auditLogLevel,
  },
};

// Validation function to ensure all required config is present
export function validateConfig(): void {
  const requiredVars = [
    'JWT_SECRET',
    'API_KEY_SECRET',
    'ENCRYPTION_KEY',
    'DATABASE_PASSWORD',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  // Validate encryption key length
  if (config.security.encryptionKey.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
  }

  // Validate JWT secret strength
  if (config.security.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  // Validate API key secret strength
  if (config.security.apiKeySecret.length < 32) {
    throw new Error('API_KEY_SECRET must be at least 32 characters long');
  }
}

// CORS configuration
export const corsOptions = {
  origin: config.nodeEnv === 'production' 
    ? ['https://serenity-platform.com', 'https://api.serenity-platform.com']
    : ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
  ],
};

// Helmet security headers configuration
export const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
};

export default config;