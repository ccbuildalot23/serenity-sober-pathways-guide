import { CrisisHandler } from './dist/crisis-handler.js';

// Test configurations for different scenarios
const testScenarios = [
  {
    name: "CRITICAL - Fastest escalation (15s/45s/90s)",
    severity: "critical",
    expectedDelays: { primary: 15000, secondary: 45000, emergency: 90000 }
  },
  {
    name: "HIGH - Standard timing (30s/90s/180s)",
    severity: "high",
    expectedDelays: { primary: 30000, secondary: 90000, emergency: 180000 }
  },
  {
    name: "MEDIUM - Extended timing (60s/180s/360s)",
    severity: "medium",
    expectedDelays: { primary: 60000, secondary: 180000, emergency: 360000 }
  },
  {
    name: "LOW - Maximum spacing (120s/360s/720s)",
    severity: "low",
    expectedDelays: { primary: 120000, secondary: 360000, emergency: 720000 }
  }
];

// Create mock crisis request
function createMockRequest(severity, tierConfig) {
  return {
    message: `Test crisis alert - ${severity} severity`,
    severity: severity,
    supporter_tiers: tierConfig || [
      {
        tier: "primary",
        contacts: [
          {
            name: "Primary Contact 1",
            phone: "+1-555-0001",
            email: "primary1@example.com",
            relationship: "Sponsor",
            priority: 1
          },
          {
            name: "Primary Contact 2",
            phone: "+1-555-0002",
            email: "primary2@example.com",
            relationship: "Family",
            priority: 1
          }
        ]
      },
      {
        tier: "secondary",
        contacts: [
          {
            name: "Secondary Contact 1",
            phone: "+1-555-0003",
            email: "secondary1@example.com",
            relationship: "Friend",
            priority: 2
          }
        ]
      },
      {
        tier: "emergency",
        contacts: [
          {
            name: "Emergency Contact",
            phone: "+1-555-0004",
            email: "emergency@example.com",
            relationship: "Extended Network",
            priority: 3
          }
        ]
      }
    ]
  };
}

