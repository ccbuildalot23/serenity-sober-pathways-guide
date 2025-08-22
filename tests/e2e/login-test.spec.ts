import { test, expect } from '@playwright/test';

const PATIENT_CREDENTIALS = {
  email: 'test-patient@serenity.com',
  password: 'TestPass123!'
};

test.describe('Login Functionality Test', () => {
  test('should successfully log in and redirect to dashboard', async ({ page }) => {
    // Navigate to auth page
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    
    // Fill in credentials directly (no need to click login button first)
    await page.fill('[data-testid="email"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password"]', PATIENT_CREDENTIALS.password);
    
    // Submit login (button has both login-button and submit-login testids)
    await page.click('[data-testid="submit-login"]');
    
    // Wait for redirect
    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    
    // Verify we're on the correct page
    await expect(page).toHaveURL('/patient/dashboard');
    
    // Take a screenshot for documentation
    await page.screenshot({ path: 'test-results/login-success-screenshot.png', fullPage: true });
    
    // Check if page has content (not blank white screen)
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
    
    console.log('✅ Login test passed - user can successfully log in and access dashboard');
  });
});

