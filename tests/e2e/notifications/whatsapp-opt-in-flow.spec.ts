import { test, expect } from '@playwright/test';
import { TestHelpers } from '../../utils/test-helpers';
import { MockTwilioService } from '../../mocks/twilio-mock';

test.describe('WhatsApp Opt-in Flow', () => {
  let testHelpers: TestHelpers;
  let mockTwilio: MockTwilioService;
  let patientUser: any;

  test.beforeAll(async () => {
    testHelpers = new TestHelpers();
    mockTwilio = new MockTwilioService();
    
    await testHelpers.setupTestEnvironment();
    
    patientUser = await testHelpers.createTestUser({
      email: 'whatsapp-patient@test.com',
      role: 'patient',
      phone: '+1234567890',
      notificationPreferences: {
        email: true,
        sms: true,
        push: true,
        whatsapp: false // Initially disabled
      }
    });
  });

  test.afterAll(async () => {
    await testHelpers.cleanup();
  });

  test.beforeEach(async () => {
    mockTwilio.reset();
  });

  test('should complete WhatsApp opt-in flow successfully', async ({ page }) => {
    await testHelpers.login(page, patientUser.email, 'TestPass123!');
    
    await page.goto('/settings/notifications');
    await page.waitForSelector('[data-testid="notification-preferences"]');

    // Initially WhatsApp should be disabled
    const whatsappToggle = page.locator('[data-testid="whatsapp-notifications"]');
    await expect(whatsappToggle).not.toBeChecked();

    // Click to enable WhatsApp
    await whatsappToggle.check();

    // Should show opt-in information modal
    await expect(page.locator('[data-testid="whatsapp-opt-in-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="opt-in-phone-display"]')).toContainText('+1234567890');
    
    // Read and accept terms
    await expect(page.locator('[data-testid="whatsapp-terms"]')).toBeVisible();
    await page.check('[data-testid="accept-whatsapp-terms"]');
    
    // Click send opt-in message
    await page.click('[data-testid="send-opt-in-message"]');

    // Wait for opt-in SMS to be sent
    await expect(page.locator('[data-testid="opt-in-sent-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="opt-in-sent-message"]'))
      .toContainText('We\'ve sent an opt-in message to your phone');

    // Verify opt-in SMS was sent
    const optInMessages = mockTwilio.getSentSMS();
    expect(optInMessages).toHaveLength(1);
    expect(optInMessages[0]).toMatchObject({
      to: '+1234567890',
      body: expect.stringContaining('Reply START to receive WhatsApp notifications from Serenity'),
      from: expect.any(String)
    });

    // Verify opt-in request logged
    const auditLogs = await testHelpers.getAuditLogs({
      eventType: 'WHATSAPP_OPT_IN_REQUESTED',
      userId: patientUser.id
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].details).toMatchObject({
      phone: '+1234567890',
      termsAccepted: true,
      optInMethod: 'sms'
    });

    // User status should be pending
    await expect(page.locator('[data-testid="whatsapp-status"]')).toContainText('Pending');
    await expect(page.locator('[data-testid="whatsapp-pending-info"]'))
      .toContainText('Reply START to +1234567890 to complete setup');
  });

  test('should handle user replying START to opt-in', async ({ page }) => {
    await testHelpers.login(page, patientUser.email, 'TestPass123!');
    
    // Start opt-in process
    await page.goto('/settings/notifications');
    await page.check('[data-testid="whatsapp-notifications"]');
    await page.check('[data-testid="accept-whatsapp-terms"]');
    await page.click('[data-testid="send-opt-in-message"]');

    await page.waitForTimeout(1000);

    // Simulate user replying "START" to the opt-in SMS
    await mockTwilio.simulateIncomingSMS({
      from: '+1234567890',
      to: process.env.TWILIO_PHONE_NUMBER,
      body: 'START'
    });

    // Wait for webhook processing
    await page.waitForTimeout(2000);

    // Refresh page to see updated status
    await page.reload();
    await page.waitForSelector('[data-testid="notification-preferences"]');

    // WhatsApp should now be enabled and confirmed
    await expect(page.locator('[data-testid="whatsapp-status"]')).toContainText('Active');
    await expect(page.locator('[data-testid="whatsapp-confirmed-info"]'))
      .toContainText('WhatsApp notifications are enabled');

    // Verify confirmation message was sent
    const confirmationMessages = mockTwilio.getSentSMS();
    const confirmationMsg = confirmationMessages.find(msg => 
      msg.body.includes('WhatsApp notifications enabled')
    );
    
    expect(confirmationMsg).toBeDefined();
    expect(confirmationMsg?.body).toContain('You can now receive recovery support messages via WhatsApp');

    // Verify opt-in completion logged
    const auditLogs = await testHelpers.getAuditLogs({
      eventType: 'WHATSAPP_OPT_IN_COMPLETED',
      userId: patientUser.id
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].details).toMatchObject({
      phone: '+1234567890',
      confirmationMethod: 'sms_reply',
      replyMessage: 'START'
    });

    // Database should reflect opt-in status
    const userPrefs = await testHelpers.getUserNotificationPreferences(patientUser.id);
    expect(userPrefs.whatsapp).toBe(true);
    expect(userPrefs.whatsappOptInDate).toBeDefined();
    expect(userPrefs.whatsappStatus).toBe('active');
  });

  test('should handle user replying STOP to opt-out', async ({ page }) => {
    // First complete opt-in
    await testHelpers.updateUserNotificationPreferences(patientUser.id, {
      whatsapp: true,
      whatsappStatus: 'active',
      whatsappOptInDate: new Date()
    });

    await testHelpers.login(page, patientUser.email, 'TestPass123!');
    await page.goto('/settings/notifications');

    // Verify WhatsApp is initially active
    await expect(page.locator('[data-testid="whatsapp-status"]')).toContainText('Active');

    // Simulate user replying "STOP" 
    await mockTwilio.simulateIncomingSMS({
      from: '+1234567890',
      to: process.env.TWILIO_PHONE_NUMBER,
      body: 'STOP'
    });

    await page.waitForTimeout(2000);
    await page.reload();
    await page.waitForSelector('[data-testid="notification-preferences"]');

    // WhatsApp should now be disabled
    await expect(page.locator('[data-testid="whatsapp-notifications"]')).not.toBeChecked();
    await expect(page.locator('[data-testid="whatsapp-status"]')).toContainText('Disabled');

    // Verify opt-out confirmation was sent
    const optOutMessages = mockTwilio.getSentSMS();
    const optOutMsg = optOutMessages.find(msg => 
      msg.body.includes('WhatsApp notifications disabled')
    );
    
    expect(optOutMsg).toBeDefined();
    expect(optOutMsg?.body).toContain('You will no longer receive WhatsApp messages');

    // Verify opt-out logged
    const auditLogs = await testHelpers.getAuditLogs({
      eventType: 'WHATSAPP_OPT_OUT',
      userId: patientUser.id
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].details).toMatchObject({
      phone: '+1234567890',
      optOutMethod: 'sms_reply',
      replyMessage: 'STOP'
    });

    // Database should reflect opt-out
    const userPrefs = await testHelpers.getUserNotificationPreferences(patientUser.id);
    expect(userPrefs.whatsapp).toBe(false);
    expect(userPrefs.whatsappStatus).toBe('opted_out');
    expect(userPrefs.whatsappOptOutDate).toBeDefined();
  });

  test('should handle invalid phone number gracefully', async ({ page }) => {
    // Create user with invalid phone format
    const invalidPhoneUser = await testHelpers.createTestUser({
      email: 'invalid-phone@test.com',
      role: 'patient',
      phone: '555-1234', // Invalid format
      notificationPreferences: { whatsapp: false }
    });

    await testHelpers.login(page, invalidPhoneUser.email, 'TestPass123!');
    await page.goto('/settings/notifications');

    // Try to enable WhatsApp
    await page.check('[data-testid="whatsapp-notifications"]');

    // Should show phone validation error
    await expect(page.locator('[data-testid="phone-validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="phone-validation-error"]'))
      .toContainText('Please enter a valid international phone number');

    // WhatsApp toggle should be disabled
    await expect(page.locator('[data-testid="whatsapp-notifications"]')).not.toBeChecked();

    // Should show phone update prompt
    await expect(page.locator('[data-testid="update-phone-prompt"]')).toBeVisible();
    await page.click('[data-testid="update-phone-link"]');

    // Should navigate to profile page
    await expect(page).toHaveURL(/.*\/profile/);
    await expect(page.locator('[data-testid="phone-field"]')).toBeFocused();

    // Verify error logged
    const auditLogs = await testHelpers.getAuditLogs({
      eventType: 'WHATSAPP_OPT_IN_FAILED',
      userId: invalidPhoneUser.id
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].details.error).toContain('Invalid phone number format');

    await testHelpers.deleteUser(invalidPhoneUser.id);
  });

  test('should enforce re-opt-in after extended inactivity', async ({ page }) => {
    // Create user with old opt-in (over 180 days ago)
    const oldOptInDate = new Date();
    oldOptInDate.setDate(oldOptInDate.getDate() - 200);

    await testHelpers.updateUserNotificationPreferences(patientUser.id, {
      whatsapp: true,
      whatsappStatus: 'active',
      whatsappOptInDate: oldOptInDate,
      whatsappLastActivity: oldOptInDate
    });

    await testHelpers.login(page, patientUser.email, 'TestPass123!');
    await page.goto('/settings/notifications');

    // Should show re-opt-in required status
    await expect(page.locator('[data-testid="whatsapp-status"]')).toContainText('Re-opt-in Required');
    await expect(page.locator('[data-testid="whatsapp-reopt-notice"]'))
      .toContainText('WhatsApp consent has expired due to inactivity');

    // WhatsApp should be unchecked but with special styling
    await expect(page.locator('[data-testid="whatsapp-notifications"]')).not.toBeChecked();
    await expect(page.locator('[data-testid="whatsapp-row"]')).toHaveClass(/expired/);

    // Click to re-enable should show re-opt-in flow
    await page.check('[data-testid="whatsapp-notifications"]');
    
    await expect(page.locator('[data-testid="whatsapp-reopt-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="reopt-explanation"]'))
      .toContainText('You need to confirm your WhatsApp consent again');

    await page.check('[data-testid="accept-whatsapp-terms"]');
    await page.click('[data-testid="send-reopt-message"]');

    // Verify re-opt-in message sent
    const reOptMessages = mockTwilio.getSentSMS();
    expect(reOptMessages).toHaveLength(1);
    expect(reOptMessages[0].body).toContain('Your WhatsApp consent has expired');
    expect(reOptMessages[0].body).toContain('Reply START to re-enable');

    // Verify re-opt-in request logged
    const auditLogs = await testHelpers.getAuditLogs({
      eventType: 'WHATSAPP_REOPT_IN_REQUESTED',
      userId: patientUser.id
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].details).toMatchObject({
      previousOptInDate: oldOptInDate.toISOString(),
      inactiveDays: expect.any(Number),
      reason: 'extended_inactivity'
    });
  });

  test('should handle Twilio webhook failures gracefully', async ({ page }) => {
    await testHelpers.login(page, patientUser.email, 'TestPass123!');
    await page.goto('/settings/notifications');

    // Start opt-in process
    await page.check('[data-testid="whatsapp-notifications"]');
    await page.check('[data-testid="accept-whatsapp-terms"]');
    await page.click('[data-testid="send-opt-in-message"]');

    // Mock Twilio service failure
    mockTwilio.mockFailure('Service temporarily unavailable');

    // Simulate incoming SMS (should fail to process)
    await mockTwilio.simulateIncomingSMS({
      from: '+1234567890',
      to: process.env.TWILIO_PHONE_NUMBER,
      body: 'START'
    });

    await page.waitForTimeout(3000);
    await page.reload();

    // Status should remain pending with error indicator
    await expect(page.locator('[data-testid="whatsapp-status"]')).toContainText('Pending');
    await expect(page.locator('[data-testid="whatsapp-error-indicator"]')).toBeVisible();

    // Should show retry option
    await expect(page.locator('[data-testid="retry-whatsapp-setup"]')).toBeVisible();
    
    // Click retry after fixing service
    mockTwilio.clearFailure();
    await page.click('[data-testid="retry-whatsapp-setup"]');

    await page.waitForTimeout(1000);

    // Should send new opt-in message
    const retryMessages = mockTwilio.getSentSMS();
    expect(retryMessages.length).toBeGreaterThan(0);

    // Verify failure and retry logged
    const auditLogs = await testHelpers.getAuditLogs({
      eventType: ['WHATSAPP_WEBHOOK_FAILED', 'WHATSAPP_OPT_IN_RETRY'],
      userId: patientUser.id
    });

    const failureLog = auditLogs.find(log => log.eventType === 'WHATSAPP_WEBHOOK_FAILED');
    const retryLog = auditLogs.find(log => log.eventType === 'WHATSAPP_OPT_IN_RETRY');

    expect(failureLog).toBeDefined();
    expect(failureLog?.details.error).toContain('Service temporarily unavailable');

    expect(retryLog).toBeDefined();
    expect(retryLog?.details.retryAttempt).toBe(1);
  });

  test('should respect international phone number formats', async ({ page }) => {
    const internationalUser = await testHelpers.createTestUser({
      email: 'international@test.com',
      role: 'patient',
      phone: '+44 7700 900123', // UK format
      notificationPreferences: { whatsapp: false }
    });

    await testHelpers.login(page, internationalUser.email, 'TestPass123!');
    await page.goto('/settings/notifications');

    // Enable WhatsApp
    await page.check('[data-testid="whatsapp-notifications"]');
    
    // Should show correct international number
    await expect(page.locator('[data-testid="opt-in-phone-display"]'))
      .toContainText('+447700900123'); // Normalized format

    await page.check('[data-testid="accept-whatsapp-terms"]');
    await page.click('[data-testid="send-opt-in-message"]');

    // Verify message sent to correct international number
    const optInMessages = mockTwilio.getSentSMS();
    expect(optInMessages).toHaveLength(1);
    expect(optInMessages[0].to).toBe('+447700900123');

    // Simulate reply from international number
    await mockTwilio.simulateIncomingSMS({
      from: '+447700900123',
      to: process.env.TWILIO_PHONE_NUMBER,
      body: 'START'
    });

    await page.waitForTimeout(2000);
    await page.reload();

    // Should complete successfully
    await expect(page.locator('[data-testid="whatsapp-status"]')).toContainText('Active');

    // Verify international number handling logged
    const auditLogs = await testHelpers.getAuditLogs({
      eventType: 'WHATSAPP_OPT_IN_COMPLETED',
      userId: internationalUser.id
    });

    expect(auditLogs[0].details.phoneCountryCode).toBe('GB');
    expect(auditLogs[0].details.phoneFormatted).toBe('+447700900123');

    await testHelpers.deleteUser(internationalUser.id);
  });

  test('should handle bulk WhatsApp opt-in for multiple users', async ({ page }) => {
    // Create multiple test users
    const bulkUsers = await Promise.all(
      Array.from({ length: 10 }, (_, i) => 
        testHelpers.createTestUser({
          email: `bulk-whatsapp-${i}@test.com`,
          role: 'patient',
          phone: `+123456789${i}`,
          notificationPreferences: { whatsapp: false }
        })
      )
    );

    // Login as admin to access bulk operations
    const adminUser = await testHelpers.createTestUser({
      email: 'admin@test.com',
      role: 'admin'
    });

    await testHelpers.login(page, adminUser.email, 'TestPass123!');
    await page.goto('/admin/notifications');

    // Select users for bulk WhatsApp opt-in invitation
    for (let i = 0; i < 10; i++) {
      await page.check(`[data-testid="select-user-${bulkUsers[i].id}"]`);
    }

    await page.click('[data-testid="bulk-whatsapp-invite"]');
    
    // Confirm bulk operation
    await expect(page.locator('[data-testid="bulk-confirm-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="selected-count"]')).toContainText('10 users');
    
    await page.click('[data-testid="confirm-bulk-invite"]');

    // Wait for bulk processing
    await page.waitForTimeout(5000);

    // Verify all opt-in messages sent
    const bulkOptInMessages = mockTwilio.getSentSMS();
    expect(bulkOptInMessages).toHaveLength(10);

    // Verify each user got personalized message
    bulkOptInMessages.forEach((message, index) => {
      expect(message.to).toBe(`+123456789${index}`);
      expect(message.body).toContain('Serenity Sober Pathways');
      expect(message.body).toContain('Reply START');
    });

    // Verify bulk operation logged
    const auditLogs = await testHelpers.getAuditLogs({
      eventType: 'BULK_WHATSAPP_INVITE_SENT'
    });

    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].details).toMatchObject({
      userCount: 10,
      initiatedBy: adminUser.id,
      batchId: expect.any(String)
    });

    // Cleanup
    await Promise.all([
      ...bulkUsers.map(user => testHelpers.deleteUser(user.id)),
      testHelpers.deleteUser(adminUser.id)
    ]);
  });
});