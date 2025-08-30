import { test, expect } from '@playwright/test';

const TEST_CREDENTIALS = {
  PATIENT: {
    email: 'test-patient@serenity.com',
    password: 'TestSerenity2024!@#'
  }
};

test.describe('Simple Auth Test', () => {
  test('should load auth page and show login form', async ({ page }) => {
    // Go directly to auth page
    await page.goto('/auth');
    
    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    
    // Check if we're on auth page
    expect(page.url()).toContain('/auth');
    
    // Look for any sign in related elements
    const signInText = await page.getByText(/sign in/i).first();
    await expect(signInText).toBeVisible({ timeout: 10000 });
    
    // Click on sign in if needed to show form
    const signInButton = page.getByRole('button', { name: /sign in/i }).first();
    if (await signInButton.isVisible()) {
      await signInButton.click();
    }
    
    // Now try to find email input with various selectors
    const emailInput = await page.locator('input[type="email"], input[name="email"], [data-testid="email-input"], #email').first();
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    
    // Fill in credentials
    await emailInput.fill(TEST_CREDENTIALS.PATIENT.email);
    
    const passwordInput = await page.locator('input[type="password"], input[name="password"], [data-testid="password-input"], #password').first();
    await expect(passwordInput).toBeVisible();
    await passwordInput.fill(TEST_CREDENTIALS.PATIENT.password);
    
    // Find and click submit button
    const submitButton = await page.locator('button[type="submit"], [data-testid*="submit"], button:has-text("Sign In")').first();
    await expect(submitButton).toBeVisible();
    
    // Click submit
    await submitButton.click();
    
    // Wait for navigation or error
    await page.waitForTimeout(3000);
    
    // Check if we got an error or navigated
    const currentUrl = page.url();
    console.log('After login attempt, URL is:', currentUrl);
    
    // If we're still on auth page, check for errors
    if (currentUrl.includes('/auth')) {
      const errorMessage = await page.locator('[role="alert"], .error, .text-red-500').first();
      if (await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();
        console.log('Login error:', errorText);
      }
    } else {
      console.log('Successfully navigated to:', currentUrl);
    }
  });
});