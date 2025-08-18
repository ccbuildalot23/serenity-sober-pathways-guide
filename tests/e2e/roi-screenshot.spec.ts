import { test, expect } from '@playwright/test';

test('capture ROI panel screenshot', async ({ page }) => {
	// dev server expected at 5173 in this repo; fall back to 4000 if needed
	const url = process.env.E2E_BASE_URL || 'http://localhost:5173';
	await page.goto(url);
	await page.waitForLoadState('domcontentloaded');
	// navigate to provider dashboard if route exists
	// fallback: assume root renders dashboard in dev
	await page.getByRole('heading', { name: /provider dashboard/i }).waitFor({ timeout: 10000 });
	const panel = page.getByRole('region', { name: /Provider ROI & Billing Hints/i });
	await expect(panel).toBeVisible();
	await panel.screenshot({ path: 'docs/roi-panel-dev.png' });
});

