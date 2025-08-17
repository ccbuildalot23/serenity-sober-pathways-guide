import { chromium } from 'playwright';

const base = process.env.ROI_BASE_URL || 'http://localhost:5173';

(async () => {
	const browser = await chromium.launch();
	const page = await browser.newPage();
	await page.goto(`${base}/provider/dashboard`, { waitUntil: 'networkidle' });
	await page.waitForSelector('text=Estimated Monthly ROI', { timeout: 30000 });
	await page.screenshot({ path: 'docs/roi-panel-dev.png', fullPage: false });
	await browser.close();
})();

import { chromium } from 'playwright';
const base = process.env.ROI_BASE_URL || 'http://localhost:5173';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(${base}/provider/dashboard, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Estimated Monthly ROI', { timeout: 30000 });
  await page.screenshot({ path: 'docs/roi-panel-dev.png', fullPage: false });
  await browser.close();
})();
