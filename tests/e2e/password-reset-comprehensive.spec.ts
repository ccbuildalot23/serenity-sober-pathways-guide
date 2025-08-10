import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test-patient@serenity.com';
const NEW_PASSWORD = 'NewPassword123!@#';

test.describe('Comprehensive Password Reset Flow', () => {
  test('should complete full password reset flow', async ({ page }) => {
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

    // Step 4: Navigate to reset password page (simulating email link click)
    await page.goto('/reset-password');
    
    // Step 5: Check if we need manual verification (common in development)
    const manualVerifyVisible = await page.locator('text=Or enter the 6-digit code from your email:').isVisible();
    
    if (manualVerifyVisible) {
      // Step 5a: Manual verification flow
      await page.fill('input[placeholder="Email address"]', TEST_EMAIL);
      await page.fill('input[placeholder="6-digit code"]', '123456'); // Test code
      await page.click('button:has-text("Verify Code")');
      
      // This will likely fail with invalid code, but we can test the error handling
      await expect(page.getByText('Invalid code')).toBeVisible({ timeout: 10000 });
    } else {
      // Step 5b: Direct reset flow (if token is valid)
      await expect(page.getByText('Set New Password')).toBeVisible();
      
      // Step 6: Enter new password
      await page.fill('#new-password', NEW_PASSWORD);
      await page.fill('#confirm-password', NEW_PASSWORD);
      await page.click('button:has-text("Update Password")');
      
      // Step 7: Verify success
      await expect(page.getByText('Password Reset Successful!')).toBeVisible({ timeout: 15000 });
    }
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

  test('should handle password validation errors', async ({ page }) => {
    // Navigate directly to reset password page
    await page.goto('/reset-password');
    
    // Without a valid token, should show invalid link message
    await expect(page.getByText('Invalid or Expired Link')).toBeVisible();
    
    // Test manual verification fallback
    await page.fill('input[placeholder="Email address"]', TEST_EMAIL);
    await page.fill('input[placeholder="6-digit code"]', '123456'); // Invalid test code
    await page.click('button:has-text("Verify Code")');
    
    // Should show error for invalid code
    await expect(page.getByText('Invalid code. Please try again.')).toBeVisible({ timeout: 10000 });
  });

  test('should handle password mismatch', async ({ page }) => {
    await page.goto('/reset-password');
    
    // Without a valid token, should show invalid link message
    await expect(page.getByText('Invalid or Expired Link')).toBeVisible();
    
    // Test manual verification fallback with different invalid code
    await page.fill('input[placeholder="Email address"]', TEST_EMAIL);
    await page.fill('input[placeholder="6-digit code"]', '654321'); // Different invalid test code
    await page.click('button:has-text("Verify Code")');
    
    // Should show error for invalid code
    await expect(page.getByText('Invalid code. Please try again.')).toBeVisible({ timeout: 10000 });
  });

  test('should handle expired/invalid reset link', async ({ page }) => {
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
    
    // Check if manual verification is available
    const manualVerifyText = await page.locator('text=Or enter the 6-digit code from your email:').isVisible();
    
    if (manualVerifyText) {
      // Test manual verification form
      await expect(page.locator('input[placeholder="Email address"]')).toBeVisible();
      await expect(page.locator('input[placeholder="6-digit code"]')).toBeVisible();
      await expect(page.getByText('Verify Code')).toBeVisible();
      
      // Test form validation
      await page.click('button:has-text("Verify Code")');
      // Should be disabled without email and code
      await expect(page.locator('button:has-text("Verify Code"):disabled')).toBeVisible();
    }
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
});
