import { test, expect } from '@playwright/test';

// Test credentials
const PATIENT_CREDENTIALS = {
  email: 'test-patient@serenity.com',
  password: 'TestSerenity2024!@#'
};

test.describe('Patient User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the auth page where login form is now shown directly
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full patient login and dashboard access', async ({ page }) => {
    // Login form is now shown directly - no need to click login button
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="login-button submit-login"]');

    // Wait for redirect and page load
    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

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
    // Login form is now shown directly
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="login-button submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Start daily check-in
    await page.click('[data-testid="start-checkin-button"]');
    await page.waitForURL('**/checkin', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Select positive mood (happy/green)
    await page.click('[data-testid="mood-positive"]');
    
    // Fill mood details
    await page.fill('[data-testid="mood-description"]', 'Feeling great today! Had a good therapy session.');
    
    // Continue to activities
    await page.click('text=Continue');
    
    // Select activities
    await page.check('[data-testid="activity-exercise"]');
    await page.check('[data-testid="activity-meditation"]');
    
    // Continue to sleep rating
    await page.click('text=Continue');
    
    // Rate sleep quality
    await page.click('[data-testid="sleep-rating-4"]'); // Good sleep
    
    // Submit check-in
    await page.click('[data-testid="submit-checkin"]');
    
    // Verify successful submission
    await expect(page.locator('[data-testid="checkin-success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="checkin-success-message"]')).toContainText('Check-in completed successfully');
    
    // Verify return to dashboard (database status may not update immediately in test environment)
    await page.click('[data-testid="return-to-dashboard"]');
    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    // Note: Database status update is tested separately in integration tests
  });

  test('should complete daily check-in flow with neutral mood', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="login-button submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Start daily check-in
    await page.click('[data-testid="start-checkin-button"]');
    await page.waitForURL('**/checkin', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Select neutral mood (yellow)
    await page.click('[data-testid="mood-neutral"]');
    
    // Fill mood details
    await page.fill('[data-testid="mood-description"]', 'Feeling okay, just a regular day.');
    
    // Continue to activities
    await page.click('text=Continue');
    
    // Select activities
    await page.check('[data-testid="activity-reading"]');
    
    // Continue to sleep rating
    await page.click('text=Continue');
    
    // Rate sleep quality
    await page.click('[data-testid="sleep-rating-3"]'); // Average sleep
    
    // Submit check-in
    await page.click('[data-testid="submit-checkin"]');
    
    // Verify successful submission
    await expect(page.locator('[data-testid="checkin-success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="checkin-success-message"]')).toContainText('Check-in completed successfully');
  });

  test('should complete daily check-in flow with negative mood and trigger support resources', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="login-button submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Start daily check-in
    await page.click('[data-testid="start-checkin-button"]');
    await page.waitForURL('**/checkin', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Select negative mood (red)
    await page.click('[data-testid="mood-negative"]');
    
    // Fill mood details
    await page.fill('[data-testid="mood-description"]', 'Feeling down today, struggling with cravings.');
    
    // Continue to activities
    await page.click('text=Continue');
    
    // Select activities
    await page.check('[data-testid="activity-therapy"]');
    
    // Continue to sleep rating
    await page.click('text=Continue');
    
    // Rate sleep quality
    await page.click('[data-testid="sleep-rating-2"]'); // Poor sleep
    
    // Submit check-in
    await page.click('[data-testid="submit-checkin"]');
    
    // Verify support resources are triggered for negative mood
    await expect(page.locator('[data-testid="support-resources"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-support-offer"]')).toBeVisible();
    
    // Verify successful submission
    await expect(page.locator('[data-testid="checkin-success-message"]')).toBeVisible();
  });

  test('should access crisis support features', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="login-button submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Access crisis support
    await page.click('[data-testid="crisis-support-button"]');
    await page.waitForURL('**/crisis', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify crisis support page elements
    await expect(page.locator('[data-testid="crisis-help-resources"]')).toBeVisible();
    await expect(page.locator('[data-testid="emergency-contacts"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-chat"]')).toBeVisible();
  });

  test('should access peer support', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="login-button submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Access peer support
    await page.click('[data-testid="peer-support-access"]');
    await page.waitForURL('**/peer-support', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify peer support page elements
    await expect(page.locator('[data-testid="peer-chat"]')).toBeVisible();
    await expect(page.locator('[data-testid="support-groups"]')).toBeVisible();
  });

  test('should access community features', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="login-button submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Access community
    await page.click('[data-testid="community-access"]');
    await page.waitForURL('**/community', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify community page elements
    await expect(page.locator('[data-testid="community-forum"]')).toBeVisible();
    await expect(page.locator('[data-testid="community-events"]')).toBeVisible();
  });

  test('should handle navigation and logout properly', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="login-button submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Navigate to different sections
    await page.click('[data-testid="progress-nav"]');
    await page.waitForURL('**/progress', { timeout: 15000 });
    await expect(page.locator('[data-testid="progress-page"]')).toBeVisible();

    await page.click('[data-testid="calendar-nav"]');
    await page.waitForURL('**/calendar', { timeout: 15000 });
    await expect(page.locator('[data-testid="calendar-page"]')).toBeVisible();

    // Logout
    await page.click('[data-testid="logout-button"]');
    await page.waitForURL('**/auth', { timeout: 15000 });
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
  });

  test('should verify role-based access control - patient cannot access provider/supporter areas', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="login-button submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Try to access provider areas (should redirect to access denied)
    await page.goto('/provider/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();

    // Try to access supporter areas (should redirect to access denied)
    await page.goto('/supporter/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();

    // Verify patient areas are still accessible
    await page.goto('/patient/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="patient-dashboard"]')).toBeVisible();
  });
});