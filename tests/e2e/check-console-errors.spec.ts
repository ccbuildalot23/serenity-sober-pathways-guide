import { test } from '@playwright/test';

test('check console errors', async ({ page }) => {
  // Collect console messages
  const consoleMessages: string[] = [];
  const consoleErrors: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(`${msg.type()}: ${text}`);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });
  
  page.on('pageerror', error => {
    consoleErrors.push(`Page error: ${error.message}`);
  });
  
  // Navigate to auth page
  await page.goto('/auth');
  
  // Wait a bit for all errors to appear
  await page.waitForTimeout(3000);
  
  // Print all console messages
  console.log('\n=== CONSOLE MESSAGES ===');
  consoleMessages.forEach(msg => console.log(msg));
  
  // Print errors specifically
  if (consoleErrors.length > 0) {
    console.log('\n=== ERRORS ===');
    consoleErrors.forEach(err => console.log(err));
  } else {
    console.log('\n=== NO ERRORS FOUND ===');
  }
  
  // Also check what's actually rendered
  const bodyContent = await page.locator('body').innerHTML();
  console.log('\n=== BODY CONTENT (first 500 chars) ===');
  console.log(bodyContent.substring(0, 500));
});