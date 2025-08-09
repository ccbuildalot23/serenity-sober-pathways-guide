import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'patient.demo+reset@example.com';

test.describe('Forgot/Reset Password UX', () => {
  test('forgot password page renders and submits', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByText('Forgot your password?')).toBeVisible();

    await page.fill('#reset-email', TEST_EMAIL);
    await page.click('button:has-text("Send Reset Link")');

    // Expect success state (we do not assert email delivery here)
    await expect(page.getByText('Check Your Email')).toBeVisible({ timeout: 15000 });
  });

  test('reset page shows clear message on expired/invalid link', async ({ page }) => {
    // Simulate an expired token via query params
    await page.goto('/reset-password?error=access_denied&error_code=otp_expired&type=recovery');
    await expect(page.getByText('Invalid or Expired Link')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send a new reset link' })).toBeVisible();
  });
});


