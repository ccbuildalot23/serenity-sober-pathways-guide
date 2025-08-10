import { test, expect } from '@playwright/test';

test.describe('Password Reset Debug', () => {
  test('should debug reset password page state', async ({ page }) => {
    await page.goto('/reset-password');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check what elements are visible
    const emailInputVisible = await page.locator('input[placeholder="Email address"]').isVisible();
    const passwordInputVisible = await page.locator('[data-testid="new-password"]').isVisible();
    const manualVerifyTextVisible = await page.locator('text=Or enter the 6-digit code from your email:').isVisible();
    const invalidLinkVisible = await page.locator('text=Invalid or Expired Link').isVisible();
    
    console.log('Debug info:');
    console.log('- Email input visible:', emailInputVisible);
    console.log('- Password input visible:', passwordInputVisible);
    console.log('- Manual verify text visible:', manualVerifyTextVisible);
    console.log('- Invalid link visible:', invalidLinkVisible);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-reset-password.png' });
    
    // Check page content
    const pageContent = await page.content();
    console.log('Page title:', await page.title());
    
    // If manual verification is available, test it
    if (emailInputVisible) {
      console.log('Testing manual verification flow...');
      await page.fill('input[placeholder="Email address"]', 'test@example.com');
      await page.fill('input[placeholder="6-digit code"]', '123456');
      await page.click('button:has-text("Verify Code")');
      
      // Wait for response
      await page.waitForTimeout(2000);
      
      // Check for error message
      const errorVisible = await page.locator('text=Invalid code').isVisible();
      console.log('- Error message visible:', errorVisible);
    }
  });
});
