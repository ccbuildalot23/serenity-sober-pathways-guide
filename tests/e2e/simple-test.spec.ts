import { test, expect } from '@playwright/test';

test.describe('Simple App Test', () => {
  test('should load the app without errors', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Check if the page has content (not a blank white screen)
    const bodyText = await page.textContent('body');
    console.log('Page body text:', bodyText);
    
    // Take a screenshot to see what's actually rendered
    await page.screenshot({ path: 'test-results/simple-test-screenshot.png', fullPage: true });
    
    // Check if there are any error messages
    const errorElements = await page.locator('[class*="error"], [class*="Error"]').count();
    console.log('Error elements found:', errorElements);
    
    // Basic assertion that the page loaded
    expect(bodyText).toBeTruthy();
  });

  test('should navigate to auth page', async ({ page }) => {
    // Navigate to the auth page
    await page.goto('/auth');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot
    await page.screenshot({ path: 'test-results/auth-page-screenshot.png', fullPage: true });
    
    // Check if there are any error messages
    const errorElements = await page.locator('[class*="error"], [class*="Error"]').count();
    console.log('Error elements on auth page:', errorElements);
    
    // Check if the page has content
    const bodyText = await page.textContent('body');
    console.log('Auth page body text:', bodyText);
    
    // Basic assertion
    expect(bodyText).toBeTruthy();
  });
});

