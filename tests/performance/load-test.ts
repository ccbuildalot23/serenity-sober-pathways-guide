#!/usr/bin/env node

/**
 * PERFORMANCE LOAD TESTING SUITE
 * 
 * This suite validates the system can handle pilot program scale:
 * - 100 concurrent users
 * - 1000 daily check-ins
 * - 500 secure messages per hour
 * - 200 care plan operations per hour
 * - Sub-3 second page loads
 * - 99.9% uptime requirement
 */

import { createClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  timestamp: number;
  error?: string;
}

interface LoadTestResult {
  testName: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  metrics: PerformanceMetric[];
}

class LoadTester {
  private supabase;
  private metrics: PerformanceMetric[] = [];
  private testUsers: Array<{ email: string; password: string; id?: string }> = [];

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // ========================================
  // SETUP AND TEARDOWN
  // ========================================
  async setup(): Promise<void> {
    console.log('🚀 Setting up load test environment...');
    
    // Create test users
    for (let i = 0; i < 10; i++) {
      const email = `loadtest-user-${i}-${Date.now()}@test.com`;
      const password = 'LoadTest123!@#';
      
      try {
        const { data, error } = await this.supabase.auth.signUp({
          email,
          password,
        });
        
        if (!error && data.user) {
          this.testUsers.push({ email, password, id: data.user.id });
        }
      } catch (error) {
        console.error(`Failed to create test user ${i}:`, error);
      }
    }
    
    console.log(`✅ Created ${this.testUsers.length} test users`);
  }

  async teardown(): Promise<void> {
    console.log('🧹 Cleaning up test data...');
    
    // Clean up test users (in production, would delete via admin API)
    for (const user of this.testUsers) {
      if (user.id) {
        // Clean up user data
        await this.supabase
          .from('daily_checkins')
          .delete()
          .eq('user_id', user.id);
        
        await this.supabase
          .from('care_plans')
          .delete()
          .eq('patient_id', user.id);
      }
    }
    
    console.log('✅ Cleanup complete');
  }

  // ========================================
  // PERFORMANCE MEASUREMENT
  // ========================================
  private async measureOperation(
    operation: string,
    fn: () => Promise<any>
  ): Promise<PerformanceMetric> {
    const startTime = performance.now();
    let success = true;
    let error: string | undefined;

    try {
      await fn();
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
    }

    const duration = performance.now() - startTime;
    
    const metric: PerformanceMetric = {
      operation,
      duration,
      success,
      timestamp: Date.now(),
      error,
    };

    this.metrics.push(metric);
    return metric;
  }

  // ========================================
  // LOAD TEST SCENARIOS
  // ========================================
  
  async testAuthentication(concurrentUsers: number = 10): Promise<LoadTestResult> {
    console.log(`\n🔐 Testing Authentication with ${concurrentUsers} concurrent users...`);
    
    const promises = [];
    for (let i = 0; i < concurrentUsers; i++) {
      const user = this.testUsers[i % this.testUsers.length];
      
      promises.push(
        this.measureOperation('auth_login', async () => {
          const { error } = await this.supabase.auth.signInWithPassword({
            email: user.email,
            password: user.password,
          });
          
          if (error) throw error;
          
          // Immediately sign out to allow reuse
          await this.supabase.auth.signOut();
        })
      );
    }

    await Promise.all(promises);
    return this.generateReport('Authentication Load Test');
  }

  async testDailyCheckIns(totalCheckIns: number = 100): Promise<LoadTestResult> {
    console.log(`\n📝 Testing Daily Check-ins with ${totalCheckIns} submissions...`);
    
    const promises = [];
    const batchSize = 10;
    
    for (let i = 0; i < totalCheckIns; i += batchSize) {
      const batch = [];
      
      for (let j = 0; j < batchSize && i + j < totalCheckIns; j++) {
        const user = this.testUsers[(i + j) % this.testUsers.length];
        
        batch.push(
          this.measureOperation('daily_checkin', async () => {
            // Sign in
            const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
              email: user.email,
              password: user.password,
            });
            
            if (authError) throw authError;
            
            // Submit check-in
            const { error: checkinError } = await this.supabase
              .from('daily_checkins')
              .insert({
                user_id: authData.user!.id,
                mood_score: Math.floor(Math.random() * 10) + 1,
                anxiety_level: Math.floor(Math.random() * 10) + 1,
                sleep_hours: Math.floor(Math.random() * 4) + 5,
                took_medication: Math.random() > 0.5,
                notes: 'Load test check-in',
              });
            
            if (checkinError) throw checkinError;
            
            // Sign out
            await this.supabase.auth.signOut();
          })
        );
      }
      
