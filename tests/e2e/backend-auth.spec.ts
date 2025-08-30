import { test, expect } from '@playwright/test';

test.describe('Backend Authentication Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the auth page
    await page.goto('http://localhost:8081/auth');
  });

  test('should login with backend API', async ({ page }) => {
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we're redirected to auth page
    const url = page.url();
    console.log('Current URL:', url);
    
    // Look for email input
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], #email');
    const passwordInput = page.locator('input[type="password"], input[name="password"], #password');
    
    // Wait for inputs to be visible
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await expect(passwordInput).toBeVisible({ timeout: 10000 });
    
    // Fill in credentials
    await emailInput.fill('test-patient@serenity.com');
    await passwordInput.fill('TestSerenity2024!@#');
    
    // Find and click submit button
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")');
    await expect(submitButton).toBeVisible();
    await submitButton.click();
    
    // Wait for navigation or error
    await page.waitForLoadState('networkidle');
    
    // Check if we're logged in (should redirect to dashboard)
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
    
    // Verify user is logged in
    const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user" i]');
    await expect(userMenu).toBeVisible({ timeout: 5000 });
  });

  test('should handle invalid credentials', async ({ page }) => {
    // Look for inputs
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    
    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Should show error message
    const errorMessage = page.locator('text=/invalid|incorrect|failed/i');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    // First login
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    
    await emailInput.fill('test-patient@serenity.com');
    await passwordInput.fill('TestSerenity2024!@#');
    
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();
    
    // Wait for dashboard
    await page.waitForURL(/dashboard/, { timeout: 10000 });
    
    // Find and click logout
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), [aria-label*="logout" i]');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // Try opening user menu first
      const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user" i]');
      await userMenu.click();
      await logoutButton.click();
    }
    
    // Should redirect to auth page
    await expect(page).toHaveURL(/auth|login/, { timeout: 5000 });
  });
});