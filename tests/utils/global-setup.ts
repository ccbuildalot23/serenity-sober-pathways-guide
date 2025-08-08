import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright E2E Test Suite for Serenity App');
  console.log('📋 Test Credentials:');
  console.log('  Patient: test-patient@serenity.com / TestSerenity2024!@#');
  console.log('  Provider: test-provider@serenity.com / TestSerenity2024!@#');
  console.log('  Supporter: test-supporter@serenity.com / TestSerenity2024!@#');
  
  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Check if the application is running
    const baseURL = config.webServer?.url || config.use?.baseURL || 'http://localhost:3000';
    console.log(`🔍 Checking if app is running at ${baseURL}`);
    
    await page.goto(baseURL, { waitUntil: 'networkidle' });
    console.log('✅ Application is accessible');
    
    // Perform any additional setup tasks here
    // For example:
    // - Seed test data
    // - Clear previous test artifacts
    // - Set up test user accounts (if not done via Supabase directly)
    
    console.log('🧹 Cleaning up previous test artifacts...');
    
    // Clear any existing local storage/session storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    // You could add database seeding here if needed
    // await seedTestDatabase();
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

export default globalSetup;