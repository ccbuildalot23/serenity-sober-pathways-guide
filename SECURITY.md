# Security Documentation

## Overview
This application implements comprehensive security measures to protect user data and ensure HIPAA compliance in healthcare settings.

## Security Features Implemented

### 1. Row-Level Security (RLS)
- All database tables have proper RLS policies
- User-specific data access controls
- Provider-specific administrative controls
- Audit logging for all data access

### 2. User Role Management
- Three-tier role system: patient, support_member, provider
- Role changes require provider-level authorization
- All role modifications are audit logged
- Secure role verification functions

### 3. Input Validation & Sanitization
- XSS prevention on all user inputs
- SQL injection protection
- Rate limiting on forms and API calls
- CSRF token validation

### 4. Security Headers
- Content Security Policy (CSP)
- X-Frame-Options protection
- X-Content-Type-Options
- Referrer Policy controls

### 5. Environment Security
- No sensitive keys exposed on client-side
- HTTPS enforcement in production
- Environment variable validation
- Secure key management

### 6. Audit Logging
- All security events logged
- User action tracking
- Failed authentication attempts
- Suspicious activity detection

### 7. Crisis Support Security
- Rate-limited crisis alerts
- Encrypted message content
- Secure contact verification
- Privacy-preserving statistics

## Edge Function Security

### JWT Authentication
Most edge functions require JWT authentication. Exceptions are documented below:

#### Functions with JWT Disabled
- **recovery-notification-scheduler**: Scheduled job function
  - Rationale: Runs as automated system task
  - Security: Internal validation prevents unauthorized access
  - Monitoring: All executions are audit logged

#### Functions with JWT Required
- **send-crisis-sms**: Crisis messaging function
  - Authentication: Requires valid user JWT
  - Rate limiting: 3 attempts per 5 minutes per user
  - Input validation: All messages sanitized and validated

### Security Monitoring

#### Automated Detection
- Rapid clicking patterns (>20 clicks/second)
- Excessive console usage
- Failed authentication attempts
- Suspicious IP activity

#### Health Checks
- Security status verification every 5 minutes
- Environment validation on startup
- Database connection security
- Session integrity verification

## Security Audit Dashboard

Access the security audit dashboard at `/security-audit` to:
- Monitor overall security score
- Review active security issues
- Check environment configuration
- View edge function security status

## Compliance

### HIPAA Compliance
- Encrypted data at rest and in transit
- Audit trails for all PHI access
- User access controls and role management
- Secure data retention policies

### Security Best Practices
- Principle of least privilege
- Defense in depth
- Regular security assessments
- Incident response procedures

## Reporting Security Issues

If you discover a security vulnerability:
1. Do not disclose publicly
2. Contact the development team immediately
3. Provide detailed reproduction steps
4. Allow time for proper remediation

## Security Updates

This documentation is updated whenever security features are modified. Last updated: 2024-07-30.