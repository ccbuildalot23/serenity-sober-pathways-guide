import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { NotificationTestFactory } from '../utils/notification-test-factory';
import { LoadTestRunner } from '../utils/load-test-runner';
import { PerformanceMetrics } from '../utils/performance-metrics';

test.describe('Notification System Load Tests', () => {
  let testHelpers: TestHelpers;
  let testFactory: NotificationTestFactory;
  let loadTestRunner: LoadTestRunner;
  let performanceMetrics: PerformanceMetrics;

  test.beforeAll(async () => {
    testHelpers = new TestHelpers();
    testFactory = new NotificationTestFactory();
    loadTestRunner = new LoadTestRunner();
    performanceMetrics = new PerformanceMetrics();
    
    await testHelpers.setupTestEnvironment();
    await loadTestRunner.initialize();
  });

  test.afterAll(async () => {
    await loadTestRunner.cleanup();
    await testHelpers.cleanup();
  });

  test('should handle high-volume notification scheduling', async () => {
    const testConfig = {
      totalNotifications: 10000,
      concurrentUsers: 100,
      rampUpTime: 30000, // 30 seconds
      testDuration: 300000, // 5 minutes
      targetThroughput: 1000 // notifications per second
    };

    console.log(`Starting load test: ${testConfig.totalNotifications} notifications with ${testConfig.concurrentUsers} concurrent users`);

    const startTime = Date.now();
    
    const loadTestResults = await loadTestRunner.runLoadTest({
      testName: 'high-volume-notification-scheduling',
      config: testConfig,
      scenarioGenerator: () => testFactory.createNotification({
        type: 'load_test_notification',
        channels: ['email'],
        priority: 'normal'
      })
    });

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // Performance assertions
    expect(loadTestResults.totalRequests).toBe(testConfig.totalNotifications);
    expect(loadTestResults.successfulRequests).toBeGreaterThan(testConfig.totalNotifications * 0.99); // 99% success rate
    expect(loadTestResults.averageResponseTime).toBeLessThan(100); // < 100ms average
    expect(loadTestResults.p95ResponseTime).toBeLessThan(250); // < 250ms 95th percentile
    expect(loadTestResults.errorRate).toBeLessThan(0.01); // < 1% error rate
    expect(totalDuration).toBeLessThan(testConfig.testDuration + 30000); // Complete within duration + buffer

    // Throughput validation
    const actualThroughput = loadTestResults.totalRequests / (totalDuration / 1000);
    expect(actualThroughput).toBeGreaterThan(testConfig.targetThroughput * 0.8); // At least 80% of target

    console.log('Load Test Results:', {
      duration: `${totalDuration / 1000}s`,
      throughput: `${actualThroughput.toFixed(2)} req/s`,
      successRate: `${(loadTestResults.successfulRequests / loadTestResults.totalRequests * 100).toFixed(2)}%`,
      avgResponseTime: `${loadTestResults.averageResponseTime}ms`,
      p95ResponseTime: `${loadTestResults.p95ResponseTime}ms`
    });
  });

  test('should maintain performance under sustained load', async () => {
    const sustainedLoadConfig = {
      duration: 600000, // 10 minutes
      constantRate: 500, // 500 notifications per second
      warmupTime: 60000, // 1 minute warmup
      cooldownTime: 60000 // 1 minute cooldown
    };

    const sustainedLoadResults = await loadTestRunner.runSustainedLoad({
      testName: 'sustained-notification-load',
      config: sustainedLoadConfig,
      scenarioGenerator: () => testFactory.createNotification({
        type: 'sustained_load_test',
        channels: ['sms', 'email'],
        priority: 'normal'
      })
    });

    // Performance should not degrade significantly over time
    const degradationThreshold = 1.5; // Max 50% performance degradation
    const performanceDegradation = sustainedLoadResults.endPerformance.averageResponseTime / 
                                  sustainedLoadResults.startPerformance.averageResponseTime;

    expect(performanceDegradation).toBeLessThan(degradationThreshold);
    expect(sustainedLoadResults.memoryLeakDetected).toBe(false);
    expect(sustainedLoadResults.cpuUsage.max).toBeLessThan(80); // Max 80% CPU usage
    expect(sustainedLoadResults.errorRateStability).toBeGreaterThan(0.95); // Error rate should be stable

    console.log('Sustained Load Results:', {
      performanceDegradation: `${((performanceDegradation - 1) * 100).toFixed(2)}%`,
      memoryUsage: `${sustainedLoadResults.memoryUsage.max}MB`,
      cpuUsage: `${sustainedLoadResults.cpuUsage.average}%`,
      errorRateVariance: sustainedLoadResults.errorRateStability
    });
  });

  test('should handle burst traffic scenarios', async () => {
    const burstConfig = {
      baselineRate: 100, // 100 notifications/sec baseline
      burstRate: 2000, // 2000 notifications/sec burst
      burstDuration: 30000, // 30 second bursts
      burstInterval: 120000, // Every 2 minutes
      totalBursts: 5,
      testDuration: 600000 // 10 minutes total
    };

    const burstResults = await loadTestRunner.runBurstTraffic({
      testName: 'burst-traffic-handling',
      config: burstConfig,
      scenarioGenerator: (isBurst: boolean) => testFactory.createNotification({
        type: isBurst ? 'burst_notification' : 'baseline_notification',
        channels: ['email'],
        priority: isBurst ? 'high' : 'normal',
        metadata: { testType: isBurst ? 'burst' : 'baseline' }
      })
    });

    // System should handle bursts without significant failures
    expect(burstResults.burstPerformance.successRate).toBeGreaterThan(0.95);
    expect(burstResults.burstPerformance.p99ResponseTime).toBeLessThan(1000); // 1 second max
    expect(burstResults.recoveryTime).toBeLessThan(10000); // Recover within 10 seconds
    expect(burstResults.queueBacklog.max).toBeLessThan(10000); // Reasonable queue size

    // Baseline performance should not be significantly affected
    const baselineImpact = burstResults.baselinePerformance.degradationDuringBurst;
    expect(baselineImpact).toBeLessThan(0.3); // Less than 30% impact on baseline

    console.log('Burst Traffic Results:', {
      burstSuccessRate: `${(burstResults.burstPerformance.successRate * 100).toFixed(2)}%`,
      burstP99: `${burstResults.burstPerformance.p99ResponseTime}ms`,
      recoveryTime: `${burstResults.recoveryTime}ms`,
      baselineImpact: `${(baselineImpact * 100).toFixed(2)}%`
    });
  });

  test('should scale efficiently with concurrent channels', async () => {
    const multiChannelConfig = {
      notifications: 5000,
      channelCombinations: [
        ['email'],
        ['sms'],
        ['push'],
        ['email', 'sms'],
        ['email', 'push'],
        ['sms', 'push'],
        ['email', 'sms', 'push']
      ],
      concurrency: 50
    };

    const scalingResults = await loadTestRunner.runChannelScalingTest({
      testName: 'multi-channel-scaling',
      config: multiChannelConfig,
      scenarioGenerator: (channels: string[]) => testFactory.createNotification({
        type: 'channel_scaling_test',
        channels,
        priority: 'normal'
      })
    });

    // Performance should scale reasonably with additional channels
    const singleChannelPerf = scalingResults.channelPerformance['email'];
    const multiChannelPerf = scalingResults.channelPerformance['email,sms,push'];
    
    const scalingFactor = multiChannelPerf.averageResponseTime / singleChannelPerf.averageResponseTime;
    expect(scalingFactor).toBeLessThan(3.5); // Should not be more than 3.5x slower for 3 channels

    // All channel combinations should maintain acceptable performance
    Object.values(scalingResults.channelPerformance).forEach(performance => {
      expect(performance.successRate).toBeGreaterThan(0.98);
      expect(performance.averageResponseTime).toBeLessThan(200);
    });

    console.log('Channel Scaling Results:', {
      singleChannelAvg: `${singleChannelPerf.averageResponseTime}ms`,
      tripleChannelAvg: `${multiChannelPerf.averageResponseTime}ms`,
      scalingFactor: `${scalingFactor.toFixed(2)}x`,
      worstPerformingChannels: scalingResults.worstPerformingChannels
    });
  });

  test('should handle database connection pool exhaustion gracefully', async () => {
    const connectionStressConfig = {
      maxConnections: 20, // Limit connection pool
      simultaneousRequests: 100, // Exceed connection limit
      requestDuration: 300000, // 5 minutes
      backpressureThreshold: 1000 // Queue size before backpressure
    };

    const connectionStressResults = await loadTestRunner.runConnectionStressTest({
      testName: 'database-connection-stress',
      config: connectionStressConfig,
      scenarioGenerator: () => testFactory.createNotification({
        type: 'db_stress_test',
        channels: ['email'],
        priority: 'normal'
      })
    });

    // System should handle connection exhaustion gracefully
    expect(connectionStressResults.connectionTimeouts).toBe(0);
    expect(connectionStressResults.backpressureActivated).toBe(true);
    expect(connectionStressResults.gracefulDegradation).toBe(true);
    expect(connectionStressResults.dataIntegrity.corruptedRecords).toBe(0);
    expect(connectionStressResults.recoveryTime).toBeLessThan(30000); // 30 second recovery

    console.log('Connection Stress Results:', {
      maxConnectionsUsed: connectionStressResults.maxConnectionsUsed,
      avgConnectionWaitTime: `${connectionStressResults.avgConnectionWaitTime}ms`,
      backpressureEvents: connectionStressResults.backpressureEvents,
      recoveryTime: `${connectionStressResults.recoveryTime}ms`
    });
  });

  test('should maintain performance during planned failover', async () => {
    const failoverConfig = {
      baselineTraffic: 1000, // notifications per minute
      failoverDuration: 60000, // 1 minute failover
      primaryRecoveryTime: 120000, // 2 minutes to recover
      testDuration: 600000 // 10 minutes total
    };

    const failoverResults = await loadTestRunner.runFailoverTest({
      testName: 'planned-failover-performance',
      config: failoverConfig,
      scenarioGenerator: () => testFactory.createNotification({
        type: 'failover_test',
        channels: ['email', 'sms'],
        priority: 'normal'
      }),
      failoverTrigger: async () => {
        // Simulate planned failover
        await testHelpers.triggerPlannedFailover();
      }
    });

    // Performance during failover should be acceptable
    expect(failoverResults.failoverPerformance.successRate).toBeGreaterThan(0.90);
    expect(failoverResults.failoverPerformance.maxResponseTime).toBeLessThan(5000);
    expect(failoverResults.dataLoss).toBe(0);
    expect(failoverResults.duplicateDeliveries).toBe(0);

    // Recovery should be swift
    expect(failoverResults.recoveryTime).toBeLessThan(failoverConfig.primaryRecoveryTime);
    expect(failoverResults.postRecoveryPerformance.successRate).toBeGreaterThan(0.99);

    console.log('Failover Performance Results:', {
      failoverSuccessRate: `${(failoverResults.failoverPerformance.successRate * 100).toFixed(2)}%`,
      recoveryTime: `${failoverResults.recoveryTime}ms`,
      performanceImpact: `${failoverResults.performanceImpactDuration}ms`,
      dataIntegrity: failoverResults.dataIntegrityScore
    });
  });

  test('should optimize memory usage under high load', async () => {
    const memoryConfig = {
      notifications: 50000,
      batchSize: 1000,
      memoryThreshold: 512, // MB
      garbageCollectionThreshold: 0.8, // 80% memory usage
      monitoringDuration: 600000 // 10 minutes
    };

    const memoryResults = await loadTestRunner.runMemoryStressTest({
      testName: 'memory-optimization',
      config: memoryConfig,
      scenarioGenerator: () => testFactory.createNotification({
        type: 'memory_test',
        channels: ['email'],
        priority: 'normal',
        // Large metadata to test memory handling
        metadata: {
          testData: 'x'.repeat(1024), // 1KB of test data per notification
          timestamp: new Date().toISOString()
        }
      })
    });

    // Memory usage should be optimized
    expect(memoryResults.peakMemoryUsage).toBeLessThan(memoryConfig.memoryThreshold);
    expect(memoryResults.memoryLeaks.detected).toBe(false);
    expect(memoryResults.garbageCollectionEfficiency).toBeGreaterThan(0.8);
    expect(memoryResults.memoryFragmentation).toBeLessThan(0.3);

    // Performance should not degrade due to memory pressure
    expect(memoryResults.performanceImpact.responseTimeDegradation).toBeLessThan(0.5);
    expect(memoryResults.outOfMemoryErrors).toBe(0);

    console.log('Memory Optimization Results:', {
      peakMemory: `${memoryResults.peakMemoryUsage}MB`,
      avgMemory: `${memoryResults.averageMemoryUsage}MB`,
      gcEfficiency: `${(memoryResults.garbageCollectionEfficiency * 100).toFixed(2)}%`,
      memoryFragmentation: `${(memoryResults.memoryFragmentation * 100).toFixed(2)}%`
    });
  });

  test('should handle WebSocket connection scaling', async () => {
    const websocketConfig = {
      simultaneousConnections: 10000,
      messagesPerConnection: 100,
      connectionRampUp: 60000, // 1 minute to establish all connections
      messageRate: 10, // messages per second per connection
      testDuration: 300000 // 5 minutes
    };

    const websocketResults = await loadTestRunner.runWebSocketScalingTest({
      testName: 'websocket-scaling',
      config: websocketConfig,
      messageGenerator: () => testFactory.createNotification({
        type: 'realtime_notification',
        channels: ['websocket'],
        priority: 'normal'
      })
    });

    // WebSocket scaling should be efficient
    expect(websocketResults.successfulConnections).toBeGreaterThan(websocketConfig.simultaneousConnections * 0.95);
    expect(websocketResults.messageDeliveryRate).toBeGreaterThan(0.98);
    expect(websocketResults.averageLatency).toBeLessThan(50); // < 50ms latency
    expect(websocketResults.connectionDrops).toBeLessThan(websocketConfig.simultaneousConnections * 0.01);

    // Resource usage should be reasonable
    expect(websocketResults.memoryPerConnection).toBeLessThan(10); // < 10KB per connection
    expect(websocketResults.cpuUsageIncrease).toBeLessThan(0.5); // < 50% CPU increase

    console.log('WebSocket Scaling Results:', {
      connectionsEstablished: websocketResults.successfulConnections,
      totalMessagesDelivered: websocketResults.totalMessagesDelivered,
      averageLatency: `${websocketResults.averageLatency}ms`,
      memoryPerConnection: `${websocketResults.memoryPerConnection}KB`,
      connectionStability: `${(websocketResults.connectionStability * 100).toFixed(2)}%`
    });
  });

  test('should benchmark against performance baselines', async () => {
    const baselineConfig = {
      testSuites: [
        'single_notification_latency',
        'batch_processing_throughput',
        'channel_delivery_speed',
        'database_query_performance',
        'template_rendering_speed'
      ],
      iterations: 1000,
      warmupIterations: 100
    };

    const benchmarkResults = await loadTestRunner.runPerformanceBaseline({
      testName: 'performance-baseline',
      config: baselineConfig,
      testFactory
    });

    // Performance should meet or exceed established baselines
    const baselines = await performanceMetrics.getPerformanceBaselines();
    
    Object.entries(benchmarkResults.results).forEach(([testSuite, results]) => {
      const baseline = baselines[testSuite];
      if (baseline) {
        expect(results.averageTime).toBeLessThan(baseline.averageTime * 1.1); // Within 10% of baseline
        expect(results.p95Time).toBeLessThan(baseline.p95Time * 1.2); // Within 20% of baseline p95
        expect(results.successRate).toBeGreaterThan(baseline.successRate * 0.99); // Within 1% of baseline success rate
      }
    });

    // Update baselines if performance has improved significantly
    const performanceImprovements = await performanceMetrics.identifyPerformanceImprovements(
      benchmarkResults.results,
      baselines
    );

    if (performanceImprovements.length > 0) {
      console.log('Performance Improvements Detected:', performanceImprovements);
      await performanceMetrics.updateBaselines(benchmarkResults.results);
    }

    console.log('Baseline Benchmark Results:', {
      totalTestSuites: Object.keys(benchmarkResults.results).length,
      overallPerformanceScore: benchmarkResults.overallScore,
      performanceRegression: benchmarkResults.regressionDetected,
      significantImprovements: performanceImprovements.length
    });
  });

  test('should handle resource exhaustion scenarios', async () => {
    const resourceConfig = {
      scenarios: [
        { type: 'cpu_saturation', target: 95 }, // 95% CPU usage
        { type: 'memory_pressure', target: 90 }, // 90% memory usage
        { type: 'disk_io_saturation', target: 1000 }, // 1000 IOPS
        { type: 'network_bandwidth', target: 80 } // 80% network usage
      ],
      testDuration: 300000, // 5 minutes per scenario
      notificationRate: 500 // notifications per second
    };

    const resourceResults = await loadTestRunner.runResourceExhaustionTest({
      testName: 'resource-exhaustion',
      config: resourceConfig,
      scenarioGenerator: () => testFactory.createNotification({
        type: 'resource_stress_test',
        channels: ['email', 'sms'],
        priority: 'normal'
      })
    });

    // System should remain functional under resource pressure
    resourceResults.scenarioResults.forEach(scenario => {
      expect(scenario.systemStability).toBeGreaterThan(0.8); // 80% stability
      expect(scenario.gracefulDegradation).toBe(true);
      expect(scenario.recoveryTime).toBeLessThan(60000); // 1 minute recovery
      expect(scenario.dataCorruption).toBe(false);
    });

    // Overall system resilience should be maintained
    expect(resourceResults.overallResilience).toBeGreaterThan(0.85);
    expect(resourceResults.criticalFailures).toBe(0);

    console.log('Resource Exhaustion Results:', {
      overallResilience: `${(resourceResults.overallResilience * 100).toFixed(2)}%`,
      worstPerformingScenario: resourceResults.worstPerformingScenario,
      averageRecoveryTime: `${resourceResults.averageRecoveryTime}ms`,
      systemStabilityScore: resourceResults.systemStabilityScore
    });
  });
});