import { test, expect } from '@playwright/test';
import { TestHelpers } from '../../utils/test-helpers';
import { MockTwilioService } from '../../mocks/twilio-mock';
import { MockSendGridService } from '../../mocks/sendgrid-mock';

test.describe('Rate Limiting and Quiet Hours', () => {
  let testHelpers: TestHelpers;
  let mockTwilio: MockTwilioService;
  let mockSendGrid: MockSendGridService;
  let patientUser: any;

  test.beforeAll(async () => {
    testHelpers = new TestHelpers();
    mockTwilio = new MockTwilioService();
    mockSendGrid = new MockSendGridService();
    
    await testHelpers.setupTestEnvironment();
    
    patientUser = await testHelpers.createTestUser({
      email: 'rate-limit-patient@test.com',
      role: 'patient',
      phone: '+1234567890',
      timezone: 'America/New_York',
      notificationPreferences: {
        email: true,
        sms: true,
        push: true,
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        maxNotificationsPerHour: 5,
        maxSmsPerDay: 10
      }
    });
  });

  test.afterAll(async () => {
    await testHelpers.cleanup();
  });

  test.beforeEach(async () => {
    mockTwilio.reset();
    mockSendGrid.reset();
    await testHelpers.clearNotificationLimits(patientUser.id);
  });

  test('should enforce SMS rate limiting per hour', async ({ page }) => {
    const notifications = Array.from({ length: 8 }, (_, i) => ({
      type: 'motivation_message',
      userId: patientUser.id,
      channel: 'sms',
      content: `Motivation message ${i + 1}`,
      timestamp: Date.now() + (i * 100) // Spread slightly to avoid deduplication
    }));

    // Send 8 notifications rapidly (above 5 per hour limit)
    for (const notification of notifications) {
      await testHelpers.triggerNotification(notification);
      await page.waitForTimeout(50); // Small delay to maintain order
    }

    await page.waitForTimeout(3000);

    // Should only send 5 SMS messages due to rate limit
    const smsNotifications = mockTwilio.getSentSMS();
    expect(smsNotifications).toHaveLength(5);

    // Verify rate limiting audit logs
    const rateLimitLogs = await testHelpers.getAuditLogs({
      eventType: 'NOTIFICATION_RATE_LIMITED',
      userId: patientUser.id
    });

    expect(rateLimitLogs).toHaveLength(3); // 3 notifications blocked
    rateLimitLogs.forEach(log => {
      expect(log.details).toMatchObject({
        channel: 'sms',
        limitType: 'hourly',
        maxAllowed: 5,
        attemptedCount: expect.any(Number),
        windowStart: expect.any(String)
      });
    });

    // Verify notifications queued for later delivery
    const queuedNotifications = await testHelpers.getQueuedNotifications({
      userId: patientUser.id,
      status: 'rate_limited'
    });

    expect(queuedNotifications).toHaveLength(3);
    queuedNotifications.forEach(notification => {
      expect(notification.scheduledFor).toBeDefined();
      expect(new Date(notification.scheduledFor!).getTime()).toBeGreaterThan(Date.now());
    });
  });

  test('should respect daily SMS limits', async ({ page }) => {
    // Pre-fill daily SMS count to near limit
    await testHelpers.setNotificationCount(patientUser.id, 'sms', 'daily', 8);

    const notifications = Array.from({ length: 5 }, (_, i) => ({
      type: 'checkin_reminder',
      userId: patientUser.id,
      channel: 'sms',
      content: `Check-in reminder ${i + 1}`
    }));

    for (const notification of notifications) {
      await testHelpers.triggerNotification(notification);
      await page.waitForTimeout(100);
    }

    await page.waitForTimeout(2000);

    // Should only send 2 SMS (daily limit is 10, already sent 8)
    const smsNotifications = mockTwilio.getSentSMS();
    expect(smsNotifications).toHaveLength(2);

    // Verify daily limit logs
    const dailyLimitLogs = await testHelpers.getAuditLogs({
      eventType: 'NOTIFICATION_DAILY_LIMIT_REACHED',
      userId: patientUser.id
    });

    expect(dailyLimitLogs).toHaveLength(1);
    expect(dailyLimitLogs[0].details).toMatchObject({
      channel: 'sms',
      dailyLimit: 10,
      currentCount: 10,
      date: expect.any(String)
    });

    // Remaining notifications should be scheduled for next day
    const tomorrowNotifications = await testHelpers.getQueuedNotifications({
      userId: patientUser.id,
      status: 'scheduled'
    });

    expect(tomorrowNotifications).toHaveLength(3);
    tomorrowNotifications.forEach(notification => {
      const scheduledDate = new Date(notification.scheduledFor!);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(8, 0, 0, 0); // Default morning delivery

      expect(scheduledDate.toDateString()).toBe(tomorrow.toDateString());
    });
  });

  test('should enforce quiet hours for non-critical notifications', async ({ page }) => {
    // Set current time to within quiet hours (11 PM)
    const quietHourTime = new Date();
    quietHourTime.setHours(23, 0, 0, 0);

    await testHelpers.mockCurrentTime(quietHourTime);

    const notifications = [
      {
        type: 'daily_motivation',
        priority: 'low',
        userId: patientUser.id,
        channels: ['sms', 'email']
      },
      {
        type: 'weekly_progress',
        priority: 'normal',
        userId: patientUser.id,
        channels: ['sms', 'email']
      }
    ];

    for (const notification of notifications) {
      await testHelpers.triggerNotification(notification);
    }

    await page.waitForTimeout(2000);

    // SMS should be blocked due to quiet hours
    const smsNotifications = mockTwilio.getSentSMS();
    expect(smsNotifications).toHaveLength(0);

    // Email should still be sent (less intrusive)
    const emailNotifications = mockSendGrid.getSentEmails();
    expect(emailNotifications).toHaveLength(2);

    // Verify quiet hours enforcement
    const quietHoursLogs = await testHelpers.getAuditLogs({
      eventType: 'NOTIFICATION_QUIET_HOURS_BLOCKED',
      userId: patientUser.id
    });

    expect(quietHoursLogs).toHaveLength(2); // Both SMS notifications blocked
    quietHoursLogs.forEach(log => {
      expect(log.details).toMatchObject({
        channel: 'sms',
        currentTime: expect.stringContaining('23:'),
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        timezone: 'America/New_York'
      });
    });

    // SMS notifications should be rescheduled for after quiet hours
    const rescheduledNotifications = await testHelpers.getQueuedNotifications({
      userId: patientUser.id,
      status: 'rescheduled_quiet_hours'
    });

    expect(rescheduledNotifications).toHaveLength(2);
    rescheduledNotifications.forEach(notification => {
      const scheduledTime = new Date(notification.scheduledFor!);
      expect(scheduledTime.getHours()).toBeGreaterThanOrEqual(7);
      expect(scheduledTime.getHours()).toBeLessThan(22);
    });

    await testHelpers.restoreCurrentTime();
  });

  test('should allow critical notifications during quiet hours', async ({ page }) => {
    const quietHourTime = new Date();
    quietHourTime.setHours(1, 30, 0, 0); // 1:30 AM - deep in quiet hours

    await testHelpers.mockCurrentTime(quietHourTime);

    const criticalNotifications = [
      {
        type: 'crisis_alert',
        priority: 'critical',
        userId: patientUser.id,
        channels: ['sms', 'email'],
        content: 'Emergency crisis support activated'
      },
      {
        type: 'appointment_urgent',
        priority: 'urgent',
        userId: patientUser.id,
        channels: ['sms'],
        content: 'Urgent: Your therapy session has been moved to 9 AM'
      }
    ];

    for (const notification of criticalNotifications) {
      await testHelpers.triggerNotification(notification);
    }

    await page.waitForTimeout(2000);

    // Critical notifications should bypass quiet hours
    const smsNotifications = mockTwilio.getSentSMS();
    expect(smsNotifications).toHaveLength(2);

    const emailNotifications = mockSendGrid.getSentEmails();
    expect(emailNotifications).toHaveLength(1);

    // Verify critical override logged
    const overrideLogs = await testHelpers.getAuditLogs({
      eventType: 'QUIET_HOURS_OVERRIDE_CRITICAL',
      userId: patientUser.id
    });

    expect(overrideLogs).toHaveLength(2);
    overrideLogs.forEach(log => {
      expect(log.details.priority).toMatch(/^(critical|urgent)$/);
      expect(log.details.reason).toBe('critical_priority_override');
    });

    await testHelpers.restoreCurrentTime();
  });

  test('should handle timezone-aware quiet hours', async ({ page }) => {
    // Create user in different timezone (Pacific)
    const pacificUser = await testHelpers.createTestUser({
      email: 'pacific-user@test.com',
      role: 'patient',
      phone: '+1987654321',
      timezone: 'America/Los_Angeles',
      notificationPreferences: {
        sms: true,
        quietHoursStart: '23:00',
        quietHoursEnd: '08:00'
      }
    });

    // Set server time to 2 AM UTC (7 PM Pacific - not in quiet hours)
    const serverTime = new Date();
    serverTime.setUTCHours(2, 0, 0, 0);
    await testHelpers.mockCurrentTime(serverTime);

    await testHelpers.triggerNotification({
      type: 'motivation_message',
      userId: pacificUser.id,
      channel: 'sms',
      content: 'Evening motivation'
    });

    await page.waitForTimeout(1000);

    // Should send notification (7 PM Pacific is outside quiet hours)
    const smsNotifications = mockTwilio.getSentSMS();
    expect(smsNotifications).toHaveLength(1);

    // Now set server time to 7 AM UTC (12 AM Pacific - in quiet hours)
    const midnightPacific = new Date();
    midnightPacific.setUTCHours(7, 0, 0, 0);
    await testHelpers.mockCurrentTime(midnightPacific);

    mockTwilio.reset();

    await testHelpers.triggerNotification({
      type: 'motivation_message',
      userId: pacificUser.id,
      channel: 'sms',
      content: 'Midnight motivation'
    });

    await page.waitForTimeout(1000);

    // Should block notification (12 AM Pacific is in quiet hours)
    const midnightSMS = mockTwilio.getSentSMS();
    expect(midnightSMS).toHaveLength(0);

    // Verify timezone calculation in logs
    const timezoneLog = await testHelpers.getAuditLogs({
      eventType: 'NOTIFICATION_QUIET_HOURS_BLOCKED',
      userId: pacificUser.id
    });

    expect(timezoneLog).toHaveLength(1);
    expect(timezoneLog[0].details).toMatchObject({
      userTimezone: 'America/Los_Angeles',
      localTime: expect.stringContaining('00:'),
      utcTime: expect.stringContaining('07:')
    });

    await testHelpers.deleteUser(pacificUser.id);
    await testHelpers.restoreCurrentTime();
  });

  test('should implement exponential backoff for failed notifications', async ({ page }) => {
    // Mock SMS service to fail initially
    mockTwilio.mockFailure('Service temporarily unavailable');

    const notification = {
      type: 'checkin_reminder',
      userId: patientUser.id,
      channel: 'sms',
      content: 'Time for your check-in'
    };

    await testHelpers.triggerNotification(notification);
    await page.waitForTimeout(1000);

    // Initial attempt should fail
    expect(mockTwilio.getSentSMS()).toHaveLength(0);

    // Verify retry scheduled with exponential backoff
    const retryLogs = await testHelpers.getAuditLogs({
      eventType: 'NOTIFICATION_RETRY_SCHEDULED',
      userId: patientUser.id
    });

    expect(retryLogs).toHaveLength(1);
    expect(retryLogs[0].details).toMatchObject({
      attempt: 1,
      nextRetryIn: 60000, // 1 minute for first retry
      maxRetries: 5,
      backoffStrategy: 'exponential'
    });

    // Simulate first retry (should still fail)
    await page.waitForTimeout(1100); // Wait past initial retry
    await testHelpers.processRetryQueue();

    expect(mockTwilio.getSentSMS()).toHaveLength(0);

    // Second retry should be scheduled with longer delay
    const secondRetryLogs = await testHelpers.getAuditLogs({
      eventType: 'NOTIFICATION_RETRY_SCHEDULED',
      userId: patientUser.id
    });

    const secondRetry = secondRetryLogs.find(log => log.details.attempt === 2);
    expect(secondRetry?.details.nextRetryIn).toBe(240000); // 4 minutes (2^2)

    // Fix service and process third retry
    mockTwilio.clearFailure();
    
    // Simulate third retry
    await page.waitForTimeout(100);
    await testHelpers.processRetryQueue();

    // Should succeed on third attempt
    const finalSMS = mockTwilio.getSentSMS();
    expect(finalSMS).toHaveLength(1);

    // Verify success after retries
    const successLog = await testHelpers.getAuditLogs({
      eventType: 'NOTIFICATION_RETRY_SUCCESS',
      userId: patientUser.id
    });

    expect(successLog).toHaveLength(1);
    expect(successLog[0].details).toMatchObject({
      finalAttempt: 3,
      totalRetryTime: expect.any(Number)
    });
  });

  test('should handle burst notification scenarios', async ({ page }) => {
    await testHelpers.login(page, patientUser.email, 'TestPass123!');

    // Simulate rapid-fire notifications (e.g., multiple crisis alerts)
    const burstNotifications = Array.from({ length: 20 }, (_, i) => ({
      type: 'crisis_update',
      priority: i < 5 ? 'critical' : 'high', // First 5 are critical
      userId: patientUser.id,
      channels: ['sms', 'email'],
      content: `Crisis update ${i + 1}`,
      burstId: 'crisis-123', // Group related notifications
      timestamp: Date.now() + (i * 10) // Very rapid succession
    }));

    const startTime = Date.now();

    // Send all notifications rapidly
    for (const notification of burstNotifications) {
      await testHelpers.triggerNotification(notification);
    }

    await page.waitForTimeout(5000);
    const processingTime = Date.now() - startTime;

    // Should apply intelligent burst handling
    const smsNotifications = mockTwilio.getSentSMS();
    
    // All critical should be sent immediately
    const criticalSMS = smsNotifications.filter(sms => 
      sms.body.includes('Crisis update') && 
      parseInt(sms.body.match(/update (\d+)/)?.[1] || '0') <= 5
    );
    expect(criticalSMS).toHaveLength(5);

    // High priority should be rate limited and batched
    const highPrioritySMS = smsNotifications.filter(sms => 
      sms.body.includes('Crisis update') && 
      parseInt(sms.body.match(/update (\d+)/)?.[1] || '0') > 5
    );
    expect(highPrioritySMS.length).toBeLessThan(15); // Some should be limited

    // Verify burst detection and handling
    const burstLogs = await testHelpers.getAuditLogs({
      eventType: 'NOTIFICATION_BURST_DETECTED',
      userId: patientUser.id
    });

    expect(burstLogs).toHaveLength(1);
    expect(burstLogs[0].details).toMatchObject({
      burstId: 'crisis-123',
      totalNotifications: 20,
      criticalCount: 5,
      timeWindow: expect.any(Number),
      strategy: 'priority_based_throttling'
    });

    // Verify processing was efficient
    expect(processingTime).toBeLessThan(8000); // Should handle burst efficiently

    // Check that remaining notifications are properly queued
    const queuedBurstNotifications = await testHelpers.getQueuedNotifications({
      userId: patientUser.id,
      burstId: 'crisis-123'
    });

    expect(queuedBurstNotifications.length).toBeGreaterThan(0);
    
    // Verify staggered delivery times
    const deliveryTimes = queuedBurstNotifications
      .map(n => new Date(n.scheduledFor!).getTime())
      .sort((a, b) => a - b);

    for (let i = 1; i < deliveryTimes.length; i++) {
      const gap = deliveryTimes[i] - deliveryTimes[i - 1];
      expect(gap).toBeGreaterThanOrEqual(30000); // At least 30 second gaps
    }
  });

  test('should provide rate limit status in user preferences', async ({ page }) => {
    // Set some notification limits
    await testHelpers.setNotificationCount(patientUser.id, 'sms', 'hourly', 3);
    await testHelpers.setNotificationCount(patientUser.id, 'sms', 'daily', 7);
    await testHelpers.setNotificationCount(patientUser.id, 'email', 'daily', 15);

    await testHelpers.login(page, patientUser.email, 'TestPass123!');
    await page.goto('/settings/notifications');

    // Should display current usage and limits
    await expect(page.locator('[data-testid="sms-hourly-usage"]'))
      .toContainText('3 of 5 used this hour');
    
    await expect(page.locator('[data-testid="sms-daily-usage"]'))
      .toContainText('7 of 10 used today');
    
    await expect(page.locator('[data-testid="email-daily-usage"]'))
      .toContainText('15 of 50 used today');

    // Should show warning when approaching limits
    await expect(page.locator('[data-testid="sms-daily-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="sms-daily-warning"]'))
      .toContainText('You\'re approaching your daily SMS limit');

    // Should allow adjusting limits (within bounds)
    await page.click('[data-testid="adjust-sms-limits"]');
    await page.selectOption('[data-testid="sms-hourly-limit"]', '8');
    await page.selectOption('[data-testid="sms-daily-limit"]', '15');
    await page.click('[data-testid="save-limits"]');

    await expect(page.locator('[data-testid="limits-saved"]')).toBeVisible();

    // Verify updated limits
    await page.reload();
    await expect(page.locator('[data-testid="sms-hourly-usage"]'))
      .toContainText('3 of 8 used this hour');
    
    await expect(page.locator('[data-testid="sms-daily-usage"]'))
      .toContainText('7 of 15 used today');

    // Verify limit change logged
    const limitChangeLog = await testHelpers.getAuditLogs({
      eventType: 'NOTIFICATION_LIMITS_UPDATED',
      userId: patientUser.id
    });

    expect(limitChangeLog).toHaveLength(1);
    expect(limitChangeLog[0].details).toMatchObject({
      previousLimits: { hourly: 5, daily: 10 },
      newLimits: { hourly: 8, daily: 15 },
      channel: 'sms'
    });
  });
});