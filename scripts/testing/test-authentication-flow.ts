// Comprehensive Authentication Flow Test
// Tests all major use cases for returning user sign-in

import { createClient } from '@supabase/supabase-js';

// Use production Supabase instance
const supabaseUrl = "https://tqyiqstpvwztvofrxpuf.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWlxc3Rwdnd6dHZvZnJ4cHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyODIxNzksImV4cCI6MjA2NDg1ODE3OX0.EJPmyjD9cpZDa_PjxKkUiVpKfVmFAFofNSk58Ssqp_8";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test scenarios for returning users
const testScenarios = [
  {
    name: "Valid Patient User",
    email: "test-patient@example.com",
    password: "SecureTestPassword2024!",
    userType: "recovery",
    expectedRole: "patient",
    description: "Patient user with valid credentials"
  },
  {
    name: "Valid Provider User", 
    email: "test-provider@example.com",
    password: "SecureTestPassword2024!",
    userType: "provider",
    expectedRole: "provider",
    description: "Provider user with valid credentials"
  },
  {
    name: "Valid Supporter User",
    email: "test-supporter@example.com", 
    password: "SecureTestPassword2024!",
    userType: "supporter",
    expectedRole: "support_member",
    description: "Supporter user with valid credentials"
  },
  {
    name: "Invalid Password",
    email: "test-patient@example.com",
    password: "WrongPassword2024!",
    userType: "recovery",
    expectedError: "Invalid login credentials",
    description: "Valid email with wrong password"
  },
  {
    name: "Non-existent User",
    email: "nonexistent@example.com",
    password: "SecureTestPassword2024!",
    userType: "recovery", 
    expectedError: "Invalid login credentials",
    description: "Email that doesn't exist in the system"
  },
  {
    name: "Empty Email",
    email: "",
    password: "SecureTestPassword2024!",
    userType: "recovery",
    expectedError: "missing email or phone",
    description: "Empty email field"
  },
  {
    name: "Invalid Email Format",
    email: "invalid-email",
    password: "SecureTestPassword2024!",
    userType: "recovery",
    expectedError: "Invalid login credentials", 
    description: "Email without proper format"
  }
];

async function testAuthenticationFlow() {
  console.log('🧪 Testing Authentication Flow for Returning Users\n');
  console.log('=' .repeat(60));

  let passedTests = 0;
  let totalTests = testScenarios.length;

  for (const scenario of testScenarios) {
    console.log(`\n📋 Test: ${scenario.name}`);
    console.log(`   Description: ${scenario.description}`);
    console.log(`   Email: ${scenario.email}`);
    
    try {
      // Test sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: scenario.email,
        password: scenario.password
      });

      if (scenario.expectedError) {
        // This scenario should fail
        if (error && error.message?.toLowerCase().includes(scenario.expectedError.toLowerCase())) {
          console.log(`   ✅ Expected error occurred: ${error.message}`);
          passedTests++;
        } else if (error) {
          console.log(`   ❌ Unexpected error: ${error.message}`);
          console.log(`   Expected: ${scenario.expectedError}`);
        } else {
          console.log(`   ❌ Expected error but sign in succeeded`);
        }
      } else {
        // This scenario should succeed
        if (error) {
          console.log(`   ❌ Sign in failed: ${error.message}`);
        } else if (data?.user) {
          console.log(`   ✅ Sign in successful`);
          console.log(`   👤 User ID: ${data.user.id}`);
          console.log(`   📧 Email: ${data.user.email}`);
          console.log(`   🏷️  User Type: ${data.user.user_metadata?.userType || 'not set'}`);
          
          // Test role assignment
          try {
            const { data: roleData, error: roleError } = await supabase.rpc('get_current_user_role');
            
            if (roleError) {
              console.log(`   ⚠️  Role fetch failed: ${roleError.message}`);
            } else if (roleData) {
              console.log(`   🎭 Assigned Role: ${roleData}`);
              if (roleData === scenario.expectedRole) {
                console.log(`   ✅ Role matches expected: ${scenario.expectedRole}`);
                passedTests++;
              } else {
                console.log(`   ❌ Role mismatch. Expected: ${scenario.expectedRole}, Got: ${roleData}`);
              }
            } else {
              console.log(`   ⚠️  No role data returned`);
            }
          } catch (roleError) {
            console.log(`   ⚠️  Role determination failed: ${roleError}`);
          }
          
          // Sign out after successful test
          await supabase.auth.signOut();
        } else {
          console.log(`   ❌ Sign in succeeded but no user data returned`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Test exception: ${error}`);
    }
    
    console.log(`   ${'-'.repeat(40)}`);
  }

  console.log(`\n📊 Test Results:`);
  console.log(`   Passed: ${passedTests}/${totalTests}`);
  console.log(`   Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log(`\n🎉 All authentication tests passed!`);
    console.log(`   ✅ Returning users can sign in without errors`);
  } else {
    console.log(`\n⚠️  Some tests failed. Please review the issues above.`);
  }
}

// Run the test
testAuthenticationFlow().catch(console.error); 