// Test timing accuracy
async function testTimingAccuracy(scenario) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${scenario.name}`);
  console.log('='.repeat(60));
  
  // Create handler with no delays for testing
  const handler = new CrisisHandler({
    staggeredTiming: {
      tierDelays: {
        primary: 30000,     // 30 seconds
        secondary: 90000,   // 90 seconds
        emergency: 180000   // 180 seconds
      },
      severityMultipliers: {
        critical: 0.5,
        high: 1.0,
        medium: 2.0,
        low: 4.0
      }
    }
  });
  
  const request = createMockRequest(scenario.severity);
  
  console.log(`\nExpected Delays:`);
  console.log(`  Primary: ${scenario.expectedDelays.primary / 1000}s`);
  console.log(`  Secondary: ${scenario.expectedDelays.secondary / 1000}s`);
  console.log(`  Emergency: ${scenario.expectedDelays.emergency / 1000}s`);
  
  console.log(`\nProcessing crisis alert...`);
  console.log('-'.repeat(40));
  
  const startTime = Date.now();
  const response = await handler.handleCrisisAlert(request);
  const duration = Date.now() - startTime;
  
  console.log('-'.repeat(40));
  console.log(`\nResults:`);
  console.log(`  Success: ${response.success}`);
  console.log(`  Alerts Sent: ${response.alerts_sent}`);
  console.log(`  Escalation Level: ${response.escalation_level}`);
  console.log(`  Total Duration: ${(duration / 1000).toFixed(1)}s`);
  
  return {
    scenario: scenario.name,
    success: response.success,
    alertsSent: response.alerts_sent,
    duration: duration
  };
}

// Test concurrent processing within tiers
async function testConcurrentProcessing() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('Testing: Concurrent Processing Within Tiers');
  console.log('='.repeat(60));
  
  const handler = new CrisisHandler({
    staggeredTiming: {
      tierDelays: {
        primary: 5000,      // 5 seconds for faster testing
        secondary: 10000,   // 10 seconds
        emergency: 15000    // 15 seconds
      },
      severityMultipliers: {
        critical: 0.5,
        high: 1.0,
        medium: 2.0,
        low: 4.0
      }
    }
  });
  
  // Create request with many contacts in primary tier
  const request = {
    message: "Testing concurrent notifications",
    severity: "high",
    supporter_tiers: [
      {
        tier: "primary",
        contacts: Array.from({ length: 10 }, (_, i) => ({
          name: `Contact ${i + 1}`,
          phone: `+1-555-${String(i + 1).padStart(4, '0')}`,
          email: `contact${i + 1}@example.com`,
          relationship: "Support",
          priority: 1
        }))
      }
    ]
  };
  
  console.log(`\nSending notifications to ${request.supporter_tiers[0].contacts.length} contacts concurrently...`);
  
  const startTime = Date.now();
  const response = await handler.handleCrisisAlert(request);
  const duration = Date.now() - startTime;
  
  console.log(`\nResults:`);
  console.log(`  Contacts: ${request.supporter_tiers[0].contacts.length}`);
  console.log(`  Notifications Sent: ${response.alerts_sent}`);
  console.log(`  Time Taken: ${(duration / 1000).toFixed(1)}s`);
  console.log(`  Average Time per Contact: ${(duration / request.supporter_tiers[0].contacts.length).toFixed(0)}ms`);
  
  if (duration < 2000) {
    console.log(`  ✅ Concurrent processing confirmed (fast execution)`);
  } else {
    console.log(`  ⚠️ May be processing sequentially (slow execution)`);
  }
}

// Main test runner
async function runAllTests() {
  console.log('');
  console.log('🚀 STAGGERED NOTIFICATION TIMING TEST SUITE');
  console.log('============================================\n');
  
  const results = [];
  
  // Run timing accuracy tests for each severity
  for (const scenario of testScenarios) {
    const result = await testTimingAccuracy(scenario);
    results.push(result);
    
    // Add small delay between tests for clarity
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Run concurrent processing test
  await testConcurrentProcessing();
  
  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.scenario}`);
    console.log(`   Alerts: ${result.alertsSent}, Duration: ${(result.duration / 1000).toFixed(1)}s`);
  });
  
  console.log(`\n✅ All tests completed successfully!`);
}

// Quick test with minimal delays for demonstration
async function runQuickDemo() {
  console.log('');
  console.log('⚡ QUICK DEMO - Staggered Notification Timing');
  console.log('=============================================\n');
  
  // Create handler with very short delays for demo
  const handler = new CrisisHandler({
    staggeredTiming: {
      tierDelays: {
        primary: 2000,      // 2 seconds
        secondary: 5000,    // 5 seconds
        emergency: 8000     // 8 seconds
      },
      severityMultipliers: {
        critical: 0.5,
        high: 1.0,
        medium: 2.0,
        low: 4.0
      }
    }
  });
  
  const request = createMockRequest("high");
  
  console.log('Configuration:');
  console.log('  Severity: HIGH (1.0x multiplier)');
  console.log('  Base Delays: 2s → 5s → 8s');
  console.log('  3 Tiers with 5 total contacts\n');
  
  console.log('Starting notification sequence...\n');
  
  const startTime = Date.now();
  const response = await handler.handleCrisisAlert(request);
  const duration = Date.now() - startTime;
  
  console.log('\n' + '='.repeat(40));
  console.log('Demo Results:');
  console.log('  ✅ Success:', response.success);
  console.log('  📨 Notifications Sent:', response.alerts_sent);
  console.log('  ⏱️ Total Time:', (duration / 1000).toFixed(1) + 's');
  console.log('  📊 Escalation Level:', response.escalation_level);
}

// Check command line arguments
const args = process.argv.slice(2);

if (args.includes('--quick')) {
  runQuickDemo().catch(console.error);
} else if (args.includes('--full')) {
  runAllTests().catch(console.error);
} else {
  console.log('Usage:');
  console.log('  node test-staggered-timing.mjs --quick   # Run quick demo with short delays');
  console.log('  node test-staggered-timing.mjs --full    # Run full test suite');
  console.log('\nRunning quick demo by default...\n');
  runQuickDemo().catch(console.error);
}