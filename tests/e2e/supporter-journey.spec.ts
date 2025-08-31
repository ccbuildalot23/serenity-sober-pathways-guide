import { test, expect } from '@playwright/test';

// Test credentials
const SUPPORTER_CREDENTIALS = {
  email: 'test-supporter@serenity.com',
  password: 'TestPass123'
};

test.describe('Supporter User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the auth page where login form is now shown directly
    await page.goto('/auth');
  });

  test('should complete full supporter login and dashboard access', async ({ page }) => {
    // Login form is now shown directly - no need to click login button
    await page.fill('input[type="email"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('input[type="password"]', SUPPORTER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // Verify successful login and redirect to supporter dashboard
    await expect(page).toHaveURL('/supporter/dashboard');
    await expect(page.locator('[data-testid="supporter-dashboard"]')).toBeVisible();
    
    // Verify supporter-specific UI elements
    await expect(page.locator('[data-testid="supported-persons-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-alerts-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="communication-tools"]')).toBeVisible();
    await expect(page.locator('[data-testid="support-resources"]')).toBeVisible();

    // Verify role-based access - supporter should NOT see patient/provider elements
    await expect(page.locator('[data-testid="patient-dashboard"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="provider-dashboard"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="daily-checkin-section"]')).not.toBeVisible();
  });

  test('should view and manage supported persons list', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('input[type="password"]', SUPPORTER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Access supported persons list
    await page.click('[data-testid="supported-persons-tab"]');
    await expect(page).toHaveURL('/supporter/persons');

    // Verify supported persons interface
    await expect(page.locator('[data-testid="persons-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="add-person-button"]')).toBeVisible();

    // Test adding a new supported person
    await page.click('[data-testid="add-person-button"]');
    await expect(page.locator('[data-testid="add-person-form"]')).toBeVisible();

    // Fill person details
    await page.fill('[data-testid="person-name"]', 'John Smith');
    await page.fill('[data-testid="person-email"]', 'john.smith@example.com');
    await page.fill('[data-testid="person-phone"]', '555-0123');
    await page.selectOption('[data-testid="relationship-type"]', 'family-member');
    await page.click('[data-testid="save-person"]');

    // Verify person added
    await expect(page.locator('[data-testid="person-added-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="persons-list"]')).toContainText('John Smith');
  });

  test('should receive and respond to crisis alerts', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('input[type="password"]', SUPPORTER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Access crisis alerts
    await page.click('[data-testid="crisis-alerts-tab"]');
    await expect(page).toHaveURL('/supporter/alerts');

    // Verify crisis alerts interface
    await expect(page.locator('[data-testid="alerts-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-settings"]')).toBeVisible();

    // Test crisis alert response (if any exist)
    if (await page.locator('[data-testid="crisis-alert-item"]').isVisible()) {
      await page.click('[data-testid="crisis-alert-item"]');
      await expect(page.locator('[data-testid="alert-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="person-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="response-options"]')).toBeVisible();

      // Respond to alert
      await page.click('[data-testid="acknowledge-alert"]');
      await expect(page.locator('[data-testid="alert-acknowledged"]')).toBeVisible();

      // Add response notes
      await page.fill('[data-testid="response-notes"]', 'Contacted person and provided support');
      await page.click('[data-testid="save-response"]');
      await expect(page.locator('[data-testid="response-saved"]')).toBeVisible();
    }
  });

  test('should manage communication and messaging', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('input[type="password"]', SUPPORTER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Access messaging
    await page.click('[data-testid="messaging-tab"]');
    await expect(page).toHaveURL('/supporter/messages');

    // Verify messaging interface
    await expect(page.locator('[data-testid="messages-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="compose-message"]')).toBeVisible();

    // Test composing a message
    await page.click('[data-testid="compose-message"]');
    await expect(page.locator('[data-testid="message-form"]')).toBeVisible();

    // Fill message details
    await page.selectOption('[data-testid="recipient-select"]', 'John Smith');
    await page.fill('[data-testid="message-subject"]', 'Checking in');
    await page.fill('[data-testid="message-content"]', 'Hi John, just wanted to check in and see how you\'re doing today.');
    await page.click('[data-testid="send-message"]');

    // Verify message sent
    await expect(page.locator('[data-testid="message-sent"]')).toBeVisible();
  });

  test('should manage location sharing settings and features', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('input[type="password"]', SUPPORTER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Access location settings
    await page.click('[data-testid="location-settings"]');
    await expect(page).toHaveURL('/supporter/location');

    // Verify location interface
    await expect(page.locator('[data-testid="location-sharing"]')).toBeVisible();
    await expect(page.locator('[data-testid="location-permissions"]')).toBeVisible();

    // Test location sharing toggle
    await page.click('[data-testid="enable-location-sharing"]');
    await expect(page.locator('[data-testid="location-enabled"]')).toBeVisible();

    // Test location permissions
    await page.click('[data-testid="request-location-permission"]');
    await expect(page.locator('[data-testid="permission-requested"]')).toBeVisible();
  });

  test('should access support resources and education', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('input[type="password"]', SUPPORTER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Access support resources
    await page.click('[data-testid="support-resources-tab"]');
    await expect(page).toHaveURL('/supporter/resources');

    // Verify resources interface
    await expect(page.locator('[data-testid="resources-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="educational-content"]')).toBeVisible();

    // Test accessing educational content
    await page.click('[data-testid="educational-content"]');
    await expect(page.locator('[data-testid="content-viewer"]')).toBeVisible();
    await expect(page.locator('[data-testid="content-title"]')).toBeVisible();
  });

  test('should manage supporter profile and preferences', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('input[type="password"]', SUPPORTER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Access profile settings
    await page.click('[data-testid="profile-settings"]');
    await expect(page).toHaveURL('/supporter/profile');

    // Verify profile interface
    await expect(page.locator('[data-testid="profile-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="supporter-info"]')).toBeVisible();

    // Update profile information
    await page.fill('[data-testid="supporter-name"]', 'Jane Doe');
    await page.fill('[data-testid="supporter-phone"]', '555-0123');
    await page.selectOption('[data-testid="notification-preferences"]', 'immediate');
    await page.click('[data-testid="save-profile"]');

    // Verify profile update
    await expect(page.locator('[data-testid="profile-updated"]')).toBeVisible();
  });

  test('should handle navigation and logout properly', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('input[type="password"]', SUPPORTER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Navigate to different sections
    await page.click('[data-testid="persons-nav"]');
    await page.waitForURL('**/supporter/persons', { timeout: 15000 });
    await expect(page.locator('[data-testid="supported-persons-list"]')).toBeVisible();

    await page.click('[data-testid="messages-nav"]');
    await page.waitForURL('**/supporter/messages', { timeout: 15000 });
    await expect(page.locator('[data-testid="messages-list"]')).toBeVisible();

    // Logout
    await page.click('[data-testid="logout-button"]');
    await page.waitForURL('**/auth', { timeout: 15000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should verify role-based access control - supporter cannot access patient/provider areas', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('input[type="password"]', SUPPORTER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Try to access patient areas (should redirect to access denied)
    await page.goto('/patient/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();

    // Try to access provider areas (should redirect to access denied)
    await page.goto('/provider/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();

    // Verify supporter areas are still accessible
    await page.goto('/supporter/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="supporter-dashboard"]')).toBeVisible();
  });

  test('should handle real-time notifications and alerts', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', SUPPORTER_CREDENTIALS.email);
    await page.fill('input[type="password"]', SUPPORTER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/supporter/dashboard');

    // Access notifications
    await page.click('[data-testid="notifications-tab"]');
    await expect(page).toHaveURL('/supporter/notifications');

    // Verify notifications interface
    await expect(page.locator('[data-testid="notifications-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="notification-settings"]')).toBeVisible();

    // Test notification settings
    await page.click('[data-testid="notification-settings"]');
    await expect(page.locator('[data-testid="settings-form"]')).toBeVisible();

    // Update notification preferences
    await page.check('[data-testid="email-notifications"]');
    await page.check('[data-testid="sms-notifications"]');
    await page.selectOption('[data-testid="notification-frequency"]', 'immediate');
    await page.click('[data-testid="save-settings"]');

    // Verify settings saved
    await expect(page.locator('[data-testid="settings-saved"]')).toBeVisible();
  });
});