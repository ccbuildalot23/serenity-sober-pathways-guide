import { mcpServiceRegistry } from '../McpServiceRegistry';

/**
 * MCP Integration Test Suite
 * Tests all MCP services and their integration points
 */
export class McpIntegrationTest {
  private registry: typeof mcpServiceRegistry;

  constructor() {
    this.registry = mcpServiceRegistry;
  }

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<TestResults> {
    const results: TestResult[] = [];
    
    console.log('🔬 Starting MCP Integration Tests...\n');
    
    // Test each service
    results.push(await this.testCrisisManagement());
    results.push(await this.testNotifications());
    results.push(await this.testTelemetry());
    results.push(await this.testAISupport());
    results.push(await this.testDataSync());
    results.push(await this.testBatchOperations());
    results.push(await this.testErrorHandling());
    
    // Calculate summary
    const summary = this.calculateSummary(results);
    
    console.log('\n📊 Test Summary:');
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⏭️ Skipped: ${summary.skipped}`);
    console.log(`📈 Success Rate: ${summary.successRate}%\n`);
    
    return {
      results,
      summary,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Test Crisis Management Service
   */
  async testCrisisManagement(): Promise<TestResult> {
    const testName = 'Crisis Management Service';
    console.log(`\n🚨 Testing ${testName}...`);
    
    try {
      // Test sending alert
      const alertResult = await this.registry.executeOperation(
        'crisis',
        'sendAlert',
        {
          userId: 'test-user-001',
          severity: 'medium',
          triggerType: 'manual',
          message: 'Test crisis alert'
        }
      );
      
      if (!alertResult.success) {
        throw new Error('Failed to send crisis alert');
      }
      
      console.log('  ✓ Crisis alert sent successfully');
      
      // Test getting status
      const statusResult = await this.registry.executeOperation(
        'crisis',
        'getStatus',
        { alertId: alertResult.data?.alertId }
      );
      
      if (!statusResult.success) {
        throw new Error('Failed to get alert status');
      }
      
      console.log('  ✓ Alert status retrieved successfully');
      
      return {
        name: testName,
        status: 'passed',
        duration: 100,
        assertions: 2
      };
      
    } catch (error) {
      console.error(`  ✗ ${testName} failed:`, error.message);
      return {
        name: testName,
        status: 'failed',
        error: error.message,
        duration: 0
      };
    }
  }

  /**
   * Test Notification Service
   */
  async testNotifications(): Promise<TestResult> {
    const testName = 'Notification Service';
    console.log(`\n📬 Testing ${testName}...`);
    
    try {
      // Test sending notification
      const notifResult = await this.registry.executeOperation(
        'notifications',
        'send',
        {
          userId: 'test-user-001',
          title: 'Test Notification',
          message: 'This is a test notification',
          channel: 'in_app',
          priority: 5
        }
      );
      
      if (!notifResult.success) {
        throw new Error('Failed to send notification');
      }
      
      console.log('  ✓ Notification sent successfully');
      
      // Test getting stats
      const statsResult = await this.registry.executeOperation(
        'notifications',
        'getStats',
        {}
      );
      
      if (!statsResult.success) {
        throw new Error('Failed to get notification stats');
      }
      
      console.log('  ✓ Notification stats retrieved');
      
      return {
        name: testName,
        status: 'passed',
        duration: 50,
        assertions: 2
      };
      
    } catch (error) {
      console.error(`  ✗ ${testName} failed:`, error.message);
      return {
        name: testName,
        status: 'failed',
        error: error.message,
        duration: 0
      };
    }
  }

  /**
   * Test Telemetry Service
   */
  async testTelemetry(): Promise<TestResult> {
    const testName = 'Telemetry Service';
    console.log(`\n📈 Testing ${testName}...`);
    
    try {
      // Test recording metric
      const recordResult = await this.registry.executeOperation(
        'telemetry',
        'record',
        {
          type: 'test',
          event: 'integration_test',
          service: 'mcp_test',
          value: 42,
          unit: 'ms'
        }
      );
      
      if (!recordResult.success) {
        throw new Error('Failed to record telemetry');
      }
      
      console.log('  ✓ Telemetry metric recorded');
      
      // Test flushing metrics
      const flushResult = await this.registry.executeOperation(
        'telemetry',
        'flush',
        {}
      );
      
      if (!flushResult.success) {
        throw new Error('Failed to flush telemetry');
      }
      
      console.log('  ✓ Telemetry metrics flushed');
      
      return {
        name: testName,
        status: 'passed',
        duration: 30,
        assertions: 2
      };
      
    } catch (error) {
      console.error(`  ✗ ${testName} failed:`, error.message);
      return {
        name: testName,
        status: 'failed',
        error: error.message,
        duration: 0
      };
    }
  }

  /**
   * Test AI Support Service
   */
  async testAISupport(): Promise<TestResult> {
    const testName = 'AI Support Service';
    console.log(`\n🤖 Testing ${testName}...`);
    
    try {
      // Test mood analysis
      const moodResult = await this.registry.executeOperation(
        'aiSupport',
        'analyzeMood',
        {
          userId: 'test-user-001',
          timeRange: 7,
          data: [
            { value: 5, timestamp: Date.now() - 86400000 },
            { value: 6, timestamp: Date.now() - 172800000 },
            { value: 7, timestamp: Date.now() }
          ]
        }
      );
      
      if (!moodResult.success) {
        throw new Error('Failed to analyze mood');
      }
      
      console.log('  ✓ Mood analysis completed');
      
      // Test crisis prediction
      const predictionResult = await this.registry.executeOperation(
        'aiSupport',
        'predictCrisis',
        {
          userId: 'test-user-001',
          indicators: {
            mood: 3,
            sleep: 4,
            social: 2,
            substance: { cravings: 5 }
          },
          history: {}
        }
      );
      
      if (!predictionResult.success) {
        throw new Error('Failed to predict crisis risk');
      }
      
      console.log('  ✓ Crisis risk prediction completed');
      
      return {
        name: testName,
        status: 'passed',
        duration: 150,
        assertions: 2
      };
      
    } catch (error) {
      console.error(`  ✗ ${testName} failed:`, error.message);
      return {
        name: testName,
        status: 'failed',
        error: error.message,
        duration: 0
      };
    }
  }

  /**
   * Test Data Sync Service
   */
  async testDataSync(): Promise<TestResult> {
    const testName = 'Data Sync Service';
    console.log(`\n🔄 Testing ${testName}...`);
    
    try {
      // Test offline data storage
      const storeResult = await this.registry.executeOperation(
        'dataSync',
        'setOfflineData',
        {
          key: 'test-data',
          data: { test: true, timestamp: Date.now() }
        }
      );
      
      if (!storeResult.success) {
        throw new Error('Failed to store offline data');
      }
      
      console.log('  ✓ Offline data stored');
      
      // Test retrieving offline data
      const retrieveResult = await this.registry.executeOperation(
        'dataSync',
        'getOfflineData',
        { key: 'test-data' }
      );
      
      if (!retrieveResult.success) {
        throw new Error('Failed to retrieve offline data');
      }
      
      console.log('  ✓ Offline data retrieved');
      
      return {
        name: testName,
        status: 'passed',
        duration: 40,
        assertions: 2
      };
      
    } catch (error) {
      console.error(`  ✗ ${testName} failed:`, error.message);
      return {
        name: testName,
        status: 'failed',
        error: error.message,
        duration: 0
      };
    }
  }

  /**
   * Test Batch Operations
   */
  async testBatchOperations(): Promise<TestResult> {
    const testName = 'Batch Operations';
    console.log(`\n⚡ Testing ${testName}...`);
    
    try {
      const batchResult = await this.registry.batchExecute([
        {
          service: 'telemetry',
          operation: 'record',
          params: { type: 'batch', event: 'test1' }
        },
        {
          service: 'telemetry',
          operation: 'record',
          params: { type: 'batch', event: 'test2' }
        },
        {
          service: 'telemetry',
          operation: 'record',
          params: { type: 'batch', event: 'test3' }
        }
      ]);
      
      if (batchResult.failed > 0) {
        throw new Error(`${batchResult.failed} operations failed`);
      }
      
      console.log(`  ✓ Batch operations completed (${batchResult.successful}/${batchResult.total})`);
      
      return {
        name: testName,
        status: 'passed',
        duration: 80,
        assertions: 1
      };
      
    } catch (error) {
      console.error(`  ✗ ${testName} failed:`, error.message);
      return {
        name: testName,
        status: 'failed',
        error: error.message,
        duration: 0
      };
    }
  }

  /**
   * Test Error Handling
   */
  async testErrorHandling(): Promise<TestResult> {
    const testName = 'Error Handling';
    console.log(`\n⚠️ Testing ${testName}...`);
    
    try {
      // Test invalid service
      const invalidServiceResult = await this.registry.executeOperation(
        'invalid-service',
        'test',
        {}
      );
      
      if (invalidServiceResult.success) {
        throw new Error('Should have failed for invalid service');
      }
      
      console.log('  ✓ Invalid service handled correctly');
      
      // Test invalid operation
      const invalidOpResult = await this.registry.executeOperation(
        'telemetry',
        'invalid-operation',
        {}
      );
      
      if (invalidOpResult.success) {
        throw new Error('Should have failed for invalid operation');
      }
      
      console.log('  ✓ Invalid operation handled correctly');
      
      // Test with fallback
      const fallbackResult = await this.registry.executeOperation(
        'telemetry',
        'invalid-op',
        {},
        {
          fallback: async () => ({ fallback: true })
        }
      );
      
      if (!fallbackResult.fallback) {
        throw new Error('Fallback not executed');
      }
      
      console.log('  ✓ Fallback mechanism working');
      
      return {
        name: testName,
        status: 'passed',
        duration: 60,
        assertions: 3
      };
      
    } catch (error) {
      console.error(`  ✗ ${testName} failed:`, error.message);
      return {
        name: testName,
        status: 'failed',
        error: error.message,
        duration: 0
      };
    }
  }

  /**
   * Calculate test summary
   */
  private calculateSummary(results: TestResult[]): TestSummary {
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    
    return {
      total: results.length,
      passed,
      failed,
      skipped,
      successRate: Math.round((passed / results.length) * 100)
    };
  }
}

// Types
interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  assertions?: number;
  error?: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  successRate: number;
}

interface TestResults {
  results: TestResult[];
  summary: TestSummary;
  timestamp: string;
}

// Export test runner
export const mcpIntegrationTest = new McpIntegrationTest();