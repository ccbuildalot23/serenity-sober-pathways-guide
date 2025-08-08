#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.log('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Test account details
const testAccounts = [
  {
    email: 'test-patient@serenity.com',
    password: 'TestPass123!',
    userType: 'recovery',
    role: 'patient',
    profile: {
      full_name: 'Test Patient',
      recovery_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
      is_anonymous: false,
      preferences: {
        notifications: true,
        crisis_alerts: true,
        daily_reminders: true
      }
    }
  },
  {
    email: 'test-provider@serenity.com',
    password: 'TestPass123!',
    userType: 'provider',
    role: 'provider',
    profile: {
      full_name: 'Dr. Test Provider',
      license_number: 'TEST-12345',
      specialization: 'Addiction Medicine',
      is_approved: true,
      preferences: {
        notifications: true,
        patient_alerts: true,
        appointment_reminders: true
      }
    }
  },
  {
    email: 'test-supporter@serenity.com',
    password: 'TestPass123!',
    userType: 'supporter',
    role: 'support_member',
    profile: {
      full_name: 'Test Supporter',
      relationship: 'Family Member',
      is_verified: true,
      preferences: {
        notifications: true,
        crisis_alerts: true,
        location_sharing: true
      }
    }
  }
];

async function createTestAccounts() {
  console.log('🚀 Setting up test accounts for Serenity app...\n');

  for (const account of testAccounts) {
    try {
      console.log(`Creating ${account.role} account: ${account.email}`);
      
      // Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.getUserByEmail(account.email);
      
      if (existingUser) {
        console.log(`  ⚠️  User already exists, updating metadata...`);
        
        // Update user metadata
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          {
            user_metadata: {
              userType: account.userType,
              role: account.role,
              ...account.profile
            }
          }
        );
        
        if (updateError) {
          console.error(`  ❌ Failed to update user: ${updateError.message}`);
        } else {
          console.log(`  ✅ Updated ${account.role} account successfully`);
        }
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            userType: account.userType,
            role: account.role,
            ...account.profile
          }
        });
        
        if (createError) {
          console.error(`  ❌ Failed to create user: ${createError.message}`);
        } else {
          console.log(`  ✅ Created ${account.role} account successfully`);
          
          // Create profile record
          if (newUser) {
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: newUser.id,
                email: account.email,
                full_name: account.profile.full_name,
                user_type: account.userType,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });
            
            if (profileError) {
              console.error(`  ⚠️  Failed to create profile: ${profileError.message}`);
            } else {
              console.log(`  ✅ Created profile record`);
            }
          }
        }
      }
      
      console.log('');
    } catch (error) {
      console.error(`❌ Error processing ${account.email}:`, error.message);
    }
  }
  
  console.log('\n✅ Test account setup complete!');
  console.log('\n📝 Test Credentials:');
  console.log('====================');
  testAccounts.forEach(account => {
    console.log(`${account.role.toUpperCase()}:`);
    console.log(`  Email: ${account.email}`);
    console.log(`  Password: ${account.password}`);
    console.log('');
  });
}

// Run the setup
createTestAccounts().catch(console.error);