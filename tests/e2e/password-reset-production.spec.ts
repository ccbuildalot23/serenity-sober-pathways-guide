import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'cmcald1018@gmail.com'; // Your actual email
const INVALID_EMAIL = 'nonexistent@example.com';

test.describe('Production Password Reset Flow - Comprehensive', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing rate limits for testing
    await page.addInitScript(() => {
      if (window.emailService) {
        window.emailService.clearRateLimit('cmcald1018@gmail.com');
      }
    });
  });

  test('should handle rate limiting properly', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Try to send multiple reset emails to trigger rate limiting
    for (let i = 0; i < 4; i++) {
      await page.fill('#reset-email', TEST_EMAIL);
      await page.click('button:has-text("Send Reset Link")');
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Check if we hit rate limit
      const errorVisible = await page.locator('[data-testid="password-reset-error"]').isVisible();
      if (errorVisible) {
        const errorText = await page.locator('[data-testid="password-reset-error"]').textContent();
        if (errorText?.includes('Too many password reset attempts')) {
          console.log(`Rate limit triggered after ${i + 1} attempts`);
          break;
        }
      }
    }
    
    // Should show rate limit error
    await expect(page.locator('[data-testid="password-reset-error"]')).toBeVisible();
    await expect(page.getByText(/Too many password reset attempts/)).toBeVisible();
  });

  test('should handle invalid email gracefully', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Test with invalid email
    await page.fill('#reset-email', INVALID_EMAIL);
    await page.click('button:has-text("Send Reset Link")');
    
    // Should show appropriate error
    await expect(page.locator('[data-testid="password-reset-error"]')).toBeVisible();
    
    // Check for either "User not found" or "No account found" message
    const errorText = await page.locator('[data-testid="password-reset-error"]').textContent();
    expect(errorText).toMatch(/(No account found|User not found)/i);
  });

  test('should handle empty email validation', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Try to submit without email
    await page.click('button:has-text("Send Reset Link")');
    
    // Should show validation error
    await expect(page.locator('[data-testid="password-reset-error"]')).toBeVisible();
    await expect(page.getByText('Email address is required')).toBeVisible();
  });

  test('should handle invalid email format', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Test with invalid email format
    await page.fill('#reset-email', 'invalid-email-format');
    await page.click('button:has-text("Send Reset Link")');
    
    // Should show validation error
    await expect(page.locator('[data-testid="password-reset-error"]')).toBeVisible();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('should show proper success message for valid email', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Clear rate limit first
    await page.addInitScript(() => {
      if (window.emailService) {
        window.emailService.clearRateLimit('cmcald1018@gmail.com');
      }
    });
    
    // Test with valid email
    await page.fill('#reset-email', TEST_EMAIL);
    await page.click('button:has-text("Send Reset Link")');
    
    // Should show success message
    await expect(page.getByText('Check Your Email')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(TEST_EMAIL)).toBeVisible();
  });

  test('should handle reset password page with invalid token', async ({ page }) => {
    // Navigate directly to reset password page without valid token
    await page.goto('/reset-password');
    
    // Should show invalid link message
    await expect(page.getByText('Invalid or Expired Link')).toBeVisible();
    await expect(page.getByText('This password reset link is invalid or has expired.')).toBeVisible();
    
    // Should have option to request new link
    await expect(page.getByText('Send a new reset link')).toBeVisible();
  });

  test('should provide manual email reset fallback', async ({ page }) => {
    await page.goto('/reset-password');
    
    // Should show manual reset form
    await expect(page.getByText('Or enter your email to receive a new reset link:')).toBeVisible();
    await expect(page.locator('input[placeholder="Email address"]')).toBeVisible();
    await expect(page.getByText('Send New Reset Link')).toBeVisible();
    
    // Test form validation
    await expect(page.locator('button:has-text("Send New Reset Link"):disabled')).toBeVisible();
    
    // Test with email - should be enabled
    await page.fill('input[placeholder="Email address"]', TEST_EMAIL);
    await expect(page.locator('button:has-text("Send New Reset Link"):not(:disabled)')).toBeVisible();
  });

  test('should handle manual reset with rate limiting', async ({ page }) => {
    await page.goto('/reset-password');
    
    // Fill in manual reset form
    await page.fill('input[placeholder="Email address"]', TEST_EMAIL);
    await page.click('button:has-text("Send New Reset Link")');
    
    // Wait for response
    await page.waitForTimeout(3000);
    
    // Should show either success or rate limit message
    const successVisible = await page.getByText('A new password reset email has been sent').isVisible();
    const errorVisible = await page.locator('[data-testid="password-reset-error"]').isVisible();
    
    expect(successVisible || errorVisible).toBeTruthy();
  });

  test('should have proper navigation back to auth', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Test back to sign in button
    const backButton = page.locator('button:has-text("Back to Sign In")');
    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(page).toHaveURL(/\/auth/);
    }
    
    // Test return to sign in from reset page
    await page.goto('/reset-password');
    const returnButton = page.locator('text=Return to Sign In');
    if (await returnButton.isVisible()) {
      await returnButton.click();
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('**/auth/v1/recover', route => {
      route.abort('failed');
    });
    
    await page.goto('/forgot-password');
    await page.fill('#reset-email', TEST_EMAIL);
    await page.click('button:has-text("Send Reset Link")');
    
    // Should show error message
    await expect(page.locator('[data-testid="password-reset-error"]')).toBeVisible();
    await expect(page.getByText(/unexpected error|network error/i)).toBeVisible();
  });
});
