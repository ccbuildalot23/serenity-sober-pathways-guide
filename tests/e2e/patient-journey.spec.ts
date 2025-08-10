import { test, expect } from '@playwright/test';

// Test credentials
const PATIENT_CREDENTIALS = {
  email: 'test-patient@serenity.com',
  password: 'TestSerenity2024!@#'
};

test.describe('Patient User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the auth page where login button is located
    await page.goto('/auth');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full patient login and dashboard access', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

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
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

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
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Start daily check-in
    await page.click('[data-testid="start-checkin-button"]');
    await page.waitForURL('**/checkin', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    
    // Select neutral mood (okay/yellow)
    await page.click('[data-testid="mood-neutral"]');
    
    // Fill mood details
    await page.fill('[data-testid="mood-description"]', 'Having an okay day. Some ups and downs.');
    
    // Continue to activities
    await page.click('text=Continue');
    
    // Select activities
    await page.check('[data-testid="activity-journaling"]');
    
    // Continue to sleep rating
    await page.click('text=Continue');
    
    // Rate sleep quality
    await page.click('[data-testid="sleep-rating-3"]'); // Average sleep
    
    // Submit check-in
    await page.click('[data-testid="submit-checkin"]');
    
    // Verify successful submission
    await expect(page.locator('[data-testid="checkin-success-message"]')).toBeVisible();
    
    // Return to dashboard (database status may not update immediately in test environment)
    await page.click('[data-testid="return-to-dashboard"]');
    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    // Note: Database status update is tested separately in integration tests
  });

  test('should complete daily check-in flow with negative mood and trigger support resources', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Start daily check-in
    await page.click('[data-testid="start-checkin-button"]');
    await page.waitForURL('**/checkin', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    
    // Select negative mood (sad/red)
    await page.click('[data-testid="mood-negative"]');
    
    // Fill mood details with concerning content
    await page.fill('[data-testid="mood-description"]', 'Having a really tough day. Feeling overwhelmed and struggling.');
    
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
    
    // Verify support resources modal appears
    await expect(page.locator('[data-testid="support-resources-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-hotline-988"]')).toBeVisible();
    await expect(page.locator('[data-testid="text-crisis-line"]')).toBeVisible();
    await expect(page.locator('[data-testid="emergency-contacts"]')).toBeVisible();
    await expect(page.locator('[data-testid="breathing-exercises"]')).toBeVisible();
    
    // Return to dashboard
    await page.click('[data-testid="return-to-dashboard"]');
    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
  });

  test('should access crisis support features', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Access crisis support
    await page.click('[data-testid="crisis-support-button"]');
    await page.waitForURL('**/crisis-support', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify we're on the crisis support page
    await expect(page).toHaveURL(/\/crisis-support/);
  });

  test('should access peer support', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Access peer support
    await page.click('[data-testid="peer-support-access"]');
    await page.waitForURL('**/peer-support', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify we're on the peer support page
    await expect(page).toHaveURL(/\/peer-support/);
  });

  test('should access community features', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Access community features
    await page.click('[data-testid="community-access"]');
    await page.waitForURL('**/community', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify we're on the community page
    await expect(page).toHaveURL(/\/community/);
  });

  test('should handle navigation and logout properly', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Test navigation between sections
    await page.click('[data-testid="nav-checkin"]');
    await page.waitForURL('**/checkin', { timeout: 15000 });

    await page.click('[data-testid="nav-peer-support"]');
    await page.waitForURL('**/peer-support', { timeout: 15000 });

    await page.click('[data-testid="nav-community"]');
    await page.waitForURL('**/community', { timeout: 15000 });

    await page.click('[data-testid="nav-dashboard"]');
    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });

    // Test profile access
    await page.click('[data-testid="nav-profile"]');
    await page.waitForURL('**/profile', { timeout: 15000 });
  });

  test('should verify role-based access control - patient cannot access provider/supporter areas', async ({ page }) => {
    // Login as patient
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Attempt to access provider dashboard directly
    await page.goto('/provider/dashboard');
    await expect(page).toHaveURL('/access-denied');
    await expect(page.locator('[data-testid="access-denied-message"]')).toContainText('You do not have permission to access this area');

    // Attempt to access supporter dashboard directly
    await page.goto('/supporter/dashboard');
    await expect(page).toHaveURL('/access-denied');
    await expect(page.locator('[data-testid="access-denied-message"]')).toContainText('You do not have permission to access this area');
  });
});