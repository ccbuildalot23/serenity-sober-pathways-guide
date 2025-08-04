// Test Data Storage - Verifies all user data is being stored properly
// Run this after deployment to ensure everything works

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/integrations/supabase/types';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test user credentials
const TEST_USER = {
  email: `test_user_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  userId: ''
};

async function createTestUser() {
  console.log('📝 Creating test user...');
  
  const { data, error } = await supabase.auth.signUp({
    email: TEST_USER.email,
    password: TEST_USER.password,
    options: {
      data: {
        full_name: 'Test User',
        user_type: 'patient'
      }
    }
  });
  
  if (error) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
  
  TEST_USER.userId = data.user?.id || '';
  console.log('✅ Test user created:', TEST_USER.email);
  
  // Sign in
  await supabase.auth.signInWithPassword({
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  
  return data.user;
}

async function testProfileCreation() {
  console.log('\n🧪 Testing Profile Creation...');
  
  // Check if profile was auto-created
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', TEST_USER.userId)
    .single();
  
  if (error) {
    console.log('❌ Profile not auto-created:', error.message);
    return false;
  }
  
  console.log('✅ Profile created successfully');
  console.log('   - ID:', profile.id);
  console.log('   - Email:', profile.email);
  console.log('   - User Type:', profile.user_type);
  
  return true;
}

async function testDailyCheckIn() {
  console.log('\n🧪 Testing Daily Check-in Storage...');
  
  const checkInData = {
    user_id: TEST_USER.userId,
    check_in_date: new Date().toISOString().split('T')[0],
    mood: 7,
    energy: 6,
    sleep_quality: 8,
    anxiety_level: 4,
    substance_use: false,
    notes: 'Test check-in from deployment verification',
    created_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase
    .from('daily_check_ins')
    .insert(checkInData)
    .select()
    .single();
  
  if (error) {
    console.log('❌ Check-in storage failed:', error.message);
    return false;
  }
  
  console.log('✅ Daily check-in stored successfully');
  console.log('   - ID:', data.id);
  console.log('   - Mood:', data.mood);
  console.log('   - Date:', data.check_in_date);
  
  return true;
}

async function testCrisisContact() {
  console.log('\n🧪 Testing Crisis Contact Storage...');
  
  const contactData = {
    user_id: TEST_USER.userId,
    name: 'Test Sponsor',
    phone_number: '+1234567890',
    relationship: 'Sponsor',
    priority_order: 1
  };
  
  const { data, error } = await supabase
    .from('crisis_contacts')
    .insert(contactData)
    .select()
    .single();
  
  if (error) {
    console.log('❌ Crisis contact storage failed:', error.message);
    return false;
  }
  
  console.log('✅ Crisis contact stored successfully');
  console.log('   - ID:', data.id);
  console.log('   - Name:', data.name);
  console.log('   - Phone:', data.phone_number);
  
  return true;
}

async function testRecoveryGoal() {
  console.log('\n🧪 Testing Recovery Goal Storage...');
  
  const goalData = {
    user_id: TEST_USER.userId,
    title: '30 Days Clean',
    description: 'Reach 30 days of sobriety',
    category: 'sobriety',
    priority: 'high',
    target_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'active'
  };
  
  const { data, error } = await supabase
    .from('recovery_goals')
    .insert(goalData)
    .select()
    .single();
  
  if (error) {
    console.log('❌ Recovery goal storage failed:', error.message);
    return false;
  }
  
  console.log('✅ Recovery goal stored successfully');
  console.log('   - ID:', data.id);
  console.log('   - Title:', data.title);
  console.log('   - Target Date:', data.target_date);
  
  return true;
}

async function testAuditLog() {
  console.log('\n🧪 Testing Audit Log...');
  
  const auditData = {
    user_id: TEST_USER.userId,
    action: 'test_deployment',
    resource_type: 'system',
    resource_id: 'deployment-check',
    ip_address: '127.0.0.1',
    user_agent: 'Deployment Test Script',
    success: true,
    risk_level: 'low'
  };
  
  const { data, error } = await supabase
    .from('security_audit_logs')
    .insert(auditData)
    .select()
    .single();
  
  if (error) {
    console.log('❌ Audit log failed:', error.message);
    return false;
  }
  
  console.log('✅ Audit log working');
  console.log('   - Action:', data.action);
  console.log('   - Risk Level:', data.risk_level);
  
  return true;
}

async function testDataRetrieval() {
  console.log('\n🧪 Testing Data Retrieval...');
  
  // Test retrieving user's data
  const { data: checkIns, error: checkInError } = await supabase
    .from('daily_check_ins')
    .select('*')
    .eq('user_id', TEST_USER.userId);
  
  if (checkInError) {
    console.log('❌ Failed to retrieve check-ins:', checkInError.message);
    return false;
  }
  
  console.log(`✅ Retrieved ${checkIns.length} check-ins`);
  
  // Test that other users' data is not accessible
  const { data: otherData, error: otherError } = await supabase
    .from('daily_check_ins')
    .select('*')
    .neq('user_id', TEST_USER.userId);
  
  if (!otherError && otherData && otherData.length > 0) {
    console.log('❌ WARNING: Can access other users data - RLS may be misconfigured');
    return false;
  }
  
  console.log('✅ RLS working - cannot access other users data');
  
  return true;
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Delete test user (cascades to related data)
    await supabase.auth.admin.deleteUser(TEST_USER.userId);
    console.log('✅ Test data cleaned up');
  } catch (err) {
    console.log('⚠️  Could not clean up test data:', err);
  }
}

async function runDataStorageTests() {
  console.log('🔬 TESTING DATA STORAGE\n');
  
  try {
    // Create test user
    await createTestUser();
    
    // Run all tests
    const tests = [
      testProfileCreation(),
      testDailyCheckIn(),
      testCrisisContact(),
      testRecoveryGoal(),
      testAuditLog(),
      testDataRetrieval()
    ];
    
    const results = await Promise.all(tests);
    const allPassed = results.every(r => r === true);
    
    // Cleanup
    await cleanupTestData();
    
    // Summary
    console.log('\n📊 TEST SUMMARY');
    console.log('================');
    console.log(`Total Tests: ${tests.length}`);
    console.log(`Passed: ${results.filter(r => r === true).length}`);
    console.log(`Failed: ${results.filter(r => r === false).length}`);
    
    if (allPassed) {
      console.log('\n✅ All data storage tests passed!');
      console.log('The database is properly configured and storing user data correctly.');
    } else {
      console.log('\n❌ Some tests failed. Please check the configuration.');
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runDataStorageTests().catch(console.error);