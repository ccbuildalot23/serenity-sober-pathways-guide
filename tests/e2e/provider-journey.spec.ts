import { test, expect } from '@playwright/test';

// Test credentials
const PROVIDER_CREDENTIALS = {
  email: 'test-provider@serenity.com',
  password: 'TestSerenity2024!@#'
};

test.describe('Provider User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the auth page where login button is located
    await page.goto('/auth');
  });

  test('should complete full provider login and dashboard access', async ({ page }) => {
    // Login as provider
    await page.click('[data-testid="login-button"]');
    await page.locator('[data-testid="email-input"]').waitFor({ state: 'visible' });
    await page.fill('[data-testid="email-input"]', PROVIDER_CREDENTIALS.email);
    await page.locator('[data-testid="password-input"]').waitFor({ state: 'visible' });
    await page.fill('[data-testid="password-input"]', PROVIDER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

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
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PROVIDER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PROVIDER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

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
    await expect(page.locator('[data-testid="patient-name"]')).toContainText('test-patient@serenity.com');

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
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PROVIDER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PROVIDER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

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
    await expect(page.locator('[data-testid="checkin-timeline"]')).toBeVisible();
    await expect(page.locator('[data-testid="mood-patterns"]')).toBeVisible();
    
    // Test date range filtering
    await page.click('[data-testid="date-range-picker"]');
    await page.click('[data-testid="last-30-days"]');
    await expect(page.locator('[data-testid="filtered-checkins"]')).toBeVisible();

    // Test detailed check-in view
    await page.click('[data-testid="view-checkin-details"]'); // First check-in
    await expect(page.locator('[data-testid="checkin-detail-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="mood-assessment"]')).toBeVisible();
    await expect(page.locator('[data-testid="activities-completed"]')).toBeVisible();
    await expect(page.locator('[data-testid="sleep-quality"]')).toBeVisible();
    await expect(page.locator('[data-testid="provider-notes-section"]')).toBeVisible();

    // Add provider notes
    await page.fill('[data-testid="provider-notes-input"]', 'Patient showing consistent improvement. Continue current treatment plan.');
    await page.click('[data-testid="save-provider-notes"]');
    
    // Verify notes saved
    await expect(page.locator('[data-testid="notes-saved-confirmation"]')).toBeVisible();
  });

  test('should analyze check-in patterns and trends', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PROVIDER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PROVIDER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/provider/dashboard');

    // Access analytics section
    await page.click('[data-testid="analytics-tab"]');
    await expect(page).toHaveURL('/provider/analytics');

    // Verify analytics interface
    await expect(page.locator('[data-testid="patient-overview-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="mood-trend-analysis"]')).toBeVisible();
    await expect(page.locator('[data-testid="risk-assessment-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="engagement-metrics"]')).toBeVisible();

    // Test individual patient analysis
    await page.selectOption('[data-testid="select-patient-analysis"]', 'test-patient@serenity.com');
    await page.click('[data-testid="generate-analysis"]');
    
    // Verify patient-specific analytics
    await expect(page.locator('[data-testid="patient-mood-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="checkin-frequency-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="risk-indicators"]')).toBeVisible();
    await expect(page.locator('[data-testid="intervention-suggestions"]')).toBeVisible();

    // Test time range analysis
    await page.selectOption('[data-testid="analysis-timeframe"]', '90-days');
    await page.click('[data-testid="update-analysis"]');
    await expect(page.locator('[data-testid="long-term-trends"]')).toBeVisible();

    // Test pattern recognition alerts
    await expect(page.locator('[data-testid="pattern-alerts"]')).toBeVisible();
    if (await page.locator('[data-testid="concerning-pattern-alert"]').isVisible()) {
      await page.click('[data-testid="review-pattern-details"]');
      await expect(page.locator('[data-testid="pattern-detail-modal"]')).toBeVisible();
      await expect(page.locator('[data-testid="recommended-actions"]')).toBeVisible();
    }

    // Export analytics report
    await page.click('[data-testid="export-analytics-report"]');
    await expect(page.locator('[data-testid="export-confirmation"]')).toBeVisible();
  });

  test('should create and manage care plans', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PROVIDER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PROVIDER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/provider/dashboard');

    // Access care plan management
    await page.click('[data-testid="care-plans-tab"]');
    await expect(page).toHaveURL('/provider/care-plans');

    // Verify care plan interface
    await expect(page.locator('[data-testid="care-plan-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-care-plan-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="care-plan-templates"]')).toBeVisible();

    // Create new care plan
    await page.click('[data-testid="create-care-plan-button"]');
    await expect(page.locator('[data-testid="care-plan-modal"]')).toBeVisible();

    // Fill care plan details
    await page.selectOption('[data-testid="select-patient"]', 'test-patient@serenity.com');
    await page.fill('[data-testid="care-plan-title"]', 'Early Recovery Support Plan');
    await page.selectOption('[data-testid="care-plan-template"]', 'substance-abuse-recovery');
    
    // Add goals
    await page.click('[data-testid="add-goal-button"]');
    await page.fill('[data-testid="goal-description"]', 'Complete daily check-ins for 30 consecutive days');
    await page.selectOption('[data-testid="goal-priority"]', 'high');
    await page.fill('[data-testid="goal-target-date"]', '2024-03-01');

    // Add interventions
    await page.click('[data-testid="add-intervention-button"]');
    await page.selectOption('[data-testid="intervention-type"]', 'therapy-session');
    await page.fill('[data-testid="intervention-frequency"]', 'Weekly');
    await page.fill('[data-testid="intervention-notes"]', 'Individual cognitive behavioral therapy sessions');

    // Save care plan
    await page.click('[data-testid="save-care-plan"]');
    
    // Verify care plan created
    await expect(page.locator('[data-testid="care-plan-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="care-plan-list"]')).toContainText('Early Recovery Support Plan');

    // Test editing existing care plan
    await page.click('[data-testid="edit-care-plan"]'); // First care plan
    await expect(page.locator('[data-testid="care-plan-modal"]')).toBeVisible();
    
    // Update progress notes
    await page.fill('[data-testid="progress-notes"]', 'Patient has been consistently completing daily check-ins. Showing positive engagement.');
    await page.click('[data-testid="update-care-plan"]');
    
    // Verify updates saved
    await expect(page.locator('[data-testid="update-success"]')).toBeVisible();
  });

  test('should handle crisis alerts and notifications', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PROVIDER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PROVIDER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/provider/dashboard');

    // Check for notifications badge
    await expect(page.locator('[data-testid="notifications-badge"]')).toBeVisible();

    // Access notifications panel
    await page.click('[data-testid="notifications-icon"]');
    await expect(page.locator('[data-testid="notifications-panel"]')).toBeVisible();

    // Test crisis alert handling (if any exist)
    if (await page.locator('[data-testid="crisis-alert"]').isVisible()) {
      await page.click('[data-testid="crisis-alert"]');
      await expect(page.locator('[data-testid="crisis-alert-modal"]')).toBeVisible();
      
      // Verify crisis alert details
      await expect(page.locator('[data-testid="patient-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="alert-timestamp"]')).toBeVisible();
      await expect(page.locator('[data-testid="risk-level"]')).toBeVisible();
      await expect(page.locator('[data-testid="patient-message"]')).toBeVisible();

      // Test response actions
      await page.click('[data-testid="contact-patient-button"]');
      await expect(page.locator('[data-testid="contact-options"]')).toBeVisible();
      
      await page.click('[data-testid="mark-as-addressed"]');
      await page.fill('[data-testid="response-notes"]', 'Contacted patient directly. Provided immediate support and scheduled follow-up appointment.');
      await page.click('[data-testid="save-response"]');
      
      // Verify alert marked as addressed
      await expect(page.locator('[data-testid="alert-addressed-confirmation"]')).toBeVisible();
    }

    // Test notification settings
    await page.click('[data-testid="notification-settings"]');
    await expect(page.locator('[data-testid="notification-preferences"]')).toBeVisible();
    
    // Update notification preferences
    await page.check('[data-testid="email-alerts"]');
    await page.check('[data-testid="sms-alerts"]');
    await page.selectOption('[data-testid="alert-frequency"]', 'immediate');
    await page.click('[data-testid="save-preferences"]');
    
    // Verify preferences saved
    await expect(page.locator('[data-testid="preferences-saved"]')).toBeVisible();
  });

  test('should manage provider profile and settings', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PROVIDER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PROVIDER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/provider/dashboard');

    // Access provider profile
    await page.click('[data-testid="provider-menu"]');
    await page.click('[data-testid="profile-settings"]');
    await expect(page).toHaveURL('/provider/profile');

    // Verify profile interface
    await expect(page.locator('[data-testid="provider-profile-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="professional-info"]')).toBeVisible();
    await expect(page.locator('[data-testid="contact-preferences"]')).toBeVisible();

    // Update professional information
    await page.fill('[data-testid="provider-name"]', 'Dr. Test Provider');
    await page.fill('[data-testid="specialty"]', 'Addiction Counseling');
    await page.fill('[data-testid="license-number"]', 'LIC123456');
    await page.fill('[data-testid="phone-number"]', '555-0123');

    // Update availability settings
    await page.check('[data-testid="monday-availability"]');
    await page.check('[data-testid="tuesday-availability"]');
    await page.fill('[data-testid="start-time"]', '09:00');
    await page.fill('[data-testid="end-time"]', '17:00');

    // Save profile updates
    await page.click('[data-testid="save-profile"]');
    
    // Verify profile updated
    await expect(page.locator('[data-testid="profile-updated-success"]')).toBeVisible();

    // Test password change
    await page.click('[data-testid="change-password-tab"]');
    await page.fill('[data-testid="current-password"]', PROVIDER_CREDENTIALS.password);
    await page.fill('[data-testid="new-password"]', 'NewTestSerenity2024!@#');
    await page.fill('[data-testid="confirm-password"]', 'NewTestSerenity2024!@#');
    await page.click('[data-testid="update-password"]');
    
    // Note: In a real test, we'd want to test login with new password
    await expect(page.locator('[data-testid="password-updated-success"]')).toBeVisible();
  });

  test('should handle navigation and logout properly', async ({ page }) => {
    // Login first
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PROVIDER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PROVIDER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/provider/dashboard');

    // Test navigation between sections (use direct routing for engine stability)
    await page.click('[data-testid="nav-patients"]');
    await expect(page).toHaveURL('/provider/patients');

    await page.goto('/provider/analytics');
    await expect(page.locator('[data-testid="patient-overview-metrics"]')).toBeVisible();

    await page.goto('/provider/care-plans');
    await expect(page.locator('[data-testid="care-plan-list"]')).toBeVisible();

    await page.goto('/provider/dashboard');
    await expect(page.locator('[data-testid="provider-dashboard"]')).toBeVisible();

    // Test logout
    await page.click('[data-testid="provider-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    // Verify logout and redirect to login
    await expect(page).toHaveURL('/login');
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    
    // Verify provider areas are no longer accessible without authentication
    await page.goto('/provider/dashboard');
    await expect(page).toHaveURL('/login');
  });

  test('should verify role-based access control - provider cannot access patient/supporter areas', async ({ page }) => {
    // Login as provider
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PROVIDER_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PROVIDER_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL('/provider/dashboard');

    // Attempt to access patient dashboard directly
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL('/access-denied');
    await expect(page.locator('[data-testid="access-denied-message"]')).toContainText('You do not have permission to access this area');

    // Attempt to access supporter dashboard directly
    await page.goto('/supporter/dashboard');
    await expect(page).toHaveURL('/access-denied');
    await expect(page.locator('[data-testid="access-denied-message"]')).toContainText('You do not have permission to access this area');

    // Verify provider can return to their authorized dashboard
    await page.click('[data-testid="return-to-dashboard"]');
    await expect(page).toHaveURL('/provider/dashboard');
  });
});