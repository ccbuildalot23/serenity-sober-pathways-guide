import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../utils/test-helpers';

test.describe('Debug Admin Login', () => {
  test('should debug admin login process', async ({ page }) => {
    // Step 1: Go to auth page
    await page.goto('/auth');
    console.log('✅ Navigated to auth page');
    
    // Step 2: Click login button
    await page.click('[data-testid="login-button"]');
    console.log('✅ Clicked login button');
    
    // Step 3: Fill patient credentials
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.PATIENT.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.PATIENT.password);
    console.log('✅ Filled patient credentials');
    
    // Step 4: Submit login
    await page.click('[data-testid="submit-login"]');
    console.log('✅ Clicked submit login');
    
    // Step 5: Wait for redirect to patient dashboard
    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    console.log('✅ Redirected to patient dashboard');
    
    // Step 6: Set admin role after successful login
    await page.evaluate(() => {
      localStorage.setItem('pw_role', 'admin');
    });
    console.log('✅ Set admin role hint');
    
    // Step 7: Navigate to admin dashboard
    await page.goto('/admin/dashboard');
    console.log('✅ Navigated to admin dashboard');
    
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
