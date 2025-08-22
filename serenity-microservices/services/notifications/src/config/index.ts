import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

const configSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3003),
  HOST: Joi.string().default('0.0.0.0'),

  // Database
  DATABASE_URL: Joi.string().required(),
  DB_HOST: Joi.string().default('localhost'),
  DB_PORT: Joi.number().default(5432),
  DB_NAME: Joi.string().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_SSL: Joi.boolean().default(false),

  // Redis
  REDIS_URL: Joi.string().default('redis://localhost:6379'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().default(0),

  // RabbitMQ
  RABBITMQ_URL: Joi.string().default('amqp://localhost:5672'),
  RABBITMQ_HOST: Joi.string().default('localhost'),
  RABBITMQ_PORT: Joi.number().default(5672),
  RABBITMQ_USER: Joi.string().default('guest'),
  RABBITMQ_PASSWORD: Joi.string().default('guest'),
  RABBITMQ_VHOST: Joi.string().default('/'),

  // JWT
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('24h'),

  // Email
  SENDGRID_API_KEY: Joi.string().optional(),
  EMAIL_FROM: Joi.string().email().required(),
  EMAIL_FROM_NAME: Joi.string().default('Serenity Platform'),
  
  // SMTP (alternative to SendGrid)
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASSWORD: Joi.string().optional(),

  // SMS
  TWILIO_ACCOUNT_SID: Joi.string().required(),
  TWILIO_AUTH_TOKEN: Joi.string().required(),
  TWILIO_PHONE_NUMBER: Joi.string().required(),

  // Push Notifications
  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().required(),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: Joi.number().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),

  // Encryption
  ENCRYPTION_KEY: Joi.string().length(32).required(),
  HIPAA_ENCRYPTION_KEY: Joi.string().length(32).required(),

  // Monitoring
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),
  ENABLE_REQUEST_LOGGING: Joi.boolean().default(true),

  // Health Check
  HEALTH_CHECK_INTERVAL: Joi.number().default(30000),

  // Retry Configuration
  MAX_RETRY_ATTEMPTS: Joi.number().default(3),
  RETRY_DELAY_MS: Joi.number().default(1000),

  // HIPAA Compliance
  HIPAA_AUDIT_ENABLED: Joi.boolean().default(true),
  DATA_RETENTION_DAYS: Joi.number().default(2555), // 7 years
  ENCRYPTION_AT_REST: Joi.boolean().default(true)
});

const { error, value: validatedConfig } = configSchema.validate(process.env, {
  allowUnknown: true,
  stripUnknown: true
});

if (error) {
  throw new Error(`Configuration validation error: ${error.message}`);
}

export const config = {
  env: validatedConfig.NODE_ENV,
  port: validatedConfig.PORT,
  host: validatedConfig.HOST,
  
  database: {
    url: validatedConfig.DATABASE_URL,
    host: validatedConfig.DB_HOST,
    port: validatedConfig.DB_PORT,
    name: validatedConfig.DB_NAME,
    user: validatedConfig.DB_USER,
    password: validatedConfig.DB_PASSWORD,
    ssl: validatedConfig.DB_SSL
  },

  redis: {
    url: validatedConfig.REDIS_URL,
    host: validatedConfig.REDIS_HOST,
    port: validatedConfig.REDIS_PORT,
    password: validatedConfig.REDIS_PASSWORD,
    db: validatedConfig.REDIS_DB
  },

  rabbitmq: {
    url: validatedConfig.RABBITMQ_URL,
    host: validatedConfig.RABBITMQ_HOST,
    port: validatedConfig.RABBITMQ_PORT,
    user: validatedConfig.RABBITMQ_USER,
    password: validatedConfig.RABBITMQ_PASSWORD,
    vhost: validatedConfig.RABBITMQ_VHOST
  },

  jwt: {
    secret: validatedConfig.JWT_SECRET,
    expiresIn: validatedConfig.JWT_EXPIRES_IN
  },

  email: {
    sendgrid: {
      apiKey: validatedConfig.SENDGRID_API_KEY
    },
    smtp: {
      host: validatedConfig.SMTP_HOST,
      port: validatedConfig.SMTP_PORT,
      secure: validatedConfig.SMTP_SECURE,
      user: validatedConfig.SMTP_USER,
      password: validatedConfig.SMTP_PASSWORD
    },
    from: validatedConfig.EMAIL_FROM,
    fromName: validatedConfig.EMAIL_FROM_NAME
  },

  sms: {
    twilio: {
      accountSid: validatedConfig.TWILIO_ACCOUNT_SID,
      authToken: validatedConfig.TWILIO_AUTH_TOKEN,
      phoneNumber: validatedConfig.TWILIO_PHONE_NUMBER
    }
  },

  push: {
    firebase: {
      projectId: validatedConfig.FIREBASE_PROJECT_ID,
      privateKey: validatedConfig.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      clientEmail: validatedConfig.FIREBASE_CLIENT_EMAIL
    }
  },

  rateLimit: {
    windowMs: validatedConfig.RATE_LIMIT_WINDOW_MS,
    maxRequests: validatedConfig.RATE_LIMIT_MAX_REQUESTS
  },

  encryption: {
    key: validatedConfig.ENCRYPTION_KEY,
    hipaaKey: validatedConfig.HIPAA_ENCRYPTION_KEY
  },

  monitoring: {
    logLevel: validatedConfig.LOG_LEVEL,
    enableRequestLogging: validatedConfig.ENABLE_REQUEST_LOGGING
  },

  healthCheck: {
    interval: validatedConfig.HEALTH_CHECK_INTERVAL
  },

  retry: {
    maxAttempts: validatedConfig.MAX_RETRY_ATTEMPTS,
    delayMs: validatedConfig.RETRY_DELAY_MS
  },

  hipaa: {
    auditEnabled: validatedConfig.HIPAA_AUDIT_ENABLED,
    dataRetentionDays: validatedConfig.DATA_RETENTION_DAYS,
    encryptionAtRest: validatedConfig.ENCRYPTION_AT_REST
  }
};

export default config;