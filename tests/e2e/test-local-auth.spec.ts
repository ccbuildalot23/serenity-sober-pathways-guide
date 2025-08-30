import { test, expect } from '@playwright/test';

test.describe('Local Authentication Test', () => {
  test('should authenticate with local test users', async ({ page }) => {
    // Navigate to auth page
    await page.goto('/auth');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of auth page
    await page.screenshot({ path: 'auth-page.png' });
    
    // Look for sign in elements using multiple selectors
    const possibleSignInButtons = [
      'button:has-text("Sign In")',
      'button:has-text("Sign in")',
      'button:has-text("Login")',
      'button:has-text("Get Started")',
      '[data-testid="login-button"]',
      'a:has-text("Sign In")',
      'a:has-text("Sign in")'
    ];
    
    let signInClicked = false;
    for (const selector of possibleSignInButtons) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          signInClicked = true;
          console.log(`Clicked: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Wait a bit after click
    if (signInClicked) {
      await page.waitForTimeout(2000);
    }
    
    // Try to find email input
    const emailSelectors = [
      'input[type="email"]',
      'input[name="email"]',
      '[data-testid="email-input"]',
      'input[placeholder*="email" i]',
      '#email'
    ];
    
    let emailInput = null;
    for (const selector of emailSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          emailInput = element;
          console.log(`Found email input: ${selector}`);
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (!emailInput) {
      // Take screenshot to see what's on the page
      await page.screenshot({ path: 'no-email-input.png' });
      
      // Print page content for debugging
      const bodyText = await page.locator('body').innerText();
      console.log('Page content:', bodyText.substring(0, 500));
      
      throw new Error('Could not find email input');
    }
    
    // Fill in credentials
    await emailInput.fill('test-patient@serenity.com');
    
    // Find password input
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.fill('TestSerenity2024!@#');
    
    // Find submit button
    const submitSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign In")',
      'button:has-text("Login")',
      '[data-testid*="submit"]'
    ];
    
    let submitButton = null;
    for (const selector of submitSelectors) {
      try {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 1000 })) {
          submitButton = element;
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    
    if (submitButton) {
      await submitButton.click();
    }
    
    // Wait for navigation or error
    await page.waitForTimeout(3000);
    
    // Check results
    const currentUrl = page.url();
    console.log('After login URL:', currentUrl);
    
    // Take final screenshot
    await page.screenshot({ path: 'after-login.png' });
    
    // Check if we navigated away from auth
    if (currentUrl.includes('/patient/dashboard') || 
        currentUrl.includes('/provider/dashboard') || 
        currentUrl.includes('/supporter/dashboard')) {
      console.log('✅ Successfully authenticated and redirected');
    } else if (currentUrl.includes('/auth')) {
      // Check for error messages
      const errorText = await page.locator('.text-red-500, [role="alert"]').first().textContent().catch(() => null);
      if (errorText) {
        console.log('❌ Authentication failed:', errorText);
      } else {
        console.log('⚠️ Still on auth page, authentication may have failed silently');
      }
    }
    
    // Verify local auth is working
    const hasSession = await page.evaluate(() => {
      return localStorage.getItem('supabase.auth.token') !== null;
    });
    
    expect(hasSession).toBe(true);
  });
});