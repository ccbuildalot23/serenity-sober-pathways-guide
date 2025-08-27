import * as Sentry from '@sentry/node';

// Initialize Sentry for security monitoring
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
  ],
  tracesSampleRate: 1.0,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.authorization;
    }
    return event;
  }
});

// Security event types
export enum SecurityEvent {
  UNAUTHORIZED_PHI_ACCESS = 'unauthorized_phi_access',
  SUSPICIOUS_LOGIN = 'suspicious_login',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_TOKEN = 'invalid_token',
  AUDIT_TAMPERING = 'audit_tampering',
  ENCRYPTION_FAILURE = 'encryption_failure'
}

// Alert on security events
export function alertSecurity(
  event: SecurityEvent,
  details: any,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  Sentry.captureMessage(`Security Event: ${event}`, {
    level: severity === 'critical' ? 'error' : 'warning',
    tags: {
      security: true,
      event_type: event,
      severity
    },
    extra: details
  });
  
  // Log to audit trail
  logSecurityAudit(event, details, severity);
  
  // Send immediate notification for critical events
  if (severity === 'critical') {
    sendCriticalAlert(event, details);
  }
}

function logSecurityAudit(event: string, details: any, severity: string) {
  // Implementation for secure audit logging
  console.log(`[SECURITY AUDIT] ${event}: ${JSON.stringify(details)}`);
}

function sendCriticalAlert(event: string, details: any) {
  // Send immediate notification via SMS/Email for critical security events
  console.error(`[CRITICAL SECURITY ALERT] ${event}:`, details);
}
