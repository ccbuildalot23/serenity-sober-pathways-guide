import { Page, expect, Browser, BrowserContext } from '@playwright/test';

// Enhanced test helpers for crisis support and real-time features

/**
 * Simulates a crisis scenario with full workflow testing
 */
export async function simulateCrisisScenario(page: Page, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): Promise<void> {
  // Navigate to patient dashboard
  await page.goto('/patient/dashboard');
  
  // Trigger crisis alert
  await page.click('[data-testid="crisis-support-button"]');
  
  // Fill crisis details based on severity
  const crisisMessages = {
    low: 'Feeling a bit overwhelmed today',
    medium: 'Having strong cravings and need support',
    high: 'In crisis - need immediate help',
    critical: 'Emergency situation - immediate danger'
  };
  
  await page.fill('[data-testid="crisis-message-input"]', crisisMessages[severity]);
  
  // Enable location sharing for high/critical severity
  if (severity === 'high' || severity === 'critical') {
    await page.click('[data-testid="location-sharing-toggle"]');
  }
  
  // Submit crisis alert
  await page.click('[data-testid="submit-crisis-alert"]');
  
  // Verify alert sent
  await expect(page.locator('[data-testid="crisis-alert-sent"]')).toBeVisible();
}

/**
 * Tests real-time synchronization between multiple users
 */
export async function testRealTimeSync(page1: Page, page2: Page, testScenario: 'chat' | 'crisis' | 'checkin'): Promise<void> {
  switch (testScenario) {
    case 'chat':
      // Test chat message sync
      await page1.fill('[data-testid="chat-message-input"]', 'Test real-time message');
      await page1.click('[data-testid="send-message-button"]');
      
      // Verify message appears on second page
      await expect(page2.locator('[data-testid="chat-message"]')).toContainText('Test real-time message');
      break;
      
    case 'crisis':
      // Test crisis alert sync
      await simulateCrisisScenario(page1, 'medium');
      
      // Verify crisis alert appears on supporter page
      await expect(page2.locator('[data-testid="active-crisis-alert"]')).toBeVisible();
      break;
      
    case 'checkin':
      // Test check-in sync
      await page1.click('[data-testid="start-checkin-button"]');
      await page1.click('[data-testid="mood-positive"]');
      await page1.click('[data-testid="submit-checkin"]');
      
      // Verify check-in appears on provider dashboard
      await expect(page2.locator('[data-testid="recent-checkin"]')).toBeVisible();
      break;
  }
}

/**
 * Simulates network conditions for testing offline functionality
 */
export async function simulateNetworkConditions(page: Page, condition: 'offline' | 'slow' | 'intermittent'): Promise<void> {
  switch (condition) {
    case 'offline':
      await page.route('**/*', route => route.abort());
      break;
      
    case 'slow':
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 2000);
      });
      break;
      
    case 'intermittent':
      await page.route('**/*', route => {
        if (Math.random() > 0.7) {
          route.abort();
        } else {
          route.continue();
        }
      });
      break;
  }
}

/**
 * Tests mobile-specific functionality
 */
export async function testMobileFeatures(page: Page): Promise<void> {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });
  
  // Test touch targets (minimum 44px)
  const buttons = await page.locator('button').all();
  for (const button of buttons) {
    const box = await button.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
  
  // Test crisis button accessibility (minimum 60px for crisis features)
  const crisisButton = page.locator('[data-testid="crisis-support-button"]');
  if (await crisisButton.isVisible()) {
    const box = await crisisButton.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(60);
      expect(box.height).toBeGreaterThanOrEqual(60);
    }
  }
  
  // Test one-handed operation
  const importantButtons = page.locator('[data-testid*="crisis"], [data-testid*="emergency"]');
  const buttonsList = await importantButtons.all();
  for (const button of buttonsList) {
    const box = await button.boundingBox();
    if (box) {
      // Ensure buttons are reachable with thumb (bottom half of screen)
      expect(box.y + box.height).toBeGreaterThan(333); // Half of 667px height
    }
  }
}

