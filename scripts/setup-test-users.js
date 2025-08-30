#!/usr/bin/env node

/**
 * Setup Test Users for E2E Testing
 * Creates test users in Supabase with proper roles
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use the actual Supabase URL and service role key (aligned with client.ts)
const supabaseUrl = process.env.SUPABASE_URL || 'https://tqyiqstpvwztvofrxpuf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWlxc3Rwdnd6dHZvZnJ4cHVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI4MjE3OSwiZXhwIjoyMDY0ODU4MTc5fQ.z_BvKSu_P5wZ-RvFxKkUiVpKfVmFAFofNSk58Ssqp_8';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const testUsers = [
  {
    email: 'test-patient@serenity.com',
    password: 'TestSerenity2024!@#',
    role: 'patient',
    profile: {
      full_name: 'Test Patient',
      phone_number: '+15551234567',
      bio: 'Test patient account for E2E testing'
    }
  },
  {
    email: 'test-provider@serenity.com',
    password: 'TestSerenity2024!@#',
    role: 'provider',
    profile: {
      full_name: 'Test Provider',
      phone_number: '+15551234568',
      bio: 'Test provider account for E2E testing'
    }
  },
  {
    email: 'test-supporter@serenity.com',
    password: 'TestSerenity2024!@#',
    role: 'supporter',
    profile: {
      full_name: 'Test Supporter',
      phone_number: '+15551234569',
      bio: 'Test supporter account for E2E testing'
    }
  }
];

async function createTestUser(userData) {
  console.log(`\n🔄 Processing ${userData.email}...`);
  
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', userData.email)
      .single();
    
    if (existingUser) {
      console.log(`  ℹ️ User ${userData.email} already exists`);
      return { success: true, exists: true };
    }
    
    // Create user in auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.profile.full_name
      }
    });
    
    if (authError) {
      if (authError.message?.includes('already registered')) {
        console.log(`  ℹ️ Auth user ${userData.email} already exists`);
        
        // Get the existing user ID
        const { data: users } = await supabase.auth.admin.listUsers();
        const existingAuthUser = users?.users?.find(u => u.email === userData.email);
        
        if (existingAuthUser) {
          // Create profile if it doesn't exist
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: existingAuthUser.id,
              email: userData.email,
              ...userData.profile
            }, {
              onConflict: 'id'
            });
          
          if (!profileError) {
            // Add role
            await supabase
              .from('user_roles')
              .upsert({
                user_id: existingAuthUser.id,
                role: userData.role
              }, {
                onConflict: 'user_id'
              });
            
            console.log(`  ✅ Profile and role updated for ${userData.email}`);
            return { success: true };
          }
        }
      }
      
      console.error(`  ❌ Error creating auth user: ${authError.message}`);
      return { success: false, error: authError.message };
    }
    
    console.log(`  ✅ Auth user created`);
    
    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: userData.email,
        ...userData.profile
      });
    
    if (profileError) {
      console.error(`  ❌ Error creating profile: ${profileError.message}`);
      return { success: false, error: profileError.message };
    }
    
    console.log(`  ✅ Profile created`);
    
    // Add role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: userData.role
      });
    
    if (roleError) {
      console.error(`  ❌ Error adding role: ${roleError.message}`);
      return { success: false, error: roleError.message };
    }
    
    console.log(`  ✅ Role assigned: ${userData.role}`);
    
    return { success: true };
    
  } catch (error) {
    console.error(`  ❌ Unexpected error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function setupTestUsers() {
  console.log('🚀 Setting up test users for Serenity platform');
  console.log('=' .repeat(60));
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log('=' .repeat(60));
  
  const results = {
    success: 0,
    failed: 0,
    exists: 0
  };
  
  for (const user of testUsers) {
    const result = await createTestUser(user);
    
    if (result.success) {
      if (result.exists) {
        results.exists++;
      } else {
        results.success++;
      }
    } else {
      results.failed++;
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Summary:');
  console.log(`  ✅ Created: ${results.success}`);
  console.log(`  ℹ️ Already existed: ${results.exists}`);
  console.log(`  ❌ Failed: ${results.failed}`);
  console.log('=' .repeat(60));
  
  // Test authentication
  console.log('\n🧪 Testing authentication...');
  
  for (const user of testUsers) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password
    });
    
    if (error) {
      console.log(`  ❌ ${user.email}: Login failed - ${error.message}`);
    } else {
      console.log(`  ✅ ${user.email}: Login successful`);
      await supabase.auth.signOut();
    }
  }
  
  console.log('\n✅ Test user setup complete!');
}

// Run the setup
setupTestUsers().catch(console.error);