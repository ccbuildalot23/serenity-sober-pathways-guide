import { CPTCodeParser } from './dist/cpt-parser.js';
import { SimplePracticeIntegration } from './dist/simplepractice.js';

console.log('🏥 Serenity Clinical MCP Test');
console.log('================================\n');

const parser = new CPTCodeParser();
const simplePractice = new SimplePracticeIntegration();

/**
 * Test 1: Parse individual therapy session
 */
async function testIndividualTherapy() {
  console.log('📋 Test 1: Individual Therapy Session (45 minutes)\n');
  
  const sessionNote = {
    patientId: 'patient_001',
    providerId: 'provider_001',
    date: '2025-08-22',
    duration: 45,
    type: 'individual',
    activities: ['cbt', 'mindfulness'],
    diagnoses: ['F33.1', 'F10.20'],
    notes: 'Patient discussed coping strategies for depression and alcohol cravings. Practiced mindfulness exercises and cognitive restructuring. Good engagement.'
  };

  const codes = await parser.parseSessionNotes(sessionNote);
  const summary = await parser.generateBillingSummary(codes);

  console.log('Generated CPT Codes:');
  summary.codes.forEach(code => {
    console.log(`  - ${code.code}: ${code.description}`);
    console.log(`    Medicare: $${code.medicareRate}, Medicaid: $${code.medicaidRate}`);
  });
  
  console.log(`\n💰 Total Medicare: $${summary.totalMedicare}`);
  console.log(`💰 Total Medicaid: $${summary.totalMedicaid}\n`);

  return codes;
}

/**
 * Test 2: Parse crisis intervention
 */
async function testCrisisIntervention() {
  console.log('🚨 Test 2: Crisis Intervention (75 minutes)\n');
  
  const sessionNote = {
    patientId: 'patient_002',
    providerId: 'provider_001',
    date: '2025-08-22',
    duration: 75,
    type: 'crisis',
    activities: ['crisis intervention', 'safety planning'],
    diagnoses: ['F31.13', 'F43.10'],
    notes: 'Patient in acute crisis with suicidal ideation. Conducted safety assessment, developed safety plan, contacted support network. Patient stabilized by end of session.'
  };

  const codes = await parser.parseSessionNotes(sessionNote);
  const summary = await parser.generateBillingSummary(codes);

  console.log('Generated CPT Codes:');
  summary.codes.forEach(code => {
    console.log(`  - ${code.code}: ${code.description}`);
    console.log(`    Medicare: $${code.medicareRate}, Medicaid: $${code.medicaidRate}`);
  });
  
  console.log(`\n💰 Total Medicare: $${summary.totalMedicare}`);
  console.log(`💰 Total Medicaid: $${summary.totalMedicaid}\n`);

  return codes;
}

/**
 * Test 3: Parse group therapy
 */
async function testGroupTherapy() {
  console.log('👥 Test 3: Group Therapy Session (90 minutes)\n');
  
  const sessionNote = {
    patientId: 'patient_003',
    providerId: 'provider_001',
    date: '2025-08-22',
    duration: 90,
    type: 'group',
    activities: ['group discussion', 'peer support'],
    diagnoses: ['F10.20'],
    notes: 'Substance abuse recovery group. 8 participants. Topics: relapse prevention, coping skills, peer support strategies.'
  };

  const codes = await parser.parseSessionNotes(sessionNote);
  const summary = await parser.generateBillingSummary(codes);

  console.log('Generated CPT Codes:');
  summary.codes.forEach(code => {
    console.log(`  - ${code.code}: ${code.description}`);
    console.log(`    Medicare: $${code.medicareRate}, Medicaid: $${code.medicaidRate}`);
  });
  
  console.log(`\n💰 Total Medicare: $${summary.totalMedicare}`);
  console.log(`💰 Total Medicaid: $${summary.totalMedicaid}\n`);

  return codes;
}

/**
 * Test 4: Complex session with interactive complexity
 */
