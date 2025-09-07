/**
 * Configuration Management
 * HIPAA-compliant environment variable handling
 */

const joi = require('joi');
const crypto = require('crypto');

// Helper function to generate secure keys for development
const generateSecureKey = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

// Helper function to get or generate environment variable
const getOrGenerate = (envVar, generator, warningMessage) => {
  if (process.env[envVar]) {
    return process.env[envVar];
  }
  
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${envVar} is required in production`);
  }
  
  const generated = generator();
  console.warn(`⚠️  ${warningMessage}`);
  return generated;
};

// Configuration schema validation
const schema = joi.object({
    NODE_ENV: joi.string().valid('development', 'production', 'test').default('development'),
    PORT: joi.number().port().default(3002),
    
    // Database configuration
    DATABASE_URL: joi.string().uri().required(),
    DATABASE_POOL_MIN: joi.number().min(0).default(2),
    DATABASE_POOL_MAX: joi.number().min(1).default(20),
    DATABASE_TIMEOUT: joi.number().default(30000),
    
    // Redis configuration
    REDIS_URL: joi.string().uri().default('redis://localhost:6379'),
    REDIS_PASSWORD: joi.string().allow(''),
    REDIS_DB: joi.number().min(0).max(15).default(0),
    REDIS_RETRY_DELAY: joi.number().default(1000),
    
    // JWT configuration
    JWT_SECRET: joi.string().min(32).required(),
    JWT_EXPIRES_IN: joi.string().default('15m'), // Short expiry for PHI access
    JWT_REFRESH_EXPIRES_IN: joi.string().default('7d'),
    
    // Encryption keys - require in production, generate secure defaults in development
    ENCRYPTION_KEY: joi.string().length(64).when('NODE_ENV', {
      is: 'production',
      then: joi.required(),
      otherwise: joi.optional()
    }),
    ENCRYPTION_IV_LENGTH: joi.number().default(16),
    
    // Emergency services configuration
    EMERGENCY_OVERRIDE_KEY: joi.string().min(32).when('NODE_ENV', {
      is: 'production',
      then: joi.required(),
      otherwise: joi.optional()
    }),
    EMERGENCY_SERVICE_API_KEY: joi.string().when('NODE_ENV', {
      is: 'production',
      then: joi.required(),
      otherwise: joi.optional()
    }),
    TWILIO_ACCOUNT_SID: joi.string().when('NODE_ENV', {
      is: 'production',
      then: joi.required(),
      otherwise: joi.optional()
    }),
    TWILIO_AUTH_TOKEN: joi.string().when('NODE_ENV', {
      is: 'production',
      then: joi.required(),
      otherwise: joi.optional()
    }),
    TWILIO_PHONE_NUMBER: joi.string().when('NODE_ENV', {
      is: 'production',
      then: joi.required(),
      otherwise: joi.optional()
    }),
    
    // Location services
    GOOGLE_MAPS_API_KEY: joi.string().when('NODE_ENV', {
      is: 'production',
      then: joi.required(),
      otherwise: joi.optional()
    }),
    GEOFENCE_RADIUS_METERS: joi.number().default(500),
    
    // Machine Learning
    ML_MODEL_PATH: joi.string().default('./models/crisis-prediction'),
    ML_BATCH_SIZE: joi.number().default(32),
    ML_CONFIDENCE_THRESHOLD: joi.number().min(0).max(1).default(0.8),
    
    // WebSocket
    WEBSOCKET_HEARTBEAT_INTERVAL: joi.number().default(25000),
    WEBSOCKET_TIMEOUT: joi.number().default(60000),
    
    // Security
    ALLOWED_ORIGINS: joi.string().default('http://localhost:3000'),
    RATE_LIMIT_WINDOW_MS: joi.number().default(900000), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: joi.number().default(1000),
    
    // Logging
    LOG_LEVEL: joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    LOG_MAX_FILES: joi.number().default(5),
    LOG_MAX_SIZE: joi.string().default('20m'),
    
    // Performance monitoring
    RESPONSE_TIME_THRESHOLD_MS: joi.number().default(500),
    CRISIS_RESPONSE_MAX_TIME_MS: joi.number().default(500),
    
    // Notifications
    NOTIFICATION_SERVICE_URL: joi.string().uri().default('http://localhost:8000'),
    NOTIFICATION_SERVICE_API_KEY: joi.string().when('NODE_ENV', {
      is: 'production',
      then: joi.required(),
      otherwise: joi.optional()
    }),
    
    // Audio processing
    VOICE_ANALYSIS_API_KEY: joi.string().when('NODE_ENV', {
      is: 'production',
      then: joi.required(),
      otherwise: joi.optional()
    }),
    VOICE_ANALYSIS_ENDPOINT: joi.string().uri().default('http://localhost:9000/analyze'),
    
    // Biometric monitoring
    BIOMETRIC_THRESHOLD_HEART_RATE_HIGH: joi.number().default(120),
    BIOMETRIC_THRESHOLD_HEART_RATE_LOW: joi.number().default(50),
    BIOMETRIC_SLEEP_HOURS_MIN: joi.number().default(4),
    
    // Crisis escalation timing
    ESCALATION_TIER1_DELAY_MS: joi.number().default(30000), // 30 seconds
    ESCALATION_TIER2_DELAY_MS: joi.number().default(180000), // 3 minutes
    ESCALATION_PROFESSIONAL_DELAY_MS: joi.number().default(300000), // 5 minutes
    
    // Safety check-ins
    SAFETY_CHECKIN_INTERVAL_HOURS: joi.number().default(24),
    SAFETY_CHECKIN_REMINDER_HOURS: joi.number().default(2),
    
    // Data retention (HIPAA compliance)
    DATA_RETENTION_DAYS: joi.number().default(2555), // 7 years
    AUDIT_LOG_RETENTION_DAYS: joi.number().default(2555),
    SESSION_TIMEOUT_MINUTES: joi.number().default(15)
}).unknown();

// Pre-populate missing environment variables with secure defaults
const processEnvWithDefaults = {
  ...process.env,
  ENCRYPTION_KEY: getOrGenerate('ENCRYPTION_KEY', 
    () => generateSecureKey(32), 
    'Generated temporary encryption key for development. Set ENCRYPTION_KEY in production.'),
  EMERGENCY_OVERRIDE_KEY: getOrGenerate('EMERGENCY_OVERRIDE_KEY', 
    () => generateSecureKey(32), 
    'Generated temporary emergency override key for development. Set EMERGENCY_OVERRIDE_KEY in production.'),
  EMERGENCY_SERVICE_API_KEY: getOrGenerate('EMERGENCY_SERVICE_API_KEY', 
    () => `dev_${generateSecureKey(16)}`, 
    'Generated temporary emergency service API key for development. Set EMERGENCY_SERVICE_API_KEY in production.'),
  TWILIO_ACCOUNT_SID: getOrGenerate('TWILIO_ACCOUNT_SID', 
    () => `AC${generateSecureKey(16)}`, 
    'Using development Twilio Account SID. Set TWILIO_ACCOUNT_SID in production.'),
  TWILIO_AUTH_TOKEN: getOrGenerate('TWILIO_AUTH_TOKEN', 
    () => generateSecureKey(32), 
    'Generated temporary Twilio auth token for development. Set TWILIO_AUTH_TOKEN in production.'),
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '+15551234567',
  GOOGLE_MAPS_API_KEY: getOrGenerate('GOOGLE_MAPS_API_KEY', 
    () => `dev_maps_${generateSecureKey(16)}`, 
    'Generated temporary Google Maps API key for development. Set GOOGLE_MAPS_API_KEY in production.'),
  NOTIFICATION_SERVICE_API_KEY: getOrGenerate('NOTIFICATION_SERVICE_API_KEY', 
    () => `dev_notif_${generateSecureKey(16)}`, 
    'Generated temporary notification service API key for development. Set NOTIFICATION_SERVICE_API_KEY in production.'),
  VOICE_ANALYSIS_API_KEY: getOrGenerate('VOICE_ANALYSIS_API_KEY', 
    () => `dev_voice_${generateSecureKey(16)}`, 
    'Generated temporary voice analysis API key for development. Set VOICE_ANALYSIS_API_KEY in production.')
};

const { error, value: envVars } = schema.validate(processEnvWithDefaults);

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

const config = {
    environment: envVars.NODE_ENV,
    port: envVars.PORT,
    
    database: {
        url: envVars.DATABASE_URL,
        pool: {
            min: envVars.DATABASE_POOL_MIN,
            max: envVars.DATABASE_POOL_MAX
        },
        timeout: envVars.DATABASE_TIMEOUT
    },
    
    redis: {
        url: envVars.REDIS_URL,
        password: envVars.REDIS_PASSWORD,
        db: envVars.REDIS_DB,
        retryDelayOnFailover: envVars.REDIS_RETRY_DELAY,
        maxRetriesPerRequest: 3,
        lazyConnect: true
    },
    
    jwt: {
        secret: envVars.JWT_SECRET,
        expiresIn: envVars.JWT_EXPIRES_IN,
        refreshExpiresIn: envVars.JWT_REFRESH_EXPIRES_IN,
        issuer: 'serenity-crisis-service',
        audience: 'serenity-users'
    },
    
    encryption: {
        key: envVars.ENCRYPTION_KEY,
        ivLength: envVars.ENCRYPTION_IV_LENGTH,
        algorithm: 'aes-256-gcm'
    },
    
    emergency: {
        overrideKey: envVars.EMERGENCY_OVERRIDE_KEY,
        apiKey: envVars.EMERGENCY_SERVICE_API_KEY,
        twilio: {
            accountSid: envVars.TWILIO_ACCOUNT_SID,
            authToken: envVars.TWILIO_AUTH_TOKEN,
            phoneNumber: envVars.TWILIO_PHONE_NUMBER
        },
        escalation: {
            tier1Delay: envVars.ESCALATION_TIER1_DELAY_MS,
            tier2Delay: envVars.ESCALATION_TIER2_DELAY_MS,
            professionalDelay: envVars.ESCALATION_PROFESSIONAL_DELAY_MS
        }
    },
    
    location: {
        googleMapsApiKey: envVars.GOOGLE_MAPS_API_KEY,
        geofenceRadius: envVars.GEOFENCE_RADIUS_METERS
    },
    
    ml: {
        modelPath: envVars.ML_MODEL_PATH,
        batchSize: envVars.ML_BATCH_SIZE,
        confidenceThreshold: envVars.ML_CONFIDENCE_THRESHOLD
    },
    
    websocket: {
        heartbeatInterval: envVars.WEBSOCKET_HEARTBEAT_INTERVAL,
        timeout: envVars.WEBSOCKET_TIMEOUT
    },
    
    security: {
        allowedOrigins: envVars.ALLOWED_ORIGINS.split(','),
        rateLimitWindowMs: envVars.RATE_LIMIT_WINDOW_MS,
        rateLimitMaxRequests: envVars.RATE_LIMIT_MAX_REQUESTS
    },
    
    logging: {
        level: envVars.LOG_LEVEL,
        maxFiles: envVars.LOG_MAX_FILES,
        maxSize: envVars.LOG_MAX_SIZE
    },
    
    performance: {
        responseTimeThreshold: envVars.RESPONSE_TIME_THRESHOLD_MS,
        crisisResponseMaxTime: envVars.CRISIS_RESPONSE_MAX_TIME_MS
    },
    
    notifications: {
        serviceUrl: envVars.NOTIFICATION_SERVICE_URL,
        apiKey: envVars.NOTIFICATION_SERVICE_API_KEY
    },
    
    voice: {
        apiKey: envVars.VOICE_ANALYSIS_API_KEY,
        endpoint: envVars.VOICE_ANALYSIS_ENDPOINT
    },
    
    biometric: {
        heartRate: {
            high: envVars.BIOMETRIC_THRESHOLD_HEART_RATE_HIGH,
            low: envVars.BIOMETRIC_THRESHOLD_HEART_RATE_LOW
        },
        sleepHoursMin: envVars.BIOMETRIC_SLEEP_HOURS_MIN
    },
    
    safety: {
        checkinIntervalHours: envVars.SAFETY_CHECKIN_INTERVAL_HOURS,
        reminderHours: envVars.SAFETY_CHECKIN_REMINDER_HOURS
    },
    
    dataRetention: {
        days: envVars.DATA_RETENTION_DAYS,
        auditLogDays: envVars.AUDIT_LOG_RETENTION_DAYS,
        sessionTimeoutMinutes: envVars.SESSION_TIMEOUT_MINUTES
    }
};

// Validate required environment variables in production
if (config.environment === 'production') {
    const requiredVars = [
        'DATABASE_URL',
        'JWT_SECRET',
        'ENCRYPTION_KEY',
        'EMERGENCY_OVERRIDE_KEY',
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'GOOGLE_MAPS_API_KEY',
        'VOICE_ANALYSIS_API_KEY',
        'NOTIFICATION_SERVICE_API_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables in production: ${missingVars.join(', ')}`);
    }
}

module.exports = config;