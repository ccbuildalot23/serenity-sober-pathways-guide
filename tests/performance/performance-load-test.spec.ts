/**
 * Performance Load Testing Suite
 * Tests system performance under various load conditions for healthcare requirements
 */

import { test, expect, Page, Browser } from '@playwright/test';

interface LoadTestMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  memoryUsage: number;
  cpuUsage: number;
  crisisResponseTime?: number;
}

interface LoadTestConfig {
  concurrentUsers: number;
  duration: number; // seconds
  rampUpTime: number; // seconds
  testName: string;
}

class PerformanceLoadTester {
  private browser: Browser;
  private results: LoadTestMetrics[] = [];

  constructor(browser: Browser) {
    this.browser = browser;
  }

  async runLoadTest(config: LoadTestConfig): Promise<LoadTestMetrics> {
    console.log(`🚀 Starting load test: ${config.testName}`);
    console.log(`👥 Concurrent users: ${config.concurrentUsers}`);
    console.log(`⏱️ Duration: ${config.duration}s`);
    console.log(`📈 Ramp-up time: ${config.rampUpTime}s`);

    const metrics: LoadTestMetrics = {
      responseTime: 0,
      throughput: 0,
      errorRate: 0,
      memoryUsage: 0,
      cpuUsage: 0,
    };

    const userSessions: Promise<any>[] = [];
    const results: any[] = [];

    // Ramp up users gradually
    const rampUpInterval = (config.rampUpTime * 1000) / config.concurrentUsers;

    for (let i = 0; i < config.concurrentUsers; i++) {
      await new Promise(resolve => setTimeout(resolve, rampUpInterval));
      
      const userSession = this.simulateUser(config.duration * 1000)
        .then(result => {
          results.push(result);
          return result;
        })
        .catch(error => {
          results.push({ error: error.message, failed: true });
          return { error: error.message, failed: true };
        });
      
      userSessions.push(userSession);
    }

    // Wait for all user sessions to complete
    await Promise.all(userSessions);

    // Calculate metrics
    const successfulResults = results.filter(r => !r.failed);
    const failedResults = results.filter(r => r.failed);

    if (successfulResults.length > 0) {
      metrics.responseTime = successfulResults.reduce((sum, r) => sum + r.avgResponseTime, 0) / successfulResults.length;
      metrics.throughput = successfulResults.reduce((sum, r) => sum + r.requestCount, 0) / config.duration;
      metrics.memoryUsage = successfulResults.reduce((sum, r) => sum + r.memoryUsage, 0) / successfulResults.length;
      
      // Crisis-specific metrics
      const crisisResults = successfulResults.filter(r => r.crisisResponseTime);
      if (crisisResults.length > 0) {
        metrics.crisisResponseTime = crisisResults.reduce((sum, r) => sum + r.crisisResponseTime, 0) / crisisResults.length;
      }
    }

    metrics.errorRate = (failedResults.length / results.length) * 100;

    console.log(`📊 Load test completed: ${config.testName}`);
    console.log(`⚡ Average response time: ${metrics.responseTime.toFixed(2)}ms`);
    console.log(`🔄 Throughput: ${metrics.throughput.toFixed(2)} requests/sec`);
    console.log(`❌ Error rate: ${metrics.errorRate.toFixed(2)}%`);
    console.log(`💾 Memory usage: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
    
    if (metrics.crisisResponseTime) {
      console.log(`🚨 Crisis response time: ${metrics.crisisResponseTime.toFixed(2)}ms`);
    }

    return metrics;
  }

  private async simulateUser(duration: number): Promise<any> {
    const context = await this.browser.newContext();
    const page = await context.newPage();
    
    const startTime = Date.now();
    const endTime = startTime + duration;
    let requestCount = 0;
    let totalResponseTime = 0;
    let memoryUsage = 0;
    let crisisResponseTime: number | undefined;

    try {
      // Initial page load
      const loadStartTime = Date.now();
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      totalResponseTime += Date.now() - loadStartTime;
      requestCount++;

      // Simulate user behavior during test duration
      while (Date.now() < endTime) {
        // Random user actions
        const actions = [
          () => this.simulateCheckin(page),
          () => this.simulateNavigation(page),
          () => this.simulateProfileView(page),
          () => this.simulateCrisisAccess(page), // 10% chance
        ];

        const actionIndex = Math.floor(Math.random() * actions.length);
        const actionStartTime = Date.now();
        
        try {
          const result = await actions[actionIndex]();
          
          if (result?.crisisResponseTime) {
            crisisResponseTime = result.crisisResponseTime;
          }
          
          totalResponseTime += Date.now() - actionStartTime;
          requestCount++;
        } catch (error) {
          // Log error but continue
          console.warn(`User action failed: ${error}`);
        }

        // Wait between actions (simulate user think time)
        await page.waitForTimeout(Math.random() * 2000 + 500); // 0.5-2.5 seconds
      }

      // Measure memory usage
      memoryUsage = await page.evaluate(() => {
        return (performance as any).memory?.usedJSHeapSize || 0;
      });

    } finally {
      await context.close();
    }

    return {
      requestCount,
      avgResponseTime: totalResponseTime / requestCount,
      memoryUsage,
      crisisResponseTime,
    };
  }

  private async simulateCheckin(page: Page) {
    const checkinButton = page.locator('[data-testid="checkin-button"], a[href*="checkin"]').first();
    
    if (await checkinButton.count() > 0) {
      await checkinButton.click();
      await page.waitForLoadState('networkidle');
      
      // Fill out basic checkin
      const moodSlider = page.locator('input[type="range"], [data-testid="mood-slider"]').first();
      if (await moodSlider.count() > 0) {
        await moodSlider.fill(String(Math.floor(Math.random() * 10) + 1));
      }
    }
  }

  private async simulateNavigation(page: Page) {
    const navItems = [
      '[href="/dashboard"]',
      '[href="/progress"]',
      '[href="/resources"]',
      '[href="/support"]',
    ];
    
    const randomNav = navItems[Math.floor(Math.random() * navItems.length)];
    const navElement = page.locator(randomNav).first();
    
    if (await navElement.count() > 0) {
      await navElement.click();
      await page.waitForLoadState('networkidle');
    }
  }

  private async simulateProfileView(page: Page) {
    const profileButton = page.locator('[data-testid="profile-button"], [href="/profile"]').first();
    
    if (await profileButton.count() > 0) {
      await profileButton.click();
      await page.waitForLoadState('networkidle');
    }
  }

  private async simulateCrisisAccess(page: Page) {
    // Only 10% of users access crisis features to simulate realistic usage
    if (Math.random() < 0.1) {
      const crisisStartTime = Date.now();
      
      const crisisButton = page.locator('[data-crisis-button], [data-testid="crisis-button"]').first();
      
      if (await crisisButton.count() > 0) {
        await crisisButton.click();
        await page.waitForSelector('[data-testid="crisis-modal"], [data-crisis-modal]', { timeout: 1000 });
        
        const crisisResponseTime = Date.now() - crisisStartTime;
        return { crisisResponseTime };
      }
    }
    
    return {};
  }
}

test.describe('Performance Load Testing', () => {
  let loadTester: PerformanceLoadTester;

  test.beforeAll(async ({ browser }) => {
    loadTester = new PerformanceLoadTester(browser);
  });

  test('should handle light load (10 concurrent users)', async () => {
    const config: LoadTestConfig = {
      concurrentUsers: 10,
      duration: 30, // 30 seconds
      rampUpTime: 10, // 10 seconds ramp-up
      testName: 'Light Load Test',
    };

    const metrics = await loadTester.runLoadTest(config);

    // Validate healthcare performance requirements under light load
    expect(metrics.responseTime).toBeLessThan(2000); // 2 second response time
    expect(metrics.errorRate).toBeLessThan(1); // < 1% error rate
    expect(metrics.throughput).toBeGreaterThan(5); // > 5 requests/sec
    
    if (metrics.crisisResponseTime) {
      expect(metrics.crisisResponseTime).toBeLessThan(500); // Crisis features < 500ms
    }
  });

  test('should handle moderate load (25 concurrent users)', async () => {
    const config: LoadTestConfig = {
      concurrentUsers: 25,
      duration: 60, // 1 minute
      rampUpTime: 15, // 15 seconds ramp-up
      testName: 'Moderate Load Test',
    };

    const metrics = await loadTester.runLoadTest(config);

    // Validate performance under moderate load
    expect(metrics.responseTime).toBeLessThan(3000); // 3 second response time
    expect(metrics.errorRate).toBeLessThan(2); // < 2% error rate
    expect(metrics.throughput).toBeGreaterThan(10); // > 10 requests/sec
    
    if (metrics.crisisResponseTime) {
      expect(metrics.crisisResponseTime).toBeLessThan(750); // Crisis features < 750ms (50% tolerance)
    }
  });

  test('should handle peak load (50 concurrent users)', async () => {
    const config: LoadTestConfig = {
      concurrentUsers: 50,
      duration: 120, // 2 minutes
      rampUpTime: 30, // 30 seconds ramp-up
      testName: 'Peak Load Test',
    };

    const metrics = await loadTester.runLoadTest(config);

    // Validate performance under peak load
    expect(metrics.responseTime).toBeLessThan(5000); // 5 second response time
    expect(metrics.errorRate).toBeLessThan(5); // < 5% error rate
    expect(metrics.throughput).toBeGreaterThan(15); // > 15 requests/sec
    
    if (metrics.crisisResponseTime) {
      expect(metrics.crisisResponseTime).toBeLessThan(1000); // Crisis features < 1 second (degraded)
    }

    // Memory usage should not grow excessively
    expect(metrics.memoryUsage).toBeLessThan(100 * 1024 * 1024); // < 100MB per user session
  });

  test('should handle crisis load scenario (emergency situation)', async () => {
    // Simulate emergency situation where many users access crisis features
    const config: LoadTestConfig = {
      concurrentUsers: 20,
      duration: 45, // 45 seconds
      rampUpTime: 5, // Quick ramp-up for emergency
      testName: 'Crisis Emergency Load Test',
    };

    // Override the crisis access probability for this test
    const originalSimulateCrisisAccess = PerformanceLoadTester.prototype['simulateCrisisAccess'];
    
    PerformanceLoadTester.prototype['simulateCrisisAccess'] = async function(page: Page) {
      // 80% of users access crisis features during emergency
      if (Math.random() < 0.8) {
        const crisisStartTime = Date.now();
        
        const crisisButton = page.locator('[data-crisis-button], [data-testid="crisis-button"]').first();
        
        if (await crisisButton.count() > 0) {
          await crisisButton.click();
          await page.waitForSelector('[data-testid="crisis-modal"], [data-crisis-modal]', { timeout: 2000 });
          
          const crisisResponseTime = Date.now() - crisisStartTime;
          return { crisisResponseTime };
        }
      }
      
      return {};
    };

    const metrics = await loadTester.runLoadTest(config);

    // Restore original method
    PerformanceLoadTester.prototype['simulateCrisisAccess'] = originalSimulateCrisisAccess;

    // Validate crisis performance during emergency load
    expect(metrics.errorRate).toBeLessThan(3); // < 3% error rate during crisis
    
    if (metrics.crisisResponseTime) {
      expect(metrics.crisisResponseTime).toBeLessThan(1500); // Crisis features < 1.5 seconds during emergency
      console.log(`🚨 Emergency crisis response time: ${metrics.crisisResponseTime.toFixed(2)}ms`);
    }
  });

  test('should recover from load spikes', async () => {
    // First, run a high load test
    const highLoadConfig: LoadTestConfig = {
      concurrentUsers: 40,
      duration: 30,
      rampUpTime: 5,
      testName: 'Load Spike Test',
    };

    const spikeMetrics = await loadTester.runLoadTest(highLoadConfig);
    
    // Wait for system to recover
    await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second recovery

    // Then run a normal load test to verify recovery
    const normalLoadConfig: LoadTestConfig = {
      concurrentUsers: 15,
      duration: 30,
      rampUpTime: 10,
      testName: 'Post-Spike Recovery Test',
    };

    const recoveryMetrics = await loadTester.runLoadTest(normalLoadConfig);

    // Validate system has recovered
    expect(recoveryMetrics.responseTime).toBeLessThan(spikeMetrics.responseTime * 0.8); // 20% improvement
    expect(recoveryMetrics.errorRate).toBeLessThan(Math.max(spikeMetrics.errorRate * 0.5, 2)); // 50% improvement or < 2%
    
    console.log(`📈 Performance improvement after recovery: ${((spikeMetrics.responseTime - recoveryMetrics.responseTime) / spikeMetrics.responseTime * 100).toFixed(1)}%`);
  });

  test('should maintain SLA under sustained load', async () => {
    // Simulate sustained load over longer period
    const config: LoadTestConfig = {
      concurrentUsers: 20,
      duration: 300, // 5 minutes
      rampUpTime: 60, // 1 minute ramp-up
      testName: 'Sustained Load SLA Test',
    };

    const metrics = await loadTester.runLoadTest(config);

    // Healthcare SLA requirements
    expect(metrics.responseTime).toBeLessThan(4000); // 4 second SLA
    expect(metrics.errorRate).toBeLessThan(2); // 98% availability SLA
    expect(metrics.throughput).toBeGreaterThan(8); // Minimum throughput requirement
    
    // Crisis features must maintain performance
    if (metrics.crisisResponseTime) {
      expect(metrics.crisisResponseTime).toBeLessThan(1000); // 1 second SLA for crisis features
    }

    console.log('✅ SLA requirements met under sustained load');
  });

  test('should generate performance benchmark report', async () => {
    const testConfigs: LoadTestConfig[] = [
      { concurrentUsers: 5, duration: 30, rampUpTime: 5, testName: 'Baseline' },
      { concurrentUsers: 15, duration: 30, rampUpTime: 10, testName: 'Normal Load' },
      { concurrentUsers: 30, duration: 30, rampUpTime: 15, testName: 'High Load' },
    ];

    const benchmarkResults: Array<LoadTestMetrics & { testName: string }> = [];

    for (const config of testConfigs) {
      const metrics = await loadTester.runLoadTest(config);
      benchmarkResults.push({ ...metrics, testName: config.testName });
    }

    // Generate comprehensive report
    console.log('\n📊 PERFORMANCE BENCHMARK REPORT');
    console.log('=====================================');
    
    benchmarkResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.testName}:`);
      console.log(`   Response Time: ${result.responseTime.toFixed(2)}ms`);
      console.log(`   Throughput: ${result.throughput.toFixed(2)} req/sec`);
      console.log(`   Error Rate: ${result.errorRate.toFixed(2)}%`);
      console.log(`   Memory Usage: ${(result.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
      
      if (result.crisisResponseTime) {
        console.log(`   Crisis Response: ${result.crisisResponseTime.toFixed(2)}ms`);
      }
    });

    // Performance trend analysis
    const baselineResponseTime = benchmarkResults[0].responseTime;
    const highLoadResponseTime = benchmarkResults[2].responseTime;
    const degradationPercent = ((highLoadResponseTime - baselineResponseTime) / baselineResponseTime) * 100;
    
    console.log(`\n📈 Performance Analysis:`);
    console.log(`   Baseline to High Load Degradation: ${degradationPercent.toFixed(1)}%`);
    console.log(`   Throughput Scaling Factor: ${(benchmarkResults[2].throughput / benchmarkResults[0].throughput).toFixed(2)}x`);
    
    // Validate overall performance characteristics
    expect(degradationPercent).toBeLessThan(200); // Response time should not degrade more than 200%
    expect(benchmarkResults[2].errorRate).toBeLessThan(5); // High load error rate < 5%
    
    console.log('\n✅ Performance benchmark completed successfully');

    return benchmarkResults;
  });
});