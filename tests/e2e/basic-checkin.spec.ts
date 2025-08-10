import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../utils/test-helpers';

test.describe('Basic Check-in Test', () => {
  test('should load check-in page and show basic content', async ({ page }) => {
    // Login first
    await page.goto('/auth');
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Navigate to check-in
    await page.goto('/checkin');
    await page.waitForLoadState('networkidle');

    // Check if page loaded
    await expect(page.locator('h1')).toContainText('Daily Check-In');
    console.log('✅ Check-in page loaded');

    // Check if any content is visible
    const pageContent = await page.textContent('body');
    console.log('Page content:', pageContent?.substring(0, 200));

    // Check if mood section exists
    const moodSection = page.locator('[data-testid="daily-checkin-section"]');
    await expect(moodSection).toBeVisible();
    console.log('✅ Mood section is visible');

    // Check if mood buttons exist (with longer timeout)
    const moodPositive = page.locator('[data-testid="mood-positive"]');
    await expect(moodPositive).toBeVisible({ timeout: 15000 });
    console.log('✅ Mood positive button is visible');

    const moodNeutral = page.locator('[data-testid="mood-neutral"]');
    await expect(moodNeutral).toBeVisible();
    console.log('✅ Mood neutral button is visible');

    const moodNegative = page.locator('[data-testid="mood-negative"]');
    await expect(moodNegative).toBeVisible();
    console.log('✅ Mood negative button is visible');

    console.log('🎉 Basic check-in test completed successfully!');
  });
});
