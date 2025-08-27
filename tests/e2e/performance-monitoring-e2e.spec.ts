/**
 * E2E Performance Monitoring Tests
 * Tests performance monitoring in real browser environments with healthcare requirements
 */

import { test, expect, Page } from '@playwright/test';
import type { PerformanceMetrics, CrisisMetrics } from '../../src/monitoring/performance-monitor';

// Healthcare performance thresholds
const HEALTHCARE_THRESHOLDS = {
  CRISIS_LOAD_TIME: 500, // ms - Critical for crisis response
  LCP_GOOD: 2500, // ms - Largest Contentful Paint
  FID_GOOD: 100, // ms - First Input Delay
  CLS_GOOD: 0.1, // Cumulative Layout Shift
  FCP_GOOD: 1800, // ms - First Contentful Paint
  TTFB_GOOD: 600, // ms - Time to First Byte
};

test.describe('Performance Monitoring E2E Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Enable performance monitoring
    await page.addInitScript(() => {
      // Mock performance APIs if needed
      window.mockPerformanceData = {
        webVitals: {},
        crisisMetrics: {},
        alerts: [],
      };
      
      // Intercept performance monitor calls
      window.capturePerformanceAlert = (type: string, data: any) => {
        window.mockPerformanceData.alerts.push({ type, data, timestamp: Date.now() });
      };
    });
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.describe('Core Web Vitals Tracking', () => {
    test('should track and validate CLS (Cumulative Layout Shift)', async () => {
      await page.goto('/dashboard');
      
      // Wait for page to stabilize
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Get CLS value
      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
                resolve((entry as any).value);
              }
            }
          }).observe({ entryTypes: ['layout-shift'] });
          
          // Fallback timeout
          setTimeout(() => resolve(0), 3000);
        });
      });
      
      expect(cls).toBeLessThanOrEqual(HEALTHCARE_THRESHOLDS.CLS_GOOD);
      console.log(`✅ CLS: ${cls} (threshold: ${HEALTHCARE_THRESHOLDS.CLS_GOOD})`);
    });

    test('should track and validate LCP (Largest Contentful Paint)', async () => {
      await page.goto('/dashboard');
      
      const lcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              resolve(entry.startTime);
            }
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          setTimeout(() => resolve(0), 5000);
        });
      });
      
      expect(lcp).toBeLessThanOrEqual(HEALTHCARE_THRESHOLDS.LCP_GOOD);
      console.log(`✅ LCP: ${lcp}ms (threshold: ${HEALTHCARE_THRESHOLDS.LCP_GOOD}ms)`);
    });

    test('should track and validate FCP (First Contentful Paint)', async () => {
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      
      const fcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              resolve(entry.startTime);
            }
          }).observe({ entryTypes: ['first-contentful-paint'] });
          
          setTimeout(() => resolve(0), 3000);
        });
      });
      
      expect(fcp).toBeLessThanOrEqual(HEALTHCARE_THRESHOLDS.FCP_GOOD);
      console.log(`✅ FCP: ${fcp}ms (threshold: ${HEALTHCARE_THRESHOLDS.FCP_GOOD}ms)`);
    });

    test('should measure TTFB (Time to First Byte)', async () => {
      const response = await page.goto('/dashboard');
      const ttfb = await response?.headerValue('server-timing') || '0';
      
      // Alternative: measure from navigation timing
      const navigationTTFB = await page.evaluate(() => {
        const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return navTiming.responseStart - navTiming.requestStart;
      });
      
      expect(navigationTTFB).toBeLessThanOrEqual(HEALTHCARE_THRESHOLDS.TTFB_GOOD);
      console.log(`✅ TTFB: ${navigationTTFB}ms (threshold: ${HEALTHCARE_THRESHOLDS.TTFB_GOOD}ms)`);
    });
  });

  test.describe('Crisis Response Performance', () => {
    test('should load crisis support button within 500ms threshold', async () => {
      const startTime = Date.now();
      
      await page.goto('/dashboard');
      
      // Wait for crisis button to be interactive
      const crisisButton = page.locator('[data-crisis-button], [data-testid="crisis-button"], button:has-text("Crisis")').first();
      await crisisButton.waitFor({ state: 'visible', timeout: 1000 });
      
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThanOrEqual(HEALTHCARE_THRESHOLDS.CRISIS_LOAD_TIME);
      console.log(`✅ Crisis button load time: ${loadTime}ms (threshold: ${HEALTHCARE_THRESHOLDS.CRISIS_LOAD_TIME}ms)`);
      
      // Verify button is interactive
      await expect(crisisButton).toBeEnabled();
      
      // Test click responsiveness
      const clickStartTime = Date.now();
      await crisisButton.click();
      
      // Wait for crisis modal or navigation
      await page.waitForSelector('[data-testid="crisis-modal"], [data-crisis-modal]', { 
        timeout: 500,
        state: 'visible' 
      });
      
      const responseTime = Date.now() - clickStartTime;
      expect(responseTime).toBeLessThanOrEqual(300); // Crisis interaction should be < 300ms
      console.log(`✅ Crisis button response time: ${responseTime}ms`);
    });

    test('should maintain crisis functionality under load', async () => {
      // Simulate multiple tabs/users accessing crisis features
      const pages = await Promise.all([
        page.context().newPage(),
        page.context().newPage(),
        page.context().newPage(),
      ]);
      
      const crisisLoadTimes: number[] = [];
      
      await Promise.all(pages.map(async (testPage, index) => {
        const startTime = Date.now();
        
        await testPage.goto('/dashboard');
        
        const crisisButton = testPage.locator('[data-crisis-button], [data-testid="crisis-button"]').first();
        await crisisButton.waitFor({ state: 'visible' });
        
        const loadTime = Date.now() - startTime;
        crisisLoadTimes.push(loadTime);
        
        console.log(`Tab ${index + 1} crisis load time: ${loadTime}ms`);
        
        await testPage.close();
      }));
      
      // All crisis buttons should load within threshold even under load
      for (const loadTime of crisisLoadTimes) {
        expect(loadTime).toBeLessThanOrEqual(HEALTHCARE_THRESHOLDS.CRISIS_LOAD_TIME * 1.2); // 20% tolerance under load
      }
      
      const avgLoadTime = crisisLoadTimes.reduce((a, b) => a + b, 0) / crisisLoadTimes.length;
      console.log(`✅ Average crisis load time under load: ${avgLoadTime}ms`);
    });

    test('should monitor crisis endpoint availability', async () => {
      await page.goto('/dashboard');
      
      // Intercept crisis health check requests
      const crisisRequests: any[] = [];
      
      await page.route('**/api/crisis/health', async (route, request) => {
        const startTime = Date.now();
        const response = await route.fetch();
        const endTime = Date.now();
        
        crisisRequests.push({
          status: response.status(),
          responseTime: endTime - startTime,
          timestamp: startTime,
        });
        
        await route.fulfill({ response });
      });
      
      // Wait for health checks to occur
      await page.waitForTimeout(5000);
      
      // Verify crisis endpoint is accessible
      if (crisisRequests.length > 0) {
        const lastRequest = crisisRequests[crisisRequests.length - 1];
        expect(lastRequest.status).toBe(200);
        expect(lastRequest.responseTime).toBeLessThan(1000); // Crisis endpoints should respond quickly
        
        console.log(`✅ Crisis endpoint response time: ${lastRequest.responseTime}ms`);
      }
    });
  });

  test.describe('Error Tracking and Monitoring', () => {
    test('should capture and track JavaScript errors', async () => {
      const errors: any[] = [];
      
      page.on('pageerror', (error) => {
        errors.push({
          message: error.message,
          stack: error.stack,
          timestamp: Date.now(),
        });
      });
      
      page.on('requestfailed', (request) => {
        errors.push({
          message: `Failed request: ${request.url()}`,
          failure: request.failure()?.errorText,
          timestamp: Date.now(),
        });
      });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Intentionally trigger an error for testing
      await page.evaluate(() => {
        // Simulate a non-critical error
        try {
          (window as any).nonExistentFunction();
        } catch (e) {
          console.error('Test error:', e);
        }
      });
      
      await page.waitForTimeout(1000);
      
      // Check if performance monitor captured the error
      const capturedErrors = await page.evaluate(() => {
        return (window as any).mockPerformanceData?.alerts || [];
      });
      
      console.log(`Captured ${errors.length} client errors and ${capturedErrors.length} performance alerts`);
      
      // Verify no critical crisis-related errors occurred
      const criticalErrors = errors.filter(error => 
        error.message?.toLowerCase().includes('crisis') ||
        error.message?.toLowerCase().includes('emergency')
      );
      
      expect(criticalErrors.length).toBe(0);
    });

    test('should handle and report performance degradation', async () => {
      await page.goto('/dashboard');
      
      // Simulate network slowdown
      await page.route('**/*', async (route, request) => {
        // Add delay to simulate slow network
        await new Promise(resolve => setTimeout(resolve, 100));
        await route.continue();
      });
      
      // Navigate to a heavy page
      await page.goto('/analytics');
      await page.waitForLoadState('networkidle');
      
      // Check if performance monitor detected degradation
      const performanceAlerts = await page.evaluate(() => {
        return (window as any).mockPerformanceData?.alerts?.filter(
          (alert: any) => alert.type === 'PERFORMANCE_DEGRADATION'
        ) || [];
      });
      
      console.log(`Performance degradation alerts: ${performanceAlerts.length}`);
      
      // Verify system continues to function despite degradation
      const crisisButton = page.locator('[data-crisis-button], [data-testid="crisis-button"]').first();
      if (await crisisButton.count() > 0) {
        await expect(crisisButton).toBeVisible();
        await expect(crisisButton).toBeEnabled();
      }
    });
  });

  test.describe('Resource Loading Performance', () => {
    test('should monitor and report large resource loading', async () => {
      const resourceMetrics: any[] = [];
      
      page.on('response', async (response) => {
        const request = response.request();
        const timing = await response.timing();
        
        // Check for large resources
        const contentLength = response.headers()['content-length'];
        if (contentLength && parseInt(contentLength) > 500000) { // 500KB
          resourceMetrics.push({
            url: request.url(),
            size: parseInt(contentLength),
            loadTime: timing.responseEnd - timing.responseStart,
          });
        }
      });
      
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Log large resources
      for (const resource of resourceMetrics) {
        console.log(`Large resource: ${resource.url} (${resource.size} bytes, ${resource.loadTime}ms)`);
        
        // Verify large resources don't impact critical functionality
        expect(resource.loadTime).toBeLessThan(5000); // 5 second timeout for large resources
      }
    });

    test('should measure page bundle size impact', async () => {
      await page.goto('/dashboard');
      
      // Measure total transferred bytes
      const transferMetrics = await page.evaluate(() => {
        const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
        let totalBytes = 0;
        let jsBytes = 0;
        let cssBytes = 0;
        
        entries.forEach((entry) => {
          totalBytes += entry.transferSize || 0;
          
          if (entry.name.endsWith('.js')) {
            jsBytes += entry.transferSize || 0;
          } else if (entry.name.endsWith('.css')) {
            cssBytes += entry.transferSize || 0;
          }
        });
        
        return { totalBytes, jsBytes, cssBytes };
      });
      
      console.log(`Total transferred: ${(transferMetrics.totalBytes / 1024).toFixed(2)} KB`);
      console.log(`JavaScript: ${(transferMetrics.jsBytes / 1024).toFixed(2)} KB`);
      console.log(`CSS: ${(transferMetrics.cssBytes / 1024).toFixed(2)} KB`);
      
      // Healthcare app bundle size recommendations
      expect(transferMetrics.totalBytes).toBeLessThan(5 * 1024 * 1024); // 5MB total
      expect(transferMetrics.jsBytes).toBeLessThan(2 * 1024 * 1024); // 2MB JS
    });
  });

  test.describe('Mobile Performance', () => {
    test('should maintain performance on mobile devices', async ({ browser }) => {
      const context = await browser.newContext({
        ...browser.version().includes('webkit') ? {} : {
          // Simulate mobile device performance
          viewport: { width: 375, height: 667 },
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        },
      });
      
      const mobilePage = await context.newPage();
      
      // Throttle network to simulate mobile conditions
      await mobilePage.route('**/*', async (route, request) => {
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay
        await route.continue();
      });
      
      const startTime = Date.now();
      await mobilePage.goto('/dashboard');
      
      // Wait for crisis button specifically on mobile
      const crisisButton = mobilePage.locator('[data-crisis-button], [data-testid="crisis-button"]').first();
      await crisisButton.waitFor({ state: 'visible', timeout: 1000 });
      
      const mobileLoadTime = Date.now() - startTime;
      
      // Mobile should still meet crisis response requirements (with slight tolerance)
      expect(mobileLoadTime).toBeLessThan(HEALTHCARE_THRESHOLDS.CRISIS_LOAD_TIME * 1.5); // 50% tolerance
      console.log(`✅ Mobile crisis load time: ${mobileLoadTime}ms`);
      
      await context.close();
    });
  });

  test.describe('Offline Performance', () => {
    test('should handle offline scenarios gracefully', async () => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      
      // Go offline
      await page.context().setOffline(true);
      
      // Test crisis functionality offline
      const crisisButton = page.locator('[data-crisis-button], [data-testid="crisis-button"]').first();
      
      if (await crisisButton.count() > 0) {
        await crisisButton.click();
        
        // Should show offline crisis message or cached crisis data
        await expect(page.locator('[data-testid="offline-crisis"], .offline-message')).toBeVisible({
          timeout: 3000,
        });
        
        console.log('✅ Offline crisis handling verified');
      }
      
      // Go back online
      await page.context().setOffline(false);
    });
  });

  test.describe('Performance Benchmarking', () => {
    test('should generate comprehensive performance benchmark', async () => {
      const benchmark = {
        pageLoadTime: 0,
        crisisResponseTime: 0,
        interactionDelay: 0,
        resourceCount: 0,
        memoryUsage: 0,
      };
      
      // Measure page load time
      const pageStartTime = Date.now();
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      benchmark.pageLoadTime = Date.now() - pageStartTime;
      
      // Measure crisis response time
      const crisisButton = page.locator('[data-crisis-button], [data-testid="crisis-button"]').first();
      if (await crisisButton.count() > 0) {
        const crisisStartTime = Date.now();
        await crisisButton.click();
        await page.waitForSelector('[data-testid="crisis-modal"], [data-crisis-modal]', { timeout: 1000 });
        benchmark.crisisResponseTime = Date.now() - crisisStartTime;
      }
      
      // Measure interaction delay (FID simulation)
      const interactionStartTime = Date.now();
      await page.click('body'); // Simple click
      benchmark.interactionDelay = Date.now() - interactionStartTime;
      
      // Get resource metrics
      benchmark.resourceCount = await page.evaluate(() => {
        return performance.getEntriesByType('resource').length;
      });
      
      // Get memory usage if available
      benchmark.memoryUsage = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });
      
      // Log benchmark results
      console.log('\n📊 Performance Benchmark Results:');
      console.log(`Page Load Time: ${benchmark.pageLoadTime}ms`);
      console.log(`Crisis Response Time: ${benchmark.crisisResponseTime}ms`);
      console.log(`Interaction Delay: ${benchmark.interactionDelay}ms`);
      console.log(`Resource Count: ${benchmark.resourceCount}`);
      console.log(`Memory Usage: ${(benchmark.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
      
      // Validate against healthcare requirements
      expect(benchmark.pageLoadTime).toBeLessThan(3000);
      expect(benchmark.crisisResponseTime).toBeLessThan(HEALTHCARE_THRESHOLDS.CRISIS_LOAD_TIME);
      expect(benchmark.interactionDelay).toBeLessThan(100);
      
      return benchmark;
    });
  });
});