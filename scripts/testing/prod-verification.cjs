const puppeteer = require('puppeteer');
const fs = require('fs');

const TEST_URLS = [
  { url: 'https://serenity-sober-pathways-guide.vercel.app/patient/dashboard?debug=1', name: 'Prod-PatientDashboard' },
  { url: 'https://serenity-sober-pathways-guide.vercel.app/support-network?debug=1', name: 'Prod-SupportNetwork' },
  { url: 'https://serenity-sober-pathways-guide.vercel.app/calendar?debug=1', name: 'Prod-Calendar' },
  { url: 'https://serenity-sober-pathways-guide.vercel.app/?minimal=1', name: 'Prod-MinimalMode' },
];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  if (!fs.existsSync('test-results')) fs.mkdirSync('test-results');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const results = [];

  try {
    for (const { url, name } of TEST_URLS) {
      const page = await browser.newPage();
      const errors = [];
      const warnings = [];
      const networkErrors = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push({ message: msg.text(), location: msg.location() });
        if (msg.type() === 'warning') warnings.push({ message: msg.text(), location: msg.location() });
      });
      page.on('response', (resp) => {
        if (resp.status() >= 400) networkErrors.push({ url: resp.url(), status: resp.status(), statusText: resp.statusText() });
      });
      page.on('pageerror', (err) => errors.push({ message: err.message, stack: err.stack }));

      console.log(`Navigating: ${url}`);
      const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await delay(2500);

      // Detect error boundary text if present
      const boundaryText = await page.evaluate(() => {
        const el = document.querySelector('[data-error-boundary]');
        return el ? el.textContent : '';
      });
      if (boundaryText) errors.push({ message: `ErrorBoundary: ${boundaryText.slice(0, 200)}` });

      const shot = `test-results/prod-${name.replace(/[^a-zA-Z0-9]/g, '-')}.png`;
      await page.screenshot({ path: shot, fullPage: true });

      results.push({
        name,
        url,
        status: response ? response.status() : 0,
        errors: errors.length,
        warnings: warnings.length,
        networkErrors: networkErrors.length,
        details: { errors, warnings, networkErrors },
        screenshot: shot,
      });

      await page.close();
    }
  } finally {
    await browser.close();
  }

  fs.writeFileSync('test-results/prod-verification-report.json', JSON.stringify({ when: new Date().toISOString(), results }, null, 2));
  let md = '# Production Verification\n\n';
  for (const r of results) {
    md += `## ${r.name}\n- URL: ${r.url}\n- Status: ${r.status}\n- Errors: ${r.errors}\n- NetworkErrors: ${r.networkErrors}\n- Screenshot: ${r.screenshot}\n\n`;
    if (r.errors || r.networkErrors) {
      md += `Details: ${JSON.stringify(r.details).slice(0, 1000)}...\n\n`;
    }
  }
  fs.writeFileSync('test-results/prod-verification-report.md', md);
  console.log('Saved reports to test-results/');
}

run().catch((e) => {
  console.error('Prod verification failed:', e);
  process.exit(1);
});


