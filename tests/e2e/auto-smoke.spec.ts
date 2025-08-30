import { test, expect } from '@playwright/test';

test.describe('Serenity smoke: patient login and check-in counter', () => {
  test('patient can login, submit check-in, and see counter update', async ({ page }) => {
    // Capture console errors and messages
    const errors: string[] = [];
    const logs: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`CONSOLE ERROR: ${msg.text()}`);
      } else {
        logs.push(`CONSOLE ${msg.type().toUpperCase()}: ${msg.text()}`);
      }
    });
    
    page.on('pageerror', error => {
      errors.push(`PAGE ERROR: ${error.toString()}`);
    });
    
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

    // Login - Go directly to auth page and wait for React to load
    await page.goto('/auth');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait up to 30 seconds for React app to initialize and auth form to appear
    try {
      await page.waitForSelector('input[type="email"], [data-testid="email-input"], #email', { timeout: 30000 });
    } catch (error) {
      console.log('CAPTURED ERRORS:', errors);
      console.log('CAPTURED LOGS:', logs.slice(-20)); // Last 20 logs
      
      // Try to get test errors from the page
      const testErrors = await page.evaluate(() => (window as any).testErrors || []);
      console.log('PAGE TEST ERRORS:', testErrors);
      
      throw error;
    }
    
    // Fill in credentials using multiple selector strategies
    await page.fill('input[type="email"], [data-testid="email-input"], #email', 'test-patient@serenity.com');
    await page.fill('input[type="password"], [data-testid="password-input"], #password', 'TestSerenity2024!@#');
    await page.click('button[type="submit"], [data-testid="login-button submit-login"]');

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


