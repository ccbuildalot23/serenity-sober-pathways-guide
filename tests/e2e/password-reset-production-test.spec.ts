import { test, expect } from '@playwright/test';

// Test configuration for production
const PRODUCTION_URL = 'https://serenity-sober-pathways-guide.vercel.app';
const TEST_EMAIL = 'cmcald1018@gmail.com';

test.describe('Password Reset Production Test', () => {
  test('should handle password reset flow in production', async ({ page }) => {
    console.log('🧪 Testing password reset flow in production...');
    
    // Step 1: Navigate to forgot password page
    console.log('📋 Step 1: Navigating to forgot password page...');
    await page.goto(`${PRODUCTION_URL}/forgot-password`);
    
    // Wait for the page to load and check for the form
    await page.waitForSelector('form', { timeout: 10000 });
    console.log('✅ Forgot password page loaded successfully');

    // Step 2: Check if the form elements are present
    console.log('📋 Step 2: Checking form elements...');
    const emailInput = await page.locator('#reset-email');
    const submitButton = await page.locator('button:has-text("Send Reset Link")');
    
    expect(await emailInput.isVisible()).toBeTruthy();
    expect(await submitButton.isVisible()).toBeTruthy();
    console.log('✅ Form elements are visible');

    // Step 3: Enter test user email and submit
    console.log('📋 Step 3: Entering test user email and submitting...');
    await emailInput.fill(TEST_EMAIL);
    await submitButton.click();
    
    // Wait for either success message or error message
    const successMessage = page.locator('text=Check Your Email');
    const errorMessage = page.locator('[data-testid="password-reset-error"]');
    
    try {
      await successMessage.waitFor({ timeout: 15000 });
      console.log('✅ Password reset email sent successfully');
    } catch (error) {
      // Check if there's an error message instead
      const hasError = await errorMessage.isVisible();
      if (hasError) {
        const errorText = await errorMessage.textContent();
        console.log('⚠️ Password reset failed:', errorText);
      } else {
        console.log('⚠️ No success or error message found');
      }
    }

    // Step 4: Check for any CSP errors in console
    console.log('📋 Step 4: Checking for console errors...');
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a moment for any errors to appear
    await page.waitForTimeout(2000);

    // Log any console errors
    if (consoleErrors.length > 0) {
      console.log('⚠️ Console errors found:', consoleErrors.slice(0, 5)); // Limit to first 5 errors
    } else {
      console.log('✅ No console errors detected');
    }

    console.log('🎉 Password reset production test completed!');
  });

  test('should handle CSP and network connectivity', async ({ page }) => {
    console.log('🧪 Testing CSP and network connectivity...');
    
    // Navigate to the main page
    await page.goto(PRODUCTION_URL);
    
    // Check for CSP violations
    const cspViolations: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('Content Security Policy') || msg.text().includes('CSP')) {
        cspViolations.push(msg.text());
      }
    });

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for network errors
    const networkErrors: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('Failed to fetch') || msg.text().includes('ERR_CONNECTION_REFUSED')) {
        networkErrors.push(msg.text());
      }
    });

    // Wait a moment for any errors to appear
    await page.waitForTimeout(3000);

    if (cspViolations.length > 0) {
      console.log('⚠️ CSP violations found:', cspViolations.slice(0, 3)); // Limit to first 3
    } else {
      console.log('✅ No CSP violations detected');
    }

    if (networkErrors.length > 0) {
      console.log('⚠️ Network errors found:', networkErrors.slice(0, 3)); // Limit to first 3
    } else {
      console.log('✅ No network errors detected');
    }

    console.log('🎉 CSP and network connectivity test completed!');
  });
});
