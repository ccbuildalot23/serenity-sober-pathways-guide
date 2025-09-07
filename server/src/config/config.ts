import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY || '',
  
  // Authentication
  JWT_SECRET: process.env.JWT_SECRET || 'development-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT || '900000', 10), // 15 minutes for PHI
  
  // Security
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // Stripe
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  
  // Email
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@serenity-health.com',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  
  // SMS
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
  
  // Crisis Support
  CRISIS_HOTLINE: process.env.CRISIS_HOTLINE || '988',
  EMERGENCY_CONTACT_LIMIT: parseInt(process.env.EMERGENCY_CONTACT_LIMIT || '5', 10),
  
  // Monitoring
  SENTRY_DSN: process.env.SENTRY_DSN || '',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // HIPAA Compliance
  AUDIT_LOG_ENABLED: process.env.AUDIT_LOG_ENABLED === 'true',
  PHI_ENCRYPTION_KEY: process.env.PHI_ENCRYPTION_KEY || '',
  
  // Pricing Tiers
  PRICING: {
    PROFESSIONAL: {
      MONTHLY_PRICE: 299,
      MAX_PROVIDERS: 1,
      MAX_PATIENTS: 50,
    },
    PRACTICE: {
      MONTHLY_PRICE: 599,
      MAX_PROVIDERS: 20,
      MAX_PATIENTS: 500,
    },
    ENTERPRISE: {
      MONTHLY_PRICE: 1999,
      MAX_PROVIDERS: Infinity,
      MAX_PATIENTS: Infinity,
    },
  },
  
  // Billing Codes
  BILLING_CODES: {
    CCM: {
      '99490': { minutes: 20, rate: 42.84, description: 'Chronic Care Management' },
      '99439': { minutes: 20, rate: 42.84, description: 'Additional CCM' },
    },
    BHI: {
      '99484': { minutes: 20, rate: 47.53, description: 'Behavioral Health Integration' },
      '99492': { minutes: 70, rate: 93.00, description: 'Initial psychiatric collaborative care' },
      '99493': { minutes: 60, rate: 87.00, description: 'Subsequent psychiatric care' },
      '99494': { minutes: 30, rate: 47.00, description: 'Additional psychiatric care' },
    },
  },
};

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'JWT_SECRET',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar] && config.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}