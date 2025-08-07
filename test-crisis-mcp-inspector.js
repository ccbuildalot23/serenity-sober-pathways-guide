#!/usr/bin/env node

/**
 * Test script for Serenity Crisis MCP with MCP Inspector
 * This script simulates various crisis scenarios to test with MCP Inspector
 */

console.log('🚀 Serenity Crisis MCP - Inspector Test Suite');
console.log('============================================\n');

// Test data for different scenarios
const testScenarios = {
  // Critical emergency scenario
  critical: {
    severity: 'critical',
    message: 'User reporting suicidal thoughts and has means available. Immediate intervention required.',
    userId: 'user_critical_001',
    location: '123 Main St, Apartment 4B',
    supporterTiers: [
      {
        tier: 'primary',
        contacts: [
          { name: 'John (Sponsor)', phone: '+1234567890', email: 'sponsor@example.com', relationship: 'Sponsor', priority: 1 },
          { name: 'Dr. Smith', phone: '+1234567891', email: 'therapist@example.com', relationship: 'Therapist', priority: 2 }
        ]
      },
      {
        tier: 'secondary',
        contacts: [
          { name: 'Sarah (Sister)', phone: '+1234567892', email: 'sister@example.com', relationship: 'Family', priority: 1 },
          { name: 'Mike (Friend)', phone: '+1234567893', email: 'friend@example.com', relationship: 'Friend', priority: 2 }
        ]
      },
      {
        tier: 'emergency',
        contacts: [
          { name: 'Crisis Center', phone: '988', email: 'crisis@example.com', relationship: 'Professional', priority: 1 },
          { name: 'Emergency Services', phone: '911', relationship: 'Emergency', priority: 2 }
        ]
      }
    ]
  },

  // High severity - active crisis
  high: {
    severity: 'high',
    message: 'Having severe cravings and at high risk of relapse. Near old dealer location.',
    userId: 'user_high_002',
    location: 'Downtown area, near 5th Avenue',
    supporterTiers: [
      {
        tier: 'primary',
        contacts: [
          { name: 'Maria (Sponsor)', phone: '+1234567894', email: 'maria@example.com', relationship: 'Sponsor', priority: 1 }
        ]
      },
      {
        tier: 'secondary',
        contacts: [
          { name: 'Recovery Group', phone: '+1234567895', email: 'group@example.com', relationship: 'Support Group', priority: 1 }
        ]
      }
    ]
  },

  // Medium severity - struggling
  medium: {
    severity: 'medium',
    message: 'Feeling overwhelmed with anxiety. Need someone to talk to.',
    userId: 'user_medium_003',
    location: 'At home',
    supporterTiers: [
      {
        tier: 'primary',
        contacts: [
          { name: 'Alex (Buddy)', phone: '+1234567896', email: 'alex@example.com', relationship: 'Accountability Partner', priority: 1 }
        ]
      }
    ]
  },

  // Low severity - check-in needed
  low: {
    severity: 'low',
    message: 'Having a tough day but managing. Would appreciate a check-in.',
    userId: 'user_low_004',
    supporterTiers: [
      {
        tier: 'primary',
        contacts: [
          { name: 'Pat (Mentor)', phone: '+1234567897', email: 'pat@example.com', relationship: 'Mentor', priority: 1 }
        ]
      }
    ]
  }
};

// Response tracking scenarios
const responseScenarios = {
  acknowledged: {
    alertId: 'alert_test_001',
    supporterId: 'supporter_001',
    responseType: 'acknowledged',
    message: 'I got your alert. Looking into it.'
  },
  
  madeContact: {
    alertId: 'alert_test_001',
    supporterId: 'supporter_001',
    responseType: 'made_contact',
    message: 'I am with them now. They are safe.',
    location: 'At their apartment'
  },
  
  needsHelp: {
    alertId: 'alert_test_001',
    supporterId: 'supporter_001',
    responseType: 'needs_help',
    message: 'Situation is more serious than I can handle alone.'
  },
  
  emergency: {
    alertId: 'alert_test_001',
    supporterId: 'supporter_001',
    responseType: 'call_911',
    message: 'Medical emergency. Calling 911 now.'
  }
};

// Escalation scenarios
const escalationScenarios = {
  nextTier: {
    alertId: 'alert_test_001',
    escalationType: 'next_tier',
    reason: 'Primary supporters not responding after 5 minutes'
  },
  
  professional: {
    alertId: 'alert_test_001',
    escalationType: 'professional',
    reason: 'User needs professional mental health intervention',
    additionalContacts: [
      { name: 'Crisis Counselor', phone: '988', role: 'Mental Health Professional' }
    ]
  },
  
  emergencyServices: {
    alertId: 'alert_test_001',
    escalationType: 'emergency_services',
    reason: 'Immediate danger to self. Emergency response required.'
  }
};

console.log('📋 Test Scenarios Ready for MCP Inspector:\n');
console.log('1. CRISIS ALERTS (sendCrisisAlert tool):');
console.log('   - Critical: Suicidal ideation scenario');
console.log('   - High: Active addiction crisis');
console.log('   - Medium: Anxiety/struggling');
console.log('   - Low: Check-in request\n');

console.log('2. RESPONSE TRACKING (trackResponse tool):');
console.log('   - Acknowledged: Basic acknowledgment');
console.log('   - Made Contact: Physical presence confirmed');
console.log('   - Needs Help: Escalation needed');
console.log('   - Call 911: Emergency protocol\n');

console.log('3. ESCALATION (escalateSupport tool):');
console.log('   - Next Tier: Move to secondary supporters');
console.log('   - Professional: Engage crisis services');
console.log('   - Emergency: 911 dispatch\n');

console.log('4. STATUS CHECKING (getAlertStatus tool)');
console.log('5. RESOLUTION (resolveAlert tool)\n');

console.log('🔧 MCP Server Configuration:');
console.log('   - Server: serenity-crisis-mcp');
console.log('   - Path: serenity-crisis-mcp/dist/index.js');
console.log('   - Staggered Timing:');
console.log('     • Primary: 30 seconds (15s for critical)');
console.log('     • Secondary: 90 seconds (45s for critical)');
console.log('     • Emergency: 3 minutes (90s for critical)\n');

console.log('📊 Testing Instructions:');
console.log('1. Open MCP Inspector at http://localhost:5173');
console.log('2. Connect to serenity-crisis-mcp server');
console.log('3. Use the test scenarios above with each tool');
console.log('4. Observe staggered timing in action');
console.log('5. Test response coordination flow');
console.log('6. Verify escalation pathways\n');

console.log('💡 Key Testing Points:');
console.log('   - Severity multipliers affect notification timing');
console.log('   - Concurrent notifications within tiers');
console.log('   - Response status updates alert state');
console.log('   - Escalation triggers appropriate actions');
console.log('   - Resources track active alerts and responses\n');

// Export for use in other tests
module.exports = {
  testScenarios,
  responseScenarios,
  escalationScenarios
};

console.log('✅ Test suite ready! Use MCP Inspector to execute these scenarios.');
console.log('🌐 Inspector URL: http://localhost:5173');