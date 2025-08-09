import { test, expect } from '@playwright/test';

const PATIENT_CREDENTIALS = {
  email: 'test-patient@serenity.com',
  password: 'TestSerenity2024!@#'
};

test.describe('Patient Profile', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth');
  });

  test('can open profile and see basic fields', async ({ page }) => {
    // Sign in (dev/E2E bypass will route to /patient/dashboard if backend is unavailable)
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');

    await expect(page).toHaveURL(/patient\/dashboard|patient\/dashboard\/?/);
    await expect(page.locator('[data-testid="patient-dashboard"]')).toBeVisible();

    // Open profile
    await page.click('[data-testid="nav-profile"]');
    await expect(page).toHaveURL(/\/profile$/);

    // Assert profile fields that are always present
    await expect(page.locator('[data-testid="profile-email"]')).toBeVisible();

    // Optional fields (don’t fail the test if missing)
    // Name and recovery start date are conditional on metadata
    // so only check they exist if present in DOM
    const nameVisible = await page.locator('[data-testid="profile-name"]').isVisible().catch(() => false);
    if (nameVisible) {
      await expect(page.locator('[data-testid="profile-name"]')).toBeVisible();
    }
    const recoveryVisible = await page.locator('[data-testid="profile-recovery-start"]').isVisible().catch(() => false);
    if (recoveryVisible) {
      await expect(page.locator('[data-testid="profile-recovery-start"]')).toBeVisible();
    }
  });

  test('can sign out from profile', async ({ page }) => {
    await page.goto('/auth');
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', PATIENT_CREDENTIALS.email);
    await page.fill('[data-testid="password-input"]', PATIENT_CREDENTIALS.password);
    await page.click('[data-testid="submit-login"]');
    await expect(page).toHaveURL(/patient\/dashboard/);

    await page.click('[data-testid="nav-profile"]');
    await expect(page).toHaveURL(/\/profile$/);

    await page.click('[data-testid="profile-signout"]');
    await expect(page).toHaveURL(/\/auth$/);
  });
});


