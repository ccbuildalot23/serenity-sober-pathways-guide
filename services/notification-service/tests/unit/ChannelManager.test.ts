import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ChannelManager } from '../../src/services/ChannelManager';
import { TwilioChannel } from '../../src/channels/TwilioChannel';
import { SendGridChannel } from '../../src/channels/SendGridChannel';
import { FCMChannel } from '../../src/channels/FCMChannel';
import { WebSocketChannel } from '../../src/channels/WebSocketChannel';
import { NotificationDatabase } from '../../src/services/database';
import { Logger } from '../../src/utils/logger';

// Mock dependencies
jest.mock('../../src/channels/TwilioChannel');
jest.mock('../../src/channels/SendGridChannel');
jest.mock('../../src/channels/FCMChannel');
jest.mock('../../src/channels/WebSocketChannel');
jest.mock('../../src/services/database');
jest.mock('../../src/utils/logger');

const MockTwilioChannel = TwilioChannel as jest.MockedClass<typeof TwilioChannel>;
const MockSendGridChannel = SendGridChannel as jest.MockedClass<typeof SendGridChannel>;
const MockFCMChannel = FCMChannel as jest.MockedClass<typeof FCMChannel>;
const MockWebSocketChannel = WebSocketChannel as jest.MockedClass<typeof WebSocketChannel>;
const MockNotificationDatabase = NotificationDatabase as jest.MockedClass<typeof NotificationDatabase>;
const MockLogger = Logger as jest.MockedClass<typeof Logger>;

