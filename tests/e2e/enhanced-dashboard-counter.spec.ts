import { test, expect } from '@playwright/test';

test.describe('Dashboard counter increments reliably', () => {
  test('increments after check-in and persists on reload', async ({ page }) => {
    // Force bypass + role before any script runs
    await page.addInitScript(() => {
      (window as any).__PW_TEST__ = true;
      try {
        localStorage.setItem('dev_bypass_auth', 'true');
        localStorage.setItem('pw_role', 'patient');
      } catch {}
    });

    // Land directly on dashboard
    await page.goto('/patient/dashboard');
    await page.waitForLoadState('networkidle');

    // Read initial counter
    const initialText = await page.locator('[data-testid="checkin-counter"]').textContent();
    const initialCount = parseInt(initialText || '0') || 0;

    // Go to check-in via dashboard CTA to ensure routing/context
    await page.click('[data-testid="start-checkin-button"]');
    await page.waitForURL(/\/checkin$/);
    await page.waitForSelector('[data-testid="daily-checkin-section"]', { timeout: 10000 });
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


