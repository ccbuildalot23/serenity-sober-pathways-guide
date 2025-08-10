import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../utils/test-helpers';

test.describe('Supporter User Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('should complete full supporter login and dashboard access', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/supporter/dashboard', { timeout: 15000 });

    // Verify supporter dashboard elements
    await expect(page.locator('[data-testid="supporter-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="supported-persons-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-alerts-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="communication-center"]').first()).toBeVisible();
    await expect(page.locator('[data-testid="location-sharing-status"]')).toBeVisible();

    // Verify role-based access - supporter should NOT see patient/provider elements
    await expect(page.locator('[data-testid="patient-dashboard"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="provider-dashboard"]')).not.toBeVisible();
  });

  test('should view and manage supported persons list', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/supporter/dashboard', { timeout: 15000 });

    // Access supported persons section
    await page.click('[data-testid="supported-persons-tab"]');
    await expect(page).toHaveURL('/supporter/supported-persons');

    // Verify supported persons interface
    await expect(page.locator('[data-testid="supported-persons-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-supported-person"]')).toBeVisible();
    await expect(page.locator('[data-testid="support-status-overview"]')).toBeVisible();

    // Test adding a supported person
    await page.click('[data-testid="add-supported-person"]');
    // Note: This would normally open a form, but for now we just verify the button exists
  });

  test('should receive and respond to crisis alerts', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/supporter/dashboard', { timeout: 15000 });

    // Check for crisis alerts panel
    await expect(page.locator('[data-testid="crisis-alerts-panel"]')).toBeVisible();

    // Simulate receiving a crisis alert
    await page.evaluate(() => {
      const event = new (window as any).CustomEvent('crisis-alert', {
        detail: {
          patientId: 'test-patient',
          message: 'I need immediate support right now',
          location: { lat: 40.7128, lng: -74.0060 },
          timestamp: new Date().toISOString()
        }
      });
      window.dispatchEvent(event);
    });

    // Verify crisis alert appears in panel
    await expect(page.locator('[data-testid="active-crisis-alert"]')).toBeVisible();
    
    // Click on crisis alert to view details
    await page.click('[data-testid="active-crisis-alert"]');
    await expect(page.locator('[data-testid="crisis-alert-modal"]')).toBeVisible();

    // Verify crisis details
    await expect(page.locator('[data-testid="crisis-patient-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-location"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-timestamp"]')).toBeVisible();

    // Test crisis response options
    await expect(page.locator('[data-testid="call-patient-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="escalate-button"]')).toBeVisible();
  });

  test('should manage communication and messaging', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/supporter/dashboard', { timeout: 15000 });

    // Access communication center
    await page.click('[data-testid="communication-center"]');
    await expect(page).toHaveURL('/supporter/messages');

    // Verify messaging interface
    await expect(page.locator('[data-testid="message-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="compose-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="message-filters"]')).toBeVisible();

    // Test composing a message
    await page.click('[data-testid="compose-message"]');
    await expect(page.locator('[data-testid="message-compose-form"]')).toBeVisible();

    // Fill message form
    await page.fill('[data-testid="message-recipient"]', 'test-patient@serenity.com');
    await page.fill('[data-testid="message-subject"]', 'Checking in on your progress');
    await page.fill('[data-testid="message-content"]', 'Hi! Just wanted to see how you\'re doing today.');
    await page.click('[data-testid="send-message"]');

    // Verify message sent confirmation
    await expect(page.locator('[data-testid="message-sent-confirmation"]')).toBeVisible();
  });

  test('should manage location sharing settings and features', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/supporter/dashboard', { timeout: 15000 });

    // Access location settings
    await page.click('[data-testid="location-settings"]');
    await expect(page.locator('[data-testid="location-settings-modal"]')).toBeVisible();

    // Verify location sharing interface
    await expect(page.locator('[data-testid="location-sharing-toggle"]')).toBeVisible();
    await expect(page.locator('[data-testid="location-permissions"]')).toBeVisible();
    await expect(page.locator('[data-testid="sharing-preferences"]')).toBeVisible();

    // Test location sharing toggle
    await page.click('[data-testid="location-sharing-toggle"]');
    await expect(page.locator('[data-testid="location-sharing-active"]')).toBeVisible();

    // Test location permissions
    await page.click('[data-testid="location-permissions"]');
    await expect(page.locator('[data-testid="permission-status"]')).toBeVisible();
  });

  test('should access support resources and education', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/supporter/dashboard', { timeout: 15000 });

    // Access support resources
    await page.click('[data-testid="support-resources-tab"]');
    await expect(page).toHaveURL('/supporter/resources');

    // Verify resources interface
    await expect(page.locator('[data-testid="educational-materials"]')).toBeVisible();
    await expect(page.locator('[data-testid="support-guidelines"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-resources"]')).toBeVisible();

    // Test accessing educational materials
    await page.click('[data-testid="educational-materials"]');
    await expect(page.locator('[data-testid="materials-list"]')).toBeVisible();

    // Test accessing support guidelines
    await page.click('[data-testid="support-guidelines"]');
    await expect(page.locator('[data-testid="guidelines-content"]')).toBeVisible();
  });

  test('should manage supporter profile and preferences', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/supporter/dashboard', { timeout: 15000 });

    // Access profile settings
    await page.click('[data-testid="supporter-menu"]');
    await page.click('[data-testid="profile-settings"]');
    await expect(page).toHaveURL('/supporter/profile');

    // Verify profile interface
    await expect(page.locator('[data-testid="supporter-profile-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-preferences"]')).toBeVisible();
    await expect(page.locator('[data-testid="privacy-settings"]')).toBeVisible();

    // Test updating profile information
    await page.fill('[data-testid="supporter-name"]', 'Updated Supporter Name');
    await page.fill('[data-testid="supporter-phone"]', '555-9999');
    await page.click('[data-testid="save-profile"]');

    // Verify profile updated
    await expect(page.locator('[data-testid="profile-updated"]')).toBeVisible();
  });

  test('should handle navigation and logout properly', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/supporter/dashboard', { timeout: 15000 });

    // Test navigation between sections
    await page.click('[data-testid="nav-supported-persons"]');
    await expect(page).toHaveURL('/supporter/supported-persons');

    await page.click('[data-testid="nav-messages"]');
    await expect(page).toHaveURL('/supporter/messages');

    await page.click('[data-testid="nav-resources"]');
    await expect(page).toHaveURL('/supporter/resources');

    // Test logout
    await page.click('[data-testid="supporter-menu"]');
    await page.click('[data-testid="logout-button"]');
    await expect(page).toHaveURL('/');
  });

  test('should verify role-based access control - supporter cannot access patient/provider areas', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/supporter/dashboard', { timeout: 15000 });

    // Attempt to access patient dashboard directly
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/access-denied');
    await expect(page.locator('[data-testid="access-denied-message"]')).toContainText('You do not have permission to access this area');    

    // Attempt to access provider dashboard directly
    await page.goto('/provider/dashboard');
    await expect(page).toHaveURL('/access-denied');
    await expect(page.locator('[data-testid="access-denied-message"]')).toContainText('You do not have permission to access this area');
  });

  test('should handle real-time notifications and alerts', async ({ page }) => {
    // Login as supporter
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/supporter/dashboard', { timeout: 15000 });

    // Test notification history
    await page.click('[data-testid="notification-history"]');
    await expect(page.locator('[data-testid="notification-timeline"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-types"]')).toBeVisible();

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
  });
});