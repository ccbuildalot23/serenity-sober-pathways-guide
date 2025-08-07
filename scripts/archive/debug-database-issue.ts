// Debug Database Issue
// This script helps identify the exact cause of "Database error saving new user"

import { createClient } from '@supabase/supabase-js';

// Use production Supabase instance
const supabaseUrl = "https://tqyiqstpvwztvofrxpuf.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWlxc3Rwdnd6dHZvZnJ4cHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyODIxNzksImV4cCI6MjA2NDg1ODE3OX0.EJPmyjD9cpZDa_PjxKkUiVpKfVmFAFofNSk58Ssqp_8";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function debugDatabaseIssue() {
  console.log('🔍 Debugging Database Issue\n');
  console.log('=' .repeat(60));

  // Test 1: Check if we can connect to Supabase
  console.log('\n🔌 Test 1: Supabase Connection');
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.log(`   ❌ Connection failed: ${sessionError.message}`);
      return;
    } else {
      console.log(`   ✅ Connection successful`);
      console.log(`   📊 Session: ${sessionData.session ? 'Active' : 'None'}`);
    }
  } catch (error) {
    console.log(`   ❌ Connection exception: ${error}`);
    return;
  }

  // Test 2: Check if required tables exist
  console.log('\n📋 Test 2: Required Tables');
  const requiredTables = ['profiles', 'user_roles', 'audit_logs'];
  
  for (const tableName of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`   ❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`   ✅ ${tableName}: Table exists`);
      }
    } catch (error) {
      console.log(`   ❌ ${tableName}: Exception - ${error}`);
    }
  }

  // Test 3: Check if required functions exist
  console.log('\n⚙️  Test 3: Required Functions');
  const requiredFunctions = ['get_current_user_role', 'handle_new_user'];
  
  for (const functionName of requiredFunctions) {
    try {
      if (functionName === 'get_current_user_role') {
        const { data, error } = await supabase.rpc(functionName);
        if (error) {
          console.log(`   ❌ ${functionName}: ${error.message}`);
        } else {
          console.log(`   ✅ ${functionName}: Function exists`);
        }
      } else {
        // For handle_new_user, we can't test directly, but we can check if it's referenced
        console.log(`   ⚠️  ${functionName}: Cannot test directly (trigger function)`);
      }
    } catch (error) {
      console.log(`   ❌ ${functionName}: Exception - ${error}`);
    }
  }

  // Test 4: Check if app_role enum exists
  console.log('\n🏷️  Test 4: App Role Enum');
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ app_role enum: ${error.message}`);
    } else {
      console.log(`   ✅ app_role enum: Exists`);
    }
  } catch (error) {
    console.log(`   ❌ app_role enum: Exception - ${error}`);
  }

  // Test 5: Try to create a user and capture detailed error
  console.log('\n👤 Test 5: User Creation with Detailed Error');
  try {
    const testEmail = `debug-${Date.now()}@example.com`;
    console.log(`   Creating user: ${testEmail}`);
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: "SecureTestPassword2024!",
      options: {
        data: {
          userType: 'recovery'
        }
      }
    });

    if (error) {
      console.log(`   ❌ Sign up failed:`);
      console.log(`      Message: ${error.message}`);
      console.log(`      Status: ${error.status}`);
      console.log(`      Name: ${error.name}`);
      console.log(`      Stack: ${error.stack}`);
      
      // Try to get more details about the error
      if (error.message.includes('Database error')) {
        console.log(`   🔍 This appears to be a database trigger/function error`);
        console.log(`   💡 Likely causes:`);
        console.log(`      - Conflicting triggers on auth.users table`);
        console.log(`      - Missing or broken handle_new_user() function`);
        console.log(`      - Missing required tables (profiles, user_roles, audit_logs)`);
        console.log(`      - RLS policy issues`);
        console.log(`      - Permission issues with SECURITY DEFINER functions`);
      }
    } else if (data?.user) {
      console.log(`   ✅ User created successfully!`);
      console.log(`   👤 User ID: ${data.user.id}`);
      
      // Test role assignment
      const { data: roleData, error: roleError } = await supabase.rpc('get_current_user_role');
      if (roleError) {
        console.log(`   ❌ Role fetch failed: ${roleError.message}`);
      } else {
        console.log(`   ✅ Role assigned: ${roleData}`);
      }
      
      // Clean up
      await supabase.auth.signOut();
    } else {
      console.log(`   ⚠️  Sign up succeeded but no user data returned`);
    }
    
  } catch (error) {
    console.log(`   ❌ User creation exception: ${error}`);
  }

  // Test 6: Check database logs (if possible)
  console.log('\n📊 Test 6: Database State Check');
  try {
    // Check if we can query the auth.users table structure
    console.log(`   🔍 Checking auth.users table structure...`);
    
    // Try to get a count of existing users
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`   ❌ Cannot query profiles: ${error.message}`);
    } else {
      console.log(`   ✅ Profiles table accessible, ${count} profiles exist`);
    }
    
  } catch (error) {
    console.log(`   ❌ Database state check exception: ${error}`);
  }

  console.log('\n📋 Debug Summary:');
  console.log('   The "Database error saving new user" typically indicates:');
  console.log('   1. Conflicting triggers on auth.users table');
  console.log('   2. Missing or broken handle_new_user() function');
  console.log('   3. Missing required tables or columns');
  console.log('   4. RLS policy conflicts');
  console.log('   5. Permission issues with database functions');
  console.log('\n💡 Solution: Apply the database fix from DATABASE_FIX_INSTRUCTIONS.md');
}

// Run the debug
debugDatabaseIssue().catch(console.error); 