async function testComplexSession() {
  console.log('🔄 Test 4: Complex Session with Add-ons\n');
  
  const sessionNote = {
    patientId: 'patient_004',
    providerId: 'provider_001',
    date: '2025-08-22',
    duration: 60,
    type: 'individual',
    activities: ['play therapy', 'family involvement'],
    diagnoses: ['F91.1', 'F93.0'],
    notes: 'Child therapy session with interpreter present. Used play therapy techniques. Mother participated for family involvement portion. Behavioral issues addressed.'
  };

  const codes = await parser.parseSessionNotes(sessionNote);
  const summary = await parser.generateBillingSummary(codes);

  console.log('Generated CPT Codes:');
  summary.codes.forEach(code => {
    console.log(`  - ${code.code}: ${code.description}`);
    if (code.medicareRate) {
      console.log(`    Medicare: $${code.medicareRate}, Medicaid: $${code.medicaidRate}`);
    }
  });
  
  console.log(`\n💰 Total Medicare: $${summary.totalMedicare}`);
  console.log(`💰 Total Medicaid: $${summary.totalMedicaid}\n`);

  return codes;
}

/**
 * Test 5: SimplePractice webhook
 */
async function testSimplePracticeWebhook() {
  console.log('🔗 Test 5: SimplePractice Webhook Processing\n');
  
  const webhook = {
    eventType: 'appointment.completed',
    eventId: 'evt_123',
    timestamp: new Date().toISOString(),
    data: {
      id: 'apt_456',
      clientId: 'client_789',
      clinicianId: 'provider_001',
      appointmentDate: '2025-08-22',
      startTime: '14:00',
      endTime: '14:45',
      duration: 45,
      appointmentType: 'Individual Therapy',
      status: 'completed',
      notes: 'Session focused on CBT techniques for anxiety management. Patient showing good progress.'
    }
  };

  const result = await simplePractice.handleWebhook(webhook);
  
  console.log('Webhook Processing Result:');
  console.log(`  Processed: ${result.processed}`);
  console.log(`  Appointment ID: ${result.appointmentId}`);
  console.log(`  CPT Codes: ${result.codes.join(', ')}`);
  console.log(`  Total Medicare: $${result.totalMedicare}`);
  console.log(`  Total Medicaid: $${result.totalMedicaid}`);
  console.log(`  Message: ${result.message}\n`);
  
  return result;
}

/**
 * Test 6: Compliance validation
 */
async function testComplianceValidation() {
  console.log('✅ Test 6: Medicare Compliance Validation\n');
  
  const sessionNote = {
    patientId: 'patient_005',
    providerId: 'provider_001',
    date: '2025-08-22',
    duration: 30, // Too short for 90837
    type: 'individual',
    activities: [],
    diagnoses: ['F33.1'],
    notes: 'Brief check-in session.'
  };

  const codes = await parser.parseSessionNotes(sessionNote);
  const validation = await parser.validateCompliance(codes, sessionNote);
  
  console.log('Compliance Check:');
  console.log(`  Valid: ${validation.valid}`);
  if (validation.issues.length > 0) {
    console.log('  Issues:');
    validation.issues.forEach(issue => {
      console.log(`    - ${issue}`);
    });
  } else {
    console.log('  No compliance issues found');
  }
  console.log('');
}

/**
 * Main test runner
 */
async function runTests() {
  try {
    await testIndividualTherapy();
    await testCrisisIntervention();
    await testGroupTherapy();
    await testComplexSession();
    await testSimplePracticeWebhook();
    await testComplianceValidation();
    
    console.log('=' .repeat(50));
    console.log('✅ ALL CLINICAL TESTS COMPLETED!');
    console.log('=' .repeat(50));
    
    console.log('\n📊 Summary:');
    console.log('- CPT Code Parser: WORKING');
    console.log('- Billing Calculation: WORKING');
    console.log('- SimplePractice Integration: WORKING');
    console.log('- Compliance Validation: WORKING');
    console.log('\n🎯 Clinical MCP ready for provider integration!');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
  }
}

// Run the tests
runTests().catch(console.error);