import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:8080';

const SCREENSHOTS = [
  { name: '2-cbt-skills', route: '/cbt-skills', caption: 'Evidence-based therapy tools' },
  { name: '3-daily-checkin', route: '/daily-checkin', caption: 'Track your mood' },
  { name: '4-recovery-timeline', route: '/recovery', caption: 'Celebrate milestones' },
  { name: '5-peer-support', route: '/community', caption: 'Connect with others' },
  { name: '6-provider-dashboard', route: '/providers', caption: 'Share with care team' },
  { name: '7-privacy-settings', route: '/settings', caption: 'HIPAA-compliant security' },
  { name: '8-home-dashboard', route: '/', caption: 'Your recovery journey' }
];

async function completePixelScreenshots() {
  console.log('📱 Completing Pixel-7 screenshots...\n');
  
  const deviceDir = path.join(__dirname, '..', 'app-store-screenshots', 'pixel-7');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 412,
      height: 915,
      deviceScaleFactor: 2.625
    });

    for (const screenshot of SCREENSHOTS) {
      console.log(`📸 Capturing ${screenshot.name}...`);
      
      await page.goto(`${BASE_URL}${screenshot.route}`, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      await new Promise(resolve => setTimeout(resolve, 1500));

      const screenshotPath = path.join(deviceDir, `${screenshot.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: false
      });

      console.log(`✅ Saved: ${screenshot.name}.png`);
    }

    console.log('\n🎉 Pixel-7 screenshots complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

completePixelScreenshots().catch(console.error);