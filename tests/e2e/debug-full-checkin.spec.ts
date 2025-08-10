import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../utils/test-helpers';

test.describe('Debug Full Check-in Flow', () => {
  test('should complete full check-in flow step by step', async ({ page }) => {
    // Login first
    await page.goto('/auth');
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');

    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    console.log('✅ Successfully logged in and reached dashboard');

    // Navigate to check-in
    await page.goto('/checkin');
    await page.waitForLoadState('networkidle');

    console.log('✅ Navigated to check-in page');

    // Step 1: Select positive mood
    await page.click('[data-testid="mood-positive"]');
    console.log('✅ Selected positive mood');

    // Step 2: Fill mood description
    await page.fill('[data-testid="mood-description"]', 'Feeling great today! Had a good therapy session.');
    console.log('✅ Filled mood description');

    // Step 3: Continue to activities
    await page.click('text=Continue');
    console.log('✅ Clicked Continue to activities');

    // Step 4: Select activities
    await page.check('[data-testid="activity-exercise"]');
    await page.check('[data-testid="activity-meditation"]');
    console.log('✅ Selected activities');

    // Step 5: Continue to sleep rating
    await page.click('text=Continue');
    console.log('✅ Clicked Continue to sleep rating');

    // Step 6: Rate sleep quality
    await page.click('[data-testid="sleep-rating-4"]');
    console.log('✅ Selected sleep rating');

    // Step 7: Submit check-in
    await page.click('[data-testid="submit-checkin"]');
    console.log('✅ Clicked submit check-in');

    // Wait for completion
    await page.waitForTimeout(2000);
    console.log('✅ Waited for submission');

    // Check if we're on the completion step
    const pageContent = await page.textContent('body');
    console.log('Page content after submit:', pageContent?.substring(0, 500));

    // Look for success message
    const successMessage = page.locator('[data-testid="checkin-success-message"]');
    await expect(successMessage).toBeVisible({ timeout: 10000 });
    console.log('✅ Found success message');

    // Verify success message content
    await expect(successMessage).toContainText('Check-in completed successfully');
    console.log('✅ Verified success message content');

    console.log('🎉 Full check-in flow completed successfully!');
  });
});