describe('ChannelManager', () => {
  let channelManager: ChannelManager;
  let mockTwilioChannel: jest.Mocked<TwilioChannel>;
  let mockSendGridChannel: jest.Mocked<SendGridChannel>;
  let mockFCMChannel: jest.Mocked<FCMChannel>;
  let mockWebSocketChannel: jest.Mocked<WebSocketChannel>;
  let mockDatabase: jest.Mocked<NotificationDatabase>;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instances
    mockTwilioChannel = new MockTwilioChannel() as jest.Mocked<TwilioChannel>;
    mockSendGridChannel = new MockSendGridChannel() as jest.Mocked<SendGridChannel>;
    mockFCMChannel = new MockFCMChannel() as jest.Mocked<FCMChannel>;
    mockWebSocketChannel = new MockWebSocketChannel() as jest.Mocked<WebSocketChannel>;
    mockDatabase = new MockNotificationDatabase() as jest.Mocked<NotificationDatabase>;
    mockLogger = new MockLogger() as jest.Mocked<Logger>;

    // Setup default mock behaviors
    mockTwilioChannel.send.mockResolvedValue({ success: true, messageId: 'sms-123' });
    mockSendGridChannel.send.mockResolvedValue({ success: true, messageId: 'email-456' });
    mockFCMChannel.send.mockResolvedValue({ success: true, messageId: 'push-789' });
    mockWebSocketChannel.send.mockResolvedValue({ success: true, messageId: 'ws-101' });

    // Initialize channel manager
    channelManager = new ChannelManager({
      channels: {
        sms: mockTwilioChannel,
        email: mockSendGridChannel,
        push: mockFCMChannel,
        websocket: mockWebSocketChannel
      },
      database: mockDatabase,
      logger: mockLogger
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Single Channel Delivery', () => {
    it('should send SMS notification successfully', async () => {
      const notification = {
        id: 'notification-123',
        userId: 'user-456',
        type: 'daily_checkin_reminder',
        channels: ['sms'],
        content: 'Time for your daily check-in!',
        recipient: {
          phone: '+1234567890',
          firstName: 'John'
        }
      };

      const result = await channelManager.sendNotification(notification);

      expect(result.success).toBe(true);
      expect(result.channelResults.sms.success).toBe(true);
      expect(result.channelResults.sms.messageId).toBe('sms-123');

      expect(mockTwilioChannel.send).toHaveBeenCalledWith({
        to: '+1234567890',
        body: 'Time for your daily check-in!',
        notificationId: 'notification-123',
        userId: 'user-456',
        metadata: expect.objectContaining({
          type: 'daily_checkin_reminder',
          firstName: 'John'
        })
      });
    });

    it('should send email notification successfully', async () => {
      const notification = {
        id: 'notification-789',
        userId: 'user-123',
        type: 'appointment_reminder',
        channels: ['email'],
        content: 'Your appointment is tomorrow at 2 PM',
        recipient: {
          email: 'user@example.com',
          firstName: 'Jane'
        },
        renderedContent: {
          subject: 'Appointment Reminder',
          body: 'Your appointment is tomorrow at 2 PM',
          htmlBody: '<p>Your appointment is tomorrow at 2 PM</p>'
        }
      };

      const result = await channelManager.sendNotification(notification);

      expect(result.success).toBe(true);
      expect(result.channelResults.email.success).toBe(true);

      expect(mockSendGridChannel.send).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: 'Appointment Reminder',
        text: 'Your appointment is tomorrow at 2 PM',
        html: '<p>Your appointment is tomorrow at 2 PM</p>',
        notificationId: 'notification-789',
        userId: 'user-123',
        metadata: expect.objectContaining({
          type: 'appointment_reminder',
          firstName: 'Jane'
        })
      });
    });

    it('should send push notification successfully', async () => {
      const notification = {
        id: 'notification-push',
        userId: 'user-push',
        type: 'crisis_alert',
        channels: ['push'],
        content: 'Crisis alert - immediate attention required',
        recipient: {
          pushTokens: ['token1', 'token2'],
          firstName: 'Alex'
        },
        priority: 'critical'
      };

      const result = await channelManager.sendNotification(notification);

      expect(result.success).toBe(true);
      expect(result.channelResults.push.success).toBe(true);

      expect(mockFCMChannel.send).toHaveBeenCalledWith({
        tokens: ['token1', 'token2'],
        title: 'Crisis Alert',
        body: 'Crisis alert - immediate attention required',
        data: expect.objectContaining({
          notificationId: 'notification-push',
          type: 'crisis_alert',
          priority: 'critical'
        }),
        priority: 'high',
        notificationId: 'notification-push',
        userId: 'user-push'
      });
    });
  });

  describe('Multi-Channel Delivery', () => {
    it('should send to multiple channels successfully', async () => {
      const notification = {
        id: 'multi-notification',
        userId: 'multi-user',
        type: 'important_update',
        channels: ['email', 'sms', 'push'],
        content: 'Important system update',
        recipient: {
          email: 'user@example.com',
          phone: '+1234567890',
          pushTokens: ['push-token']
        },
        renderedContent: {
          subject: 'Important Update',
          body: 'Important system update',
          smsBody: 'System update: Important changes made'
        }
      };

      const result = await channelManager.sendNotification(notification);

      expect(result.success).toBe(true);
      expect(result.channelResults.email.success).toBe(true);
      expect(result.channelResults.sms.success).toBe(true);
      expect(result.channelResults.push.success).toBe(true);

      expect(mockSendGridChannel.send).toHaveBeenCalled();
      expect(mockTwilioChannel.send).toHaveBeenCalled();
      expect(mockFCMChannel.send).toHaveBeenCalled();
    });

    it('should handle partial failures gracefully', async () => {
      const notification = {
        id: 'partial-fail',
        userId: 'fail-user',
        type: 'test_notification',
        channels: ['email', 'sms', 'push'],
        content: 'Test message',
        recipient: {
          email: 'user@example.com',
          phone: '+1234567890',
          pushTokens: ['push-token']
        }
      };

      // Mock SMS failure
      mockTwilioChannel.send.mockRejectedValue(new Error('SMS service unavailable'));

      const result = await channelManager.sendNotification(notification);

      expect(result.success).toBe(false); // Overall failure due to partial failure
      expect(result.channelResults.email.success).toBe(true);
      expect(result.channelResults.sms.success).toBe(false);
      expect(result.channelResults.sms.error).toBe('SMS service unavailable');
      expect(result.channelResults.push.success).toBe(true);

      expect(result.successfulChannels).toBe(2);
      expect(result.failedChannels).toBe(1);
    });

    it('should apply channel fallback strategy', async () => {
      const notification = {
        id: 'fallback-notification',
        userId: 'fallback-user',
        type: 'critical_alert',
        channels: ['email', 'sms'],
        content: 'Critical alert message',
        recipient: {
          email: 'user@example.com',
          phone: '+1234567890'
        },
        fallbackStrategy: {
          primary: 'email',
          fallback: 'sms',
          fallbackOnFailure: true
        }
      };

      // Mock email failure
      mockSendGridChannel.send.mockRejectedValue(new Error('Email service down'));

      const result = await channelManager.sendNotification(notification);

      expect(result.success).toBe(true); // Success via fallback
      expect(result.channelResults.email.success).toBe(false);
      expect(result.channelResults.sms.success).toBe(true);
      expect(result.fallbackActivated).toBe(true);
      expect(result.fallbackChannel).toBe('sms');

      // Should log fallback activation
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Channel fallback activated'),
        expect.objectContaining({
          notificationId: 'fallback-notification',
          originalChannel: 'email',
          fallbackChannel: 'sms'
        })
      );
    });
  });

  describe('Channel Selection and Preferences', () => {
    it('should respect user channel preferences', async () => {
      const notification = {
        id: 'preference-notification',
        userId: 'preference-user',
        type: 'weekly_summary',
        channels: ['email', 'sms', 'push'], // Requested channels
        content: 'Your weekly summary',
        recipient: {
          email: 'user@example.com',
          phone: '+1234567890',
          pushTokens: ['push-token']
        },
        userPreferences: {
          email: true,
          sms: false, // User disabled SMS
          push: true,
          whatsapp: false
        }
      };

      const result = await channelManager.sendNotification(notification);

      expect(result.success).toBe(true);
      
      // Should only send to enabled channels
      expect(mockSendGridChannel.send).toHaveBeenCalled();
      expect(mockFCMChannel.send).toHaveBeenCalled();
      expect(mockTwilioChannel.send).not.toHaveBeenCalled(); // SMS disabled

      expect(result.skippedChannels).toEqual(['sms']);
      expect(result.skippedReason).toEqual({ sms: 'user_preference_disabled' });
    });

    it('should override preferences for critical notifications', async () => {
      const criticalNotification = {
        id: 'critical-override',
        userId: 'critical-user',
        type: 'crisis_alert',
        channels: ['email', 'sms'],
        content: 'Emergency crisis alert',
        priority: 'critical',
        overridePreferences: true,
        recipient: {
          email: 'user@example.com',
          phone: '+1234567890'
        },
        userPreferences: {
          email: false, // User disabled email
          sms: false    // User disabled SMS
        }
      };

      const result = await channelManager.sendNotification(criticalNotification);

      expect(result.success).toBe(true);
      
      // Should send via all channels despite preferences
      expect(mockSendGridChannel.send).toHaveBeenCalled();
      expect(mockTwilioChannel.send).toHaveBeenCalled();
      
      expect(result.preferencesOverridden).toBe(true);
      expect(result.overrideReason).toBe('critical_priority');
    });

    it('should select optimal channel based on user activity patterns', async () => {
      const notification = {
        id: 'optimal-channel',
        userId: 'active-user',
        type: 'time_sensitive_reminder',
        channels: ['email', 'sms', 'push'],
        content: 'Time-sensitive reminder',
        recipient: {
          email: 'user@example.com',
          phone: '+1234567890',
          pushTokens: ['push-token']
        },
        channelOptimization: {
          enabled: true,
          userActivity: {
            email: { lastOpened: '2024-01-01T10:00:00Z', openRate: 0.3 },
            sms: { lastReplied: '2024-01-15T14:30:00Z', responseRate: 0.8 },
            push: { lastInteracted: '2024-01-15T16:00:00Z', clickRate: 0.6 }
          }
        }
      };

      mockDatabase.getUserChannelOptimalTimes.mockResolvedValue({
        sms: { score: 0.9, reason: 'high_response_rate' },
        push: { score: 0.7, reason: 'recent_activity' },
        email: { score: 0.4, reason: 'low_engagement' }
      });

      const result = await channelManager.sendNotification(notification);

      expect(result.success).toBe(true);
      expect(result.channelOptimization.applied).toBe(true);
      expect(result.channelOptimization.primaryChannel).toBe('sms');
      expect(result.channelOptimization.score).toBe(0.9);

      // Should prioritize SMS but also send to other channels
      expect(mockTwilioChannel.send).toHaveBeenCalled();
      expect(mockFCMChannel.send).toHaveBeenCalled();
      expect(mockSendGridChannel.send).toHaveBeenCalled();
    });
  });

  describe('Real-time and WebSocket Delivery', () => {
    it('should send real-time notification via WebSocket', async () => {
      const realtimeNotification = {
        id: 'realtime-notification',
        userId: 'realtime-user',
        type: 'live_update',
        channels: ['websocket'],
        content: 'Live status update',
        recipient: {
          userId: 'realtime-user',
          sessionId: 'session-123'
        },
        realtime: true
      };

      const result = await channelManager.sendNotification(realtimeNotification);

      expect(result.success).toBe(true);
      expect(result.channelResults.websocket.success).toBe(true);

      expect(mockWebSocketChannel.send).toHaveBeenCalledWith({
        userId: 'realtime-user',
        sessionId: 'session-123',
        type: 'live_update',
        data: {
          content: 'Live status update',
          notificationId: 'realtime-notification',
          timestamp: expect.any(String)
        }
      });
    });

    it('should handle WebSocket connection failures gracefully', async () => {
      const notification = {
        id: 'ws-fail',
        userId: 'ws-user',
        type: 'realtime_alert',
        channels: ['websocket', 'push'], // Fallback to push
        content: 'Real-time alert',
        recipient: {
          userId: 'ws-user',
          pushTokens: ['fallback-token']
        }
      };

      mockWebSocketChannel.send.mockRejectedValue(new Error('WebSocket connection closed'));

      const result = await channelManager.sendNotification(notification);

      expect(result.success).toBe(true); // Success via push fallback
      expect(result.channelResults.websocket.success).toBe(false);
      expect(result.channelResults.push.success).toBe(true);

      // Should attempt WebSocket first, then fallback to push
      expect(mockWebSocketChannel.send).toHaveBeenCalled();
      expect(mockFCMChannel.send).toHaveBeenCalled();
    });

    it('should broadcast to multiple active sessions', async () => {
      const broadcastNotification = {
        id: 'broadcast-notification',
        userId: 'broadcast-user',
        type: 'system_broadcast',
        channels: ['websocket'],
        content: 'System maintenance in 5 minutes',
        recipient: {
          userId: 'broadcast-user',
          sessionIds: ['session-1', 'session-2', 'session-3'] // Multiple sessions
        },
        broadcast: true
      };

      const result = await channelManager.sendNotification(broadcastNotification);

      expect(result.success).toBe(true);
      expect(mockWebSocketChannel.send).toHaveBeenCalledTimes(1);
      
      // Should send to all sessions in single call
      expect(mockWebSocketChannel.send).toHaveBeenCalledWith(
        expect.objectContaining({
          broadcast: true,
          sessionIds: ['session-1', 'session-2', 'session-3']
        })
      );
    });
  });

  describe('Channel Health and Circuit Breaker', () => {
    it('should detect channel health issues', async () => {
      const notification = {
        id: 'health-check',
        userId: 'health-user',
        type: 'test_notification',
        channels: ['email'],
        content: 'Health check message',
        recipient: { email: 'test@example.com' }
      };

      // Mock repeated failures to trigger health issue detection
      mockSendGridChannel.send.mockRejectedValue(new Error('Service unhealthy'));

      const result = await channelManager.sendNotification(notification);

      expect(result.success).toBe(false);
      expect(result.channelResults.email.success).toBe(false);

      // Should track channel health
      const channelHealth = await channelManager.getChannelHealth();
      expect(channelHealth.email.status).toBe('unhealthy');
      expect(channelHealth.email.failures).toBeGreaterThan(0);
    });

    it('should implement circuit breaker for failing channels', async () => {
      // Simulate multiple failures to trigger circuit breaker
      mockSendGridChannel.send.mockRejectedValue(new Error('Repeated service failure'));

      const notifications = Array.from({ length: 10 }, (_, i) => ({
        id: `circuit-${i}`,
        userId: `user-${i}`,
        type: 'circuit_test',
        channels: ['email'],
        content: `Test message ${i}`,
        recipient: { email: `user${i}@example.com` }
      }));

      const results = [];
      for (const notification of notifications) {
        const result = await channelManager.sendNotification(notification);
        results.push(result);
      }

      // After threshold failures, circuit should open
      const circuitBreakerTriggered = results.some(r => 
        r.channelResults.email.error?.includes('circuit_breaker_open')
      );
      expect(circuitBreakerTriggered).toBe(true);

      const channelHealth = await channelManager.getChannelHealth();
      expect(channelHealth.email.circuitBreakerStatus).toBe('open');
    });

    it('should recover from circuit breaker after timeout', async () => {
      // Trigger circuit breaker
      mockSendGridChannel.send.mockRejectedValue(new Error('Service down'));
      
      await channelManager.sendNotification({
        id: 'trigger-circuit-breaker',
        userId: 'user',
        type: 'test',
        channels: ['email'],
        content: 'Test',
        recipient: { email: 'test@example.com' }
      });

      // Wait for circuit breaker timeout (mocked)
      await channelManager.advanceCircuitBreakerTimer(60000); // 1 minute

      // Fix service
      mockSendGridChannel.send.mockResolvedValue({ success: true, messageId: 'recovered' });

      // Should allow test request through
      const recoveryResult = await channelManager.sendNotification({
        id: 'recovery-test',
        userId: 'user',
        type: 'test',
        channels: ['email'],
        content: 'Recovery test',
        recipient: { email: 'test@example.com' }
      });

      expect(recoveryResult.success).toBe(true);
      expect(recoveryResult.channelResults.email.success).toBe(true);

      const channelHealth = await channelManager.getChannelHealth();
      expect(channelHealth.email.circuitBreakerStatus).toBe('closed');
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle high-volume concurrent deliveries', async () => {
      const concurrentNotifications = Array.from({ length: 100 }, (_, i) => ({
        id: `concurrent-${i}`,
        userId: `user-${i}`,
        type: 'concurrent_test',
        channels: ['email'],
        content: `Concurrent message ${i}`,
        recipient: { email: `user${i}@example.com` }
      }));

      const startTime = Date.now();

      const results = await Promise.all(
        concurrentNotifications.map(notification =>
          channelManager.sendNotification(notification)
        )
      );

      const processingTime = Date.now() - startTime;

      // All should succeed
      expect(results.every(r => r.success)).toBe(true);

      // Should complete in reasonable time (under 10 seconds)
      expect(processingTime).toBeLessThan(10000);

      // Should have made 100 email send calls
      expect(mockSendGridChannel.send).toHaveBeenCalledTimes(100);
    });

    it('should optimize channel connections with pooling', async () => {
      const pooledNotifications = Array.from({ length: 50 }, (_, i) => ({
        id: `pooled-${i}`,
        userId: `pool-user-${i}`,
        type: 'pooled_test',
        channels: ['sms'],
        content: `Pooled message ${i}`,
        recipient: { phone: `+123456${i.toString().padStart(4, '0')}` }
      }));

      mockTwilioChannel.send.mockImplementation(async () => {
        // Simulate connection pooling efficiency
        await new Promise(resolve => setTimeout(resolve, 10)); // 10ms per send
        return { success: true, messageId: `sms-${Math.random()}` };
      });

      const startTime = Date.now();
      
      await Promise.all(
        pooledNotifications.map(notification =>
          channelManager.sendNotification(notification)
        )
      );

      const processingTime = Date.now() - startTime;

      // Should complete efficiently with connection pooling
      expect(processingTime).toBeLessThan(3000); // Should be much faster than 50 * 10ms

      expect(mockTwilioChannel.send).toHaveBeenCalledTimes(50);
    });

    it('should implement channel-specific rate limiting', async () => {
      const rateLimitedNotifications = Array.from({ length: 20 }, (_, i) => ({
        id: `rate-limited-${i}`,
        userId: `rate-user-${i}`,
        type: 'rate_test',
        channels: ['sms'],
        content: `Rate limited message ${i}`,
        recipient: { phone: `+123456${i.toString().padStart(4, '0')}` },
        channelRateLimit: {
          sms: { maxPerSecond: 5, maxPerMinute: 100 }
        }
      }));

      let sendCount = 0;
      mockTwilioChannel.send.mockImplementation(async () => {
        sendCount++;
        return { success: true, messageId: `sms-${sendCount}` };
      });

      const startTime = Date.now();
      
      const results = await Promise.all(
        rateLimitedNotifications.map(notification =>
          channelManager.sendNotification(notification)
        )
      );

      const processingTime = Date.now() - startTime;

      expect(results.every(r => r.success)).toBe(true);
      
      // Should take at least 4 seconds to send 20 messages at 5/second rate
      expect(processingTime).toBeGreaterThan(3000);
      
      expect(mockTwilioChannel.send).toHaveBeenCalledTimes(20);
    });

    it('should cache channel configurations for performance', async () => {
      const cachedNotifications = Array.from({ length: 30 }, (_, i) => ({
        id: `cached-${i}`,
        userId: 'same-user', // Same user for all
        type: 'cached_test',
        channels: ['email', 'sms'],
        content: `Cached message ${i}`,
        recipient: {
          email: 'user@example.com',
          phone: '+1234567890'
        }
      }));

      mockDatabase.getUserNotificationPreferences.mockResolvedValue({
        email: true,
        sms: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00'
      });

      for (const notification of cachedNotifications) {
        await channelManager.sendNotification(notification);
      }

      // Should only fetch user preferences once due to caching
      expect(mockDatabase.getUserNotificationPreferences).toHaveBeenCalledTimes(1);

      // Should have sent all notifications
      expect(mockSendGridChannel.send).toHaveBeenCalledTimes(30);
      expect(mockTwilioChannel.send).toHaveBeenCalledTimes(30);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle channel initialization failures', async () => {
      const failingChannelManager = new ChannelManager({
        channels: {
          email: mockSendGridChannel,
          sms: null as any // Null channel to simulate initialization failure
        },
        database: mockDatabase,
        logger: mockLogger
      });

      const notification = {
        id: 'init-fail',
        userId: 'fail-user',
        type: 'test',
        channels: ['sms'],
        content: 'Test message',
        recipient: { phone: '+1234567890' }
      };

      const result = await failingChannelManager.sendNotification(notification);

      expect(result.success).toBe(false);
      expect(result.channelResults.sms.success).toBe(false);
      expect(result.channelResults.sms.error).toContain('Channel not initialized');

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Channel not available'),
        expect.objectContaining({
          channel: 'sms',
          notificationId: 'init-fail'
        })
      );
    });

    it('should implement exponential backoff for retries', async () => {
      const notification = {
        id: 'retry-notification',
        userId: 'retry-user',
        type: 'retry_test',
        channels: ['email'],
        content: 'Retry test message',
        recipient: { email: 'retry@example.com' },
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'exponential',
          initialDelay: 1000
        }
      };

      let attemptCount = 0;
      mockSendGridChannel.send.mockImplementation(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return { success: true, messageId: 'retry-success' };
      });

      const result = await channelManager.sendNotification(notification);

      expect(result.success).toBe(true);
      expect(result.channelResults.email.success).toBe(true);
      expect(result.channelResults.email.attempts).toBe(3);
      
      expect(mockSendGridChannel.send).toHaveBeenCalledTimes(3);
    });

    it('should handle timeout scenarios gracefully', async () => {
      const notification = {
        id: 'timeout-notification',
        userId: 'timeout-user',
        type: 'timeout_test',
        channels: ['sms'],
        content: 'Timeout test',
        recipient: { phone: '+1234567890' },
        timeout: 5000 // 5 second timeout
      };

      // Mock slow response (longer than timeout)
      mockTwilioChannel.send.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => 
          resolve({ success: true, messageId: 'slow-response' }), 10000
        ))
      );

      const result = await channelManager.sendNotification(notification);

      expect(result.success).toBe(false);
      expect(result.channelResults.sms.success).toBe(false);
      expect(result.channelResults.sms.error).toContain('timeout');
      expect(result.channelResults.sms.duration).toBeGreaterThan(4900);
    });
  });
});