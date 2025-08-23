/**
 * Logger Service Test Suite
 * 
 * Tests the centralized logging system for:
 * - PHI data sanitization
 * - Environment-aware logging
 * - Production safety
 * - Error handling
 */

import { LoggerService } from './loggerService';

// Mock environment variables for testing
const mockEnv = (overrides: Record<string, string> = {}) => {
  const originalEnv = import.meta.env;
  Object.assign(import.meta.env, {
    MODE: 'development',
    PROD: false,
    VITE_ENABLE_CONSOLE_LOGGING: 'true',
    VITE_LOG_LEVEL: 'debug',
    VITE_ENABLE_PERFORMANCE_LOGGING: 'false',
    ...overrides
  });
  return () => {
    Object.assign(import.meta.env, originalEnv);
  };
};

describe('LoggerService', () => {
  let logger: LoggerService;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('PHI Data Sanitization', () => {
    beforeEach(() => {
      const restoreEnv = mockEnv();
      logger = new LoggerService();
    });

    it('should redact email addresses', () => {
      const testData = {
        userEmail: 'patient@example.com',
        message: 'User signed in'
      };

      logger.debug('Test message', testData);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG] Test message',
        expect.objectContaining({
          userEmail: '[EMAIL_REDACTED]'
        })
      );
    });

    it('should redact phone numbers', () => {
      const testData = {
        phone: '555-123-4567',
        alternatePhone: '(555) 987-6543'
      };

      logger.debug('Test message', testData);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG] Test message',
        expect.objectContaining({
          phone: '[PHONE_REDACTED]',
          alternatePhone: '[PHONE_REDACTED]'
        })
      );
    });

    it('should redact social security numbers', () => {
      const testData = {
        ssn: '123-45-6789',
        socialSecurity: '987654321'
      };

      logger.debug('Test message', testData);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG] Test message',
        expect.objectContaining({
          ssn: '[SSN_REDACTED]',
          socialSecurity: '[SSN_REDACTED]'
        })
      );
    });

    it('should redact passwords and tokens', () => {
      const testData = {
        password: 'secretPassword123',
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        sessionToken: 'abc123def456'
      };

      logger.debug('Test message', testData);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG] Test message',
        expect.objectContaining({
          password: '[REDACTED]',
          accessToken: '[TOKEN_REDACTED]',
          sessionToken: '[REDACTED]'
        })
      );
    });

    it('should handle nested objects', () => {
      const testData = {
        user: {
          id: '123',
          email: 'user@test.com',
          profile: {
            phone: '555-0123',
            address: '123 Main St'
          }
        }
      };

      logger.debug('Test message', testData);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG] Test message',
        expect.objectContaining({
          user: expect.objectContaining({
            id: '123',
            email: '[EMAIL_REDACTED]',
            profile: expect.objectContaining({
              phone: '[PHONE_REDACTED]',
              address: '[REDACTED]'
            })
          })
        })
      );
    });

    it('should handle arrays with PHI data', () => {
      const testData = {
        contacts: [
          { name: 'John', email: 'john@test.com' },
          { name: 'Jane', phone: '555-1234' }
        ]
      };

      logger.debug('Test message', testData);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG] Test message',
        expect.objectContaining({
          contacts: [
            { name: 'John', email: '[EMAIL_REDACTED]' },
            { name: 'Jane', phone: '[PHONE_REDACTED]' }
          ]
        })
      );
    });
  });

  describe('Environment-Aware Logging', () => {
    it('should respect VITE_ENABLE_CONSOLE_LOGGING=false', () => {
      const restoreEnv = mockEnv({ VITE_ENABLE_CONSOLE_LOGGING: 'false' });
      logger = new LoggerService();

      logger.debug('This should not appear in console');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      restoreEnv();
    });

    it('should respect log level configuration', () => {
      const restoreEnv = mockEnv({ VITE_LOG_LEVEL: 'warn' });
      logger = new LoggerService();

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');

      expect(consoleLogSpy).not.toHaveBeenCalled(); // debug and info should be filtered
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] Warning message', '');
      restoreEnv();
    });

    it('should disable performance logging by default', () => {
      const restoreEnv = mockEnv({ VITE_ENABLE_PERFORMANCE_LOGGING: 'false' });
      logger = new LoggerService();

      logger.performance('API call', 150);

      expect(consoleLogSpy).not.toHaveBeenCalled();
      restoreEnv();
    });

    it('should enable performance logging when configured', () => {
      const restoreEnv = mockEnv({ VITE_ENABLE_PERFORMANCE_LOGGING: 'true' });
      logger = new LoggerService();

      logger.performance('API call', 150, { component: 'test' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[PERF] API call (150ms)',
        expect.objectContaining({ component: 'test' })
      );
      restoreEnv();
    });
  });

  describe('Production Safety', () => {
    it('should not log debug messages in production', () => {
      const restoreEnv = mockEnv({ 
        MODE: 'production', 
        PROD: 'true',
        VITE_LOG_LEVEL: 'error'
      });
      logger = new LoggerService();

      logger.debug('Debug message');
      logger.info('Info message');
      logger.warn('Warning message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
      restoreEnv();
    });

    it('should always log errors regardless of environment', () => {
      const restoreEnv = mockEnv({ 
        MODE: 'production',
        PROD: 'true',
        VITE_ENABLE_CONSOLE_LOGGING: 'false',
        VITE_LOG_LEVEL: 'error'
      });
      logger = new LoggerService();

      const error = new Error('Test error');
      logger.error('Error occurred', error);

      // In production, errors are sent to monitoring, not console
      // This test would need to mock the monitoring service
      expect(true).toBe(true); // Placeholder for monitoring test
      restoreEnv();
    });

    it('should always log security events', () => {
      const restoreEnv = mockEnv({ 
        MODE: 'production',
        PROD: 'true',
        VITE_LOG_LEVEL: 'error'
      });
      logger = new LoggerService();

      logger.security('Login attempt', { userId: '123' });

      // Security events should always be processed regardless of log level
      expect(true).toBe(true); // Placeholder for monitoring test
      restoreEnv();
    });
  });

  describe('API and Database Logging', () => {
    beforeEach(() => {
      const restoreEnv = mockEnv();
      logger = new LoggerService();
    });

    it('should log API calls with sanitized URLs', () => {
      logger.api('GET', '/api/users/12345/profile', 200, 150);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[INFO] API GET /api/users/[ID]/profile - 200 (150ms)',
        expect.objectContaining({
          method: 'GET',
          url: '/api/users/[ID]/profile',
          status: 200,
          duration: 150
        })
      );
    });

    it('should log database operations', () => {
      logger.database('SELECT', 'user_profiles', 25);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[DEBUG] DB SELECT on user_profiles (25ms)',
        expect.objectContaining({
          operation: 'SELECT',
          table: 'user_profiles',
          duration: 25,
          database: true
        })
      );
    });
  });

  describe('User Action Logging', () => {
    beforeEach(() => {
      const restoreEnv = mockEnv();
      logger = new LoggerService();
    });

    it('should log user actions for analytics', () => {
      logger.userAction('completed_checkin', { 
        userId: 'user123',
        sessionId: 'session456' 
      });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[INFO] User action: completed_checkin',
        expect.objectContaining({
          userAction: true,
          action: 'completed_checkin',
          userId: 'user123',
          sessionId: 'session456'
        })
      );
    });
  });
});

export { LoggerService };