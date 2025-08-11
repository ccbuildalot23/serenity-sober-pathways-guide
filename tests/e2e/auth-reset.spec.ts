import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test@example.com';

test.describe('Forgot/Reset Password UX', () => {
  test('forgot password page renders and submits', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByText('Reset Your Password')).toBeVisible();

    await page.fill('#reset-email', TEST_EMAIL);
    await page.click('button:has-text("Send Reset Link")');
    
    // Wait for success message
    await expect(page.getByText('Check Your Email')).toBeVisible();
  });

  test('reset page shows clear message on expired/invalid link', async ({ page }) => {
    // Simulate an expired token via query params
    await page.goto('/reset-password?error=access_denied&error_code=otp_expired&type=recovery'); 
    await expect(page.getByText('Invalid Reset Link')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Return to Sign In' })).toBeVisible();
  });
});


