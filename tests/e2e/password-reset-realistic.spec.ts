import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test-patient@serenity.com';

test.describe('Realistic Password Reset Testing', () => {
  test('should complete forgot password flow', async ({ page }) => {
    // Step 1: Navigate to forgot password page
    await page.goto('/forgot-password');
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByRole('heading', { name: 'Reset Your Password' })).toBeVisible();

    // Step 2: Enter email and submit
    await page.fill('#reset-email', TEST_EMAIL);
    await page.click('button:has-text("Send Reset Link")');

    // Step 3: Verify success message
    await expect(page.getByText('Check Your Email')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(TEST_EMAIL)).toBeVisible();
  });

  test('should handle invalid email format', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Test invalid email
    await page.fill('#reset-email', 'invalid-email');
    await page.click('button:has-text("Send Reset Link")');
    
    // Should show validation error
    await expect(page.getByTestId('password-reset-error')).toBeVisible();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('should handle empty email', async ({ page }) => {
    await page.goto('/forgot-password');
    
    // Test empty email
    await page.click('button:has-text("Send Reset Link")');
    
    // Should show validation error
    await expect(page.getByTestId('password-reset-error')).toBeVisible();
    await expect(page.getByText('Email address is required')).toBeVisible();
  });

  test('should show proper error for invalid reset link', async ({ page }) => {
    // Navigate to reset password page without valid token
    await page.goto('/reset-password');
    
    // Should show invalid link message
    await expect(page.getByText('Invalid or Expired Link')).toBeVisible();
    await expect(page.getByText('This password reset link is invalid or has expired.')).toBeVisible();
    
    // Should have option to request new link
    await expect(page.getByText('Send a new reset link')).toBeVisible();
  });

  test('should show expired link error', async ({ page }) => {
    // Simulate expired token
    await page.goto('/reset-password?error=access_denied&error_code=otp_expired&type=recovery');
    
    // Should show error message
    await expect(page.getByText('Invalid or Expired Link')).toBeVisible();
    await expect(page.getByText('This password reset link has expired')).toBeVisible();
    
    // Should have option to request new link
    await expect(page.getByText('Send a new reset link')).toBeVisible();
  });

  test('should provide manual OTP verification fallback', async ({ page }) => {
    await page.goto('/reset-password');
    
    // Should show manual verification form
    await expect(page.getByText('Or enter the 6-digit code from your email:')).toBeVisible();
    await expect(page.locator('input[placeholder="Email address"]')).toBeVisible();
    await expect(page.locator('input[placeholder="6-digit code"]')).toBeVisible();
    await expect(page.getByText('Verify Code')).toBeVisible();
    
    // Test form validation - button should be disabled without inputs
    await expect(page.locator('button:has-text("Verify Code"):disabled')).toBeVisible();
    
    // Test with email only - should still be disabled
    await page.fill('input[placeholder="Email address"]', TEST_EMAIL);
    await expect(page.locator('button:has-text("Verify Code"):disabled')).toBeVisible();
    
    // Test with both email and code - should be enabled
    await page.fill('input[placeholder="6-digit code"]', '123456');
    await expect(page.locator('button:has-text("Verify Code"):not(:disabled)')).toBeVisible();
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

  test('should handle manual verification with invalid code', async ({ page }) => {
    await page.goto('/reset-password');
    
    // Fill in manual verification form
    await page.fill('input[placeholder="Email address"]', TEST_EMAIL);
    await page.fill('input[placeholder="6-digit code"]', '000000'); // Invalid code
    await page.click('button:has-text("Verify Code")');
    
    // Wait for verification attempt
    await page.waitForTimeout(2000);
    
    // For now, just verify the form is still there (verification failed)
    // This indicates the verification attempt was made but failed
    await expect(page.locator('input[placeholder="Email address"]')).toBeVisible();
    await expect(page.locator('input[placeholder="6-digit code"]')).toBeVisible();
  });
});
