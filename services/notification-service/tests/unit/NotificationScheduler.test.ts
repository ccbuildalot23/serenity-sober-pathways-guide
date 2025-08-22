import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NotificationScheduler } from '../../src/services/NotificationScheduler';
import { NotificationDatabase } from '../../src/services/database';
import { RateLimitService } from '../../src/services/rateLimitService';
import { TemplateEngine } from '../../src/services/TemplateEngine';
import { Logger } from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/services/database');
jest.mock('../../src/services/rateLimitService');
jest.mock('../../src/services/TemplateEngine');
jest.mock('../../src/utils/logger');

const MockNotificationDatabase = NotificationDatabase as jest.MockedClass<typeof NotificationDatabase>;
const MockRateLimitService = RateLimitService as jest.MockedClass<typeof RateLimitService>;
const MockTemplateEngine = TemplateEngine as jest.MockedClass<typeof TemplateEngine>;
const MockLogger = Logger as jest.MockedClass<typeof Logger>;

describe('NotificationScheduler', () => {
  let scheduler: NotificationScheduler;
  let mockDatabase: jest.Mocked<NotificationDatabase>;
  let mockRateLimitService: jest.Mocked<RateLimitService>;
  let mockTemplateEngine: jest.Mocked<TemplateEngine>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockDatabase = new MockNotificationDatabase() as jest.Mocked<NotificationDatabase>;
    mockRateLimitService = new MockRateLimitService() as jest.Mocked<RateLimitService>;
    mockTemplateEngine = new MockTemplateEngine() as jest.Mocked<TemplateEngine>;
    mockLogger = new MockLogger() as jest.Mocked<Logger>;

    // Initialize scheduler
    scheduler = new NotificationScheduler({
      database: mockDatabase,
      rateLimitService: mockRateLimitService,
      templateEngine: mockTemplateEngine,
      logger: mockLogger
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Basic Scheduling', () => {
    it('should schedule notification for immediate delivery', async () => {
      const notification = {
        userId: 'user-123',
        type: 'daily_checkin_reminder',
        channels: ['email', 'sms'],
        content: 'Time for your daily check-in!',
        priority: 'normal' as const,
        scheduledFor: new Date()
      };

      mockDatabase.enqueueNotification.mockResolvedValue('notification-456');
      mockRateLimitService.checkRateLimit.mockResolvedValue(true);
      mockTemplateEngine.renderTemplate.mockResolvedValue({
        subject: 'Daily Check-in Reminder',
        body: 'Time for your daily check-in!',
        smsBody: 'Daily check-in reminder'
      });

      const result = await scheduler.scheduleNotification(notification);

      expect(result.notificationId).toBe('notification-456');
      expect(result.status).toBe('scheduled');
      expect(mockDatabase.enqueueNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          type: 'daily_checkin_reminder',
          channels: ['email', 'sms'],
          priority: 'normal'
        })
      );
    });

    it('should schedule notification for future delivery', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now
      const notification = {
        userId: 'user-789',
        type: 'appointment_reminder',
        channels: ['sms'],
        content: 'Your appointment is tomorrow at 2 PM',
        scheduledFor: futureDate
      };

      mockDatabase.enqueueNotification.mockResolvedValue('notification-789');
      mockRateLimitService.checkRateLimit.mockResolvedValue(true);

      const result = await scheduler.scheduleNotification(notification);

      expect(result.status).toBe('scheduled');
      expect(mockDatabase.enqueueNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledFor: futureDate
        })
      );
    });

    it('should handle timezone-aware scheduling', async () => {
      const notification = {
        userId: 'user-tz',
        type: 'morning_motivation',
        channels: ['email'],
        content: 'Good morning! Have a great day!',
        scheduledFor: '09:00', // 9 AM local time
        timezone: 'America/Los_Angeles'
      };

      mockDatabase.enqueueNotification.mockResolvedValue('notification-tz');
      mockRateLimitService.checkRateLimit.mockResolvedValue(true);

      const result = await scheduler.scheduleNotification(notification);

      expect(result.status).toBe('scheduled');
      expect(mockDatabase.enqueueNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledFor: expect.any(Date),
          timezone: 'America/Los_Angeles'
        })
      );

      // Verify timezone conversion was applied
      const scheduledCall = mockDatabase.enqueueNotification.mock.calls[0][0];
      expect(scheduledCall.scheduledFor).toBeInstanceOf(Date);
    });

    it('should apply deduplication when specified', async () => {
      const notification = {
        userId: 'user-dedup',
        type: 'daily_checkin_reminder',
        channels: ['email'],
        content: 'Daily check-in reminder',
        deduplicationKey: 'daily-checkin-2024-01-15',
        deduplicationWindow: 86400000 // 24 hours
      };

      mockDatabase.checkDuplicateNotification.mockResolvedValue(false);
      mockDatabase.enqueueNotification.mockResolvedValue('notification-dedup');
      mockRateLimitService.checkRateLimit.mockResolvedValue(true);

      await scheduler.scheduleNotification(notification);

      expect(mockDatabase.checkDuplicateNotification).toHaveBeenCalledWith(
        'daily-checkin-2024-01-15',
        86400000
      );
    });

    it('should skip scheduling if duplicate found within window', async () => {
      const notification = {
        userId: 'user-duplicate',
        type: 'daily_checkin_reminder',
        channels: ['email'],
        content: 'Daily check-in reminder',
        deduplicationKey: 'daily-checkin-2024-01-15'
      };

      mockDatabase.checkDuplicateNotification.mockResolvedValue(true);

      const result = await scheduler.scheduleNotification(notification);

      expect(result.status).toBe('deduplicated');
      expect(result.reason).toBe('duplicate_within_window');
      expect(mockDatabase.enqueueNotification).not.toHaveBeenCalled();
    });
  });

  describe('Rate Limiting Integration', () => {
    it('should check rate limits before scheduling', async () => {
      const notification = {
        userId: 'user-rate',
        type: 'motivation_message',
        channels: ['sms'],
        content: 'You got this!'
      };

      mockRateLimitService.checkRateLimit.mockResolvedValue(false);

      const result = await scheduler.scheduleNotification(notification);

      expect(result.status).toBe('rate_limited');
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'user-rate',
        'sms',
        'hourly'
      );
      expect(mockDatabase.enqueueNotification).not.toHaveBeenCalled();
    });

    it('should queue rate-limited notifications for later delivery', async () => {
      const notification = {
        userId: 'user-queued',
        type: 'weekly_progress',
        channels: ['email'],
        content: 'Weekly progress update'
      };

      mockRateLimitService.checkRateLimit.mockResolvedValue(false);
      mockRateLimitService.getNextAvailableSlot.mockResolvedValue(
        new Date(Date.now() + 1800000) // 30 minutes
      );
      mockDatabase.enqueueNotification.mockResolvedValue('notification-queued');

      const result = await scheduler.scheduleNotification(notification);

      expect(result.status).toBe('rate_limited_queued');
      expect(result.rescheduledFor).toBeInstanceOf(Date);
      expect(mockDatabase.enqueueNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          scheduledFor: expect.any(Date),
          rateLimited: true
        })
      );
    });

    it('should bypass rate limits for critical notifications', async () => {
      const criticalNotification = {
        userId: 'user-critical',
        type: 'crisis_alert',
        channels: ['sms', 'email'],
        content: 'Crisis alert - immediate action required',
        priority: 'critical' as const,
        bypassRateLimit: true
      };

      mockDatabase.enqueueNotification.mockResolvedValue('notification-critical');
      
      // Rate limit would normally block, but should be bypassed
      mockRateLimitService.checkRateLimit.mockResolvedValue(false);

      const result = await scheduler.scheduleNotification(criticalNotification);

      expect(result.status).toBe('scheduled');
      expect(result.rateLimitBypassed).toBe(true);
      expect(mockDatabase.enqueueNotification).toHaveBeenCalled();
    });
  });

  describe('Quiet Hours Enforcement', () => {
    it('should respect quiet hours for non-urgent notifications', async () => {
      const notification = {
        userId: 'user-quiet',
        type: 'daily_motivation',
        channels: ['sms'],
        content: 'Daily motivation message',
        priority: 'low' as const
      };

      const userPreferences = {
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        timezone: 'America/New_York'
      };

      mockDatabase.getNotificationPreferences.mockResolvedValue(userPreferences);
      
      // Mock current time to be during quiet hours (11 PM)
      const quietHourTime = new Date();
      quietHourTime.setHours(23, 0, 0, 0);
      jest.spyOn(Date, 'now').mockReturnValue(quietHourTime.getTime());

      mockDatabase.enqueueNotification.mockResolvedValue('notification-quiet');

      const result = await scheduler.scheduleNotification(notification);

      expect(result.status).toBe('rescheduled_quiet_hours');
      expect(result.rescheduledFor).toBeInstanceOf(Date);
      
      // Should be rescheduled for after quiet hours (7 AM)
      const rescheduledHour = result.rescheduledFor!.getHours();
      expect(rescheduledHour).toBeGreaterThanOrEqual(7);
    });

    it('should allow urgent notifications during quiet hours', async () => {
      const urgentNotification = {
        userId: 'user-urgent',
        type: 'crisis_update',
        channels: ['sms'],
        content: 'Crisis update - support is on the way',
        priority: 'urgent' as const
      };

      const userPreferences = {
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        timezone: 'America/New_York'
      };

      mockDatabase.getNotificationPreferences.mockResolvedValue(userPreferences);
      mockDatabase.enqueueNotification.mockResolvedValue('notification-urgent');
      mockRateLimitService.checkRateLimit.mockResolvedValue(true);

      // Mock current time to be during quiet hours
      const quietHourTime = new Date();
      quietHourTime.setHours(1, 0, 0, 0);
      jest.spyOn(Date, 'now').mockReturnValue(quietHourTime.getTime());

      const result = await scheduler.scheduleNotification(urgentNotification);

      expect(result.status).toBe('scheduled');
      expect(result.quietHoursBypassed).toBe(true);
      expect(mockDatabase.enqueueNotification).toHaveBeenCalled();
    });
  });

  describe('Template Processing', () => {
    it('should render templates with user data', async () => {
      const notification = {
        userId: 'user-template',
        type: 'milestone_celebration',
        channels: ['email'],
        templateData: {
          firstName: 'John',
          milestoneType: '30_days',
          daysClean: 30
        }
      };

      const renderedContent = {
        subject: 'Congratulations on 30 days clean, John!',
        body: 'Amazing milestone achievement!',
        smsBody: 'Congrats John! 30 days clean!'
      };

      mockTemplateEngine.renderTemplate.mockResolvedValue(renderedContent);
      mockDatabase.enqueueNotification.mockResolvedValue('notification-template');
      mockRateLimitService.checkRateLimit.mockResolvedValue(true);

      await scheduler.scheduleNotification(notification);

      expect(mockTemplateEngine.renderTemplate).toHaveBeenCalledWith(
        'milestone_celebration',
        expect.objectContaining({
          firstName: 'John',
          milestoneType: '30_days',
          daysClean: 30
        })
      );

      expect(mockDatabase.enqueueNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          renderedContent
        })
      );
    });

    it('should handle template rendering failures gracefully', async () => {
      const notification = {
        userId: 'user-template-fail',
        type: 'invalid_template',
        channels: ['email'],
        templateData: { name: 'Test' }
      };

      mockTemplateEngine.renderTemplate.mockRejectedValue(
        new Error('Template not found')
      );

      const result = await scheduler.scheduleNotification(notification);

      expect(result.status).toBe('template_error');
      expect(result.error).toContain('Template not found');
      expect(mockDatabase.enqueueNotification).not.toHaveBeenCalled();
    });

    it('should use fallback content when template fails', async () => {
      const notification = {
        userId: 'user-fallback',
        type: 'custom_template',
        channels: ['sms'],
        content: 'Fallback message content', // Fallback content
        templateData: { name: 'Test' },
        fallbackOnTemplateError: true
      };

      mockTemplateEngine.renderTemplate.mockRejectedValue(
        new Error('Template rendering error')
      );
      mockDatabase.enqueueNotification.mockResolvedValue('notification-fallback');
      mockRateLimitService.checkRateLimit.mockResolvedValue(true);

      const result = await scheduler.scheduleNotification(notification);

      expect(result.status).toBe('scheduled');
      expect(result.templateFallbackUsed).toBe(true);
      expect(mockDatabase.enqueueNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Fallback message content'
        })
      );
    });
  });

  describe('Batch Scheduling', () => {
    it('should efficiently schedule batch notifications', async () => {
      const batchNotifications = Array.from({ length: 100 }, (_, i) => ({
        userId: `batch-user-${i}`,
        type: 'system_announcement',
        channels: ['email'],
        content: 'System maintenance scheduled for tonight',
        batchId: 'batch-001'
      }));

      mockDatabase.bulkEnqueueNotifications.mockResolvedValue(
        Array.from({ length: 100 }, (_, i) => `notification-${i}`)
      );
      mockRateLimitService.checkBatchRateLimit.mockResolvedValue({
        allowed: batchNotifications,
        blocked: [],
        delayed: []
      });

      const result = await scheduler.scheduleBatchNotifications(batchNotifications);

      expect(result.totalScheduled).toBe(100);
      expect(result.successful).toBe(100);
      expect(result.failed).toBe(0);
      expect(result.batchId).toBe('batch-001');
      
      expect(mockDatabase.bulkEnqueueNotifications).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ batchId: 'batch-001' })
        ])
      );
    });

    it('should handle partial batch failures', async () => {
      const batchNotifications = Array.from({ length: 10 }, (_, i) => ({
        userId: `user-${i}`,
        type: 'batch_test',
        channels: ['email'],
        content: 'Test message'
      }));

      // Mock some notifications failing
      mockDatabase.bulkEnqueueNotifications.mockResolvedValue(
        Array.from({ length: 7 }, (_, i) => `notification-${i}`)
      );
      mockDatabase.bulkEnqueueNotifications.mockRejectedValue(
        new Error('Partial batch failure')
      );

      // Mock individual fallback for failed items
      mockDatabase.enqueueNotification.mockImplementation((notification) => {
        if (notification.userId.includes('user-7') || 
            notification.userId.includes('user-8') || 
            notification.userId.includes('user-9')) {
          return Promise.reject(new Error('Individual failure'));
        }
        return Promise.resolve(`individual-${notification.userId}`);
      });

      const result = await scheduler.scheduleBatchNotifications(batchNotifications);

      expect(result.totalScheduled).toBe(10);
      expect(result.successful).toBeLessThan(10);
      expect(result.failed).toBeGreaterThan(0);
      expect(result.errors).toBeDefined();
    });

    it('should apply batch-specific rate limiting', async () => {
      const largeBatch = Array.from({ length: 1000 }, (_, i) => ({
        userId: `bulk-user-${i}`,
        type: 'marketing_campaign',
        channels: ['email'],
        content: 'Special offer just for you!'
      }));

      mockRateLimitService.checkBatchRateLimit.mockResolvedValue({
        allowed: largeBatch.slice(0, 500), // Only allow first 500
        blocked: largeBatch.slice(500, 800), // Block 300
        delayed: largeBatch.slice(800) // Delay remaining 200
      });

      mockDatabase.bulkEnqueueNotifications.mockResolvedValue(
        Array.from({ length: 500 }, (_, i) => `notification-${i}`)
      );
      
      mockDatabase.bulkEnqueueNotifications.mockImplementation((notifications) => {
        // Delayed batch should be scheduled for later
        if (notifications.some((n: any) => n.rateLimited)) {
          return Promise.resolve(
            Array.from({ length: 200 }, (_, i) => `delayed-${i}`)
          );
        }
        return Promise.resolve(
          Array.from({ length: 500 }, (_, i) => `immediate-${i}`)
        );
      });

      const result = await scheduler.scheduleBatchNotifications(largeBatch);

      expect(result.immediate).toBe(500);
      expect(result.rateLimited).toBe(300);
      expect(result.delayed).toBe(200);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle database connection failures', async () => {
      const notification = {
        userId: 'user-db-fail',
        type: 'test_notification',
        channels: ['email'],
        content: 'Test message'
      };

      mockDatabase.enqueueNotification.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await scheduler.scheduleNotification(notification);

      expect(result.status).toBe('error');
      expect(result.error).toContain('Database connection failed');
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to schedule notification'),
        expect.objectContaining({
          userId: 'user-db-fail',
          error: expect.any(Error)
        })
      );
    });

    it('should implement circuit breaker for external service failures', async () => {
      // Mock repeated template engine failures
      mockTemplateEngine.renderTemplate.mockRejectedValue(
        new Error('Service unavailable')
      );

      const notifications = Array.from({ length: 10 }, (_, i) => ({
        userId: `circuit-user-${i}`,
        type: 'templated_notification',
        channels: ['email'],
        templateData: { name: `User ${i}` }
      }));

      const results = [];
      for (const notification of notifications) {
        const result = await scheduler.scheduleNotification(notification);
        results.push(result);
      }

      // After threshold failures, circuit breaker should open
      const circuitBreakerTriggered = results.some(r => 
        r.status === 'circuit_breaker_open'
      );
      expect(circuitBreakerTriggered).toBe(true);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker opened'),
        expect.any(Object)
      );
    });

    it('should validate notification data before scheduling', async () => {
      const invalidNotification = {
        // Missing required userId
        type: 'invalid_notification',
        channels: ['invalid_channel'], // Invalid channel
        content: '', // Empty content
        priority: 'invalid_priority' // Invalid priority
      };

      const result = await scheduler.scheduleNotification(invalidNotification as any);

      expect(result.status).toBe('validation_error');
      expect(result.validationErrors).toContain('userId is required');
      expect(result.validationErrors).toContain('invalid channel: invalid_channel');
      expect(result.validationErrors).toContain('content cannot be empty');
      expect(result.validationErrors).toContain('invalid priority level');
      
      expect(mockDatabase.enqueueNotification).not.toHaveBeenCalled();
    });

    it('should handle concurrent scheduling requests safely', async () => {
      const concurrentNotifications = Array.from({ length: 50 }, (_, i) => ({
        userId: `concurrent-user-${i}`,
        type: 'concurrent_test',
        channels: ['email'],
        content: `Concurrent message ${i}`
      }));

      mockDatabase.enqueueNotification.mockImplementation(() => 
        Promise.resolve(`notification-${Math.random()}`)
      );
      mockRateLimitService.checkRateLimit.mockResolvedValue(true);

      // Schedule all notifications concurrently
      const results = await Promise.allSettled(
        concurrentNotifications.map(notification => 
          scheduler.scheduleNotification(notification)
        )
      );

      // All should succeed without race conditions
      const successful = results.filter(r => 
        r.status === 'fulfilled' && r.value.status === 'scheduled'
      );
      
      expect(successful).toHaveLength(50);
      
      // Database should have been called for each notification
      expect(mockDatabase.enqueueNotification).toHaveBeenCalledTimes(50);
    });
  });

  describe('Performance and Optimization', () => {
    it('should cache user preferences for performance', async () => {
      const notifications = Array.from({ length: 20 }, (_, i) => ({
        userId: 'same-user', // Same user for all notifications
        type: `notification-${i}`,
        channels: ['email'],
        content: `Message ${i}`
      }));

      const userPreferences = {
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        timezone: 'America/New_York'
      };

      mockDatabase.getNotificationPreferences.mockResolvedValue(userPreferences);
      mockDatabase.enqueueNotification.mockResolvedValue('notification-cached');
      mockRateLimitService.checkRateLimit.mockResolvedValue(true);

      for (const notification of notifications) {
        await scheduler.scheduleNotification(notification);
      }

      // Should only fetch preferences once due to caching
      expect(mockDatabase.getNotificationPreferences).toHaveBeenCalledTimes(1);
      expect(mockDatabase.enqueueNotification).toHaveBeenCalledTimes(20);
    });

    it('should optimize batch operations for large datasets', async () => {
      const largeBatch = Array.from({ length: 5000 }, (_, i) => ({
        userId: `bulk-user-${i}`,
        type: 'bulk_notification',
        channels: ['email'],
        content: 'Bulk message'
      }));

      mockDatabase.bulkEnqueueNotifications.mockImplementation((batch) => {
        // Simulate processing in chunks
        return Promise.resolve(
          Array.from({ length: batch.length }, (_, i) => `notification-${i}`)
        );
      });

      mockRateLimitService.checkBatchRateLimit.mockResolvedValue({
        allowed: largeBatch,
        blocked: [],
        delayed: []
      });

      const startTime = Date.now();
      const result = await scheduler.scheduleBatchNotifications(largeBatch);
      const processingTime = Date.now() - startTime;

      expect(result.totalScheduled).toBe(5000);
      expect(result.successful).toBe(5000);
      
      // Should complete large batch efficiently (under 10 seconds)
      expect(processingTime).toBeLessThan(10000);
      
      // Should use batch operations rather than individual calls
      expect(mockDatabase.bulkEnqueueNotifications).toHaveBeenCalled();
      expect(mockDatabase.enqueueNotification).not.toHaveBeenCalled();
    });

    it('should implement memory-efficient streaming for huge datasets', async () => {
      const hugeDataset = function* () {
        for (let i = 0; i < 50000; i++) {
          yield {
            userId: `stream-user-${i}`,
            type: 'streaming_notification',
            channels: ['email'],
            content: `Streaming message ${i}`
          };
        }
      };

      mockDatabase.bulkEnqueueNotifications.mockResolvedValue([]);
      mockRateLimitService.checkBatchRateLimit.mockResolvedValue({
        allowed: [],
        blocked: [],
        delayed: []
      });

      const result = await scheduler.scheduleNotificationStream(
        hugeDataset(),
        { chunkSize: 1000, maxConcurrency: 5 }
      );

      expect(result.totalProcessed).toBe(50000);
      
      // Should process in manageable chunks
      expect(mockDatabase.bulkEnqueueNotifications.mock.calls.length)
        .toBeGreaterThan(10); // At least 10 chunks
      
      // Each chunk should be reasonable size
      mockDatabase.bulkEnqueueNotifications.mock.calls.forEach(call => {
        expect(call[0].length).toBeLessThanOrEqual(1000);
      });
    });
  });
});