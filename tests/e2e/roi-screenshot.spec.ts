import { test, expect } from '@playwright/test';

test('capture ROI panel screenshot', async ({ page, context }) => {
	await context.route('**/api/billing/providers/**/summary**', async route => {
		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				minutesCCM: 45,
				minutesBHI: 25,
				retainedPatientsEstimate: 2,
				suggestedCodes: [
					{ code: '99490', reason: '≥20 CCM minutes', minutes: 30, confidence: 0.9, missing: [] },
					{ code: '99484', reason: '≥20 BHI minutes', minutes: 20, confidence: 0.85, missing: ['note signature'] }
				]
			})
		});
	});
	await page.goto('/?ff=billingHintsOn');
	await page.getByTestId('roi-panel').waitFor({ timeout: 30000 });
	await page.screenshot({ path: 'docs/roi-panel-dev.png', fullPage: false });
	await expect(await page.getByTestId('roi-panel').locator('text=Suggested Codes').count()).toBeGreaterThan(0);
});

