import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../utils/test-helpers';

test.describe('Simple Daily Check-in Test', () => {
  test('should navigate to daily check-in and select mood', async ({ page }) => {
    // Login as patient
    await page.goto('/auth');
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');

    // Wait for dashboard
    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Click start check-in button
    await page.click('[data-testid="start-checkin-button"]');
    
    // Wait for check-in page
    await page.waitForURL('**/checkin', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Verify mood selection buttons are visible
    await expect(page.locator('[data-testid="mood-positive"]')).toBeVisible();
    await expect(page.locator('[data-testid="mood-neutral"]')).toBeVisible();
    await expect(page.locator('[data-testid="mood-negative"]')).toBeVisible();

    // Select positive mood
    await page.click('[data-testid="mood-positive"]');
    
    // Verify we moved to the details step
    await expect(page.locator('[data-testid="mood-description"]')).toBeVisible();
    
    console.log('✅ Daily check-in navigation and mood selection working correctly');
  });
});
