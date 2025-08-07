/**
 * MCP Screenshot Generator for App Store Submission
 * Automates screenshot capture for both iOS and Android app stores
 */

import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:8080'; // Your dev server is running here

const SCREENSHOTS = [
  {
    name: '1-crisis-support',
    route: '/crisis-help',
    caption: 'Get help instantly with one-tap crisis support',
    waitFor: 'h1',
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
    waitFor: 'h1',
    action: async (page) => {
      // Try to select a mood for better screenshot
      const moodButton = await page.$('[data-value="7"]');
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
    waitFor: 'h1',
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
  'pixel-7': {
    width: 412,
    height: 915,
    deviceScaleFactor: 2.625,
    userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36'
  }
};

async function generateScreenshots() {
  console.log('🚀 Starting MCP Screenshot Generator for App Store Submission\n');

  // Create screenshots directory
  const screenshotDir = path.join(__dirname, '..', 'app-store-screenshots');
  await fs.mkdir(screenshotDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: true, // Run in headless mode for speed
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
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

      // First, go to login page
      console.log('  🔐 Attempting login...');
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
      
      // Check if we need to login
      const needsLogin = await page.$('input[type="email"]');
      if (needsLogin) {
        await page.type('input[type="email"]', 'test@example.com');
        await page.type('input[type="password"]', 'password123');
        
        // Try to find and click the submit button
        const submitButton = await page.$('button[type="submit"]') || await page.$('button:has-text("Sign In")') || await page.$('button:has-text("Login")');
        if (submitButton) {
          await submitButton.click();
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Take screenshots of each screen
      for (const screenshot of SCREENSHOTS) {
        try {
          console.log(`  📸 Capturing ${screenshot.name}...`);
          
          await page.goto(`${BASE_URL}${screenshot.route}`, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
          });

          // Wait a bit for the page to render
          await new Promise(resolve => setTimeout(resolve, 1500));

          // Wait for specific element if specified
          if (screenshot.waitFor) {
            await page.waitForSelector(screenshot.waitFor, { timeout: 5000 }).catch(() => {
              console.log(`    ⚠️ Element ${screenshot.waitFor} not found, continuing...`);
            });
          }

          // Perform any custom actions
          if (screenshot.action) {
            await screenshot.action(page);
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait for animations
          }

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

// Run the generator
generateScreenshots().catch(console.error);