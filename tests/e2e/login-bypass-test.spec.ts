import { test, expect } from '@playwright/test';

test.describe('Login with Dev Bypass', () => {
  test('should navigate to patient dashboard with dev bypass', async ({ page }) => {
    // The app automatically detects Playwright and bypasses auth
    // This test verifies that the bypass works correctly
    
    // Navigate to auth page - should auto-redirect to dashboard
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    
    // Wait for dashboard to load
    await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    
    // Verify we're on the patient dashboard
    await expect(page).toHaveURL('/patient/dashboard');
    
    // Verify dashboard content is visible
    await expect(page.locator('h1')).toContainText('Serenity Dashboard');
    
    // Check that dashboard has loaded properly
    const dashboardText = await page.textContent('body');
    expect(dashboardText).toContain('Welcome back');
    expect(dashboardText).toContain('Daily Check-in');
    expect(dashboardText).toContain('Crisis Support');
    
    console.log('✅ Dev bypass login test passed - patient dashboard loaded successfully');
  });
  
  test('should navigate to provider dashboard for provider email', async ({ page }) => {
    // Set provider role hint and bypass
    await page.addInitScript(() => {
      localStorage.setItem('dev_bypass_auth', 'true');
      localStorage.setItem('pw_role', 'provider');
    });
    
    // Navigate to auth page - should auto-redirect to provider dashboard
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    
    // Wait for provider dashboard to load
    await page.waitForURL('**/provider/dashboard', { timeout: 15000 });
    
    // Verify we're on the provider dashboard
    await expect(page).toHaveURL('/provider/dashboard');
    
    console.log('✅ Provider bypass login test passed');
  });
  
  test('should navigate to supporter dashboard for supporter email', async ({ page }) => {
    // Set supporter role hint and bypass
    await page.addInitScript(() => {
      localStorage.setItem('dev_bypass_auth', 'true');
      localStorage.setItem('pw_role', 'support_member');
    });
    
    // Navigate to auth page - should auto-redirect to supporter dashboard
    await page.goto('/auth', { waitUntil: 'domcontentloaded' });
    
    // Wait for supporter dashboard to load
    await page.waitForURL('**/supporter/dashboard', { timeout: 15000 });
    
    // Verify we're on the supporter dashboard  
    await expect(page).toHaveURL('/supporter/dashboard');
    
    console.log('✅ Supporter bypass login test passed');
  });
});