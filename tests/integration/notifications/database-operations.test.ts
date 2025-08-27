import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { NotificationDatabase } from '../../../services/notification-service/src/services/database';
import { TestDatabase } from '../../utils/test-database';
import { NotificationTestFactory } from '../../utils/notification-test-factory';

describe('Notification Database Operations', () => {
  let testDb: TestDatabase;
  let notificationDb: NotificationDatabase;
  let supabaseClient: any;
  let testUserId: string;
  let providerUserId: string;
  let supportContactId: string;

  beforeAll(async () => {
    testDb = new TestDatabase();
    await testDb.setup();
    
    supabaseClient = createClient(
      process.env.TEST_SUPABASE_URL!,
      process.env.TEST_SUPABASE_ANON_KEY!
    );
    
    notificationDb = new NotificationDatabase(supabaseClient);
    
    // Create test users
    testUserId = await testDb.createUser({
      email: 'test-patient@db.com',
      role: 'patient',
      phone: '+1234567890'
    });
    
    providerUserId = await testDb.createUser({
      email: 'test-provider@db.com',
      role: 'provider',
      phone: '+1987654321'
    });

    supportContactId = await testDb.createSupportContact({
      userId: testUserId,
      name: 'Test Support',
      phone: '+1555000001',
      email: 'support@test.com'
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  beforeEach(async () => {
    await testDb.clearNotifications();
  });

  describe('Notification Preferences', () => {
    it('should create and retrieve notification preferences', async () => {
      const preferences = {
        userId: testUserId,
        email: true,
        sms: true,
        push: false,
        whatsapp: false,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        timezone: 'America/New_York',
        maxSmsPerDay: 10,
        maxEmailPerDay: 20
      };

      await notificationDb.saveNotificationPreferences(preferences);

      const retrieved = await notificationDb.getNotificationPreferences(testUserId);
      expect(retrieved).toMatchObject(preferences);
    });

    it('should update existing preferences', async () => {
      const initialPrefs = {
        userId: testUserId,
        email: true,
        sms: false,
        push: true
      };

      await notificationDb.saveNotificationPreferences(initialPrefs);

      const updatedPrefs = {
        userId: testUserId,
        email: false,
        sms: true,
        push: true,
        whatsapp: true
      };

      await notificationDb.saveNotificationPreferences(updatedPrefs);

      const retrieved = await notificationDb.getNotificationPreferences(testUserId);
      expect(retrieved.email).toBe(false);
      expect(retrieved.sms).toBe(true);
      expect(retrieved.whatsapp).toBe(true);
    });

    it('should enforce RLS policies for preferences access', async () => {
      const otherUserId = await testDb.createUser({
        email: 'other-user@test.com',
        role: 'patient'
      });

      await notificationDb.saveNotificationPreferences({
        userId: testUserId,
        email: true,
        sms: true
      });

      // Create client authenticated as other user
      const otherUserClient = await testDb.createUserClient(otherUserId);
      const otherUserNotificationDb = new NotificationDatabase(otherUserClient);

      // Should not be able to access other user's preferences
      await expect(
        otherUserNotificationDb.getNotificationPreferences(testUserId)
      ).rejects.toThrow();
    });

    it('should handle batch preference updates efficiently', async () => {
      const batchUsers = await Promise.all(
        Array.from({ length: 100 }, (_, i) => 
          testDb.createUser({
            email: `batch-user-${i}@test.com`,
            role: 'patient'
          })
        )
      );

      const batchPreferences = batchUsers.map(userId => ({
        userId,
        email: true,
        sms: Math.random() > 0.5,
        push: Math.random() > 0.3,
        quietHoursStart: '23:00',
        quietHoursEnd: '06:00'
      }));

      const startTime = Date.now();
      await notificationDb.batchUpdatePreferences(batchPreferences);
      const duration = Date.now() - startTime;

      // Should complete batch update in under 5 seconds
      expect(duration).toBeLessThan(5000);

      // Verify all preferences were saved correctly
      const savedPrefs = await Promise.all(
        batchUsers.map(userId => notificationDb.getNotificationPreferences(userId))
      );

      expect(savedPrefs).toHaveLength(100);
      savedPrefs.forEach((prefs, index) => {
        expect(prefs.userId).toBe(batchUsers[index]);
        expect(prefs.email).toBe(true);
      });
    });
  });

  describe('Notification Queue Management', () => {
    it('should enqueue notification with proper priority ordering', async () => {
      const notifications = [
        {
          userId: testUserId,
          type: 'daily_checkin',
          priority: 'low',
          channels: ['email'],
          scheduledFor: new Date(Date.now() + 60000)
        },
        {
          userId: testUserId,
          type: 'crisis_alert',
          priority: 'critical',
          channels: ['sms', 'email', 'push'],
          scheduledFor: new Date()
        },
        {
          userId: testUserId,
          type: 'appointment_reminder',
          priority: 'normal',
          channels: ['sms'],
          scheduledFor: new Date(Date.now() + 30000)
        }
      ];

      for (const notification of notifications) {
        await notificationDb.enqueueNotification(notification);
      }

      // Should retrieve notifications in priority order
      const queuedNotifications = await notificationDb.getQueuedNotifications({
        limit: 10,
        orderBy: 'priority'
      });

      expect(queuedNotifications).toHaveLength(3);
      expect(queuedNotifications[0].priority).toBe('critical');
      expect(queuedNotifications[1].priority).toBe('normal');
      expect(queuedNotifications[2].priority).toBe('low');
    });

    it('should handle deduplication correctly', async () => {
      const duplicateNotification = {
        userId: testUserId,
        type: 'daily_checkin',
        deduplicationKey: 'daily-checkin-2024-01-15',
        channels: ['email'],
        content: 'Time for your check-in'
      };

      // Enqueue same notification multiple times
      await notificationDb.enqueueNotification(duplicateNotification);
      await notificationDb.enqueueNotification(duplicateNotification);
      await notificationDb.enqueueNotification(duplicateNotification);

      const queuedNotifications = await notificationDb.getQueuedNotifications({
        userId: testUserId,
        type: 'daily_checkin'
      });

      // Should only have one notification due to deduplication
      expect(queuedNotifications).toHaveLength(1);
    });

    it('should track notification delivery status transitions', async () => {
      const notificationId = await notificationDb.enqueueNotification({
        userId: testUserId,
        type: 'test_notification',
        channels: ['sms'],
        content: 'Test message'
      });

      // Track status progression: queued -> processing -> sent
      await notificationDb.updateNotificationStatus(notificationId, 'processing', {
        startedAt: new Date(),
        processingNode: 'worker-1'
      });

      await notificationDb.updateNotificationStatus(notificationId, 'sent', {
        sentAt: new Date(),
        deliveryProvider: 'twilio',
        providerMessageId: 'SMS123456'
      });

      const notification = await notificationDb.getNotification(notificationId);
      expect(notification.status).toBe('sent');
      expect(notification.statusHistory).toHaveLength(3); // queued, processing, sent
      expect(notification.metadata.providerMessageId).toBe('SMS123456');
    });

    it('should handle failed deliveries with retry logic', async () => {
      const notificationId = await notificationDb.enqueueNotification({
        userId: testUserId,
        type: 'test_notification',
        channels: ['sms'],
        maxRetries: 3
      });

      // Simulate delivery failure
      await notificationDb.updateNotificationStatus(notificationId, 'failed', {
        error: 'Service temporarily unavailable',
        failedAt: new Date(),
        retryCount: 1
      });

      const notification = await notificationDb.getNotification(notificationId);
      expect(notification.status).toBe('failed');
      expect(notification.retryCount).toBe(1);
      expect(notification.nextRetryAt).toBeDefined();

      // Should be available for retry
      const retryNotifications = await notificationDb.getNotificationsForRetry();
      expect(retryNotifications).toContainEqual(
        expect.objectContaining({ id: notificationId })
      );
    });

    it('should clean up old notifications based on retention policy', async () => {
      // Create old notifications (older than 90 days)
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 95);

      const oldNotificationIds = await Promise.all([
        notificationDb.enqueueNotification({
          userId: testUserId,
          type: 'old_notification_1',
          channels: ['email'],
          createdAt: oldDate,
          status: 'sent'
        }),
        notificationDb.enqueueNotification({
          userId: testUserId,
          type: 'old_notification_2',
          channels: ['sms'],
          createdAt: oldDate,
          status: 'failed'
        })
      ]);

      // Create recent notification
      const recentNotificationId = await notificationDb.enqueueNotification({
        userId: testUserId,
        type: 'recent_notification',
        channels: ['email']
      });

      // Run cleanup
      const cleanedCount = await notificationDb.cleanupOldNotifications({
        retentionDays: 90,
        batchSize: 1000
      });

      expect(cleanedCount).toBe(2);

      // Old notifications should be gone
      for (const oldId of oldNotificationIds) {
        const oldNotification = await notificationDb.getNotification(oldId);
        expect(oldNotification).toBeNull();
      }

      // Recent notification should remain
      const recentNotification = await notificationDb.getNotification(recentNotificationId);
      expect(recentNotification).toBeDefined();
    });
  });

  describe('Rate Limiting and Throttling', () => {
    it('should track and enforce rate limits per user and channel', async () => {
      // Set rate limit for user
      await notificationDb.setRateLimit(testUserId, 'sms', 'hourly', 5);

      // Send 5 SMS notifications
      for (let i = 0; i < 5; i++) {
        await notificationDb.incrementRateLimitCounter(testUserId, 'sms', 'hourly');
      }

      const rateLimitStatus = await notificationDb.getRateLimitStatus(testUserId, 'sms', 'hourly');
      expect(rateLimitStatus.current).toBe(5);
      expect(rateLimitStatus.limit).toBe(5);
      expect(rateLimitStatus.exceeded).toBe(true);

      // 6th attempt should be blocked
      const canSend = await notificationDb.checkRateLimit(testUserId, 'sms', 'hourly');
      expect(canSend).toBe(false);
    });

    it('should reset rate limits on schedule', async () => {
      await notificationDb.setRateLimit(testUserId, 'email', 'daily', 10);
      
      // Use up daily limit
      for (let i = 0; i < 10; i++) {
        await notificationDb.incrementRateLimitCounter(testUserId, 'email', 'daily');
      }

      let rateLimitStatus = await notificationDb.getRateLimitStatus(testUserId, 'email', 'daily');
      expect(rateLimitStatus.exceeded).toBe(true);

      // Simulate next day reset
      await notificationDb.resetRateLimit(testUserId, 'email', 'daily');

      rateLimitStatus = await notificationDb.getRateLimitStatus(testUserId, 'email', 'daily');
      expect(rateLimitStatus.current).toBe(0);
      expect(rateLimitStatus.exceeded).toBe(false);
    });

    it('should handle burst detection and throttling', async () => {
      const burstNotifications = Array.from({ length: 10 }, (_, i) => ({
        userId: testUserId,
        type: 'burst_test',
        channels: ['sms'],
        burstId: 'test-burst-1',
        createdAt: new Date(Date.now() + i * 100) // 100ms apart
      }));

      for (const notification of burstNotifications) {
        await notificationDb.enqueueNotification(notification);
      }

      const burstAnalysis = await notificationDb.analyzeBurst('test-burst-1');
      
      expect(burstAnalysis).toMatchObject({
        burstId: 'test-burst-1',
        totalNotifications: 10,
        timeSpan: expect.any(Number),
        rateBps: expect.any(Number), // Notifications per second
        shouldThrottle: true
      });

      // Should apply throttling to burst notifications
      const throttledNotifications = await notificationDb.getThrottledNotifications('test-burst-1');
      expect(throttledNotifications.length).toBeGreaterThan(0);
      
      // Should have staggered delivery times
      const deliveryTimes = throttledNotifications.map(n => new Date(n.scheduledFor).getTime());
      const gaps = deliveryTimes.slice(1).map((time, i) => time - deliveryTimes[i]);
      
      // All gaps should be at least 1 second apart
      gaps.forEach(gap => {
        expect(gap).toBeGreaterThanOrEqual(1000);
      });
    });
  });

  describe('Crisis Alert Database Operations', () => {
    it('should store crisis alerts with proper escalation metadata', async () => {
      const crisisAlert = {
        userId: testUserId,
        severity: 'critical',
        message: 'I need immediate help',
        riskFactors: ['suicidal_ideation', 'access_to_means'],
        location: { lat: 40.7128, lng: -74.0060 },
        supportContacts: [supportContactId],
        escalationLevel: 'immediate',
        triggerKeywords: ['help', 'immediate']
      };

      const alertId = await notificationDb.createCrisisAlert(crisisAlert);
      expect(alertId).toBeDefined();

      const savedAlert = await notificationDb.getCrisisAlert(alertId);
      expect(savedAlert).toMatchObject(crisisAlert);
      expect(savedAlert.createdAt).toBeInstanceOf(Date);
      expect(savedAlert.status).toBe('active');
    });

    it('should track crisis escalation timeline', async () => {
      const alertId = await notificationDb.createCrisisAlert({
        userId: testUserId,
        severity: 'high',
        message: 'Having a crisis',
        escalationLevel: 'standard'
      });

      // Record escalation events
      await notificationDb.addCrisisEscalationEvent(alertId, {
        eventType: 'contacts_notified',
        contacts: [supportContactId],
        timestamp: new Date()
      });

      await notificationDb.addCrisisEscalationEvent(alertId, {
        eventType: 'provider_escalated',
        providerId: providerUserId,
        timestamp: new Date(Date.now() + 300000) // 5 minutes later
      });

      const escalationTimeline = await notificationDb.getCrisisEscalationTimeline(alertId);
      
      expect(escalationTimeline).toHaveLength(2);
      expect(escalationTimeline[0].eventType).toBe('contacts_notified');
      expect(escalationTimeline[1].eventType).toBe('provider_escalated');
      
      // Timeline should be ordered chronologically
      expect(escalationTimeline[1].timestamp.getTime())
        .toBeGreaterThan(escalationTimeline[0].timestamp.getTime());
    });

    it('should handle crisis resolution with outcome tracking', async () => {
      const alertId = await notificationDb.createCrisisAlert({
        userId: testUserId,
        severity: 'moderate',
        message: 'Need support'
      });

      const resolutionData = {
        resolvedBy: 'family_member',
        resolution: 'de-escalated',
        resolutionNotes: 'Family provided support, patient stabilized',
        followUpRequired: true,
        followUpScheduled: new Date(Date.now() + 86400000), // Tomorrow
        totalDuration: 1200000 // 20 minutes
      };

      await notificationDb.resolveCrisisAlert(alertId, resolutionData);

      const resolvedAlert = await notificationDb.getCrisisAlert(alertId);
      expect(resolvedAlert.status).toBe('resolved');
      expect(resolvedAlert.resolvedAt).toBeInstanceOf(Date);
      expect(resolvedAlert.resolution).toMatchObject(resolutionData);
    });

    it('should support crisis pattern analysis queries', async () => {
      // Create multiple crisis alerts for pattern analysis
      const crisisData = [
        { severity: 'moderate', triggerTime: '14:30', dayOfWeek: 1 },
        { severity: 'high', triggerTime: '15:15', dayOfWeek: 1 },
        { severity: 'moderate', triggerTime: '14:45', dayOfWeek: 3 },
        { severity: 'critical', triggerTime: '22:30', dayOfWeek: 5 }
      ];

      for (const crisis of crisisData) {
        const alertDate = new Date();
        alertDate.setDate(alertDate.getDate() - (7 - crisis.dayOfWeek)); // Set to specific day of week
        const [hours, minutes] = crisis.triggerTime.split(':');
        alertDate.setHours(parseInt(hours), parseInt(minutes));

        await notificationDb.createCrisisAlert({
          userId: testUserId,
          severity: crisis.severity,
          message: 'Crisis alert',
          createdAt: alertDate
        });
      }

      const patterns = await notificationDb.analyzeCrisisPatterns(testUserId, {
        timeRange: '30d',
        groupBy: ['dayOfWeek', 'hourOfDay', 'severity']
      });

      expect(patterns.totalAlerts).toBe(4);
      expect(patterns.byDayOfWeek).toBeDefined();
      expect(patterns.byTimeOfDay).toBeDefined();
      expect(patterns.bySeverity).toMatchObject({
        moderate: 2,
        high: 1,
        critical: 1
      });

      // Should identify Monday afternoon pattern
      expect(patterns.byDayOfWeek[1]).toBe(2); // Monday
      expect(patterns.riskFactors).toContain('afternoon_weekday_pattern');
    });
  });

  describe('Audit Logging and Compliance', () => {
    it('should create comprehensive audit logs for all notification operations', async () => {
      const notificationId = await notificationDb.enqueueNotification({
        userId: testUserId,
        type: 'test_notification',
        channels: ['email'],
        phi: true, // Contains PHI
        content: 'Your appointment is tomorrow'
      });

      await notificationDb.updateNotificationStatus(notificationId, 'sent', {
        sentAt: new Date(),
        recipient: 'test@example.com'
      });

      const auditLogs = await notificationDb.getAuditLogs({
        userId: testUserId,
        entityId: notificationId,
        eventTypes: ['NOTIFICATION_CREATED', 'NOTIFICATION_SENT']
      });

      expect(auditLogs).toHaveLength(2);
      
      const createdLog = auditLogs.find(log => log.eventType === 'NOTIFICATION_CREATED');
      const sentLog = auditLogs.find(log => log.eventType === 'NOTIFICATION_SENT');

      expect(createdLog).toMatchObject({
        userId: testUserId,
        entityId: notificationId,
        eventType: 'NOTIFICATION_CREATED',
        details: expect.objectContaining({
          notificationType: 'test_notification',
          channels: ['email'],
          containsPHI: true
        })
      });

      expect(sentLog).toMatchObject({
        entityId: notificationId,
        eventType: 'NOTIFICATION_SENT',
        details: expect.objectContaining({
          channel: 'email',
          recipient: expect.any(String) // Should be hashed/masked
        })
      });
    });

    it('should support HIPAA-compliant audit trail queries', async () => {
      // Create various audit events
      await Promise.all([
        notificationDb.logAuditEvent({
          userId: testUserId,
          eventType: 'PHI_ACCESSED',
          details: { accessReason: 'crisis_notification' }
        }),
        notificationDb.logAuditEvent({
          userId: testUserId,
          eventType: 'PHI_TRANSMITTED',
          details: { channel: 'sms', destination: 'masked_phone' }
        }),
        notificationDb.logAuditEvent({
          userId: providerUserId,
          eventType: 'PATIENT_DATA_ACCESSED',
          details: { patientId: testUserId, accessType: 'crisis_alert' }
        })
      ]);

      // Query for HIPAA compliance report
      const hipaaAuditLogs = await notificationDb.getHIPAAAuditReport({
        startDate: new Date(Date.now() - 86400000), // Last 24 hours
        endDate: new Date(),
        eventTypes: ['PHI_ACCESSED', 'PHI_TRANSMITTED', 'PATIENT_DATA_ACCESSED'],
        includeDetails: true
      });

      expect(hipaaAuditLogs).toHaveLength(3);
      
      hipaaAuditLogs.forEach(log => {
        expect(log).toHaveProperty('timestamp');
        expect(log).toHaveProperty('userId');
        expect(log).toHaveProperty('eventType');
        expect(log).toHaveProperty('ipAddress');
        expect(log).toHaveProperty('userAgent');
        expect(log.details).toHaveProperty('hipaaCompliant', true);
      });
    });

    it('should maintain audit log immutability', async () => {
      const auditId = await notificationDb.logAuditEvent({
        userId: testUserId,
        eventType: 'TEST_EVENT',
        details: { originalValue: 'test' }
      });

      // Attempt to modify audit log (should fail)
      await expect(
        notificationDb.updateAuditLog(auditId, {
          details: { modifiedValue: 'hacked' }
        })
      ).rejects.toThrow('Audit logs are immutable');

      // Original log should remain unchanged
      const originalLog = await notificationDb.getAuditLog(auditId);
      expect(originalLog.details.originalValue).toBe('test');
      expect(originalLog.details.modifiedValue).toBeUndefined();
    });

    it('should support audit log retention and archiving', async () => {
      // Create old audit logs (older than 7 years)
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 8);

      const oldAuditIds = await Promise.all([
        notificationDb.logAuditEvent({
          userId: testUserId,
          eventType: 'OLD_EVENT_1',
          timestamp: oldDate
        }),
        notificationDb.logAuditEvent({
          userId: testUserId,
          eventType: 'OLD_EVENT_2',
          timestamp: oldDate
        })
      ]);

      // Archive old audit logs
      const archiveResult = await notificationDb.archiveOldAuditLogs({
        retentionYears: 7,
        archiveLocation: 's3://audit-archive/2017'
      });

      expect(archiveResult.archivedCount).toBe(2);
      expect(archiveResult.archiveLocation).toBeDefined();

      // Old logs should be marked as archived, not deleted
      for (const oldId of oldAuditIds) {
        const archivedLog = await notificationDb.getAuditLog(oldId);
        expect(archivedLog.archived).toBe(true);
        expect(archivedLog.archiveLocation).toBe('s3://audit-archive/2017');
        expect(archivedLog.details).toBeUndefined(); // Details moved to archive
      }
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle high-volume notification queuing efficiently', async () => {
      const largeNotificationBatch = Array.from({ length: 1000 }, (_, i) => ({
        userId: i % 10 === 0 ? testUserId : `user-${i}`,
        type: 'bulk_notification',
        channels: ['email'],
        content: `Bulk message ${i}`,
        priority: i < 50 ? 'high' : 'normal'
      }));

      const startTime = Date.now();
      await notificationDb.bulkEnqueueNotifications(largeNotificationBatch);
      const enqueueDuration = Date.now() - startTime;

      // Should complete bulk enqueue in under 10 seconds
      expect(enqueueDuration).toBeLessThan(10000);

      // Verify correct queuing
      const queuedCount = await notificationDb.getQueuedNotificationCount();
      expect(queuedCount).toBeGreaterThanOrEqual(1000);

      // Should maintain priority ordering
      const highPriorityCount = await notificationDb.getQueuedNotificationCount({
        priority: 'high'
      });
      expect(highPriorityCount).toBe(50);
    });

    it('should optimize database queries with proper indexing', async () => {
      // Create test data for index performance testing
      const testUsers = await Promise.all(
        Array.from({ length: 100 }, (_, i) => 
          testDb.createUser({ email: `perf-user-${i}@test.com`, role: 'patient' })
        )
      );

      const notifications = testUsers.flatMap(userId => 
        Array.from({ length: 10 }, (_, i) => ({
          userId,
          type: 'performance_test',
          channels: ['email'],
          status: Math.random() > 0.5 ? 'sent' : 'pending',
          createdAt: new Date(Date.now() - Math.random() * 86400000) // Random within last day
        }))
      );

      await notificationDb.bulkEnqueueNotifications(notifications);

      // Test query performance
      const queryTests = [
        {
          name: 'getUserNotifications',
          query: () => notificationDb.getUserNotifications(testUsers[0], { limit: 50 })
        },
        {
          name: 'getNotificationsByStatus',
          query: () => notificationDb.getNotificationsByStatus('pending', { limit: 100 })
        },
        {
          name: 'getNotificationsByDateRange',
          query: () => notificationDb.getNotificationsByDateRange(
            new Date(Date.now() - 43200000), // 12 hours ago
            new Date(),
            { limit: 200 }
          )
        }
      ];

      for (const test of queryTests) {
        const startTime = Date.now();
        const results = await test.query();
        const duration = Date.now() - startTime;

        // Each query should complete in under 1 second
        expect(duration).toBeLessThan(1000);
        expect(results).toBeDefined();
      }
    });

    it('should handle concurrent database operations safely', async () => {
      const concurrentOperations = Array.from({ length: 20 }, async (_, i) => {
        const userId = await testDb.createUser({
          email: `concurrent-${i}@test.com`,
          role: 'patient'
        });

        // Mix of different operations
        const operations = [
          () => notificationDb.saveNotificationPreferences({
            userId,
            email: true,
            sms: i % 2 === 0
          }),
          () => notificationDb.enqueueNotification({
            userId,
            type: 'concurrent_test',
            channels: ['email']
          }),
          () => notificationDb.incrementRateLimitCounter(userId, 'email', 'daily'),
          () => notificationDb.logAuditEvent({
            userId,
            eventType: 'CONCURRENT_TEST',
            details: { operationId: i }
          })
        ];

        // Execute operations concurrently
        return Promise.all(operations.map(op => op()));
      });

      // All concurrent operations should complete without errors
      await expect(Promise.all(concurrentOperations)).resolves.toBeDefined();

      // Verify data consistency
      const totalNotifications = await notificationDb.getQueuedNotificationCount({
        type: 'concurrent_test'
      });
      expect(totalNotifications).toBe(20);

      const totalAuditLogs = await notificationDb.getAuditLogCount({
        eventType: 'CONCURRENT_TEST'
      });
      expect(totalAuditLogs).toBe(20);
    });
  });
});