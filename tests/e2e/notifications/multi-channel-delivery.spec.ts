import { test, expect } from '@playwright/test';
import { TestHelpers } from '../../utils/test-helpers';
import { NotificationTestFactory } from '../../utils/notification-test-factory';
import { MockTwilioService } from '../../mocks/twilio-mock';
import { MockSendGridService } from '../../mocks/sendgrid-mock';
import { MockFCMService } from '../../mocks/fcm-mock';

test.describe('Multi-Channel Notification Delivery', () => {
  let testHelpers: TestHelpers;
  let mockTwilio: MockTwilioService;
  let mockSendGrid: MockSendGridService;
  let mockFCM: MockFCMService;
  let patientUser: any;
  let providerUser: any;

  test.beforeAll(async () => {
    testHelpers = new TestHelpers();
    mockTwilio = new MockTwilioService();
    mockSendGrid = new MockSendGridService();
    mockFCM = new MockFCMService();
    
    await testHelpers.setupTestEnvironment();
    
    // Create test users
    patientUser = await testHelpers.createTestUser({
      email: 'patient-notifications@test.com',
      role: 'patient',
      phone: '+1234567890',
      notificationPreferences: {
        email: true,
        sms: true,
        push: true,
        whatsapp: false
      }
    });

    providerUser = await testHelpers.createTestUser({
      email: 'provider-notifications@test.com',
      role: 'provider',
      phone: '+1987654321'
    });
  });

  test.afterAll(async () => {
    await testHelpers.cleanup();
  });

  test.beforeEach(async () => {
    mockTwilio.reset();
    mockSendGrid.reset();
    mockFCM.reset();
  });

  test('should deliver daily check-in reminder via multiple channels', async ({ page }) => {
    // Set up notification preferences for multi-channel delivery
    await testHelpers.login(page, patientUser.email, 'TestPass123!');
    
    await page.goto('/settings/notifications');
    await page.waitForSelector('[data-testid="notification-preferences"]');

    // Enable multiple channels
    await page.check('[data-testid="email-notifications"]');
    await page.check('[data-testid="sms-notifications"]');
    await page.check('[data-testid="push-notifications"]');
    
    // Set reminder time
    await page.selectOption('[data-testid="reminder-time"]', '09:00');
    await page.click('[data-testid="save-preferences"]');

    // Wait for preferences to be saved
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // Trigger daily check-in reminder
    await testHelpers.triggerScheduledNotification({
      type: 'daily_checkin_reminder',
      userId: patientUser.id,
      scheduledFor: new Date()
    });

    // Wait for notifications to be processed
    await page.waitForTimeout(3000);

    // Verify email notification sent
    const emailNotifications = mockSendGrid.getSentEmails();
    expect(emailNotifications).toHaveLength(1);
    expect(emailNotifications[0]).toMatchObject({
      to: patientUser.email,
      subject: expect.stringContaining('Daily Check-in Reminder'),
      templateId: 'daily-checkin-reminder'
    });

    // Verify SMS notification sent
    const smsNotifications = mockTwilio.getSentSMS();
    expect(smsNotifications).toHaveLength(1);
    expect(smsNotifications[0]).toMatchObject({
      to: patientUser.phone,
      body: expect.stringContaining('Time for your daily check-in')
    });

    // Verify push notification sent
    const pushNotifications = mockFCM.getSentNotifications();
    expect(pushNotifications).toHaveLength(1);
    expect(pushNotifications[0]).toMatchObject({
      token: expect.any(String),
      notification: {
        title: 'Daily Check-in Reminder',
        body: expect.stringContaining('Take a moment to reflect')
      }
    });

    // Verify audit log entry
    const auditLogs = await testHelpers.getAuditLogs({
      eventType: 'NOTIFICATION_SENT',
      userId: patientUser.id
    });
    
    expect(auditLogs).toHaveLength(3); // One for each channel
    expect(auditLogs[0].details).toMatchObject({
      notificationType: 'daily_checkin_reminder',
      channels: ['email', 'sms', 'push'],
      hipaaCompliant: true
    });
  });

  test('should respect channel preferences and quiet hours', async ({ page }) => {
    await testHelpers.login(page, patientUser.email, 'TestPass123!');
    
    await page.goto('/settings/notifications');
    
    // Disable SMS, keep email and push enabled
    await page.uncheck('[data-testid="sms-notifications"]');
    await page.check('[data-testid="email-notifications"]');
    await page.check('[data-testid="push-notifications"]');
    
    // Set quiet hours (10 PM to 7 AM)
    await page.selectOption('[data-testid="quiet-hours-start"]', '22:00');
    await page.selectOption('[data-testid="quiet-hours-end"]', '07:00');
    
    await page.click('[data-testid="save-preferences"]');
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

    // Trigger notification during quiet hours (11 PM)
    const quietHourTime = new Date();
    quietHourTime.setHours(23, 0, 0, 0);

    await testHelpers.triggerScheduledNotification({
      type: 'motivation_message',
      userId: patientUser.id,
      scheduledFor: quietHourTime
    });

    await page.waitForTimeout(2000);

    // Should only send push notification (marked as urgent) and email
    // SMS should be blocked due to quiet hours and being disabled
    const emailNotifications = mockSendGrid.getSentEmails();
    expect(emailNotifications).toHaveLength(1);

    const smsNotifications = mockTwilio.getSentSMS();
    expect(smsNotifications).toHaveLength(0); // Disabled + quiet hours

    const pushNotifications = mockFCM.getSentNotifications();
    expect(pushNotifications).toHaveLength(1);
    
    // Verify quiet hours respected in audit log
    const auditLogs = await testHelpers.getAuditLogs({
      eventType: 'NOTIFICATION_BLOCKED',
      userId: patientUser.id
    });
    
    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0].details.reason).toBe('quiet_hours');
  });

  test('should handle channel failures gracefully with fallback', async ({ page }) => {
    await testHelpers.login(page, patientUser.email, 'TestPass123!');
    
    // Configure email as primary, SMS as fallback
    await page.goto('/settings/notifications');
    await page.check('[data-testid="email-notifications"]');
    await page.check('[data-testid="sms-notifications"]');
    await page.check('[data-testid="enable-fallback"]');
    await page.click('[data-testid="save-preferences"]');

    // Mock email service failure
    mockSendGrid.mockFailure('Service temporarily unavailable');

    // Trigger critical crisis alert
    await testHelpers.triggerNotification({
      type: 'crisis_alert',
      userId: patientUser.id,
      priority: 'critical',
      channels: ['email', 'sms']
    });

    await page.waitForTimeout(3000);

    // Email should fail, SMS should succeed as fallback
    const emailNotifications = mockSendGrid.getSentEmails();
    expect(emailNotifications).toHaveLength(0);

    const smsNotifications = mockTwilio.getSentSMS();
    expect(smsNotifications).toHaveLength(1);
    expect(smsNotifications[0].body).toContain('CRISIS ALERT');

    // Verify failure and fallback logged
    const auditLogs = await testHelpers.getAuditLogs({
      eventType: ['NOTIFICATION_FAILED', 'NOTIFICATION_FALLBACK'],
      userId: patientUser.id
    });

    const failureLog = auditLogs.find(log => log.eventType === 'NOTIFICATION_FAILED');
    const fallbackLog = auditLogs.find(log => log.eventType === 'NOTIFICATION_FALLBACK');

    expect(failureLog).toBeDefined();
    expect(failureLog?.details.channel).toBe('email');
    expect(failureLog?.details.error).toContain('Service temporarily unavailable');

    expect(fallbackLog).toBeDefined();
    expect(fallbackLog?.details.originalChannel).toBe('email');
    expect(fallbackLog?.details.fallbackChannel).toBe('sms');
  });

  test('should batch notifications efficiently for high volume', async ({ page }) => {
    const batchUsers = await Promise.all(
      Array.from({ length: 50 }, (_, i) => 
        testHelpers.createTestUser({
          email: `batch-user-${i}@test.com`,
          role: 'patient',
          phone: `+123456${i.toString().padStart(4, '0')}`,
          notificationPreferences: { email: true, sms: true }
        })
      )
    );

    // Trigger batch notification (e.g., maintenance notification)
    const startTime = Date.now();
    
    await testHelpers.triggerBatchNotification({
      type: 'system_maintenance',
      userIds: batchUsers.map(u => u.id),
      message: 'Scheduled maintenance tonight from 2-4 AM EST'
    });

    // Wait for batch processing
    await page.waitForTimeout(10000);
    const endTime = Date.now();
    const processingTime = endTime - startTime;

    // Verify all notifications sent
    const emailNotifications = mockSendGrid.getSentEmails();
    const smsNotifications = mockTwilio.getSentSMS();
    
    expect(emailNotifications).toHaveLength(50);
    expect(smsNotifications).toHaveLength(50);

    // Verify batching efficiency (should process 50 notifications in under 15 seconds)
    expect(processingTime).toBeLessThan(15000);

    // Verify rate limiting respected
    const rateLimitLogs = await testHelpers.getAuditLogs({
      eventType: 'RATE_LIMIT_APPLIED'
    });

    expect(rateLimitLogs.length).toBeGreaterThan(0);
    rateLimitLogs.forEach(log => {
      expect(log.details.batchSize).toBeLessThanOrEqual(10); // Max batch size
      expect(log.details.delayMs).toBeGreaterThanOrEqual(100); // Min delay
    });

    // Cleanup batch users
    await Promise.all(batchUsers.map(user => testHelpers.deleteUser(user.id)));
  });

  test('should handle template personalization correctly', async ({ page }) => {
    await testHelpers.login(page, patientUser.email, 'TestPass123!');

    // Set user preferences for personalization
    await testHelpers.updateUserProfile(patientUser.id, {
      firstName: 'Alex',
      preferredName: 'Alex',
      timezone: 'America/New_York',
      sobrietyStartDate: '2024-01-01',
      recoveryGoals: ['Stay sober', 'Improve mental health']
    });

    // Trigger personalized milestone notification
    await testHelpers.triggerNotification({
      type: 'milestone_achievement',
      userId: patientUser.id,
      templateData: {
        milestoneType: '30_days',
        daysClean: 30,
        nextGoal: '60_days'
      }
    });

    await page.waitForTimeout(2000);

    // Verify personalized email content
    const emailNotifications = mockSendGrid.getSentEmails();
    expect(emailNotifications).toHaveLength(1);
    
    const emailContent = emailNotifications[0];
    expect(emailContent.personalizations[0].dynamic_template_data).toMatchObject({
      firstName: 'Alex',
      preferredName: 'Alex',
      daysClean: 30,
      milestoneType: '30_days',
      nextGoal: '60_days',
      timezone: 'America/New_York'
    });

    // Verify personalized SMS content
    const smsNotifications = mockTwilio.getSentSMS();
    expect(smsNotifications).toHaveLength(1);
    expect(smsNotifications[0].body).toContain('Alex');
    expect(smsNotifications[0].body).toContain('30 days');

    // Verify template rendering audit
    const auditLogs = await testHelpers.getAuditLogs({
      eventType: 'TEMPLATE_RENDERED',
      userId: patientUser.id
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].details).toMatchObject({
      templateType: 'milestone_achievement',
      personalizationApplied: true,
      dataFields: ['firstName', 'daysClean', 'milestoneType']
    });
  });

  test('should maintain delivery order for sequential notifications', async ({ page }) => {
    await testHelpers.login(page, patientUser.email, 'TestPass123!');

    // Send sequence of time-sensitive notifications
    const notifications = [
      { type: 'crisis_alert', priority: 'critical', sequenceId: 1, timestamp: Date.now() },
      { type: 'crisis_update', priority: 'high', sequenceId: 2, timestamp: Date.now() + 1000 },
      { type: 'crisis_resolved', priority: 'normal', sequenceId: 3, timestamp: Date.now() + 2000 }
    ];

    // Trigger all notifications rapidly
    for (const notification of notifications) {
      await testHelpers.triggerNotification({
        ...notification,
        userId: patientUser.id
      });
      await page.waitForTimeout(100); // Small delay to maintain sequence
    }

    await page.waitForTimeout(5000);

    // Verify SMS notifications maintain order
    const smsNotifications = mockTwilio.getSentSMS();
    expect(smsNotifications).toHaveLength(3);
    
    // Check chronological order by content
    expect(smsNotifications[0].body).toContain('CRISIS ALERT');
    expect(smsNotifications[1].body).toContain('Crisis Update');
    expect(smsNotifications[2].body).toContain('Crisis Resolved');

    // Verify timestamps are in order
    const timestamps = smsNotifications.map(sms => 
      new Date(sms.dateSent || sms.dateCreated).getTime()
    );
    
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }

    // Verify sequence tracking in audit logs
    const auditLogs = await testHelpers.getAuditLogs({
      eventType: 'NOTIFICATION_SENT',
      userId: patientUser.id
    });

    const sequenceIds = auditLogs
      .filter(log => log.details.sequenceId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(log => log.details.sequenceId);

    expect(sequenceIds).toEqual([1, 2, 3]);
  });

  test('should handle notification deduplication correctly', async ({ page }) => {
    await testHelpers.login(page, patientUser.email, 'TestPass123!');

    const duplicateNotification = {
      type: 'daily_checkin_reminder',
      userId: patientUser.id,
      deduplicationKey: 'daily-checkin-2024-01-15',
      content: 'Time for your daily check-in!'
    };

    // Send same notification multiple times rapidly
    await Promise.all([
      testHelpers.triggerNotification(duplicateNotification),
      testHelpers.triggerNotification(duplicateNotification),
      testHelpers.triggerNotification(duplicateNotification)
    ]);

    await page.waitForTimeout(3000);

    // Should only receive one notification despite multiple triggers
    const emailNotifications = mockSendGrid.getSentEmails();
    const smsNotifications = mockTwilio.getSentSMS();
    
    expect(emailNotifications).toHaveLength(1);
    expect(smsNotifications).toHaveLength(1);

    // Verify deduplication logged
    const auditLogs = await testHelpers.getAuditLogs({
      eventType: 'NOTIFICATION_DEDUPLICATED',
      userId: patientUser.id
    });

    expect(auditLogs.length).toBeGreaterThanOrEqual(2); // At least 2 duplicates blocked
    auditLogs.forEach(log => {
      expect(log.details.deduplicationKey).toBe('daily-checkin-2024-01-15');
      expect(log.details.reason).toBe('duplicate_within_window');
    });
  });
});