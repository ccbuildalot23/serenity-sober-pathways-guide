import { test, expect } from '@playwright/test';

test.describe('Dashboard counter increments reliably', () => {
  test('increments after check-in and persists on reload', async ({ page }) => {
    // Mark E2E mode for SignIn bypass logic
    await page.addInitScript(() => { (window as any).__PW_TEST__ = true; });

    // Login as patient (bypass mode routes directly)
    await page.goto('/login');
    await page.fill('#email', 'test-patient@serenity.com');
    await page.fill('#password', 'TestSerenity2024!@#');
    // Hitting Enter is more stable in E2E bypass mode (button can re-render)
    await page.locator('#password').press('Enter');
    await page.waitForURL(/\/patient\/dashboard/);

    // Read initial counter
    const initialText = await page.locator('[data-testid="checkin-counter"]').textContent();
    const initialCount = parseInt(initialText || '0') || 0;

    // Go to check-in and submit a minimal valid check-in
    await page.goto('/checkin');
    await page.click('[data-testid="mood-neutral"]');
    await page.click('[data-testid="sleep-rating-3"]');

    const postPromise = page.waitForResponse(r => r.url().includes('/rest/v1/checkin_events') && r.request().method() === 'POST');
    await page.click('[data-testid="submit-checkin"]');
    await postPromise.catch(() => {}); // may be blocked by RLS in headless bypass; UI still transitions
    await page.waitForSelector('[data-testid="checkin-success-message"]');

    // Return to dashboard
    await page.click('[data-testid="return-to-dashboard"]');
    await page.waitForURL(/\/patient\/dashboard/);
    await page.waitForLoadState('networkidle');

    // Re-read counter
    const finalText = await page.locator('[data-testid="checkin-counter"]').textContent();
    const finalCount = parseInt(finalText || '0') || 0;

    expect(finalCount).toBeGreaterThanOrEqual(initialCount + 1);

    // Reload and verify persistence
    await page.reload();
    await page.waitForLoadState('networkidle');
    const persistedText = await page.locator('[data-testid="checkin-counter"]').textContent();
    const persisted = parseInt(persistedText || '0') || 0;
    expect(persisted).toBe(finalCount);
  });
});