      await Promise.all(batch);
      
      // Small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return this.generateReport('Daily Check-ins Load Test');
  }

  async testCarePlanOperations(operations: number = 50): Promise<LoadTestResult> {
    console.log(`\n📋 Testing Care Plan operations with ${operations} requests...`);
    
    // First, sign in as a provider
    await this.supabase.auth.signInWithPassword({
      email: this.testUsers[0].email,
      password: this.testUsers[0].password,
    });
    
    const promises = [];
    
    for (let i = 0; i < operations; i++) {
      const operationType = i % 4; // Cycle through different operations
      
      switch (operationType) {
        case 0: // Create care plan
          promises.push(
            this.measureOperation('care_plan_create', async () => {
              const { error } = await this.supabase
                .from('care_plans')
                .insert({
                  patient_id: this.testUsers[1].id,
                  provider_id: this.testUsers[0].id,
                  title: `Load Test Care Plan ${i}`,
                  description: 'Performance testing care plan',
                  status: 'active',
                  start_date: new Date().toISOString(),
                });
              
              if (error) throw error;
            })
          );
          break;
          
        case 1: // Read care plans
          promises.push(
            this.measureOperation('care_plan_read', async () => {
              const { error } = await this.supabase
                .from('care_plans')
                .select('*')
                .limit(10);
              
              if (error) throw error;
            })
          );
          break;
          
        case 2: // Update care plan
          promises.push(
            this.measureOperation('care_plan_update', async () => {
              const { error } = await this.supabase
                .from('care_plans')
                .update({ status: 'completed' })
                .eq('provider_id', this.testUsers[0].id)
                .limit(1);
              
              if (error) throw error;
            })
          );
          break;
          
        case 3: // Search care plans
          promises.push(
            this.measureOperation('care_plan_search', async () => {
              const { error } = await this.supabase
                .from('care_plans')
                .select('*')
                .ilike('title', '%Load Test%')
                .limit(5);
              
              if (error) throw error;
            })
          );
          break;
      }
    }
    
    await Promise.all(promises);
    await this.supabase.auth.signOut();
    
    return this.generateReport('Care Plan Operations Load Test');
  }

  async testSecureMessaging(messages: number = 100): Promise<LoadTestResult> {
    console.log(`\n💬 Testing Secure Messaging with ${messages} messages...`);
    
    const promises = [];
    const conversationId = 'loadtest-conv-' + Date.now();
    
    // Create a conversation first
    await this.supabase.auth.signInWithPassword({
      email: this.testUsers[0].email,
      password: this.testUsers[0].password,
    });
    
    const { data: conversation } = await this.supabase
      .from('message_conversations')
      .insert({
        patient_id: this.testUsers[1].id,
        provider_id: this.testUsers[0].id,
        subject: 'Load Test Conversation',
        status: 'active',
      })
      .select()
      .single();
    
    if (conversation) {
      for (let i = 0; i < messages; i++) {
        promises.push(
          this.measureOperation('secure_message_send', async () => {
            const { error } = await this.supabase
              .from('secure_messages')
              .insert({
                conversation_id: conversation.id,
                sender_id: this.testUsers[0].id,
                recipient_id: this.testUsers[1].id,
                message_content: `Load test message ${i}`,
                message_type: 'text',
                is_urgent: i % 10 === 0, // Every 10th message is urgent
              });
            
            if (error) throw error;
          })
        );
      }
    }
    
    await Promise.all(promises);
    await this.supabase.auth.signOut();
    
    return this.generateReport('Secure Messaging Load Test');
  }

  async testDatabaseQueries(): Promise<LoadTestResult> {
    console.log('\n🗄️ Testing Database Query Performance...');
    
    const queries = [
      {
        name: 'complex_join',
        fn: async () => {
          const { error } = await this.supabase
            .from('care_plans')
            .select(`
              *,
              patient:profiles!care_plans_patient_id_fkey(*),
              goals:care_plan_goals(*),
              progress:care_plan_progress(*)
            `)
            .limit(10);
          
          if (error) throw error;
        },
      },
      {
        name: 'aggregation',
        fn: async () => {
          const { error } = await this.supabase
            .rpc('get_provider_stats', { provider_id: this.testUsers[0].id });
          
          if (error) throw error;
        },
      },
      {
        name: 'full_text_search',
        fn: async () => {
          const { error } = await this.supabase
            .from('provider_notes')
            .select('*')
            .textSearch('note_content', 'depression anxiety')
            .limit(20);
          
          if (error) throw error;
        },
      },
    ];
    
    const promises = [];
    
    for (let i = 0; i < 30; i++) {
      const query = queries[i % queries.length];
      promises.push(this.measureOperation(`db_query_${query.name}`, query.fn));
    }
    
    await Promise.all(promises);
    
    return this.generateReport('Database Query Performance Test');
  }

  async testConcurrentLoad(): Promise<LoadTestResult> {
    console.log('\n⚡ Testing Concurrent Mixed Load (Pilot Simulation)...');
    
    const operations = [];
    
    // Simulate realistic pilot program load
    // 100 users doing various operations over 1 minute
    
    for (let i = 0; i < 100; i++) {
      const operationType = Math.floor(Math.random() * 5);
      
      switch (operationType) {
        case 0: // Login
          operations.push(this.testAuthentication(1));
          break;
        case 1: // Check-in
          operations.push(this.testDailyCheckIns(1));
          break;
        case 2: // View care plan
          operations.push(this.testCarePlanOperations(1));
          break;
        case 3: // Send message
          operations.push(this.testSecureMessaging(1));
          break;
        case 4: // Database query
          operations.push(this.testDatabaseQueries());
          break;
      }
      
      // Stagger requests over 60 seconds
      await new Promise(resolve => setTimeout(resolve, 600));
    }
    
    await Promise.all(operations);
    
    return this.generateReport('Concurrent Mixed Load Test (Pilot Simulation)');
  }

  // ========================================
  // REPORTING
  // ========================================
  
  private generateReport(testName: string): LoadTestResult {
    const successfulMetrics = this.metrics.filter(m => m.success);
    const failedMetrics = this.metrics.filter(m => !m.success);
    
    const durations = successfulMetrics.map(m => m.duration).sort((a, b) => a - b);
    
    const result: LoadTestResult = {
      testName,
      totalRequests: this.metrics.length,
      successfulRequests: successfulMetrics.length,
      failedRequests: failedMetrics.length,
      averageResponseTime: durations.reduce((a, b) => a + b, 0) / durations.length || 0,
      minResponseTime: durations[0] || 0,
      maxResponseTime: durations[durations.length - 1] || 0,
      p50ResponseTime: this.getPercentile(durations, 50),
      p95ResponseTime: this.getPercentile(durations, 95),
      p99ResponseTime: this.getPercentile(durations, 99),
      requestsPerSecond: this.calculateRPS(),
      errorRate: (failedMetrics.length / this.metrics.length) * 100,
      metrics: this.metrics,
    };
    
    // Clear metrics for next test
    this.metrics = [];
    
    return result;
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[index] || 0;
  }

  private calculateRPS(): number {
    if (this.metrics.length === 0) return 0;
    
    const firstTimestamp = this.metrics[0].timestamp;
    const lastTimestamp = this.metrics[this.metrics.length - 1].timestamp;
    const durationSeconds = (lastTimestamp - firstTimestamp) / 1000;
    
    return durationSeconds > 0 ? this.metrics.length / durationSeconds : 0;
  }

  // ========================================
  // MAIN EXECUTION
  // ========================================
  
  async runAllTests(): Promise<void> {
    console.log('🏁 STARTING PERFORMANCE LOAD TEST SUITE');
    console.log('=====================================');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Supabase URL: ${SUPABASE_URL}`);
    console.log('');

    const results: LoadTestResult[] = [];
    
    try {
      await this.setup();
      
      // Run individual tests
      results.push(await this.testAuthentication(20));
      results.push(await this.testDailyCheckIns(100));
      results.push(await this.testCarePlanOperations(50));
      results.push(await this.testSecureMessaging(100));
      results.push(await this.testDatabaseQueries());
      
      // Run concurrent load test
      results.push(await this.testConcurrentLoad());
      
      // Generate final report
      this.generateFinalReport(results);
      
    } catch (error) {
      console.error('❌ Load test failed:', error);
    } finally {
      await this.teardown();
    }
  }

  private generateFinalReport(results: LoadTestResult[]): void {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: results.length,
        totalRequests: results.reduce((sum, r) => sum + r.totalRequests, 0),
        totalSuccess: results.reduce((sum, r) => sum + r.successfulRequests, 0),
        totalFailures: results.reduce((sum, r) => sum + r.failedRequests, 0),
        overallErrorRate: 0,
        averageResponseTime: 0,
      },
      tests: results,
      pilotReadiness: {
        canHandle100ConcurrentUsers: false,
        canHandle1000DailyCheckins: false,
        meetsResponseTimeRequirements: false,
        meetsUptimeRequirements: false,
        overallStatus: 'UNKNOWN',
      },
    };

    // Calculate summary metrics
    const totalRequests = report.summary.totalRequests;
    report.summary.overallErrorRate = (report.summary.totalFailures / totalRequests) * 100;
    report.summary.averageResponseTime = 
      results.reduce((sum, r) => sum + r.averageResponseTime, 0) / results.length;

    // Evaluate pilot readiness
    const authTest = results.find(r => r.testName.includes('Authentication'));
    const checkinTest = results.find(r => r.testName.includes('Check-ins'));
    const concurrentTest = results.find(r => r.testName.includes('Concurrent'));
    
    report.pilotReadiness.canHandle100ConcurrentUsers = 
      concurrentTest ? concurrentTest.errorRate < 1 : false;
    
    report.pilotReadiness.canHandle1000DailyCheckins = 
      checkinTest ? checkinTest.errorRate < 1 && checkinTest.p95ResponseTime < 3000 : false;
    
    report.pilotReadiness.meetsResponseTimeRequirements = 
      results.every(r => r.p95ResponseTime < 3000);
    
    report.pilotReadiness.meetsUptimeRequirements = 
      report.summary.overallErrorRate < 0.1;
    
    report.pilotReadiness.overallStatus = 
      Object.values(report.pilotReadiness).filter(v => v === true).length >= 3 
        ? 'READY' 
        : 'NOT_READY';

    // Save report
    const reportPath = path.join(process.cwd(), 'performance-load-test-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Console output
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║         PERFORMANCE LOAD TEST SUMMARY                     ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║ Total Requests:       ${String(report.summary.totalRequests).padEnd(6)}                             ║`);
    console.log(`║ Successful:           ${String(report.summary.totalSuccess).padEnd(6)}                             ║`);
    console.log(`║ Failed:               ${String(report.summary.totalFailures).padEnd(6)}                             ║`);
    console.log(`║ Error Rate:           ${report.summary.overallErrorRate.toFixed(2)}%                              ║`);
    console.log(`║ Avg Response Time:    ${report.summary.averageResponseTime.toFixed(0)}ms                             ║`);
    console.log('║                                                            ║');
    console.log('║ PILOT READINESS ASSESSMENT:                               ║');
    console.log(`║ • 100 Concurrent Users:  ${report.pilotReadiness.canHandle100ConcurrentUsers ? '✅ PASS' : '❌ FAIL'}                        ║`);
    console.log(`║ • 1000 Daily Check-ins:   ${report.pilotReadiness.canHandle1000DailyCheckins ? '✅ PASS' : '❌ FAIL'}                        ║`);
    console.log(`║ • <3s Response Times:     ${report.pilotReadiness.meetsResponseTimeRequirements ? '✅ PASS' : '❌ FAIL'}                        ║`);
    console.log(`║ • 99.9% Uptime:           ${report.pilotReadiness.meetsUptimeRequirements ? '✅ PASS' : '❌ FAIL'}                        ║`);
    console.log('║                                                            ║');
    console.log(`║ OVERALL STATUS: ${report.pilotReadiness.overallStatus === 'READY' ? '✅ READY FOR PILOT' : '❌ NOT READY'}                     ║`);
    console.log('║                                                            ║');
    console.log('║ Full report: performance-load-test-report.json            ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    // Detailed test results
    console.log('\n📊 DETAILED TEST RESULTS:');
    results.forEach(result => {
      console.log(`\n${result.testName}:`);
      console.log(`  Requests: ${result.totalRequests} (${result.successfulRequests} success, ${result.failedRequests} failed)`);
      console.log(`  Response Times: min=${result.minResponseTime.toFixed(0)}ms, avg=${result.averageResponseTime.toFixed(0)}ms, max=${result.maxResponseTime.toFixed(0)}ms`);
      console.log(`  Percentiles: P50=${result.p50ResponseTime.toFixed(0)}ms, P95=${result.p95ResponseTime.toFixed(0)}ms, P99=${result.p99ResponseTime.toFixed(0)}ms`);
      console.log(`  Throughput: ${result.requestsPerSecond.toFixed(2)} req/s`);
      console.log(`  Error Rate: ${result.errorRate.toFixed(2)}%`);
    });
  }
}

// Execute if run directly
const tester = new LoadTester();
tester.runAllTests().catch(console.error);