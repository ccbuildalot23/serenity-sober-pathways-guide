/**
 * Comprehensive Security Configuration
 * Centralized security settings for HIPAA compliance and defense-in-depth
 */

export const SECURITY_CONFIG = {
  // Content Security Policy Configuration
  CSP_DIRECTIVES: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for React dev tools and hot reload
      "'unsafe-eval'", // Required for Vite dev server
      'https://va.vercel-scripts.com',
      'https://vercel.live'
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for styled-components and CSS-in-JS
      'https://fonts.googleapis.com'
    ],
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com'
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:'
    ],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://api.ipify.org', // For IP geolocation
      'https://vercel.live'
    ],
    'media-src': ["'self'", 'data:', 'blob:'],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': []
  },

  // Security Headers
  SECURITY_HEADERS: {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'same-site'
  },

  // Session Security
  SESSION_CONFIG: {
    TIMEOUT_MINUTES: 30,
    WARNING_MINUTES: 5,
    AUTO_REFRESH_THRESHOLD_MINUTES: 5,
    MAX_CONCURRENT_SESSIONS: 3,
    IDLE_TIMEOUT_MINUTES: 15
  },

  // Encryption Configuration
  ENCRYPTION_CONFIG: {
    ALGORITHM: 'aes-256-gcm',
    KEY_LENGTH: 32,
    IV_LENGTH: 16,
    SALT_LENGTH: 32,
    TAG_LENGTH: 16,
    PBKDF2_ITERATIONS: 100000,
    HASH_ALGORITHM: 'sha256'
  },

  // Rate Limiting
  RATE_LIMITING: {
    LOGIN_ATTEMPTS: {
      MAX_ATTEMPTS: 5,
      WINDOW_MINUTES: 15,
      LOCKOUT_MINUTES: 30
    },
    API_REQUESTS: {
      MAX_REQUESTS: 1000,
      WINDOW_MINUTES: 15
    },
    PASSWORD_RESET: {
      MAX_ATTEMPTS: 3,
      WINDOW_MINUTES: 60
    }
  },

  // Password Policy
  PASSWORD_POLICY: {
    MIN_LENGTH: 12,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
    MAX_CONSECUTIVE_CHARS: 3,
    HISTORY_COUNT: 12, // Remember last 12 passwords
    MAX_AGE_DAYS: 90
  },

  // Audit Logging
  AUDIT_CONFIG: {
    RETENTION_DAYS: 90,
    ENCRYPT_LOGS: true,
    LOG_LEVELS: ['security', 'error', 'warn'],
    SENSITIVE_FIELDS: ['password', 'ssn', 'credit_card', 'token'],
    MAX_LOG_SIZE_MB: 100
  },

  // HIPAA Specific
  HIPAA_CONFIG: {
    PHI_ENCRYPTION_REQUIRED: true,
    AUDIT_TRAIL_REQUIRED: true,
    ACCESS_CONTROL_REQUIRED: true,
    DATA_INTEGRITY_REQUIRED: true,
    TRANSMISSION_SECURITY_REQUIRED: true,
    MINIMUM_TLS_VERSION: '1.2',
    ENCRYPTION_AT_REST: true,
    AUTOMATIC_LOGOFF_MINUTES: 30
  },

  // Content Validation
  INPUT_VALIDATION: {
    MAX_INPUT_LENGTH: 10000,
    ALLOWED_FILE_TYPES: ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx'],
    MAX_FILE_SIZE_MB: 10,
    SANITIZE_HTML: true,
    VALIDATE_EMAIL: true,
    VALIDATE_PHONE: true
  },

  // Development/Testing Overrides
  DEV_OVERRIDES: {
    ALLOW_HTTP: process.env.NODE_ENV === 'development',
    DISABLE_CSP: false, // Never disable CSP even in dev
    VERBOSE_LOGGING: process.env.NODE_ENV === 'development',
    MOCK_ENCRYPTION: false // Use real encryption even in dev
  },

  // Emergency/Crisis Features
  CRISIS_SECURITY: {
    EMERGENCY_BYPASS_ENABLED: true,
    EMERGENCY_CONTACTS_ENCRYPTION: true,
    CRISIS_DATA_RETENTION_DAYS: 365,
    EMERGENCY_ACCESS_AUDIT: true
  },

  // Feature Flags
  SECURITY_FEATURES: {
    BIOMETRIC_AUTH: true,
    TWO_FACTOR_AUTH: true,
    DEVICE_FINGERPRINTING: true,
    ANOMALY_DETECTION: true,
    GEOGRAPHIC_RESTRICTIONS: false,
    IP_WHITELISTING: false
  }
} as const;

// Helper functions
export const getCSPString = (): string => {
  return Object.entries(SECURITY_CONFIG.CSP_DIRECTIVES)
    .map(([directive, sources]) => {
      if (sources.length === 0) return directive;
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
};

export const isSecureContext = (): boolean => {
  if (typeof window === 'undefined') return true;
  
  // Allow localhost for development
  if (window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1') {
    return true;
  }
  
  // Require HTTPS in production
  return window.location.protocol === 'https:';
};

export const validateSecurityHeaders = (headers: Record<string, string>): string[] => {
  const issues: string[] = [];
  const requiredHeaders = Object.keys(SECURITY_CONFIG.SECURITY_HEADERS);
  
  for (const header of requiredHeaders) {
    if (!headers[header]) {
      issues.push(`Missing security header: ${header}`);
    }
  }
  
  return issues;
};

export const getSecurityScore = (
  vulnerabilities: number = 0,
  securityHeaders: number = 0,
  encryptionEnabled: boolean = true,
  auditingEnabled: boolean = true,
  accessControlEnabled: boolean = true
): number => {
  let score = 100;
  
  // Deduct points for vulnerabilities
  score -= Math.min(vulnerabilities * 5, 50);
  
  // Deduct points for missing security headers
  const totalHeaders = Object.keys(SECURITY_CONFIG.SECURITY_HEADERS).length;
  const headerScore = (securityHeaders / totalHeaders) * 20;
  score -= (20 - headerScore);
  
  // Deduct points for missing critical features
  if (!encryptionEnabled) score -= 20;
  if (!auditingEnabled) score -= 15;
  if (!accessControlEnabled) score -= 15;
  
  return Math.max(0, Math.round(score));
};

export default SECURITY_CONFIG;