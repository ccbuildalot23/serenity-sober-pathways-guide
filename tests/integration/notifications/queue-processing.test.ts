import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { NotificationQueueProcessor } from '../../../services/notification-service/src/services/queue';
import { TestRedis } from '../../utils/test-redis';
import { MockTwilioService } from '../../mocks/twilio-mock';
import { MockSendGridService } from '../../mocks/sendgrid-mock';
import { MockFCMService } from '../../mocks/fcm-mock';
import { NotificationTestFactory } from '../../utils/notification-test-factory';

describe('Notification Queue Processing', () => {
  let testRedis: TestRedis;
  let redisConnection: Redis;
  let notificationQueue: Queue;
  let queueProcessor: NotificationQueueProcessor;
  let mockTwilio: MockTwilioService;
  let mockSendGrid: MockSendGridService;
  let mockFCM: MockFCMService;
  let testFactory: NotificationTestFactory;

  beforeAll(async () => {
    testRedis = new TestRedis();
    await testRedis.setup();
    
    redisConnection = testRedis.getConnection();
    
    // Initialize services
    mockTwilio = new MockTwilioService();
    mockSendGrid = new MockSendGridService();
    mockFCM = new MockFCMService();
    testFactory = new NotificationTestFactory();
    
    // Create notification queue
    notificationQueue = new Queue('notifications', {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      }
    });

    // Initialize queue processor
    queueProcessor = new NotificationQueueProcessor({
      redisConnection,
      services: {
        twilio: mockTwilio,
        sendGrid: mockSendGrid,
        fcm: mockFCM
      }
    });

    await queueProcessor.start();
  });

  afterAll(async () => {
    await queueProcessor.stop();
    await notificationQueue.close();
    await testRedis.cleanup();
  });

  beforeEach(async () => {
    await notificationQueue.drain();
    await notificationQueue.clean(0, 1000); // Remove all completed/failed jobs
    mockTwilio.reset();
    mockSendGrid.reset();
    mockFCM.reset();
  });

  describe('Basic Queue Operations', () => {
    it('should process single notification job successfully', async () => {
      const notificationJob = testFactory.createNotificationJob({
        userId: 'user-123',
        type: 'daily_checkin_reminder',
        channels: ['email'],
        content: 'Time for your daily check-in!',
        recipient: {
          email: 'user@example.com',
          firstName: 'John'
        }
      });

      const job = await notificationQueue.add('send-notification', notificationJob);

      // Wait for job processing
      await job.waitUntilFinished(queueProcessor.getQueueEvents());

      // Verify email was sent
      const sentEmails = mockSendGrid.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      expect(sentEmails[0]).toMatchObject({
        to: 'user@example.com',
        templateId: 'daily_checkin_reminder',
        personalizations: [{
          to: [{ email: 'user@example.com' }],
          dynamic_template_data: expect.objectContaining({
            firstName: 'John'
          })
        }]
      });

      // Verify job completion
      const jobStatus = await job.getState();
      expect(jobStatus).toBe('completed');
    });

    it('should handle job failures with proper retry logic', async () => {
      // Mock service failure
      mockSendGrid.mockFailure('Service temporarily unavailable');

      const failingJob = testFactory.createNotificationJob({
        userId: 'user-456',
        type: 'test_notification',
        channels: ['email'],
        recipient: { email: 'test@example.com' }
      });

      const job = await notificationQueue.add('send-notification', failingJob);

      // Wait for all retry attempts to complete
      await new Promise(resolve => setTimeout(resolve, 20000));

      const jobStatus = await job.getState();
      expect(jobStatus).toBe('failed');

      // Verify retry attempts
      const jobData = await job.getData();
      expect(job.attemptsMade).toBe(3); // Should have made 3 attempts

      // Verify no emails were sent due to failures
      const sentEmails = mockSendGrid.getSentEmails();
      expect(sentEmails).toHaveLength(0);

      // Clear failure for next tests
      mockSendGrid.clearFailure();
    });

    it('should process multi-channel notifications correctly', async () => {
      const multiChannelJob = testFactory.createNotificationJob({
        userId: 'user-789',
        type: 'crisis_alert',
        channels: ['sms', 'email', 'push'],
        content: 'Crisis alert - immediate attention required',
        recipient: {
          phone: '+1234567890',
          email: 'user@example.com',
          pushTokens: ['fcm_token_123']
        }
      });

      const job = await notificationQueue.add('send-notification', multiChannelJob);
      await job.waitUntilFinished(queueProcessor.getQueueEvents());

      // Verify all channels were used
      const sentSMS = mockTwilio.getSentSMS();
      const sentEmails = mockSendGrid.getSentEmails();
      const sentPush = mockFCM.getSentNotifications();

      expect(sentSMS).toHaveLength(1);
      expect(sentEmails).toHaveLength(1);
      expect(sentPush).toHaveLength(1);

      // Verify content consistency across channels
      expect(sentSMS[0].body).toContain('Crisis alert');
      expect(sentEmails[0].subject).toContain('Crisis Alert');
      expect(sentPush[0].notification.title).toContain('Crisis Alert');
    });

    it('should respect priority-based job processing', async () => {
      const jobs = [
        {
          priority: 1, // Low priority
          type: 'daily_motivation',
          processingOrder: 3
        },
        {
          priority: 10, // High priority
          type: 'crisis_alert',
          processingOrder: 1
        },
        {
          priority: 5, // Normal priority
          type: 'appointment_reminder',
          processingOrder: 2
        }
      ];

      const jobPromises = jobs.map(jobConfig => 
        notificationQueue.add('send-notification', 
          testFactory.createNotificationJob({
            userId: `user-${jobConfig.processingOrder}`,
            type: jobConfig.type,
            channels: ['email'],
            recipient: { email: `user${jobConfig.processingOrder}@example.com` }
          }),
          { priority: jobConfig.priority }
        )
      );

      const addedJobs = await Promise.all(jobPromises);

      // Wait for all jobs to complete
      await Promise.all(
        addedJobs.map(job => job.waitUntilFinished(queueProcessor.getQueueEvents()))
      );

      const sentEmails = mockSendGrid.getSentEmails();
      expect(sentEmails).toHaveLength(3);

      // Verify processing order based on priority (high to low)
      expect(sentEmails[0].to).toBe('user1@example.com'); // Crisis alert (priority 10)
      expect(sentEmails[1].to).toBe('user2@example.com'); // Appointment (priority 5)
      expect(sentEmails[2].to).toBe('user3@example.com'); // Motivation (priority 1)
    });
  });

  describe('Batch Processing', () => {
    it('should efficiently process batch notification jobs', async () => {
      const batchSize = 100;
      const batchJob = testFactory.createBatchNotificationJob({
        batchId: 'batch-001',
        type: 'system_announcement',
        channels: ['email'],
        recipients: Array.from({ length: batchSize }, (_, i) => ({
          userId: `batch-user-${i}`,
          email: `batchuser${i}@example.com`,
          firstName: `User${i}`
        })),
        content: 'Important system maintenance announcement',
        batchProcessingOptions: {
          maxConcurrency: 10,
          delayBetweenBatches: 100 // 100ms
        }
      });

      const startTime = Date.now();
      const job = await notificationQueue.add('send-batch-notification', batchJob);
      await job.waitUntilFinished(queueProcessor.getQueueEvents());
      const processingTime = Date.now() - startTime;

      // Should complete batch in reasonable time (under 30 seconds)
      expect(processingTime).toBeLessThan(30000);

      // Verify all emails were sent
      const sentEmails = mockSendGrid.getSentEmails();
      expect(sentEmails).toHaveLength(batchSize);

      // Verify batch processing respects concurrency limits
      const processingLogs = await queueProcessor.getBatchProcessingLogs('batch-001');
      expect(processingLogs.maxConcurrentJobs).toBeLessThanOrEqual(10);
    });

    it('should handle partial batch failures gracefully', async () => {
      // Mock intermittent failures (every 5th email fails)
      mockSendGrid.mockSelectiveFailure(email => 
        email.to.endsWith('4@example.com') || email.to.endsWith('9@example.com')
      );

      const batchJob = testFactory.createBatchNotificationJob({
        batchId: 'batch-002',
        type: 'weekly_progress',
        channels: ['email'],
        recipients: Array.from({ length: 20 }, (_, i) => ({
          userId: `user-${i}`,
          email: `user${i}@example.com`
        })),
        failureHandling: {
          continueOnFailure: true,
          maxFailureRate: 0.2 // Allow up to 20% failures
        }
      });

      const job = await notificationQueue.add('send-batch-notification', batchJob);
      await job.waitUntilFinished(queueProcessor.getQueueEvents());

      // Should succeed overall despite partial failures
      const jobStatus = await job.getState();
      expect(jobStatus).toBe('completed');

      // Verify successful sends
      const sentEmails = mockSendGrid.getSentEmails();
      expect(sentEmails).toHaveLength(16); // 20 - 4 failures

      // Verify failure tracking
      const batchResult = await job.returnvalue;
      expect(batchResult.totalAttempts).toBe(20);
      expect(batchResult.successCount).toBe(16);
      expect(batchResult.failureCount).toBe(4);
      expect(batchResult.failureRate).toBe(0.2);

      mockSendGrid.clearFailure();
    });

    it('should abort batch if failure rate exceeds threshold', async () => {
      // Mock high failure rate (60% failures)
      mockSendGrid.mockSelectiveFailure(email => 
        !email.to.includes('user0@') && !email.to.includes('user1@') && 
        !email.to.includes('user2@') && !email.to.includes('user3@')
      );

      const batchJob = testFactory.createBatchNotificationJob({
        batchId: 'batch-003',
        type: 'critical_update',
        channels: ['email'],
        recipients: Array.from({ length: 10 }, (_, i) => ({
          userId: `user-${i}`,
          email: `user${i}@example.com`
        })),
        failureHandling: {
          continueOnFailure: true,
          maxFailureRate: 0.3, // Max 30% failures
          abortOnThresholdExceeded: true
        }
      });

      const job = await notificationQueue.add('send-batch-notification', batchJob);
      
      // Job should fail due to high failure rate
      await expect(
        job.waitUntilFinished(queueProcessor.getQueueEvents())
      ).rejects.toThrow();

      const jobStatus = await job.getState();
      expect(jobStatus).toBe('failed');

      // Should have stopped processing when threshold was exceeded
      const sentEmails = mockSendGrid.getSentEmails();
      expect(sentEmails.length).toBeLessThan(10);

      mockSendGrid.clearFailure();
    });
  });

  describe('Scheduled and Delayed Jobs', () => {
    it('should process scheduled notifications at correct time', async () => {
      const scheduleTime = new Date(Date.now() + 5000); // 5 seconds from now
      
      const scheduledJob = testFactory.createNotificationJob({
        userId: 'scheduled-user',
        type: 'scheduled_reminder',
        channels: ['sms'],
        recipient: { phone: '+1234567890' },
        scheduledFor: scheduleTime
      });

      const job = await notificationQueue.add(
        'send-notification', 
        scheduledJob,
        { delay: 5000 }
      );

      // Should not be processed immediately
      await new Promise(resolve => setTimeout(resolve, 2000));
      expect(mockTwilio.getSentSMS()).toHaveLength(0);

      // Should be processed after delay
      await job.waitUntilFinished(queueProcessor.getQueueEvents());
      
      const sentSMS = mockTwilio.getSentSMS();
      expect(sentSMS).toHaveLength(1);
      
      // Verify timing
      const actualSentTime = new Date(sentSMS[0].dateCreated);
      const timeDifference = Math.abs(actualSentTime.getTime() - scheduleTime.getTime());
      expect(timeDifference).toBeLessThan(2000); // Within 2 seconds tolerance
    });

    it('should handle timezone-aware scheduling', async () => {
      const userTimezone = 'America/Los_Angeles';
      const localTime = '09:00'; // 9 AM Pacific
      
      const timezoneJob = testFactory.createNotificationJob({
        userId: 'timezone-user',
        type: 'morning_motivation',
        channels: ['email'],
        recipient: { 
          email: 'user@example.com',
          timezone: userTimezone
        },
        scheduledFor: localTime, // Will be converted to UTC
        timezoneAware: true
      });

      const job = await notificationQueue.add('send-timezone-notification', timezoneJob);
      await job.waitUntilFinished(queueProcessor.getQueueEvents());

      const sentEmails = mockSendGrid.getSentEmails();
      expect(sentEmails).toHaveLength(1);
      
      // Verify timezone was properly handled
      const jobResult = await job.returnvalue;
      expect(jobResult.scheduledInTimezone).toBe(userTimezone);
      expect(jobResult.localScheduledTime).toBe(localTime);
    });

    it('should reschedule failed delayed jobs appropriately', async () => {
      // Mock temporary failure
      mockSendGrid.mockFailure('Temporary service outage');

      const delayedJob = testFactory.createNotificationJob({
        userId: 'retry-user',
        type: 'important_reminder',
        channels: ['email'],
        recipient: { email: 'retry@example.com' },
        retryOptions: {
          maxRetries: 2,
          retryDelay: 1000 // 1 second for testing
        }
      });

      const job = await notificationQueue.add(
        'send-notification', 
        delayedJob,
        { delay: 2000, attempts: 3 }
      );

      // Let initial attempts fail
      await new Promise(resolve => setTimeout(resolve, 8000));

      // Clear failure and wait for final retry
      mockSendGrid.clearFailure();
      await new Promise(resolve => setTimeout(resolve, 3000));

      const sentEmails = mockSendGrid.getSentEmails();
      expect(sentEmails).toHaveLength(1);

      const jobStatus = await job.getState();
      expect(jobStatus).toBe('completed');
    });
  });

  describe('Rate Limiting and Throttling', () => {
    it('should enforce rate limits at queue level', async () => {
      const rateLimitedQueue = new Queue('rate-limited-notifications', {
        connection: redisConnection,
        settings: {
          stalledInterval: 30 * 1000,
          maxStalledCount: 1
        },
        limiter: {
          max: 5, // Max 5 jobs per minute
          duration: 60 * 1000
        }
      });

      // Add 10 jobs rapidly
      const jobs = await Promise.all(
        Array.from({ length: 10 }, (_, i) => 
          rateLimitedQueue.add('send-notification', 
            testFactory.createNotificationJob({
              userId: `rate-user-${i}`,
              type: 'rate_test',
              channels: ['email'],
              recipient: { email: `rateuser${i}@example.com` }
            })
          )
        )
      );

      // Wait for rate limiting to take effect
      await new Promise(resolve => setTimeout(resolve, 10000));

      // Only 5 jobs should have been processed initially
      const sentEmails = mockSendGrid.getSentEmails();
      expect(sentEmails.length).toBeLessThanOrEqual(5);

      // Wait for rate limit window to reset
      await new Promise(resolve => setTimeout(resolve, 55000));

      // Remaining jobs should now be processed
      await Promise.all(
        jobs.map(job => job.waitUntilFinished(queueProcessor.getQueueEvents()))
      );

      const finalSentEmails = mockSendGrid.getSentEmails();
      expect(finalSentEmails).toHaveLength(10);

      await rateLimitedQueue.close();
    });

    it('should implement channel-specific throttling', async () => {
      const smsJobs = Array.from({ length: 20 }, (_, i) => 
        testFactory.createNotificationJob({
          userId: `sms-user-${i}`,
          type: 'sms_test',
          channels: ['sms'],
          recipient: { phone: `+12345678${i.toString().padStart(2, '0')}` },
          throttling: {
            channel: 'sms',
            maxPerSecond: 2 // Limit SMS to 2 per second
          }
        })
      );

      const startTime = Date.now();
      
      const jobs = await Promise.all(
        smsJobs.map(jobData => notificationQueue.add('send-notification', jobData))
      );

      await Promise.all(
        jobs.map(job => job.waitUntilFinished(queueProcessor.getQueueEvents()))
      );

      const processingTime = Date.now() - startTime;
      const sentSMS = mockTwilio.getSentSMS();

      expect(sentSMS).toHaveLength(20);
      
      // Should take at least 10 seconds to send 20 SMS at 2/second rate
      expect(processingTime).toBeGreaterThan(9000);
      
      // Verify throttling was applied
      const throttlingLogs = await queueProcessor.getThrottlingLogs();
      expect(throttlingLogs.some(log => log.channel === 'sms')).toBe(true);
    });

    it('should bypass rate limits for critical notifications', async () => {
      const rateLimitedQueue = new Queue('critical-bypass', {
        connection: redisConnection,
        limiter: {
          max: 1, // Very strict limit
          duration: 30 * 1000
        }
      });

      // Add critical and normal priority jobs
      const jobs = await Promise.all([
        rateLimitedQueue.add('send-notification',
          testFactory.createNotificationJob({
            userId: 'critical-user-1',
            type: 'crisis_alert',
            priority: 'critical',
            channels: ['sms'],
            recipient: { phone: '+1111111111' },
            bypassRateLimit: true
          }),
          { priority: 100 }
        ),
        rateLimitedQueue.add('send-notification',
          testFactory.createNotificationJob({
            userId: 'normal-user',
            type: 'daily_tip',
            priority: 'normal',
            channels: ['sms'],
            recipient: { phone: '+2222222222' }
          }),
          { priority: 1 }
        ),
        rateLimitedQueue.add('send-notification',
          testFactory.createNotificationJob({
            userId: 'critical-user-2',
            type: 'emergency_alert',
            priority: 'critical',
            channels: ['sms'],
            recipient: { phone: '+3333333333' },
            bypassRateLimit: true
          }),
          { priority: 100 }
        )
      ]);

      await Promise.all(
        jobs.map(job => job.waitUntilFinished(queueProcessor.getQueueEvents()))
      );

      const sentSMS = mockTwilio.getSentSMS();
      
      // All critical notifications should be sent regardless of rate limits
      const criticalSMS = sentSMS.filter(sms => 
        sms.to === '+1111111111' || sms.to === '+3333333333'
      );
      expect(criticalSMS).toHaveLength(2);

      // Normal notification should be sent as well (within rate limit)
      const normalSMS = sentSMS.find(sms => sms.to === '+2222222222');
      expect(normalSMS).toBeDefined();

      await rateLimitedQueue.close();
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle worker crashes gracefully', async () => {
      const job = await notificationQueue.add('send-notification',
        testFactory.createNotificationJob({
          userId: 'crash-test',
          type: 'crash_simulation',
          channels: ['email'],
          recipient: { email: 'crash@example.com' }
        })
      );

      // Simulate worker crash during processing
      await queueProcessor.simulateCrash();

      // Wait a moment then restart
      await new Promise(resolve => setTimeout(resolve, 2000));
      await queueProcessor.restart();

      // Job should be retried and completed
      await job.waitUntilFinished(queueProcessor.getQueueEvents());

      const sentEmails = mockSendGrid.getSentEmails();
      expect(sentEmails).toHaveLength(1);

      const jobStatus = await job.getState();
      expect(jobStatus).toBe('completed');
    });

    it('should handle dead letter queue for permanently failed jobs', async () => {
      // Mock permanent failure
      mockTwilio.mockPermanentFailure('Invalid phone number');

      const permanentFailJob = testFactory.createNotificationJob({
        userId: 'dead-letter-user',
        type: 'sms_permanent_fail',
        channels: ['sms'],
        recipient: { phone: 'invalid-phone' }
      });

      const job = await notificationQueue.add('send-notification', permanentFailJob);

      // Wait for all retry attempts to exhaust
      await new Promise(resolve => setTimeout(resolve, 30000));

      const jobStatus = await job.getState();
      expect(jobStatus).toBe('failed');

      // Job should be moved to dead letter queue
      const deadLetterJobs = await queueProcessor.getDeadLetterJobs();
      expect(deadLetterJobs).toContainEqual(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'dead-letter-user'
          })
        })
      );

      mockTwilio.clearFailure();
    });

    it('should provide comprehensive monitoring and metrics', async () => {
      // Process various types of jobs
      const testJobs = [
        { type: 'success_job', shouldFail: false },
        { type: 'retry_job', shouldFail: true, retries: 2 },
        { type: 'fail_job', shouldFail: true, retries: 0 }
      ];

      for (const testJob of testJobs) {
        if (testJob.shouldFail) {
          mockSendGrid.mockFailure('Test failure', testJob.retries);
        }

        const job = await notificationQueue.add('send-notification',
          testFactory.createNotificationJob({
            userId: `metrics-user-${testJob.type}`,
            type: testJob.type,
            channels: ['email'],
            recipient: { email: `${testJob.type}@example.com` }
          })
        );

        try {
          await job.waitUntilFinished(queueProcessor.getQueueEvents());
        } catch (error) {
          // Expected for fail_job
        }

        mockSendGrid.clearFailure();
      }

      // Get comprehensive metrics
      const metrics = await queueProcessor.getMetrics();

      expect(metrics).toMatchObject({
        totalProcessed: 3,
        successful: 2, // success_job + retry_job (after retries)
        failed: 1, // fail_job
        retryCount: expect.any(Number),
        averageProcessingTime: expect.any(Number),
        throughput: expect.any(Number)
      });

      // Channel-specific metrics
      expect(metrics.channels.email).toMatchObject({
        sent: 2,
        failed: 1,
        averageDeliveryTime: expect.any(Number)
      });
    });
  });

  describe('Queue Health and Monitoring', () => {
    it('should detect and alert on queue health issues', async () => {
      // Create stalled jobs by stopping processor
      await queueProcessor.stop();

      const stalledJobs = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          notificationQueue.add('send-notification',
            testFactory.createNotificationJob({
              userId: `stalled-user-${i}`,
              type: 'stalled_job',
              channels: ['email'],
              recipient: { email: `stalled${i}@example.com` }
            })
          )
        )
      );

      // Wait for jobs to become stalled
      await new Promise(resolve => setTimeout(resolve, 35000));

      // Check queue health
      const queueHealth = await queueProcessor.checkQueueHealth();
      
      expect(queueHealth).toMatchObject({
        status: 'unhealthy',
        stalledJobs: 5,
        waitingJobs: expect.any(Number),
        activeJobs: 0,
        issues: expect.arrayContaining(['stalled_jobs_detected'])
      });

      // Restart processor to clear stalled jobs
      await queueProcessor.start();
      
      // Wait for recovery
      await Promise.all(
        stalledJobs.map(job => job.waitUntilFinished(queueProcessor.getQueueEvents()))
      );

      const recoveredHealth = await queueProcessor.checkQueueHealth();
      expect(recoveredHealth.status).toBe('healthy');
    });

    it('should provide queue statistics and insights', async () => {
      // Generate various job patterns
      const jobPatterns = [
        { type: 'email', count: 10, avgDuration: 500 },
        { type: 'sms', count: 15, avgDuration: 200 },
        { type: 'push', count: 8, avgDuration: 100 }
      ];

      for (const pattern of jobPatterns) {
        for (let i = 0; i < pattern.count; i++) {
          await notificationQueue.add('send-notification',
            testFactory.createNotificationJob({
              userId: `stats-user-${pattern.type}-${i}`,
              type: `${pattern.type}_notification`,
              channels: [pattern.type as any],
              recipient: { 
                email: pattern.type === 'email' ? `user${i}@example.com` : undefined,
                phone: pattern.type === 'sms' ? `+123456${i.toString().padStart(4, '0')}` : undefined,
                pushTokens: pattern.type === 'push' ? [`token_${i}`] : undefined
              }
            })
          );
        }
      }

      // Wait for all jobs to process
      await new Promise(resolve => setTimeout(resolve, 10000));

      const queueStats = await queueProcessor.getQueueStatistics({
        timeWindow: '1h',
        groupBy: ['type', 'channel', 'status']
      });

      expect(queueStats.totalJobs).toBe(33);
      expect(queueStats.byChannel).toMatchObject({
        email: expect.objectContaining({ count: 10 }),
        sms: expect.objectContaining({ count: 15 }),
        push: expect.objectContaining({ count: 8 })
      });

      expect(queueStats.performance).toMatchObject({
        averageProcessingTime: expect.any(Number),
        successRate: expect.any(Number),
        throughputPerMinute: expect.any(Number)
      });
    });
  });
});