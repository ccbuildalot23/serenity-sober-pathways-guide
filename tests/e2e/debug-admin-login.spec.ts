import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../utils/test-helpers';

test.describe('Debug Admin Login', () => {
  test('should debug admin login process', async ({ page }) => {
    // Step 1: Go to auth page
    await page.goto('/auth');
    console.log('✅ Navigated to auth page');
    
    // Step 2: Set admin role before login
    await page.evaluate(() => {
      localStorage.setItem('pw_role', 'admin');
    });
    console.log('✅ Set admin role hint');
    
    // Step 3: Click login button
    await page.click('[data-testid="login-button"]');
    console.log('✅ Clicked login button');
    
    // Step 4: Fill admin credentials
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.ADMIN.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.ADMIN.password);
    console.log('✅ Filled admin credentials');
    
    // Step 5: Submit login
    await page.click('[data-testid="submit-login"]');
    console.log('✅ Clicked submit login');
    
    // Step 6: Wait for any redirect
    await page.waitForLoadState('networkidle');
    console.log('✅ Page loaded');
    
    // Step 7: Check current URL
    const currentUrl = page.url();
    console.log(`✅ Current URL: ${currentUrl}`);
    
    // Step 8: Check if we're on admin dashboard
    const adminDashboard = page.locator('[data-testid="admin-dashboard"]');
    const isVisible = await adminDashboard.isVisible();
    console.log(`✅ Admin dashboard visible: ${isVisible}`);
    
    // Step 9: Check page content
    const pageContent = await page.textContent('body');
    console.log('Page content preview:', pageContent?.substring(0, 500));
    
    console.log('🎉 Debug test completed!');
  });
});
