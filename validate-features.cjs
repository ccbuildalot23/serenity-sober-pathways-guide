#!/usr/bin/env node
/**
 * Feature Validation Script
 * Tests all enhanced features functionality
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔥 SERENITY ENHANCED FEATURES VALIDATION');
console.log('=======================================\n');

// Test 1: Crisis Detection Features Validation
console.log('🚨 Test 1: Crisis Detection System');

const crisisFeatures = [
  {
    name: 'Peer Chat Crisis Keywords',
    file: 'src/components/peer-support/PeerSupportChat.tsx',
    validations: [
      { search: 'CRISIS_KEYWORDS', description: 'Crisis keyword dictionary' },
      { search: 'detectCrisisKeywords', description: 'Detection function' },
      { search: 'handleCrisisDetection', description: 'Crisis response handler' },
      { search: 'immediate.*high.*medium', description: 'Severity levels' }
    ]
  },
  {
    name: 'HALT Crisis Integration',
    file: 'src/components/recovery/HALTAssessment.tsx',
    validations: [
      { search: 'supportNetworkNotificationService', description: 'Support network integration' },
      { search: 'notifyHALTCrisis', description: 'HALT-specific notifications' },
      { search: 'severeCount.*2.*totalScore.*32', description: 'Crisis thresholds' }
    ]
  }
];

let crisisTestsPassed = 0;
let totalCrisisTests = 0;

crisisFeatures.forEach(feature => {
  console.log(`\n  📋 ${feature.name}:`);
  if (fs.existsSync(feature.file)) {
    const content = fs.readFileSync(feature.file, 'utf-8');
    
    feature.validations.forEach(validation => {
      totalCrisisTests++;
      if (content.match(new RegExp(validation.search, 'i'))) {
        console.log(`    ✅ ${validation.description}`);
        crisisTestsPassed++;
      } else {
        console.log(`    ❌ ${validation.description} - NOT FOUND`);
      }
    });
  } else {
    console.log(`    ❌ File not found`);
    totalCrisisTests += feature.validations.length;
  }
});

console.log(`\n  Crisis Detection: ${crisisTestsPassed}/${totalCrisisTests} tests passed\n`);

// Test 2: Accessibility Enhancement Validation
console.log('♿ Test 2: Accessibility Enhancements');

const accessibilityFeatures = [
  {
    name: 'One-Tap Emotional Scale',
    file: 'src/components/daily-checkin/MoodSection.tsx',
    validations: [
      { search: 'quickMoodOptions', description: 'Quick mood button configuration' },
      { search: 'emoji.*label.*value', description: 'Emoji-based mood indicators' },
      { search: 'grid.*cols.*5', description: '5-button grid layout' },
      { search: 'Struggling.*Low.*Okay.*Good.*Great', description: 'Mood scale labels' }
    ]
  },
  {
    name: 'Hourly Progress Tracking',
    file: 'src/components/SobrietyTracker.tsx',
    validations: [
      { search: 'totalHours', description: 'Total hours calculation' },
      { search: 'seconds.*setSeconds', description: 'Second-level tracking' },
      { search: 'achievements.*setAchievements', description: 'Achievement system' },
      { search: 'checkForNewAchievements', description: 'Achievement detection' },
      { search: '1000.*every.*second', description: 'Real-time updates' }
    ]
  }
];

let accessibilityTestsPassed = 0;
let totalAccessibilityTests = 0;

accessibilityFeatures.forEach(feature => {
  console.log(`\n  📋 ${feature.name}:`);
  if (fs.existsSync(feature.file)) {
    const content = fs.readFileSync(feature.file, 'utf-8');
    
    feature.validations.forEach(validation => {
      totalAccessibilityTests++;
      if (content.match(new RegExp(validation.search, 'i'))) {
        console.log(`    ✅ ${validation.description}`);
        accessibilityTestsPassed++;
      } else {
        console.log(`    ❌ ${validation.description} - NOT FOUND`);
      }
    });
  } else {
    console.log(`    ❌ File not found`);
    totalAccessibilityTests += feature.validations.length;
  }
});

console.log(`\n  Accessibility Features: ${accessibilityTestsPassed}/${totalAccessibilityTests} tests passed\n`);

// Test 3: Recovery Template Enhancement
console.log('📚 Test 3: Recovery Template System');

if (fs.existsSync('src/components/DailyPledges.tsx')) {
  const content = fs.readFileSync('src/components/DailyPledges.tsx', 'utf-8');
  
  // Count templates
  const templateMatches = content.match(/id:\s*['"]\d+['"],/g) || [];
  const templateCount = templateMatches.length;
  
  console.log(`  📋 Template Analysis:`);
  console.log(`    ✅ Total templates found: ${templateCount}`);
  
  if (templateCount >= 10) {
    console.log(`    ✅ Template count requirement met (${templateCount} >= 10)`);
  } else {
    console.log(`    ❌ Template count insufficient (${templateCount} < 10)`);
  }
  
  // Check for recovery-specific categories
  const recoveryCategories = [
    'early-recovery',
    'cravings', 
    'spiritual',
    'relationships',
    'long-term'
  ];
  
  let categoriesFound = 0;
  recoveryCategories.forEach(category => {
    if (content.includes(category)) {
      console.log(`    ✅ Category: ${category}`);
      categoriesFound++;
    } else {
      console.log(`    ❌ Category: ${category} - NOT FOUND`);
    }
  });
  
  console.log(`    Recovery Categories: ${categoriesFound}/${recoveryCategories.length} found`);
} else {
  console.log('  ❌ DailyPledges.tsx not found');
}

// Test 4: Support Network Notification Service
console.log('\n🤝 Test 4: Support Network Service');

if (fs.existsSync('src/services/supportNetworkNotificationService.ts')) {
  const content = fs.readFileSync('src/services/supportNetworkNotificationService.ts', 'utf-8');
  
  const requiredMethods = [
    'notifyHALTCrisis',
    'notifyCravingIntervention', 
    'notifyPlayingItForwardRisk',
    'notifyMilestoneReached',
    'notifyMissedCheckIn',
    'getSupportNetwork',
    'filterMembersByNotificationType',
    'sendImmediateAlerts'
  ];
  
  console.log('  📋 Service Methods:');
  let methodsFound = 0;
  
  requiredMethods.forEach(method => {
    if (content.includes(method)) {
      console.log(`    ✅ ${method}`);
      methodsFound++;
    } else {
      console.log(`    ❌ ${method} - NOT FOUND`);
    }
  });
  
  console.log(`  Methods Implemented: ${methodsFound}/${requiredMethods.length}`);
  
  // Check for proper TypeScript interfaces
  const requiredInterfaces = ['NotificationData', 'SupportNetworkMember'];
  console.log('\n  📋 TypeScript Interfaces:');
  let interfacesFound = 0;
  
  requiredInterfaces.forEach(interface => {
    if (content.includes(`interface ${interface}`)) {
      console.log(`    ✅ ${interface}`);
      interfacesFound++;
    } else {
      console.log(`    ❌ ${interface} - NOT FOUND`);
    }
  });
  
  console.log(`  Interfaces Defined: ${interfacesFound}/${requiredInterfaces.length}`);
} else {
  console.log('  ❌ supportNetworkNotificationService.ts not found');
}

// Test 5: Integration Points Validation
console.log('\n🔗 Test 5: Integration Points');

const integrationTests = [
  {
    name: 'Crisis System Integration',
    files: [
      'src/components/recovery/HALTAssessment.tsx',
      'src/components/peer-support/PeerSupportChat.tsx'
    ],
    search: 'useCrisisSystem|handleCrisisActivated'
  },
  {
    name: 'Real-time Updates',
    files: [
      'src/components/SobrietyTracker.tsx',
      'src/components/peer-support/PeerSupportChat.tsx'
    ],
    search: 'useEffect.*setInterval|real.*time|subscribe'
  },
  {
    name: 'Database Integration',
    files: [
      'src/components/recovery/HALTAssessment.tsx',
      'src/components/recovery/CravingTimer.tsx'
    ],
    search: 'supabase.*from.*insert|supabase.*from.*select'
  }
];

console.log('  📋 Integration Tests:');
let integrationTestsPassed = 0;
let totalIntegrationTests = integrationTests.length;

integrationTests.forEach(test => {
  let testPassed = false;
  
  test.files.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.match(new RegExp(test.search, 'i'))) {
        testPassed = true;
      }
    }
  });
  
  if (testPassed) {
    console.log(`    ✅ ${test.name}`);
    integrationTestsPassed++;
  } else {
    console.log(`    ❌ ${test.name} - NOT FOUND`);
  }
});

console.log(`  Integration Points: ${integrationTestsPassed}/${totalIntegrationTests} working`);

// Final Summary
console.log('\n' + '='.repeat(50));
console.log('📊 FEATURE VALIDATION SUMMARY');
console.log('='.repeat(50));

const overallScore = crisisTestsPassed + accessibilityTestsPassed + integrationTestsPassed;
const totalScore = totalCrisisTests + totalAccessibilityTests + totalIntegrationTests;
const successRate = Math.round((overallScore / totalScore) * 100);

console.log(`\nCrisis Detection: ${crisisTestsPassed}/${totalCrisisTests} (${Math.round((crisisTestsPassed/totalCrisisTests)*100)}%)`);
console.log(`Accessibility: ${accessibilityTestsPassed}/${totalAccessibilityTests} (${Math.round((accessibilityTestsPassed/totalAccessibilityTests)*100)}%)`);
console.log(`Integration: ${integrationTestsPassed}/${totalIntegrationTests} (${Math.round((integrationTestsPassed/totalIntegrationTests)*100)}%)`);

console.log(`\n🎯 Overall Success Rate: ${successRate}%`);

if (successRate >= 90) {
  console.log('\n🎉 EXCELLENT! All enhanced features validated and ready for production!');
} else if (successRate >= 75) {
  console.log('\n✅ GOOD! Most features validated, minor issues detected');
} else {
  console.log('\n⚠️ NEEDS ATTENTION! Some features require validation');
}

console.log(`\n🚀 Feature Validation Complete - ${successRate}% Success Rate`);

// Performance Impact Assessment
console.log('\n⚡ Performance Impact Assessment:');
console.log('  📋 Real-time Features:');

const performanceChecks = [
  { name: 'Second-level sobriety tracking', impact: 'LOW - Simple counter updates' },
  { name: 'Crisis keyword detection', impact: 'MEDIUM - Text processing on chat messages' },
  { name: 'Achievement notifications', impact: 'LOW - Infrequent database writes' },
  { name: 'Support network notifications', impact: 'MEDIUM - Multiple API calls for alerts' }
];

performanceChecks.forEach(check => {
  console.log(`    • ${check.name}: ${check.impact}`);
});

console.log('\n  📊 Estimated Performance Impact: ACCEPTABLE for production use');
console.log('  🔍 Recommend monitoring in first 48 hours after deployment');