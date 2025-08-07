/**
 * MCP Screenshot Generator for App Store Submission
 * Automates screenshot capture for both iOS and Android app stores
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

const BASE_URL = 'http://localhost:8080'; // Your dev server is running here

const SCREENSHOTS = [
  {
    name: '1-crisis-support',
    route: '/crisis-help',
    caption: 'Get help instantly with one-tap crisis support',
    waitFor: '.crisis-button',
    action: null
  },
  {
    name: '2-cbt-skills',
    route: '/cbt-skills',
    caption: 'Evidence-based therapy tools at your fingertips',
    waitFor: 'h1',
    action: null
  },
  {
    name: '3-daily-checkin',
    route: '/daily-checkin',
    caption: 'Track your mood and identify patterns',
    waitFor: '.mood-selector',
    action: async (page) => {
      // Select a mood for better screenshot
      const moodButton = await page.$('[data-mood="7"]');
      if (moodButton) await moodButton.click();
    }
  },
  {
    name: '4-recovery-timeline',
    route: '/recovery',
    caption: 'Celebrate every milestone in your journey',
    waitFor: 'h1',
    action: null
  },
  {
    name: '5-peer-support',
    route: '/community',
    caption: 'Connect with others who understand',
    waitFor: 'h1',
    action: null
  },
  {
    name: '6-provider-dashboard',
    route: '/providers',
    caption: 'Share progress with your care team',
    waitFor: 'h1',
    action: null
  },
  {
    name: '7-privacy-settings',
    route: '/settings',
    caption: 'HIPAA-compliant security you can trust',
    waitFor: 'h1',
    action: null
  },
  {
    name: '8-home-dashboard',
    route: '/',
    caption: 'Your recovery journey starts here',
    waitFor: '.dashboard',
    action: null
  }
];

const DEVICES = {
  'iphone-14-pro': {
    width: 393,
    height: 852,
    deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  'iphone-se': {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  'ipad-pro': {
    width: 1024,
    height: 1366,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  'pixel-7': {
    width: 412,
    height: 915,
    deviceScaleFactor: 2.625,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36'
  },
  'samsung-s23': {
    width: 360,
    height: 780,
    deviceScaleFactor: 3,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36'
  }
};

async function generateScreenshots() {
  console.log('🚀 Starting MCP Screenshot Generator for App Store Submission\n');

  // Create screenshots directory
  const screenshotDir = path.join(__dirname, '..', 'app-store-screenshots');
  await fs.mkdir(screenshotDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: false, // Set to true for production
    defaultViewport: null
  });

  try {
    // Login first
    console.log('🔐 Logging in with demo account...');
    const loginPage = await browser.newPage();
    await loginPage.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    
    // Attempt login
    await loginPage.type('input[type="email"]', 'demo@serenityrecovery.app');
    await loginPage.type('input[type="password"]', 'DemoUser2025!');
    await loginPage.click('button[type="submit"]');
    await loginPage.waitForNavigation({ waitUntil: 'networkidle2' });
    console.log('✅ Login successful\n');

    // Generate screenshots for each device
    for (const [deviceName, device] of Object.entries(DEVICES)) {
      console.log(`📱 Generating screenshots for ${deviceName}...`);
      
      const deviceDir = path.join(screenshotDir, deviceName);
      await fs.mkdir(deviceDir, { recursive: true });

      const page = await browser.newPage();
      await page.setViewport({
        width: device.width,
        height: device.height,
        deviceScaleFactor: device.deviceScaleFactor
      });
      await page.setUserAgent(device.userAgent);

      // Take screenshots of each screen
      for (const screenshot of SCREENSHOTS) {
        try {
          console.log(`  📸 Capturing ${screenshot.name}...`);
          
          await page.goto(`${BASE_URL}${screenshot.route}`, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
          });

          // Wait for specific element if specified
          if (screenshot.waitFor) {
            await page.waitForSelector(screenshot.waitFor, { timeout: 10000 }).catch(() => {
              console.log(`    ⚠️ Element ${screenshot.waitFor} not found, continuing...`);
            });
          }

          // Perform any custom actions
          if (screenshot.action) {
            await screenshot.action(page);
            await page.waitForTimeout(500); // Wait for animations
          }

          // Hide any sensitive demo data if needed
          await page.evaluate(() => {
            // Hide email addresses
            document.querySelectorAll('[data-testid="email"]').forEach(el => {
              el.textContent = 'user@example.com';
            });
          });

          // Take screenshot
          const screenshotPath = path.join(deviceDir, `${screenshot.name}.png`);
          await page.screenshot({
            path: screenshotPath,
            fullPage: false // App store wants device-sized screenshots
          });

          console.log(`    ✅ Saved: ${screenshot.name}.png`);

          // Also save with caption for reference
          const captionPath = path.join(deviceDir, `${screenshot.name}.txt`);
          await fs.writeFile(captionPath, screenshot.caption);

        } catch (error) {
          console.error(`    ❌ Error capturing ${screenshot.name}:`, error.message);
        }
      }

      await page.close();
      console.log(`✅ Completed ${deviceName}\n`);
    }

    console.log('🎉 Screenshot generation complete!');
    console.log(`📁 Screenshots saved to: ${screenshotDir}`);
    
    // Generate summary
    const summary = {
      generated: new Date().toISOString(),
      devices: Object.keys(DEVICES),
      screenshots: SCREENSHOTS.map(s => ({
        name: s.name,
        caption: s.caption,
        route: s.route
      })),
      totalGenerated: Object.keys(DEVICES).length * SCREENSHOTS.length
    };

    await fs.writeFile(
      path.join(screenshotDir, 'summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\n📊 Summary:');
    console.log(`  - Devices: ${Object.keys(DEVICES).length}`);
    console.log(`  - Screenshots per device: ${SCREENSHOTS.length}`);
    console.log(`  - Total screenshots: ${summary.totalGenerated}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await browser.close();
  }
}

// Run if called directly
if (require.main === module) {
  generateScreenshots().catch(console.error);
}

module.exports = { generateScreenshots, SCREENSHOTS, DEVICES };