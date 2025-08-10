import { test, expect } from '@playwright/test';

test.describe('Live Password Reset Debug', () => {
  test('should debug password reset request', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', error => console.log('Browser error:', error.message));
    
    await page.goto('https://serenity-sober-pathways-guide.vercel.app/forgot-password');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    console.log('Page loaded, filling email...');
    
    // Fill in the email
    await page.fill('#reset-email', 'cmcald1018@gmail.com');
    
    console.log('Email filled, clicking submit...');
    
    // Click submit and wait for response
    await Promise.all([
      page.waitForResponse(response => 
        response.url().includes('/auth/v1/recover') || 
        response.url().includes('supabase')
      ),
      page.click('button:has-text("Send Reset Link")')
    ]);
    
    console.log('Request sent, waiting for response...');
    
    // Wait a bit for any error messages
    await page.waitForTimeout(3000);
    
    // Check for error messages
    const errorVisible = await page.locator('[data-testid="password-reset-error"]').isVisible();
    if (errorVisible) {
      const errorText = await page.locator('[data-testid="password-reset-error"]').textContent();
      console.log('Error message found:', errorText);
    }
    
    // Check for success message
    const successVisible = await page.getByText('Check Your Email').isVisible();
    if (successVisible) {
      console.log('Success message found!');
    }
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-password-reset.png' });
    
    console.log('Debug test completed');
  });
});
