import { chromium } from 'playwright';

(async () => {
	const base = process.env.ROI_BASE_URL || 'http://localhost:5174';
	const url = base + '/';
	const browser = await chromium.launch();
	const page = await browser.newPage();
	await page.goto(url, { waitUntil: 'networkidle' });
	await page.waitForSelector('text=Estimated Monthly ROI', { timeout: 60000 });
	await page.screenshot({ path: 'docs/roi-panel-dev.png', fullPage: true });
	await browser.close();
})();

import { chromium } from 'playwright';
(async () => {
  const base = process.env.ROI_BASE_URL || 'http://localhost:5173';
  const url = base + '/provider/dashboard';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Estimated Monthly ROI', { timeout: 60000 });
  await page.screenshot({ path: 'docs/roi-panel-dev.png' });
  await browser.close();
})();
