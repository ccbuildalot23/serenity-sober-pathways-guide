import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting Playwright E2E Test Suite for Serenity App');
  console.log('📋 Test Credentials:');
  console.log('  Patient: test-patient@serenity.com / TestPass123!');
  console.log('  Provider: test-provider@serenity.com / TestPass123!');
  console.log('  Supporter: test-supporter@serenity.com / TestPass123!');
  
  // Launch browser for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    // Check if the application is running
    const baseURL = config.webServer?.url || config.use?.baseURL || 'http://localhost:8080';
    console.log(`🔍 Checking if app is running at ${baseURL}`);
    
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    console.log('✅ Application is accessible');
    
    // Perform any additional setup tasks here
    // For example:
    // - Seed test data
    // - Clear previous test artifacts
    // - Set up test user accounts (if not done via Supabase directly)
    
    console.log('🧹 Cleaning up previous test artifacts...');
    
    // Clear any previous auth bypass to ensure tests run with actual login
    await page.goto(`${baseURL}`, { waitUntil: 'domcontentloaded' });
    await page.addInitScript(() => {
      try {
        localStorage.removeItem('dev_bypass_auth');
        localStorage.removeItem('pw_role');
      } catch {}
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