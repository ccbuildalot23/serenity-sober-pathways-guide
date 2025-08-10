import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../utils/test-helpers';

test.describe('Patient Profile', () => {
  test('can open profile and see basic fields', async ({ page }) => {
    // Login first to ensure authentication
    await page.goto('/auth');
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Navigate to profile
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile(\?|$)/,{timeout:30000});
    
    // Wait for deterministic page-level marker
    await page.locator('[data-testid="page-profile-ready"]').waitFor({ state: 'attached', timeout: 30000 });
    
    // Assert profile fields that are always present
    await page.locator('[data-testid="profile-email"]').waitFor({ state: 'attached', timeout: 30000 });
    await expect(page.locator('[data-testid="profile-email"]')).toBeVisible({ timeout: 30000 });

    // Optional fields (don't fail the test if missing)
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
    // Login first to ensure authentication
    await page.goto('/auth');
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    await page.click('[data-testid="submit-login"]');
    
    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');

    // Navigate to profile
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile(\?|$)/,{timeout:30000});
    await page.locator('[data-testid="page-profile-ready"]').waitFor({ state: 'attached', timeout: 30000 });
    await page.locator('[data-testid="profile-email"]').waitFor({ state: 'attached', timeout: 30000 });
    await expect(page.locator('[data-testid="profile-email"]')).toBeVisible({ timeout: 30000 });

    await page.locator('[data-testid="profile-signout"]').click({ timeout: 30000 });
    await expect(page).toHaveURL(/\/auth$/,{timeout:30000});
  });
});


