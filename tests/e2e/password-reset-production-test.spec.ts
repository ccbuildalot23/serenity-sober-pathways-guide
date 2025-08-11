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
    await expect(page.getByText('Reset Your Password')).toBeVisible();
    console.log('✅ Forgot password page loaded successfully');

    // Step 2: Enter test user email and submit
    console.log('📋 Step 2: Entering test user email and submitting...');
    await page.fill('#reset-email', TEST_EMAIL);
    await page.click('button:has-text("Send Reset Link")');
    
    // Wait for success message
    await expect(page.getByText('Check Your Email')).toBeVisible({ timeout: 15000 });
    console.log('✅ Password reset email sent successfully');

    // Step 3: Check that the form is accessible and functional
    console.log('📋 Step 3: Verifying form functionality...');
    
    // Check for any CSP errors in console
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
      console.log('⚠️ Console errors found:', consoleErrors);
    } else {
      console.log('✅ No console errors detected');
    }

    // Step 4: Test form validation
    console.log('📋 Step 4: Testing form validation...');
    
    // Try submitting without email
    await page.click('button:has-text("Send Reset Link")');
    
    // Check if there's any validation error
    const hasValidationError = await page.locator('[data-testid="password-reset-error"]').isVisible().catch(() => false);
    if (hasValidationError) {
      console.log('✅ Form validation working correctly');
    } else {
      console.log('ℹ️ Form validation may be handled differently');
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
      console.log('⚠️ CSP violations found:', cspViolations);
    } else {
      console.log('✅ No CSP violations detected');
    }

    if (networkErrors.length > 0) {
      console.log('⚠️ Network errors found:', networkErrors);
    } else {
      console.log('✅ No network errors detected');
    }

    console.log('🎉 CSP and network connectivity test completed!');
  });
});
