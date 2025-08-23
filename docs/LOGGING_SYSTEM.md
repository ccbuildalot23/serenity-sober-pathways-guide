# Centralized Logging System

## Overview

Serenity Sober Pathways uses a centralized logging system that provides secure, HIPAA-compliant logging with PHI data protection. The system automatically sanitizes sensitive information and provides environment-aware logging controls.

## Features

### 🔒 PHI Data Protection
- Automatic sanitization of emails, phone numbers, SSN, and other sensitive data
- Pattern-based detection of tokens, passwords, and authentication data
- Deep object traversal to sanitize nested data structures
- HIPAA-compliant data handling

### 🌍 Environment-Aware Logging
- Production mode disables console logging by default
- Configurable log levels (debug, info, warn, error, security)
- Performance logging can be enabled/disabled via environment variables
- Security events always logged regardless of environment

### 📊 Structured Logging
- Consistent log entry format with timestamp, level, and context
- Component-based logging for better traceability
- User action tracking for analytics
- API and database operation logging

## Configuration

### Environment Variables

```bash
# Enable/disable console logging (default: true in dev, false in prod)
VITE_ENABLE_CONSOLE_LOGGING=false

# Set minimum log level (debug, info, warn, error, security)
VITE_LOG_LEVEL=error

# Enable performance logging for API calls and DB operations
VITE_ENABLE_PERFORMANCE_LOGGING=true
```

### Production Configuration

In production, the following settings are recommended:

```bash
VITE_ENABLE_CONSOLE_LOGGING=false
VITE_LOG_LEVEL=error
VITE_ENABLE_PERFORMANCE_LOGGING=false
```

## Usage

### Basic Logging

```typescript
import logger from '@/services/loggerService';

// Debug logging (development only)
logger.debug('User data loaded', { userId: user.id, component: 'Dashboard' });

// Info logging
logger.info('Feature activated', { feature: 'crisis-support', userId: user.id });

// Warning logging
logger.warn('Rate limit approaching', { userId: user.id, attempts: 8 });

// Error logging (always logged)
logger.error('Database connection failed', error, { component: 'DatabaseService' });

// Security logging (always logged and monitored)
logger.security('Failed login attempt', { 
  email: 'user@example.com', // Will be sanitized to [EMAIL_REDACTED]
  ip: request.ip,
  component: 'AuthService' 
});
```

### Performance Logging

```typescript
// Measure and log API call performance
const startTime = Date.now();
const response = await api.call();
const duration = Date.now() - startTime;

logger.api('POST', '/api/checkins', response.status, duration, {
  userId: user.id,
  component: 'CheckinService'
});

// Database operation logging
logger.database('INSERT', 'daily_checkins', duration, {
  userId: user.id,
  component: 'CheckinService'
});
```

### User Action Analytics

```typescript
// Track user actions for analytics
logger.userAction('completed_daily_checkin', {
  userId: user.id,
  sessionId: session.id,
  mood: checkin.mood, // Will be preserved as non-PHI
  component: 'CheckinForm'
});
```

## PHI Data Sanitization

The logger automatically sanitizes the following types of sensitive data:

### Automatically Detected Patterns

- **Email addresses**: `user@example.com` → `[EMAIL_REDACTED]`
- **Phone numbers**: `555-123-4567` → `[PHONE_REDACTED]`
- **SSN**: `123-45-6789` → `[SSN_REDACTED]`
- **JWT tokens**: Long strings with dots → `[TOKEN_REDACTED]`
- **Base64 data**: Encoded strings → `[ENCODED_DATA_REDACTED]`

### Field Name-Based Sanitization

Fields with these names (case-insensitive) are automatically redacted:
- `password`, `token`, `secret`, `key`
- `email`, `phone`, `ssn`, `medical_record`
- `diagnosis`, `medication`, `insurance`
- `emergency_contact`, `address`, `dob`

### Example

```typescript
const sensitiveData = {
  user: {
    id: '123',
    email: 'patient@hospital.com',
    phone: '555-0123',
    profile: {
      diagnosis: 'Depression',
      medication: ['Sertraline 50mg'],
      emergencyContact: 'John Doe - 555-9876'
    }
  }
};

logger.debug('User profile loaded', sensitiveData);
// Logs:
// {
//   user: {
//     id: '123',
//     email: '[EMAIL_REDACTED]',
//     phone: '[PHONE_REDACTED]',
//     profile: {
//       diagnosis: '[REDACTED]',
//       medication: '[REDACTED]',
//       emergencyContact: '[REDACTED]'
//     }
//   }
// }
```

## Log Levels

### Debug (`debug`)
- Development debugging information
- Only shown in development mode
- Filtered out in production

### Info (`info`)
- General application flow information
- Feature usage tracking
- Non-critical events

### Warning (`warn`)
- Potential issues that don't break functionality
- Rate limiting notifications
- Configuration warnings

### Error (`error`)
- Application errors and exceptions
- Always logged and sent to monitoring
- Critical for production troubleshooting

### Security (`security`)
- Authentication and authorization events
- HIPAA audit trail requirements
- Always logged regardless of environment

## Production Monitoring

In production, logs are automatically sent to monitoring services for:

- Error tracking and alerting
- Security event monitoring  
- Performance metrics
- Compliance audit trails

The monitoring integration can be configured to work with services like:
- Sentry for error tracking
- LogRocket for user session replay
- DataDog for metrics and monitoring
- Custom HIPAA-compliant logging services

## Migration from Console.log

The logging system has automatically replaced `console.log` statements throughout the codebase. If you need to add new logging:

### ❌ Don't do this:
```typescript
console.log('User signed in:', user.email);
console.error('Database error:', error);
```

### ✅ Do this instead:
```typescript
import logger from '@/services/loggerService';

logger.debug('User signed in', { component: 'AuthService', userId: user.id });
logger.error('Database error', error, { component: 'DatabaseService' });
```

## Testing

The logging system includes comprehensive tests for:
- PHI data sanitization
- Environment configuration
- Production safety
- Log level filtering

Run tests with:
```bash
npm test src/services/loggerService.test.ts
```

## Compliance

This logging system is designed to meet:

- **HIPAA Requirements**: PHI data is automatically sanitized
- **SOC 2 Type II**: Audit trails and security logging
- **GDPR**: Personal data protection and right to erasure
- **FDA 21 CFR Part 11**: Electronic record requirements for healthcare

## Troubleshooting

### Logs not appearing in development
1. Check `VITE_ENABLE_CONSOLE_LOGGING=true` in `.env`
2. Verify log level allows your message type
3. Ensure you're importing the logger correctly

### Production logging issues
1. Verify environment variables are set correctly
2. Check monitoring service integration
3. Ensure error logs are reaching external services

### PHI data still appearing in logs
1. Check if the field name matches sanitization patterns
2. Add custom field names to the PHI_FIELDS set
3. Report any missed patterns for system improvement

## Support

For questions about the logging system:
1. Check this documentation
2. Review the test files for usage examples
3. Contact the development team for HIPAA compliance questions