/**
 * Tests accessibility compliance for crisis scenarios
 */
export async function testCrisisAccessibility(page: Page): Promise<void> {
  // Test keyboard navigation
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-testid="crisis-support-button"]')).toBeFocused();
  
  // Test keyboard activation
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-testid="crisis-modal"]')).toBeVisible();
  
  // Test ARIA attributes
  const crisisModal = page.locator('[data-testid="crisis-modal"]');
  await expect(crisisModal).toHaveAttribute('role', 'dialog');
  await expect(crisisModal).toHaveAttribute('aria-modal', 'true');
  
  // Test focus management
  await expect(page.locator('[data-testid="emergency-contact-button"]')).toBeFocused();
  
  // Test escape key closes modal
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-testid="crisis-modal"]')).not.toBeVisible();
}

/**
 * Tests performance metrics for critical features
 */
export async function measurePerformance(page: Page, feature: 'crisis' | 'checkin' | 'chat'): Promise<{
  loadTime: number;
  memoryUsage: number;
  networkRequests: number;
}> {
  const startTime = Date.now();
  
  // Start performance monitoring
  const performanceMetrics = await page.evaluate(() => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const navigationEntry = entries.find(entry => entry.entryType === 'navigation') as PerformanceNavigationTiming;
        if (navigationEntry) {
          resolve({
            loadTime: navigationEntry.loadEventEnd - navigationEntry.loadEventStart,
            memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
            networkRequests: entries.filter(entry => entry.entryType === 'resource').length
          });
        }
      });
      observer.observe({ entryTypes: ['navigation', 'resource'] });
    });
  });
  
  // Trigger the feature being tested
  switch (feature) {
    case 'crisis':
      await page.click('[data-testid="crisis-support-button"]');
      break;
    case 'checkin':
      await page.click('[data-testid="start-checkin-button"]');
      break;
    case 'chat':
      await page.click('[data-testid="peer-support-access"]');
      break;
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  
  return {
    loadTime: totalTime,
    memoryUsage: performanceMetrics.memoryUsage,
    networkRequests: performanceMetrics.networkRequests
  };
}

/**
 * Tests concurrent user scenarios
 */
export async function testConcurrentUsers(browser: Browser, userCount: number, scenario: 'crisis' | 'chat' | 'checkin'): Promise<void> {
  const contexts: BrowserContext[] = [];
  const pages: Page[] = [];
  
  try {
    // Create multiple browser contexts
    for (let i = 0; i < userCount; i++) {
      const context = await browser.newContext();
      const page = await context.newPage();
      contexts.push(context);
      pages.push(page);
    }
    
    // Login all users
    for (const page of pages) {
      await page.goto('/auth');
      await page.click('[data-testid="login-button"]');
      await page.fill('[data-testid="email-input"]', 'test-patient@serenity.com');
      await page.fill('[data-testid="password-input"]', 'TestPass123');
      await page.click('[data-testid="submit-login"]');
      await page.waitForURL('**/patient/dashboard', { timeout: 15000 });
    }
    
    // Execute scenario simultaneously
    const promises = pages.map(page => {
      switch (scenario) {
        case 'crisis':
          return simulateCrisisScenario(page, 'medium');
        case 'chat':
          return page.click('[data-testid="peer-support-access"]');
        case 'checkin':
          return page.click('[data-testid="start-checkin-button"]');
      }
    });
    
    await Promise.all(promises);
    
    // Verify all operations completed successfully
    for (const page of pages) {
      await expect(page.locator('[data-testid="patient-dashboard"]')).toBeVisible();
    }
    
  } finally {
    // Cleanup
    for (const context of contexts) {
      await context.close();
    }
  }
}

/**
 * Tests error handling and recovery
 */
