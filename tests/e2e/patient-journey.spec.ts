import { test, expect } from '@playwright/test';

// Test credentials
const PATIENT_CREDENTIALS = {
  email: 'test-patient@serenity.com',
  password: 'TestSerenity2024!@#'
};

test.describe('Patient User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
  });

  test('should complete full patient login and dashboard access', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    // Verify successful login and redirect to patient dashboard
    await expect(page).toHaveURL('/patient/dashboard');
    await expect(page.locator('[data-testid="patient-dashboard"]')).toBeVisible();
    
    // Verify patient-specific UI elements
    await expect(page.locator('[data-testid="daily-checkin-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="mood-tracker"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-support-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="peer-support-access"]')).toBeVisible();

    // Verify role-based access - patient should NOT see provider/supporter elements
    await expect(page.locator('[data-testid="provider-dashboard"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="supporter-dashboard"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="patient-list"]')).not.toBeVisible();
  });

  test('should complete daily check-in flow with positive mood', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/patient/dashboard');

    // Start daily check-in
    await page.click('[data-testid="start-checkin-button"]');
    await expect(page).toHaveURL('/patient/checkin');

    // Select positive mood (happy/green)
    await page.click('[data-testid="mood-positive"]');
    
    // Fill mood details
    await page.fill('[data-testid="mood-description"]', 'Feeling great today! Had a good therapy session.');
    
    // Select activities
    await page.check('[data-testid="activity-exercise"]');
    await page.check('[data-testid="activity-meditation"]');
    
    // Rate sleep quality
    await page.click('[data-testid="sleep-rating-4"]'); // Good sleep
    
    // Submit check-in
    await page.click('[data-testid="submit-checkin"]');
    
    // Verify successful submission
    await expect(page.locator('[data-testid="checkin-success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="checkin-success-message"]')).toContainText('Check-in completed successfully');
    
    // Verify return to dashboard with updated status
    await page.click('[data-testid="return-to-dashboard"]');
    await expect(page).toHaveURL('/patient/dashboard');
    await expect(page.locator('[data-testid="last-checkin-status"]')).toContainText('Positive');
  });

  test('should complete daily check-in flow with neutral mood', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/patient/dashboard');

    // Start daily check-in
    await page.click('[data-testid="start-checkin-button"]');
    
    // Select neutral mood (okay/yellow)
    await page.click('[data-testid="mood-neutral"]');
    
    // Fill mood details
    await page.fill('[data-testid="mood-description"]', 'Having an okay day. Some ups and downs.');
    
    // Select activities
    await page.check('[data-testid="activity-journaling"]');
    
    // Rate sleep quality
    await page.click('[data-testid="sleep-rating-3"]'); // Average sleep
    
    // Submit check-in
    await page.click('[data-testid="submit-checkin"]');
    
    // Verify successful submission
    await expect(page.locator('[data-testid="checkin-success-message"]')).toBeVisible();
    
    // Return to dashboard
    await page.click('[data-testid="return-to-dashboard"]');
    await expect(page.locator('[data-testid="last-checkin-status"]')).toContainText('Neutral');
  });

  test('should complete daily check-in flow with negative mood and trigger support resources', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/patient/dashboard');

    // Start daily check-in
    await page.click('[data-testid="start-checkin-button"]');
    
    // Select negative mood (sad/red)
    await page.click('[data-testid="mood-negative"]');
    
    // Fill mood details with concerning content
    await page.fill('[data-testid="mood-description"]', 'Having a really tough day. Feeling overwhelmed and struggling.');
    
    // Rate sleep quality as poor
    await page.click('[data-testid="sleep-rating-1"]'); // Poor sleep
    
    // Submit check-in
    await page.click('[data-testid="submit-checkin"]');
    
    // Verify support resources are presented for negative mood
    await expect(page.locator('[data-testid="support-resources-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-hotline-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="immediate-support-options"]')).toBeVisible();
    
    // Test crisis support button
    await page.click('[data-testid="contact-crisis-support"]');
    await expect(page.locator('[data-testid="crisis-contact-modal"]')).toBeVisible();
    
    // Close modal and return to dashboard
    await page.click('[data-testid="close-support-modal"]');
    await page.click('[data-testid="return-to-dashboard"]');
    await expect(page.locator('[data-testid="last-checkin-status"]')).toContainText('Needs Support');
  });

  test('should access and use crisis support features', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/patient/dashboard');

    // Access crisis support from dashboard
    await page.click('[data-testid="crisis-support-button"]');
    await expect(page).toHaveURL('/patient/crisis-support');

    // Verify crisis support options are available
    await expect(page.locator('[data-testid="crisis-hotline-988"]')).toBeVisible();
    await expect(page.locator('[data-testid="text-crisis-line"]')).toBeVisible();
    await expect(page.locator('[data-testid="emergency-contacts"]')).toBeVisible();
    await expect(page.locator('[data-testid="breathing-exercises"]')).toBeVisible();

    // Test breathing exercise
    await page.click('[data-testid="start-breathing-exercise"]');
    await expect(page.locator('[data-testid="breathing-guide"]')).toBeVisible();
    await expect(page.locator('[data-testid="breathing-timer"]')).toBeVisible();

    // Test emergency contact feature
    await page.click('[data-testid="contact-supporter"]');
    await expect(page.locator('[data-testid="supporter-contact-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-location-toggle"]')).toBeVisible();

    // Test location sharing toggle
    await page.check('[data-testid="send-location-toggle"]');
    await page.fill('[data-testid="crisis-message"]', 'Need immediate support, feeling overwhelmed');
    await page.click('[data-testid="send-crisis-alert"]');
    
    // Verify alert sent confirmation
    await expect(page.locator('[data-testid="alert-sent-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-sent-confirmation"]')).toContainText('Support team has been notified');
  });

  test('should access and participate in peer support chat', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/patient/dashboard');

    // Access peer support
    await page.click('[data-testid="peer-support-access"]');
    await expect(page).toHaveURL('/patient/peer-support');

    // Verify peer support interface
    await expect(page.locator('[data-testid="peer-chat-room"]')).toBeVisible();
    await expect(page.locator('[data-testid="peer-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="send-message-button"]')).toBeVisible();

    // Test sending a message
    await page.fill('[data-testid="chat-input"]', 'Hello everyone, hope you\'re all having a good day!');
    await page.click('[data-testid="send-message-button"]');

    // Verify message appears in chat
    await expect(page.locator('[data-testid="chat-messages"]')).toContainText('Hello everyone, hope you\'re all having a good day!');

    // Test community guidelines access
    await page.click('[data-testid="community-guidelines-link"]');
    await expect(page.locator('[data-testid="guidelines-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="guidelines-content"]')).toContainText('Community Guidelines');
  });

  test('should access and use community features', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/patient/dashboard');

    // Access community features
    await page.click('[data-testid="community-access"]');
    await expect(page).toHaveURL('/patient/community');

    // Verify community features
    await expect(page.locator('[data-testid="community-feed"]')).toBeVisible();
    await expect(page.locator('[data-testid="milestone-sharing"]')).toBeVisible();
    await expect(page.locator('[data-testid="support-groups"]')).toBeVisible();
    await expect(page.locator('[data-testid="inspirational-content"]')).toBeVisible();

    // Test sharing a milestone
    await page.click('[data-testid="share-milestone-button"]');
    await expect(page.locator('[data-testid="milestone-modal"]')).toBeVisible();
    
    await page.selectOption('[data-testid="milestone-type"]', '30-days-sober');
    await page.fill('[data-testid="milestone-message"]', 'Just hit 30 days! Feeling grateful and strong.');
    await page.click('[data-testid="share-milestone"]');
    
    // Verify milestone shared
    await expect(page.locator('[data-testid="milestone-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="community-feed"]')).toContainText('30 days sober');

    // Test joining a support group
    await page.click('[data-testid="join-support-group"]');
    await expect(page.locator('[data-testid="group-selection-modal"]')).toBeVisible();
    await page.click('[data-testid="group-early-recovery"]');
    await page.click('[data-testid="confirm-join-group"]');
    
    // Verify group membership
    await expect(page.locator('[data-testid="joined-groups"]')).toContainText('Early Recovery Support');
  });

  test('should handle navigation and logout properly', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/patient/dashboard');

    // Test navigation between sections
    await page.click('[data-testid="nav-checkin"]');
    await expect(page).toHaveURL('/patient/checkin');

    await page.click('[data-testid="nav-peer-support"]');
    await expect(page).toHaveURL('/patient/peer-support');

    await page.click('[data-testid="nav-community"]');
    await expect(page).toHaveURL('/patient/community');

    await page.click('[data-testid="nav-dashboard"]');
    await expect(page).toHaveURL('/patient/dashboard');

    // Test logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Verify logout and redirect to home
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
    
    // Verify patient areas are no longer accessible without authentication
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('should verify role-based access control - patient cannot access provider/supporter areas', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/patient/dashboard');

    // Attempt to access provider dashboard directly
    await page.goto('/provider/dashboard');
    await expect(page).toHaveURL('/access-denied');
    await expect(page.locator('[data-testid="access-denied-message"]')).toContainText('You do not have permission to access this area');

    // Attempt to access supporter dashboard directly
    await page.goto('/supporter/dashboard');
    await expect(page).toHaveURL('/access-denied');
    await expect(page.locator('[data-testid="access-denied-message"]')).toContainText('You do not have permission to access this area');

    // Verify patient can return to their authorized dashboard
    await page.click('[data-testid="return-to-dashboard"]');
    await expect(page).toHaveURL('/patient/dashboard');
  });
});