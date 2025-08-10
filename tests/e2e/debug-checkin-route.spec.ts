import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../utils/test-helpers';

test.describe('Debug Check-in Route', () => {
  test('should access check-in page directly', async ({ page }) => {
    // Login first
    await page.goto('/auth');
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    console.log('✅ Successfully logged in and reached dashboard');

    // Try direct navigation to check-in
    await page.goto('/checkin');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Wait for lazy loading

    console.log('✅ Navigated to /checkin');

    // Check if page loaded
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);

    const pageContent = await page.textContent('body');
    console.log('Page content preview:', pageContent?.substring(0, 300));

    // Check for the main heading
    const heading = page.locator('h1');
    await expect(heading).toContainText('Daily Check-In');
    console.log('✅ Found Daily Check-In heading');

    // Check for mood section
    const moodSection = page.locator('[data-testid="daily-checkin-section"]');
    await expect(moodSection).toBeVisible();
    console.log('✅ Found daily-checkin-section');

    // Check for mood buttons
    const moodPositive = page.locator('[data-testid="mood-positive"]');
    await expect(moodPositive).toBeVisible();
    console.log('✅ Found mood-positive button');

    const moodNeutral = page.locator('[data-testid="mood-neutral"]');
    await expect(moodNeutral).toBeVisible();
    console.log('✅ Found mood-neutral button');

    const moodNegative = page.locator('[data-testid="mood-negative"]');
    await expect(moodNegative).toBeVisible();
    console.log('✅ Found mood-negative button');

    console.log('🎉 All check-in elements found successfully!');
  });
});
