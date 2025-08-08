#!/usr/bin/env node

import { chromium } from '@playwright/test';

async function testLogin() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Testing login functionality...\n');
    
    // Navigate to app
    console.log('1. Navigating to http://localhost:8086/auth');
    await page.goto('http://localhost:8086/auth');
    await page.waitForTimeout(2000);
    
    // Take screenshot of auth page
    await page.screenshot({ path: 'auth-page.png' });
    console.log('   ✅ Auth page loaded (screenshot saved as auth-page.png)');
    
    // Try to login as patient
    console.log('\n2. Attempting login as test-patient@serenity.com');
    
    // Look for email input
    const emailInput = await page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    await emailInput.fill('test-patient@serenity.com');
    console.log('   ✅ Email entered');
    
    // Look for password input
    const passwordInput = await page.locator('input[type="password"], input[name="password"], input[placeholder*="password" i]').first();
    await passwordInput.fill('TestSerenity2024!@#');
    console.log('   ✅ Password entered');
    
    // Look for submit button
    const submitButton = await page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Log In")').first();
    await submitButton.click();
    console.log('   ✅ Login button clicked');
    
    // Wait for navigation
    console.log('\n3. Waiting for dashboard...');
    await page.waitForTimeout(5000);
    
    // Check current URL
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    // Take screenshot of result
    await page.screenshot({ path: 'after-login.png' });
    console.log('   Screenshot saved as after-login.png');
    
    // Check if we're on dashboard or still on auth
    if (currentUrl.includes('dashboard') || currentUrl.includes('patient')) {
      console.log('   ✅ Successfully redirected to dashboard!');
    } else if (currentUrl.includes('auth')) {
      console.log('   ⚠️  Still on auth page - login may have failed');
      
      // Check for error messages
      const errorMessages = await page.locator('.error, .alert, [role="alert"]').allTextContents();
      if (errorMessages.length > 0) {
        console.log('   Error messages found:', errorMessages);
      }
    } else {
      console.log('   ℹ️  Redirected to:', currentUrl);
    }
    
    // Check for user info on page
    const userInfo = await page.locator('text=/test-patient@serenity.com/i').count();
    if (userInfo > 0) {
      console.log('   ✅ User email found on page - login successful!');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testLogin().catch(console.error);