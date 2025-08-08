import { CrisisHandler } from './dist/crisis-handler.js';

// Create a crisis handler instance
const crisisHandler = new CrisisHandler();

// Simulate the crisis alert request
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

console.log('Sending crisis alert...\n');
console.log('Request:', JSON.stringify(crisisRequest, null, 2));
console.log('\n---Processing---\n');

// Process the crisis alert
const response = await crisisHandler.handleCrisisAlert(crisisRequest);

console.log('\nResponse:', JSON.stringify(response, null, 2));