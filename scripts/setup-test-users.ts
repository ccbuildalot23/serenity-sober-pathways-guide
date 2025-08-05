// Setup Test Users for Authentication Testing
// Creates test accounts for all user types

import { createClient } from '@supabase/supabase-js';

// Use production Supabase instance
const supabaseUrl = "https://tqyiqstpvwztvofrxpuf.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWlxc3Rwdnd6dHZvZnJ4cHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyODIxNzksImV4cCI6MjA2NDg1ODE3OX0.EJPmyjD9cpZDa_PjxKkUiVpKfVmFAFofNSk58Ssqp_8";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test users to create with stronger passwords
const testUsers = [
  {
    email: "test-patient@example.com",
    password: "SecureTestPassword2024!",
    userType: "recovery",
    expectedRole: "patient",
    description: "Test patient user"
  },
  {
    email: "test-provider@example.com", 
    password: "SecureTestPassword2024!",
    userType: "provider",
    expectedRole: "provider",
    description: "Test provider user"
  },
  {
    email: "test-supporter@example.com",
    password: "SecureTestPassword2024!", 
    userType: "supporter",
    expectedRole: "support_member",
    description: "Test supporter user"
  }
];

async function setupTestUsers() {
  console.log('🔧 Setting up test users for authentication testing...\n');
  console.log('=' .repeat(60));

  for (const user of testUsers) {
    console.log(`\n📋 Setting up: ${user.description}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   User Type: ${user.userType}`);
    console.log(`   Expected Role: ${user.expectedRole}`);
    
    try {
      // First, try to sign in to see if user already exists
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });

      if (signInData?.user) {
        console.log(`   ✅ User already exists and can sign in`);
        
        // Test role assignment
        const { data: roleData, error: roleError } = await supabase.rpc('get_current_user_role');
        if (roleData) {
          console.log(`   🎭 Current Role: ${roleData}`);
          if (roleData === user.expectedRole) {
            console.log(`   ✅ Role is correct`);
          } else {
            console.log(`   ⚠️  Role mismatch. Expected: ${user.expectedRole}, Got: ${roleData}`);
          }
        } else {
          console.log(`   ⚠️  Could not fetch role: ${roleError?.message}`);
        }
        
        // Sign out
        await supabase.auth.signOut();
        continue;
      }

      // User doesn't exist, create new account
      console.log(`   🔄 Creating new account...`);
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          data: {
            userType: user.userType
          }
        }
      });

      if (signUpError) {
        console.log(`   ❌ Sign up failed: ${signUpError.message}`);
        continue;
      }

      if (signUpData?.user) {
        console.log(`   ✅ Account created successfully`);
        console.log(`   👤 User ID: ${signUpData.user.id}`);
        
        // In development mode, email confirmation might be auto-enabled
        // Let's try to sign in immediately
        console.log(`   🔄 Testing sign in...`);
        
        const { data: testSignIn, error: testSignInError } = await supabase.auth.signInWithPassword({
          email: user.email,
          password: user.password
        });

        if (testSignInError) {
          console.log(`   ⚠️  Sign in failed (may need email confirmation): ${testSignInError.message}`);
        } else if (testSignIn?.user) {
          console.log(`   ✅ Sign in successful`);
          
          // Test role assignment
          const { data: roleData, error: roleError } = await supabase.rpc('get_current_user_role');
          if (roleData) {
            console.log(`   🎭 Assigned Role: ${roleData}`);
            if (roleData === user.expectedRole) {
              console.log(`   ✅ Role assignment correct`);
            } else {
              console.log(`   ⚠️  Role assignment mismatch. Expected: ${user.expectedRole}, Got: ${roleData}`);
            }
          } else {
            console.log(`   ⚠️  Role assignment failed: ${roleError?.message}`);
          }
          
          // Sign out
          await supabase.auth.signOut();
        }
      } else {
        console.log(`   ❌ Sign up succeeded but no user data returned`);
      }
      
    } catch (error) {
      console.log(`   ❌ Setup failed: ${error}`);
    }
    
    console.log(`   ${'-'.repeat(40)}`);
  }

  console.log(`\n🎉 Test user setup completed!`);
  console.log(`   You can now run the authentication flow test.`);
}

// Run the setup
setupTestUsers().catch(console.error); 