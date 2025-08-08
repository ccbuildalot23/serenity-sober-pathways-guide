import { CrisisHandler } from './dist/crisis-handler.js';

// Create a crisis handler instance
const crisisHandler = new CrisisHandler();

// Simulate your crisis alert request
const crisisRequest = {
  message: "I'm struggling",
  severity: "high",
  supporter_tiers: [
    {
      tier: "primary",
      contacts: [
        {
          name: "Primary Support Person",
          phone: "+1-555-0100",
          email: "primary.support@example.com",
          relationship: "Sponsor",
          priority: 1
        },
        {
          name: "Backup Primary Support",
          phone: "+1-555-0101",
          email: "backup.primary@example.com",
          relationship: "Therapist",
          priority: 2
        }
      ]
    }
  ]
};

console.log('=== CRISIS ALERT DEMONSTRATION ===\n');
console.log('Sending crisis alert with message: "I\'m struggling"');
console.log('Severity: HIGH ⚠️\n');
console.log('Notifying primary support tier contacts...\n');

// Process the crisis alert
try {
  const response = await crisisHandler.handleCrisisAlert(crisisRequest);
  
  console.log('\n=== RESPONSE ===');
  console.log(`✅ Success: ${response.success}`);
  console.log(`📨 Alerts sent: ${response.alerts_sent}`);
  console.log(`⏰ Timestamp: ${response.timestamp}`);
  console.log(`📊 Escalation level: ${response.escalation_level}`);
  console.log(`\n${response.message}`);
} catch (error) {
  console.error('Error:', error);
}