// Test script to verify login functionality for all user types
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test users for each type
const testUsers = [
  {
    email: 'test-recovery@example.com',
    password: 'TestSecure#2024!Recovery',
    userType: 'recovery',
    expectedRole: 'patient',
    expectedDashboard: 'PatientDashboard'
  },
  {
    email: 'test-provider@example.com',
    password: 'TestSecure#2024!Provider',
    userType: 'provider',
    expectedRole: 'provider',
    expectedDashboard: 'ProviderDashboard'
  },
  {
    email: 'test-supporter@example.com',
    password: 'TestSecure#2024!Supporter',
    userType: 'supporter',
    expectedRole: 'support_member',
    expectedDashboard: 'SupporterDashboard'
  }
];

async function testUserLogin() {
  console.log('🧪 Testing user login functionality for all user types...\n');

  for (const testUser of testUsers) {
    console.log(`\n📋 Testing ${testUser.userType} user type:`);
    console.log(`   Email: ${testUser.email}`);
    
    try {
      // Try to sign in
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password
      });

      if (signInError) {
        console.log(`   ❌ Sign in failed: ${signInError.message}`);
        
        // Try to sign up if sign in failed
        console.log(`   🔄 Attempting to create new account...`);
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: testUser.email,
          password: testUser.password,
          options: {
            data: {
              userType: testUser.userType
            }
          }
        });

        if (signUpError) {
          console.log(`   ❌ Sign up failed: ${signUpError.message}`);
          continue;
        }

        console.log(`   ✅ Account created successfully`);
        console.log(`   📧 Check email for verification (in development mode, auto-confirmed)`);
        
        // Try to sign in again
        const { data: retrySignIn, error: retryError } = await supabase.auth.signInWithPassword({
          email: testUser.email,
          password: testUser.password
        });

        if (retryError) {
          console.log(`   ❌ Sign in still failed after signup: ${retryError.message}`);
          continue;
        }
      }

      // Get user data
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log(`   ✅ Sign in successful`);
        console.log(`   👤 User ID: ${user.id}`);
        console.log(`   📧 Email: ${user.email}`);
        console.log(`   🏷️  User Type (metadata): ${user.user_metadata?.userType || 'not set'}`);
        
        // Check role assignment
        const { data: roleData, error: roleError } = await supabase.rpc('get_current_user_role');
        if (roleData) {
          console.log(`   🎭 Assigned Role: ${roleData}`);
          console.log(`   ${roleData === testUser.expectedRole ? '✅' : '❌'} Role matches expected: ${testUser.expectedRole}`);
        } else {
          console.log(`   ❌ Could not fetch role: ${roleError?.message}`);
        }
        
        console.log(`   🏠 Expected Dashboard: ${testUser.expectedDashboard}`);
      }

      // Sign out for next test
      await supabase.auth.signOut();
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n\n📊 Test Summary:');
  console.log('- Recovery users should see PatientDashboard');
  console.log('- Provider users should see ProviderDashboard');
  console.log('- Supporter users should see SupporterDashboard');
  console.log('\n✨ If all users can sign in and get correct roles, the fix is working!');
}

// Run the test
testUserLogin().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});