export async function testErrorHandling(page: Page, errorType: 'network' | 'server' | 'validation'): Promise<void> {
  switch (errorType) {
    case 'network':
      // Simulate network error
      await page.route('**/*', route => route.abort());
      await page.click('[data-testid="crisis-support-button"]');
      await expect(page.locator('[data-testid="offline-crisis-options"]')).toBeVisible();
      break;
      
    case 'server':
      // Simulate server error
      await page.route('**/api/**', route => route.fulfill({ status: 500 }));
      await page.click('[data-testid="submit-login"]');
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      break;
      
    case 'validation':
      // Test form validation
      await page.click('[data-testid="submit-login"]');
      await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
      break;
  }
}

/**
 * Tests data persistence and state management
 */
export async function testDataPersistence(page: Page): Promise<void> {
  // Fill form data
  await page.fill('[data-testid="crisis-message-input"]', 'Test crisis message');
  
  // Navigate away and back
  await page.goto('/patient/dashboard');
  await page.click('[data-testid="crisis-support-button"]');
  
  // Verify data persisted
  await expect(page.locator('[data-testid="crisis-message-input"]')).toHaveValue('Test crisis message');
}

/**
 * Tests accessibility compliance for all critical features
 */
export async function testFullAccessibilityCompliance(page: Page): Promise<void> {
  // Test color contrast
  const elements = await page.locator('button, input, a').all();
  for (const element of elements) {
    const color = await element.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        backgroundColor: style.backgroundColor,
        color: style.color
      };
    });
    
    // Basic contrast check (simplified)
    expect(color.backgroundColor).not.toBe('transparent');
    expect(color.color).not.toBe('transparent');
  }
  
  // Test screen reader support
  const ariaLabels = await page.locator('[aria-label], [aria-labelledby]').all();
  expect(ariaLabels.length).toBeGreaterThan(0);
  
  // Test keyboard navigation
  await page.keyboard.press('Tab');
  const focusedElement = page.locator(':focus');
  await expect(focusedElement).toBeVisible();
}

/**
 * Tests security features and access control
 */
export async function testSecurityFeatures(page: Page): Promise<void> {
  // Test session timeout
  await page.evaluate(() => {
    // Simulate session timeout
    localStorage.clear();
    sessionStorage.clear();
  });
  
  // Try to access protected route
  await page.goto('/patient/dashboard');
  await expect(page).toHaveURL('/auth');
  
  // Test XSS prevention
  const maliciousInput = '<script>alert("xss")</script>';
  await page.fill('[data-testid="crisis-message-input"]', maliciousInput);
  await page.click('[data-testid="submit-crisis-alert"]');
  
  // Verify input is sanitized
  const messageElement = page.locator('[data-testid="crisis-message"]');
  await expect(messageElement).not.toContainText('<script>');
}

/**
 * Comprehensive test runner for all enhanced scenarios
 */
export async function runComprehensiveTestSuite(page: Page, browser: Browser): Promise<{
  accessibility: boolean;
  performance: boolean;
  security: boolean;
  mobile: boolean;
  realtime: boolean;
}> {
  const results = {
    accessibility: false,
    performance: false,
    security: false,
    mobile: false,
    realtime: false
  };
  
  try {
    // Test accessibility
    await testCrisisAccessibility(page);
    await testFullAccessibilityCompliance(page);
    results.accessibility = true;
    
    // Test performance
    const metrics = await measurePerformance(page, 'crisis');
    expect(metrics.loadTime).toBeLessThan(3000); // 3 seconds max
    results.performance = true;
    
    // Test security
    await testSecurityFeatures(page);
    results.security = true;
    
    // Test mobile features
    await testMobileFeatures(page);
    results.mobile = true;
    
    // Test real-time features
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();
    await testRealTimeSync(page, page2, 'crisis');
    await context2.close();
    results.realtime = true;
    
  } catch (error) {
    console.error('Comprehensive test suite failed:', error);
  }
  
  return results;
}
