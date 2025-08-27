// HIPAA-Compliant Security Configuration
import type { Request, Response, NextFunction } from 'express';

export interface SecurityConfig {
  csp: {
    enabled: boolean;
    reportOnly: boolean;
    directives: Record<string, string[]>;
  };
  hsts: {
    enabled: boolean;
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests: boolean;
  };
  audit: {
    enabled: boolean;
    logLevel: 'info' | 'warn' | 'error';
    retention: number; // days
  };
  encryption: {
    algorithm: string;
    keySize: number;
    saltRounds: number;
  };
}

export const defaultSecurityConfig: SecurityConfig = {
  csp: {
    enabled: true,
    reportOnly: false,
    directives: {
      'default-src': ["'self'"],
      'script-src': ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'", 'data:'],
      'connect-src': ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
      'frame-src': ["'none'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"]
    }
  },
  hsts: {
    enabled: true,
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: true
  },
  audit: {
    enabled: true,
    logLevel: 'info',
    retention: 2555 // 7 years for HIPAA compliance
  },
  encryption: {
    algorithm: 'aes-256-gcm',
    keySize: 256,
    saltRounds: 12
  }
};

export interface SecurityMiddleware {
  (req: Request, res: Response, next: NextFunction): void;
}

export interface AuditEvent {
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export enum SecurityEventType {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  PASSWORD_CHANGE = 'password_change',
  PHI_ACCESS = 'phi_access',
  PHI_EXPORT = 'phi_export',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SECURITY_VIOLATION = 'security_violation'
}

export interface PHIAccessLog {
  timestamp: Date;
  userId: string;
  patientId: string;
  dataType: string;
  action: 'view' | 'edit' | 'export' | 'delete';
  ipAddress: string;
  justification?: string;
}

export const HIPAA_REQUIRED_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=()',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
} as const;