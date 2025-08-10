import { test, expect } from '@playwright/test';
import { TEST_CREDENTIALS } from '../utils/test-helpers';

test.describe('Debug Supporter Login', () => {
  test('should debug supporter login process', async ({ page }) => {
    // Step 1: Go to auth page
    await page.goto('/auth');
    console.log('✅ Navigated to auth page');
    
    // Step 2: Click login button
    await page.click('[data-testid="login-button"]');
    console.log('✅ Clicked login button');
    
    // Step 3: Fill credentials
    await page.fill('[data-testid="email-input"]', TEST_CREDENTIALS.SUPPORTER.email);
    await page.fill('[data-testid="password-input"]', TEST_CREDENTIALS.SUPPORTER.password);
    console.log('✅ Filled supporter credentials');
    
    // Step 4: Submit login
    await page.click('[data-testid="submit-login"]');
    console.log('✅ Clicked submit login');
    
    // Step 5: Wait for redirect
    await page.waitForURL('**/supporter/dashboard', { timeout: 15000 });
    await page.waitForLoadState('networkidle');
    console.log('✅ Reached supporter dashboard URL');
    
    // Step 6: Check if dashboard is visible
    const dashboard = page.locator('[data-testid="supporter-dashboard"]');
    const isVisible = await dashboard.isVisible();
    console.log(`✅ Dashboard visible: ${isVisible}`);
    
    // Step 7: Check page content
    const pageContent = await page.textContent('body');
    console.log('Page content preview:', pageContent?.substring(0, 500));
    
    // Step 8: Check for crisis alert
    const crisisAlert = page.locator('[data-testid="active-crisis-alert"]');
    const crisisVisible = await crisisAlert.isVisible();
    console.log(`✅ Crisis alert visible: ${crisisVisible}`);
    
    console.log('🎉 Debug test completed!');
  });
});
