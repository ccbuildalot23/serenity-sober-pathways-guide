import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/react';

/**
 * Sentry Error Monitoring Service
 * Provides production error tracking and performance monitoring
 */

export const initSentry = () => {
  // Only initialize in production or staging
  if (import.meta.env.VITE_APP_ENV !== 'development') {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      environment: import.meta.env.VITE_APP_ENV || 'production',
      integrations: [
        new BrowserTracing({
          // Set sampling rate for performance monitoring
          tracingOrigins: ['localhost', 'serenity-sober-pathways-guide.vercel.app', /^\//],
          // Capture interactions for React Router
          routingInstrumentation: Sentry.reactRouterV6Instrumentation(
            window.history,
            ['/', '/login', '/dashboard', '/crisis']
          ),
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: import.meta.env.VITE_APP_ENV === 'production' ? 0.1 : 1.0,
      
      // Session Replay
      replaysSessionSampleRate: 0.1, // 10% of sessions will be recorded
      replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors
      
      // Release tracking
      release: import.meta.env.VITE_APP_VERSION || 'unknown',
      
      // Error filtering
      beforeSend(event, hint) {
        // Filter out sensitive information
        if (event.request?.cookies) {
          delete event.request.cookies;
        }
        
        // Don't send events in development
        if (import.meta.env.DEV) {
          return null;
        }
        
        // Filter out known non-critical errors
        const error = hint.originalException;
        if (error && error instanceof Error) {
          // Skip network errors that are expected
          if (error.message?.includes('NetworkError') || 
              error.message?.includes('Failed to fetch')) {
            return null;
          }
          
          // Skip cancelled requests
          if (error.name === 'AbortError') {
            return null;
          }
        }
        
        // Remove any PHI from error messages
        if (event.message) {
          event.message = sanitizePHI(event.message);
        }
        
        if (event.exception?.values) {
          event.exception.values = event.exception.values.map(value => ({
            ...value,
            value: value.value ? sanitizePHI(value.value) : value.value
          }));
        }
        
        return event;
      },
      
      // User context (no PHI)
      initialScope: {
        tags: {
          component: 'frontend',
          hipaa: 'true'
        },
      },
    });
  }
};

/**
 * Sanitize PHI from error messages
 */
function sanitizePHI(text: string): string {
  // Remove email addresses
  text = text.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, '[EMAIL_REDACTED]');
  
  // Remove phone numbers
  text = text.replace(/(\+?1?\d{10,15})/g, '[PHONE_REDACTED]');
  
  // Remove SSN patterns
  text = text.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]');
  
  // Remove date of birth patterns
  text = text.replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, '[DOB_REDACTED]');
  
  // Remove patient names (if they appear in specific patterns)
  text = text.replace(/patient:\s*[A-Za-z\s]+/gi, 'patient: [NAME_REDACTED]');
  text = text.replace(/user:\s*[A-Za-z\s]+/gi, 'user: [NAME_REDACTED]');
  
  return text;
}

/**
 * Capture exceptions manually
 */
export const captureException = (error: Error, context?: Record<string, any>) => {
  // Only capture in production
  if (import.meta.env.VITE_APP_ENV !== 'development') {
    Sentry.captureException(error, {
      contexts: {
        custom: sanitizeContext(context || {})
      }
    });
  } else {
    // In development, log to console
    console.error('Error captured:', error, context);
  }
};

/**
 * Capture custom events
 */
export const captureEvent = (message: string, level: 'info' | 'warning' | 'error' = 'info') => {
  if (import.meta.env.VITE_APP_ENV !== 'development') {
    Sentry.captureMessage(sanitizePHI(message), level);
  }
};

/**
 * Set user context (no PHI)
 */
export const setUserContext = (userId: string, role: string) => {
  Sentry.setUser({
    id: userId, // Use anonymized user ID only
    role: role,
    // Never include email, name, or other PHI
  });
};

/**
 * Clear user context on logout
 */
export const clearUserContext = () => {
  Sentry.setUser(null);
};

/**
 * Sanitize context data to remove PHI
 */
function sanitizeContext(context: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(context)) {
    // Skip sensitive keys
    if (['email', 'name', 'phone', 'ssn', 'dob', 'address'].includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizePHI(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

export default {
  initSentry,
  captureException,
  captureEvent,
  setUserContext,
  clearUserContext
};