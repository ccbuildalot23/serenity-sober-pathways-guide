import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../utils/test-helpers';

test.describe('Real-time Communication System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should handle peer support chat messaging', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });

    // Navigate to peer support
    await page.click('[data-testid="peer-support-access"]');
    await page.waitForURL('**/peer-support', { timeout: 15000 });

    // Verify peer support interface
    await expect(page.locator('[data-testid="peer-support-chat"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-message-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-message-button"]')).toBeVisible();

    // Send a message
    await page.fill('[data-testid="chat-message-input"]', 'Hello everyone! How is your recovery journey going?');
    await page.click('[data-testid="send-message-button"]');

    // Verify message appears in chat
    await expect(page.locator('[data-testid="chat-message"]')).toContainText('Hello everyone! How is your recovery journey going?');
    await expect(page.locator('[data-testid="message-timestamp"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-author"]')).toContainText('You');
  });

  test('should handle real-time message updates', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });

    // Navigate to peer support
    await page.click('[data-testid="peer-support-access"]');
    await page.waitForURL('**/peer-support', { timeout: 15000 });

    // Simulate receiving a real-time message
    await page.evaluate(() => {
      const event = new CustomEvent('new-message', {
        detail: {
          id: 'msg-123',
          content: 'Great to see you here! Keep up the good work!',
          author: 'RecoveryBuddy',
          timestamp: new Date().toISOString(),
          type: 'support'
        }
      });
      window.dispatchEvent(event);
    });

    // Verify new message appears in real-time
    await expect(page.locator('[data-testid="chat-message"]')).toContainText('Great to see you here! Keep up the good work!');
    await expect(page.locator('[data-testid="message-author"]')).toContainText('RecoveryBuddy');
  });

  test('should handle file sharing in chat', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });

    // Navigate to peer support
    await page.click('[data-testid="peer-support-access"]');
    await page.waitForURL('**/peer-support', { timeout: 15000 });

    // Test file upload
    await page.click('[data-testid="attach-file-button"]');
    await expect(page.locator('[data-testid="file-upload-modal"]')).toBeVisible();

    // Select file type
    await page.selectOption('[data-testid="file-type-select"]', 'image');
    
    // Upload file (simulated)
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles({
      name: 'recovery-milestone.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data')
    });

    // Verify file upload
    await expect(page.locator('[data-testid="file-upload-progress"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-upload-success"]')).toBeVisible();
  });

  test('should handle chat moderation features', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });

    // Navigate to peer support
    await page.click('[data-testid="peer-support-access"]');
    await page.waitForURL('**/peer-support', { timeout: 15000 });

    // Test reporting inappropriate content
    await page.click('[data-testid="message-options"]'); // First message
    await page.click('[data-testid="report-message"]');
    await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();

    // Fill report form
    await page.selectOption('[data-testid="report-reason"]', 'inappropriate-content');
    await page.fill('[data-testid="report-description"]', 'This message contains inappropriate language');
    await page.click('[data-testid="submit-report"]');

    // Verify report submitted
    await expect(page.locator('[data-testid="report-submitted"]')).toBeVisible();
  });

  test('should handle push notifications', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });

    // Enable push notifications
    await page.click('[data-testid="enable-notifications"]');
    
    // Handle browser notification permission
    page.on('dialog', dialog => dialog.accept());
    
    // Verify notification permission granted
    await expect(page.locator('[data-testid="notifications-enabled"]')).toBeVisible();

    // Test notification preferences
    await page.click('[data-testid="notification-settings"]');
    await expect(page.locator('[data-testid="notification-preferences"]')).toBeVisible();

    // Configure notification types
    await page.check('[data-testid="notify-new-messages"]');
    await page.check('[data-testid="notify-daily-reminders"]');
    await page.uncheck('[data-testid="notify-marketing"]');

    // Save preferences
    await page.click('[data-testid="save-notification-preferences"]');
    await expect(page.locator('[data-testid="preferences-saved"]')).toBeVisible();
  });

  test('should handle email notifications', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });

    // Navigate to notification settings
    await page.click('[data-testid="notification-settings"]');
    await page.click('[data-testid="email-notifications-tab"]');

    // Configure email notifications
    await page.check('[data-testid="email-daily-summary"]');
    await page.check('[data-testid="email-weekly-report"]');
    await page.check('[data-testid="email-crisis-alerts"]');
    await page.uncheck('[data-testid="email-marketing"]');

    // Set email frequency
    await page.selectOption('[data-testid="email-frequency"]', 'daily');

    // Save email preferences
    await page.click('[data-testid="save-email-preferences"]');
    await expect(page.locator('[data-testid="email-preferences-saved"]')).toBeVisible();
  });

  test('should handle SMS notifications', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });

    // Navigate to notification settings
    await page.click('[data-testid="notification-settings"]');
    await page.click('[data-testid="sms-notifications-tab"]');

    // Add phone number
    await page.fill('[data-testid="phone-number-input"]', '555-0123');
    await page.click('[data-testid="verify-phone"]');

    // Handle verification code (simulated)
    await page.fill('[data-testid="verification-code"]', '123456');
    await page.click('[data-testid="confirm-verification"]');

    // Configure SMS notifications
    await page.check('[data-testid="sms-crisis-alerts"]');
    await page.check('[data-testid="sms-daily-checkin-reminders"]');
    await page.uncheck('[data-testid="sms-marketing"]');

    // Save SMS preferences
    await page.click('[data-testid="save-sms-preferences"]');
    await expect(page.locator('[data-testid="sms-preferences-saved"]')).toBeVisible();
  });

  test('should handle notification delivery preferences', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });

    // Navigate to notification settings
    await page.click('[data-testid="notification-settings"]');
    await page.click('[data-testid="delivery-preferences-tab"]');

    // Set quiet hours
    await page.fill('[data-testid="quiet-hours-start"]', '22:00');
    await page.fill('[data-testid="quiet-hours-end"]', '08:00');
    await page.check('[data-testid="enable-quiet-hours"]');

    // Set notification priority
    await page.selectOption('[data-testid="notification-priority"]', 'high');

    // Configure emergency override
    await page.check('[data-testid="emergency-override-quiet-hours"]');
    await page.check('[data-testid="crisis-alerts-always-on"]');

    // Save delivery preferences
    await page.click('[data-testid="save-delivery-preferences"]');
    await expect(page.locator('[data-testid="delivery-preferences-saved"]')).toBeVisible();
  });

  test('should handle notification history and management', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });

    // Navigate to notification history
    await page.click('[data-testid="notification-history"]');
    await expect(page.locator('[data-testid="notification-history-list"]')).toBeVisible();

    // Test notification filtering
    await page.selectOption('[data-testid="notification-filter"]', 'crisis-alerts');
    await expect(page.locator('[data-testid="filtered-notifications"]')).toBeVisible();

    // Test notification search
    await page.fill('[data-testid="notification-search"]', 'crisis');
    await page.click('[data-testid="search-notifications"]');
    await expect(page.locator('[data-testid="search-results"]')).toBeVisible();

    // Test notification actions
    await page.click('[data-testid="mark-all-read"]');
    await expect(page.locator('[data-testid="all-notifications-read"]')).toBeVisible();

    // Test notification deletion
    await page.click('[data-testid="delete-old-notifications"]');
    await expect(page.locator('[data-testid="notifications-deleted"]')).toBeVisible();
  });
});
