import { test, expect } from '@playwright/test';

// Test credentials
const PROVIDER_CREDENTIALS = {
  email: 'test-provider@serenity.com',
  password: 'TestSerenity2024!@#'
};

test.describe('Provider User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the auth page where login form is now shown directly
    await page.goto('/auth');
  });

  test('should complete full provider login and dashboard access', async ({ page }) => {
    // Login form is now shown directly - no need to click login button
    await page.fill('input[type="email"]', PROVIDER_CREDENTIALS.email);
    await page.fill('input[type="password"]', PROVIDER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    // Verify successful login and redirect to provider dashboard
    await expect(page).toHaveURL('/provider/dashboard');
    await expect(page.locator('[data-testid="provider-dashboard"]')).toBeVisible();
    
    // Verify provider-specific UI elements
    await expect(page.locator('[data-testid="patient-list-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="analytics-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="care-plan-management"]')).toBeVisible();
    await expect(page.locator('[data-testid="alert-notifications"]')).toBeVisible();

    // Verify role-based access - provider should NOT see patient/supporter elements
    await expect(page.locator('[data-testid="patient-dashboard"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="supporter-dashboard"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="daily-checkin-section"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="peer-support-access"]')).not.toBeVisible();
  });

  test('should view and manage patient list', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', PROVIDER_CREDENTIALS.email);
    await page.fill('input[type="password"]', PROVIDER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/provider/dashboard');

    // Access patient list
    await page.click('[data-testid="patient-list-tab"]');
    await expect(page).toHaveURL('/provider/patients');

    // Verify patient list interface
    await expect(page.locator('[data-testid="patient-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="search-patients"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-by-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="sort-options"]')).toBeVisible();

    // Test patient search
    await page.fill('[data-testid="search-patients"]', 'test-patient');
    await expect(page.locator('[data-testid="patient-row"]')).toBeVisible();
    await expect(page.locator('[data-testid="patient-name"]')).toContainText('John Smith');

    // Test status filtering
    await page.selectOption('[data-testid="filter-by-status"]', 'needs-attention');
    await page.click('[data-testid="apply-filter"]');
    await expect(page.locator('[data-testid="filtered-results"]')).toBeVisible();

    // Clear filters
    await page.click('[data-testid="clear-filters"]');
    await expect(page.locator('[data-testid="all-patients-view"]')).toBeVisible();

    // Test sorting
    await page.selectOption('[data-testid="sort-options"]', 'last-checkin-desc');
    await expect(page.locator('[data-testid="patient-table"]')).toBeVisible();
  });

  test('should view detailed patient profile and check-in history', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', PROVIDER_CREDENTIALS.email);
    await page.fill('input[type="password"]', PROVIDER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/provider/dashboard');

    // Navigate to patient list and select a patient
    await page.click('[data-testid="patient-list-tab"]');
    await page.click('[data-testid="view-patient-details"]'); // First patient in list

    // Verify patient profile page
    await expect(page).toHaveURL(/\/provider\/patients\/.*$/);
    await expect(page.locator('[data-testid="patient-profile-header"]')).toBeVisible();
    await expect(page.locator('[data-testid="patient-basic-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="checkin-history-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="mood-trend-chart"]')).toBeVisible();

    // Test check-in history analysis
    await page.click('[data-testid="checkin-history-tab"]');
    await expect(page.locator('[data-testid="checkin-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="mood-patterns"]')).toBeVisible();

    // Test mood trend analysis
    await page.click('[data-testid="mood-trends-tab"]');
    await expect(page.locator('[data-testid="mood-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="trend-analysis"]')).toBeVisible();
  });

  test('should analyze check-in patterns and trends', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', PROVIDER_CREDENTIALS.email);
    await page.fill('input[type="password"]', PROVIDER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/provider/dashboard');

    // Access analytics section
    await page.click('[data-testid="analytics-tab"]');
    await expect(page).toHaveURL('/provider/analytics');

    // Verify analytics dashboard
    await expect(page.locator('[data-testid="analytics-overview"]')).toBeVisible();
    await expect(page.locator('[data-testid="patient-engagement-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="mood-trends-overview"]')).toBeVisible();

    // Test pattern analysis
    await page.click('[data-testid="pattern-analysis-tab"]');
    await expect(page.locator('[data-testid="checkin-frequency-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="mood-pattern-analysis"]')).toBeVisible();

    // Test trend analysis
    await page.click('[data-testid="trend-analysis-tab"]');
    await expect(page.locator('[data-testid="long-term-trends"]')).toBeVisible();
    await expect(page.locator('[data-testid="improvement-indicators"]')).toBeVisible();
  });

  test('should create and manage care plans', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', PROVIDER_CREDENTIALS.email);
    await page.fill('input[type="password"]', PROVIDER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/provider/dashboard');

    // Access care plan management
    await page.click('[data-testid="care-plans-tab"]');
    await expect(page).toHaveURL('/provider/care-plans');

    // Verify care plan interface
    await expect(page.locator('[data-testid="care-plan-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-care-plan-button"]')).toBeVisible();

    // Create new care plan
    await page.click('[data-testid="create-care-plan-button"]');
    await expect(page.locator('[data-testid="care-plan-form"]')).toBeVisible();

    // Fill care plan details
    await page.fill('[data-testid="care-plan-title"]', 'Recovery Support Plan');
    await page.fill('[data-testid="care-plan-description"]', 'Comprehensive recovery support plan');
    await page.selectOption('[data-testid="care-plan-type"]', 'recovery-support');
    
    // Add goals
    await page.click('[data-testid="add-goal-button"]');
    await page.fill('[data-testid="goal-description"]', 'Maintain sobriety for 30 days');
    await page.selectOption('[data-testid="goal-priority"]', 'high');
    await page.click('[data-testid="save-goal"]');

    // Add interventions
    await page.click('[data-testid="add-intervention-button"]');
    await page.fill('[data-testid="intervention-description"]', 'Daily check-ins and mood tracking');
    await page.selectOption('[data-testid="intervention-frequency"]', 'daily');
    await page.click('[data-testid="save-intervention"]');

    // Save care plan
    await page.click('[data-testid="save-care-plan"]');
    await expect(page.locator('[data-testid="care-plan-success"]')).toBeVisible();
  });

  test('should handle crisis alerts and notifications', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', PROVIDER_CREDENTIALS.email);
    await page.fill('input[type="password"]', PROVIDER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/provider/dashboard');

    // Access notifications
    await page.click('[data-testid="notifications-tab"]');
    await expect(page).toHaveURL('/provider/notifications');

    // Verify notifications interface
    await expect(page.locator('[data-testid="notification-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-alerts"]')).toBeVisible();

    // Test crisis alert handling
    await page.click('[data-testid="crisis-alert-item"]');
    await expect(page.locator('[data-testid="crisis-details"]')).toBeVisible();
    await expect(page.locator('[data-testid="patient-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="crisis-response-options"]')).toBeVisible();

    // Respond to crisis
    await page.click('[data-testid="acknowledge-crisis"]');
    await expect(page.locator('[data-testid="crisis-acknowledged"]')).toBeVisible();

    // Add crisis notes
    await page.fill('[data-testid="crisis-notes"]', 'Patient contacted and provided support resources');
    await page.click('[data-testid="save-crisis-notes"]');
    await expect(page.locator('[data-testid="notes-saved"]')).toBeVisible();
  });

  test('should manage provider profile and settings', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', PROVIDER_CREDENTIALS.email);
    await page.fill('input[type="password"]', PROVIDER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/provider/dashboard');

    // Access profile settings
    await page.click('[data-testid="profile-settings"]');
    await expect(page).toHaveURL('/provider/profile');

    // Verify profile interface
    await expect(page.locator('[data-testid="profile-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="provider-info"]')).toBeVisible();

    // Update profile information
    await page.fill('[data-testid="provider-name"]', 'Dr. Jane Smith');
    await page.fill('[data-testid="provider-specialty"]', 'Addiction Medicine');
    await page.fill('[data-testid="provider-phone"]', '555-0123');
    await page.click('[data-testid="save-profile"]');

    // Verify profile update
    await expect(page.locator('[data-testid="profile-updated"]')).toBeVisible();
  });

  test('should handle navigation and logout properly', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', PROVIDER_CREDENTIALS.email);
    await page.fill('input[type="password"]', PROVIDER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/provider/dashboard');

    // Navigate to different sections
    await page.click('[data-testid="patients-nav"]');
    await page.waitForURL('**/provider/patients', { timeout: 15000 });
    await expect(page.locator('[data-testid="patient-list-section"]')).toBeVisible();

    await page.click('[data-testid="analytics-nav"]');
    await page.waitForURL('**/provider/analytics', { timeout: 15000 });
    await expect(page.locator('[data-testid="analytics-overview"]')).toBeVisible();

    // Logout
    await page.click('[data-testid="logout-button"]');
    await page.waitForURL('**/auth', { timeout: 15000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('should verify role-based access control - provider cannot access patient/supporter areas', async ({ page }) => {
    // Login form is now shown directly
    await page.fill('input[type="email"]', PROVIDER_CREDENTIALS.email);
    await page.fill('input[type="password"]', PROVIDER_CREDENTIALS.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/provider/dashboard');

    // Try to access patient areas (should redirect to access denied)
    await page.goto('/patient/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();

    // Try to access supporter areas (should redirect to access denied)
    await page.goto('/supporter/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();

    // Verify provider areas are still accessible
    await page.goto('/provider/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="provider-dashboard"]')).toBeVisible();
  });
});