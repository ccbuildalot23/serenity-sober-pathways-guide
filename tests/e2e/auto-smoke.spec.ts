import { test, expect } from '@playwright/test';

test.describe('Serenity smoke: patient login and check-in counter', () => {
  test('patient can login, submit check-in, and see counter update', async ({ page }) => {
    // Prepare error capture to aid debugging
    await page.addInitScript(() => {
      (window as any).testErrors = [];
      window.addEventListener('error', (e) => {
        (window as any).testErrors.push({ m: e.message, f: e.filename, l: e.lineno });
      });
      window.addEventListener('unhandledrejection', (e) => {
        (window as any).testErrors.push({ m: (e as any).reason?.message || 'rejection' });
      });
    });

    // Login
    await page.goto('/login');
    await page.fill('#email, [data-testid="email"]', 'test-patient@serenity.com');
    await page.fill('#password, [data-testid="password"]', 'TestSerenity2024!@#');
    await page.locator('#password, [data-testid="password"]').press('Enter');

    await page.waitForURL(/\/patient\/dashboard/, { timeout: 20000 });
    await expect(page.locator('[data-testid="checkin-counter"]')).toBeVisible();
    const initialText = await page.locator('[data-testid="checkin-counter"]').textContent();
    const initial = parseInt(initialText || '0') || 0;

    // Navigate via CTA
    await page.click('[data-testid="start-checkin-button"]');
    await page.waitForURL(/\/checkin$/);
    await page.waitForSelector('[data-testid="daily-checkin-section"]', { timeout: 10000 });

    // Minimal path through check-in UI using testids added earlier
    await page.click('[data-testid="mood-neutral"]');
    // Buttons may be async-rendered; tolerate optional steps
    await page.locator('[data-testid="continue-to-activities"]').click({ trial: true }).catch(() => {});
    await page.locator('[data-testid="continue-to-sleep"]').click({ trial: true }).catch(() => {});
    await page.click('[data-testid^="sleep-rating-"]');
    await page.locator('[data-testid="submit-checkin"]').click({ trial: true }).catch(() => {});

    // Return to dashboard
    await page.goto('/patient/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait up to 10s for realtime/event-driven refresh
    await page.waitForFunction((start) => {
      const el = document.querySelector('[data-testid="checkin-counter"]');
      if (!el) return false;
      const n = parseInt(el.textContent || '0') || 0;
      return n > start;
    }, initial, { timeout: 10000 });

    const finalText = await page.locator('[data-testid="checkin-counter"]').textContent();
    const final = parseInt(finalText || '0') || 0;
    expect(final).toBeGreaterThan(initial);
  });
});


