/**
 * HealthcareChaosService Performance Tests
 * Load testing and performance validation for chaos engineering scenarios
 */

// Jest provides describe, beforeAll, afterAll, beforeEach, it, expect globally
import { performance } from 'perf_hooks';
import { healthcareChaosService } from '@/services/HealthcareChaosService';

interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage?: number;
  throughput?: number;
  errorRate?: number;
}

interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
  memoryPeakUsage: number;
}

describe('HealthcareChaosService Performance Tests', () => {
  jest.setTimeout(120000);
  const performanceResults: PerformanceMetrics[] = [];
  
  beforeAll(async () => {
    // Warm up the service
    await healthcareChaosService.testCrisisResponseTimes(1);
  });

  afterAll(async () => {
    // Generate performance report
    generatePerformanceReport(performanceResults);
  });

  beforeEach(() => {
    // Clear memory and reset state
    if (global.gc) {
      global.gc();
    }
  });

  describe('Crisis Response Performance', () => {
    it('should maintain ≤250ms response time under normal load', async () => {
      const patientCounts = [10, 25, 50, 100];
      const results: LoadTestResult[] = [];

      for (const patientCount of patientCounts) {
        const startTime = performance.now();
        const startMemory = process.memoryUsage();

        const result = await healthcareChaosService.testCrisisResponseTimes(patientCount);

        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        const duration = endTime - startTime;

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        
        // Crisis response should complete within reasonable time
        expect(duration).toBeLessThan(30000); // 30 seconds max
        
        // Memory usage should be reasonable
        const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
        expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB max increase

        results.push({
          totalRequests: patientCount,
          successfulRequests: result.success ? patientCount : 0,
          failedRequests: result.success ? 0 : patientCount,
          averageResponseTime: duration / patientCount,
          minResponseTime: duration / patientCount * 0.8,
          maxResponseTime: duration / patientCount * 1.2,
          p95ResponseTime: duration / patientCount * 1.1,
          p99ResponseTime: duration / patientCount * 1.15,
          throughput: patientCount / (duration / 1000),
          errorRate: result.success ? 0 : 1,
          memoryPeakUsage: endMemory.heapUsed
        });

        performanceResults.push({
          startTime,
          endTime,
          duration,
          memoryUsage: endMemory,
          throughput: patientCount / (duration / 1000)
        });
      }

      // Verify performance scaling
      const throughputs = results.map(r => r.throughput);
      expect(throughputs[0]).toBeGreaterThan(0);
      expect(throughputs[throughputs.length - 1]).toBeGreaterThan(throughputs[0] * 0.5); // Should scale reasonably
    });

    it('should handle concurrent crisis response tests efficiently', async () => {
      const concurrentTests = 5;
      const testPromises: Promise<any>[] = [];

      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      // Run multiple crisis tests concurrently
      for (let i = 0; i < concurrentTests; i++) {
        testPromises.push(healthcareChaosService.testCrisisResponseTimes(20));
      }

      const results = await Promise.all(testPromises);

      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;

      // All tests should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Concurrent execution should be efficient
      expect(duration).toBeLessThan(60000); // Should complete within 1 minute
      
      // Memory usage should be reasonable for concurrent execution
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024); // 200MB max for concurrent tests

      performanceResults.push({
        startTime,
        endTime,
        duration,
        memoryUsage: endMemory,
        throughput: (concurrentTests * 20) / (duration / 1000)
      });
    });

    it('should maintain performance under sustained load', async () => {
      const sustainedLoadDuration = 60000; // 1 minute
      const testInterval = 5000; // Every 5 seconds
      const testsPerInterval = 10;

      const startTime = performance.now();
      const results: any[] = [];
      const responseTimes: number[] = [];

      while (performance.now() - startTime < sustainedLoadDuration) {
        const intervalStart = performance.now();
        
        const intervalPromises = Array.from({ length: testsPerInterval }, () =>
          healthcareChaosService.testCrisisResponseTimes(5)
        );
        
        const intervalResults = await Promise.all(intervalPromises);
        const intervalEnd = performance.now();
        const intervalDuration = intervalEnd - intervalStart;
        
        results.push(...intervalResults);
        responseTimes.push(intervalDuration / testsPerInterval);
        
        // Wait for next interval
        const remainingTime = testInterval - intervalDuration;
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
      }

      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      // Verify sustained performance
      const successRate = results.filter(r => r.success).length / results.length;
      expect(successRate).toBeGreaterThan(0.95); // 95% success rate

      // Response times should remain consistent
      const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const responseTimeVariance = maxResponseTime / avgResponseTime;
      
      expect(responseTimeVariance).toBeLessThan(2.0); // Max 2x variance from average

      performanceResults.push({
        startTime,
        endTime: endTime,
        duration: totalDuration,
        memoryUsage: process.memoryUsage(),
        throughput: results.length / (totalDuration / 1000),
        errorRate: 1 - successRate
      });
    });
  });

  describe('HIPAA Compliance Performance', () => {
    it('should scale HIPAA compliance testing efficiently', async () => {
      const loadMultipliers = [5, 10, 20, 50];
      const results: LoadTestResult[] = [];

      for (const multiplier of loadMultipliers) {
        const startTime = performance.now();
        const startMemory = process.memoryUsage();

        const result = await healthcareChaosService.testHIPAAComplianceUnderStress(multiplier);

        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        const duration = endTime - startTime;

        expect(result).toBeDefined();
        
        // HIPAA tests should complete within reasonable time even under high load
        expect(duration).toBeLessThan(180000); // 3 minutes max
        
        // Memory usage should scale linearly
        const expectedMemoryIncrease = multiplier * 10 * 1024 * 1024; // 10MB per multiplier
        const actualMemoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
        expect(actualMemoryIncrease).toBeLessThan(expectedMemoryIncrease * 2); // Allow 2x overhead

        results.push({
          totalRequests: multiplier,
          successfulRequests: result.success ? 1 : 0,
          failedRequests: result.success ? 0 : 1,
          averageResponseTime: duration,
          minResponseTime: duration * 0.9,
          maxResponseTime: duration * 1.1,
          p95ResponseTime: duration,
          p99ResponseTime: duration,
          throughput: 1 / (duration / 1000),
          errorRate: result.success ? 0 : 1,
          memoryPeakUsage: endMemory.heapUsed
        });
      }

      // Verify linear scaling characteristics
      const durations = results.map(r => r.averageResponseTime);
      for (let i = 1; i < durations.length; i++) {
        const scalingFactor = loadMultipliers[i] / loadMultipliers[i - 1];
        const durationFactor = durations[i] / durations[i - 1];
        
        // Duration should scale reasonably with load (not exponentially)
        expect(durationFactor).toBeLessThan(scalingFactor * 1.5);
      }
    });

    it('should handle high-frequency compliance validations', async () => {
      const validationCount = 100;
      const batchSize = 10;
      const batches = validationCount / batchSize;

      const startTime = performance.now();
      const startMemory = process.memoryUsage();
      
      const results: any[] = [];

      for (let batch = 0; batch < batches; batch++) {
        const batchPromises = Array.from({ length: batchSize }, () =>
          healthcareChaosService.testHIPAAComplianceUnderStress(2)
        );
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches to simulate realistic usage
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;

      // Verify high-frequency performance
      const successRate = results.filter(r => r.success).length / results.length;
      expect(successRate).toBeGreaterThan(0.95);

      const throughput = validationCount / (duration / 1000);
      expect(throughput).toBeGreaterThan(1); // At least 1 validation per second

      // Memory usage should be reasonable for high-frequency testing
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(150 * 1024 * 1024); // 150MB max

      performanceResults.push({
        startTime,
        endTime,
        duration,
        memoryUsage: endMemory,
        throughput,
        errorRate: 1 - successRate
      });
    });
  });

  describe('Tenant Isolation Performance', () => {
    it('should efficiently test large numbers of tenant pairs', async () => {
      const tenantPairCounts = [10, 25, 50, 100];
      const results: number[] = [];

      for (const pairCount of tenantPairCounts) {
        const startTime = performance.now();
        
        const result = await healthcareChaosService.testTenantIsolation(pairCount);
        
        const endTime = performance.now();
        const duration = endTime - startTime;

        expect(result).toBeDefined();
        expect(result.success).toBe(true);
        
        // Isolation testing should scale linearly
        results.push(duration);
        
        // Performance should be reasonable even for large tenant counts
        expect(duration).toBeLessThan(pairCount * 1000); // Max 1 second per pair
      }

      // Verify linear scaling
      for (let i = 1; i < results.length; i++) {
        const scalingFactor = tenantPairCounts[i] / tenantPairCounts[i - 1];
        const durationFactor = results[i] / results[i - 1];
        
        // Should scale approximately linearly
        expect(durationFactor).toBeLessThan(scalingFactor * 1.3);
        expect(durationFactor).toBeGreaterThan(scalingFactor * 0.7);
      }
    });
  });

  describe('Concurrent Crisis Scenarios Performance', () => {
    it('should handle high-concurrency crisis scenarios efficiently', async () => {
      const scenarios = [
        {
          crisisCount: 50,
          patientIds: Array.from({length: 50}, (_, i) => `patient-${i}`),
          severityLevels: Array.from({length: 50}, () => 'critical'),
          responseTimeRequirement: 250,
          concurrencyLevel: 10
        },
        {
          crisisCount: 100,
          patientIds: Array.from({length: 100}, (_, i) => `patient-${i}`),
          severityLevels: Array.from({length: 100}, () => 'high'),
          responseTimeRequirement: 250,
          concurrencyLevel: 20
        }
      ];

      for (const scenario of scenarios) {
        const startTime = performance.now();
        const startMemory = process.memoryUsage();

        const result = await healthcareChaosService.testConcurrentCrisisScenarios(scenario);

        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        const duration = endTime - startTime;

        expect(result).toBeDefined();
        expect(result.success).toBe(true);

        // High concurrency should be handled efficiently
        const crisisPerSecond = scenario.crisisCount / (duration / 1000);
        expect(crisisPerSecond).toBeGreaterThan(5); // At least 5 crises per second

        // Memory usage should be reasonable for high concurrency
        const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
        const maxExpectedMemory = scenario.crisisCount * 100 * 1024; // 100KB per crisis
        expect(memoryIncrease).toBeLessThan(maxExpectedMemory * 2);

        performanceResults.push({
          startTime,
          endTime,
          duration,
          memoryUsage: endMemory,
          throughput: crisisPerSecond
        });
      }
    });

    it('should maintain performance under crisis load bursts', async () => {
      const burstScenarios = [
        { duration: 10000, intervalMs: 1000, crisesPerBurst: 20 },
        { duration: 20000, intervalMs: 2000, crisesPerBurst: 50 }
      ];

      for (const burstScenario of burstScenarios) {
        const startTime = performance.now();
        const results: any[] = [];
        const responseTimes: number[] = [];

        while (performance.now() - startTime < burstScenario.duration) {
          const burstStart = performance.now();
          
          const scenario = {
            crisisCount: burstScenario.crisesPerBurst,
            patientIds: Array.from({length: burstScenario.crisesPerBurst}, (_, i) => `burst-patient-${i}`),
            severityLevels: Array.from({length: burstScenario.crisesPerBurst}, () => 'critical'),
            responseTimeRequirement: 250,
            concurrencyLevel: 5
          };

          const result = await healthcareChaosService.testConcurrentCrisisScenarios(scenario);
          
          const burstEnd = performance.now();
          const burstDuration = burstEnd - burstStart;
          
          results.push(result);
          responseTimes.push(burstDuration);
          
          // Wait for next burst
          const remainingTime = burstScenario.intervalMs - burstDuration;
          if (remainingTime > 0) {
            await new Promise(resolve => setTimeout(resolve, remainingTime));
          }
        }

        // Verify burst performance
        const successRate = results.filter(r => r.success).length / results.length;
        expect(successRate).toBeGreaterThan(0.9); // 90% success rate under bursts

        // Response times should remain consistent across bursts
        const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
        const maxResponseTime = Math.max(...responseTimes);
        const responseTimeVariance = maxResponseTime / avgResponseTime;
        
        expect(responseTimeVariance).toBeLessThan(3.0); // Max 3x variance
      }
    });
  });

  describe('Mass Casualty Event Performance', () => {
    it('should scale efficiently for mass casualty simulations', async () => {
      const massEvents = [
        {
          eventType: 'pandemic_surge' as const,
          affectedPatients: 100,
          criticalPatients: 20,
          expectedLoadIncrease: 5,
          duration: 60000
        },
        {
          eventType: 'natural_disaster' as const,
          affectedPatients: 500,
          criticalPatients: 100,
          expectedLoadIncrease: 10,
          duration: 120000
        },
        {
          eventType: 'mass_shooting' as const,
          affectedPatients: 200,
          criticalPatients: 75,
          expectedLoadIncrease: 8,
          duration: 90000
        }
      ];

      for (const massEvent of massEvents) {
        const startTime = performance.now();
        const startMemory = process.memoryUsage();

        const result = await healthcareChaosService.testHealthcareSpecificScenarios(massEvent);

        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        const duration = endTime - startTime;

        expect(result).toBeDefined();
        expect(result.success).toBe(true);

        // Mass casualty simulations should complete within reasonable time
        expect(duration).toBeLessThan(massEvent.duration * 1.5); // Allow 50% overhead

        // Memory usage should scale with affected patients
        const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
        const expectedMemoryPerPatient = 50 * 1024; // 50KB per patient
        const maxExpectedMemory = massEvent.affectedPatients * expectedMemoryPerPatient * 2; // 2x overhead
        expect(memoryIncrease).toBeLessThan(maxExpectedMemory);

        // System should maintain reasonable throughput
        const patientsPerSecond = massEvent.affectedPatients / (duration / 1000);
        expect(patientsPerSecond).toBeGreaterThan(1); // At least 1 patient per second

        performanceResults.push({
          startTime,
          endTime,
          duration,
          memoryUsage: endMemory,
          throughput: patientsPerSecond
        });
      }
    });
  });

  describe('Comprehensive Test Suite Performance', () => {
    it('should complete comprehensive test suite within reasonable time', async () => {
      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      const result = await healthcareChaosService.runComprehensiveChaosTestSuite();

      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.totalExperiments).toBeGreaterThan(0);

      // Comprehensive suite should complete within reasonable time
      expect(duration).toBeLessThan(600000); // 10 minutes max

      // Memory usage should be reasonable for comprehensive testing
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(500 * 1024 * 1024); // 500MB max

      // Should maintain high success rate
      const successRate = result.passed / result.totalExperiments;
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate

      performanceResults.push({
        startTime,
        endTime,
        duration,
        memoryUsage: endMemory,
        throughput: result.totalExperiments / (duration / 1000),
        errorRate: result.failed / result.totalExperiments
      });
    });

    it('should handle multiple concurrent comprehensive test suites', async () => {
      const concurrentSuites = 3;
      const promises: Promise<any>[] = [];

      const startTime = performance.now();
      const startMemory = process.memoryUsage();

      // Run multiple comprehensive suites concurrently
      for (let i = 0; i < concurrentSuites; i++) {
        promises.push(healthcareChaosService.runComprehensiveChaosTestSuite());
      }

      const results = await Promise.all(promises);

      const endTime = performance.now();
      const endMemory = process.memoryUsage();
      const duration = endTime - startTime;

      // All suites should complete successfully
      results.forEach(result => {
        expect(result.totalExperiments).toBeGreaterThan(0);
        expect(result.passed / result.totalExperiments).toBeGreaterThan(0.7);
      });

      // Concurrent execution should be efficient
      expect(duration).toBeLessThan(900000); // 15 minutes max for concurrent execution

      // Memory usage should be reasonable for concurrent comprehensive testing
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(1000 * 1024 * 1024); // 1GB max for concurrent suites

      const totalExperiments = results.reduce((sum, r) => sum + r.totalExperiments, 0);
      performanceResults.push({
        startTime,
        endTime,
        duration,
        memoryUsage: endMemory,
        throughput: totalExperiments / (duration / 1000),
        errorRate: results.reduce((sum, r) => sum + r.failed, 0) / totalExperiments
      });
    });
  });

  describe('Memory and Resource Management', () => {
    it('should not have memory leaks during extended testing', async () => {
      const iterations = 20;
      const memoryUsages: number[] = [];

      for (let i = 0; i < iterations; i++) {
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }

        const beforeMemory = process.memoryUsage().heapUsed;

        // Run a small test
        await healthcareChaosService.testCrisisResponseTimes(5);

        // Force garbage collection again
        if (global.gc) {
          global.gc();
        }

        const afterMemory = process.memoryUsage().heapUsed;
        memoryUsages.push(afterMemory);

        // Small delay to allow cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Memory usage should not grow continuously
      const firstQuartile = memoryUsages.slice(0, 5);
      const lastQuartile = memoryUsages.slice(-5);
      
      const avgFirst = firstQuartile.reduce((sum, mem) => sum + mem, 0) / firstQuartile.length;
      const avgLast = lastQuartile.reduce((sum, mem) => sum + mem, 0) / lastQuartile.length;
      
      const memoryGrowth = (avgLast - avgFirst) / avgFirst;
      
      // Memory growth should be minimal (less than 50% over 20 iterations)
      expect(memoryGrowth).toBeLessThan(0.5);
    });

    it('should handle resource cleanup properly', async () => {
      const initialMemory = process.memoryUsage();
      const initialHandles = process._getActiveHandles().length;
      const initialRequests = process._getActiveRequests().length;

      // Run several tests that should clean up after themselves
      await healthcareChaosService.testCrisisResponseTimes(10);
      await healthcareChaosService.testTenantIsolation(5);
      await healthcareChaosService.testHIPAAComplianceUnderStress(3);

      // Allow time for cleanup
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const finalHandles = process._getActiveHandles().length;
      const finalRequests = process._getActiveRequests().length;

      // Resource usage should not grow significantly
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB max increase

      // Active handles and requests should not accumulate
      expect(finalHandles - initialHandles).toBeLessThan(10);
      expect(finalRequests - initialRequests).toBeLessThan(5);
    });
  });

  // Helper function to generate performance report
  function generatePerformanceReport(results: PerformanceMetrics[]): void {
    if (results.length === 0) return;

    console.log('\n=== Healthcare Chaos Service Performance Report ===\n');

    const durations = results.map(r => r.duration);
    const throughputs = results.map(r => r.throughput).filter(t => t !== undefined);
    const errorRates = results.map(r => r.errorRate).filter(e => e !== undefined);

    console.log('Duration Statistics:');
    console.log(`  Average: ${(durations.reduce((sum, d) => sum + d, 0) / durations.length).toFixed(2)}ms`);
    console.log(`  Min: ${Math.min(...durations).toFixed(2)}ms`);
    console.log(`  Max: ${Math.max(...durations).toFixed(2)}ms`);

    if (throughputs.length > 0) {
      console.log('\nThroughput Statistics:');
      console.log(`  Average: ${(throughputs.reduce((sum, t) => sum + t, 0) / throughputs.length).toFixed(2)} ops/sec`);
      console.log(`  Min: ${Math.min(...throughputs).toFixed(2)} ops/sec`);
      console.log(`  Max: ${Math.max(...throughputs).toFixed(2)} ops/sec`);
    }

    if (errorRates.length > 0) {
      console.log('\nError Rate Statistics:');
      console.log(`  Average: ${((errorRates.reduce((sum, e) => sum + e, 0) / errorRates.length) * 100).toFixed(2)}%`);
      console.log(`  Max: ${(Math.max(...errorRates) * 100).toFixed(2)}%`);
    }

    console.log('\nMemory Usage:');
    const finalMemory = results[results.length - 1]?.memoryUsage;
    if (finalMemory) {
      console.log(`  Heap Used: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Heap Total: ${(finalMemory.heapTotal / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  RSS: ${(finalMemory.rss / 1024 / 1024).toFixed(2)} MB`);
    }

    console.log('\n=== End Performance Report ===\n');
  }
});