import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../utils/test-helpers';

test.describe('Debug Daily Check-in Flow', () => {
  test('should debug the daily check-in flow step by step', async ({ page }) => {
    // Step 1: Login
    await page.goto('/auth');
    console.log('✅ Navigated to auth page');
    
    await page.click('[data-testid="login-button"]');
    console.log('✅ Clicked login button');
    
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    console.log('✅ Filled credentials');
    
    await page.click('[data-testid="submit-login"]');
    console.log('✅ Clicked submit login');

    // Step 2: Wait for dashboard
    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    console.log('✅ Reached patient dashboard');

    // Step 3: Check if start-checkin-button exists
    const startButton = page.locator('[data-testid="start-checkin-button"]');
    await expect(startButton).toBeVisible();
    console.log('✅ Start check-in button is visible');

    // Step 4: Click start check-in
    await startButton.click();
    console.log('✅ Clicked start check-in button');

    // Step 5: Wait for check-in page
    await page.waitForURL('**/checkin', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    console.log('✅ Reached check-in page');

    // Step 6: Check if mood buttons exist
    const moodPositive = page.locator('[data-testid="mood-positive"]');
    await expect(moodPositive).toBeVisible();
    console.log('✅ Mood positive button is visible');

    // Step 7: Click positive mood
    await moodPositive.click();
    console.log('✅ Clicked positive mood');

    // Step 8: Check if we moved to details step
    const moodDescription = page.locator('[data-testid="mood-description"]');
    await expect(moodDescription).toBeVisible();
    console.log('✅ Mood description field is visible');

    // Step 9: Fill mood description
    await moodDescription.fill('Feeling great today! Had a good therapy session.');
    console.log('✅ Filled mood description');

    // Step 10: Look for continue button
    const continueButton = page.locator('text=Continue');
    await expect(continueButton).toBeVisible();
    console.log('✅ Continue button is visible');

    // Step 11: Click continue
    await continueButton.click();
    console.log('✅ Clicked continue button');

    // Step 12: Check if we're on activities step
    const activitiesSection = page.locator('[data-testid="daily-checkin-section"]');
    await expect(activitiesSection).toBeVisible();
    console.log('✅ Activities section is visible');

    console.log('🎉 Debug test completed successfully!');
  });
});
