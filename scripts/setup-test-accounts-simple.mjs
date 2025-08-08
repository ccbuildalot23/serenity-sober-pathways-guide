#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test account details
const testAccounts = [
  {
    email: 'test-patient@serenity.com',
    password: 'TestSerenity2024!@#',
    userType: 'recovery',
    role: 'patient',
    fullName: 'Test Patient'
  },
  {
    email: 'test-provider@serenity.com',
    password: 'TestSerenity2024!@#',
    userType: 'provider',
    role: 'provider',
    fullName: 'Dr. Test Provider'
  },
  {
    email: 'test-supporter@serenity.com',
    password: 'TestSerenity2024!@#',
    userType: 'supporter',
    role: 'support_member',
    fullName: 'Test Supporter'
  }
];

async function createTestAccounts() {
  console.log('🚀 Setting up test accounts for Serenity app...\n');
  console.log('Note: This will attempt to sign up accounts. If they already exist, you\'ll see an error.\n');

  for (const account of testAccounts) {
    try {
      console.log(`Creating ${account.role} account: ${account.email}`);
      
      // Try to sign up the user
      const { data, error } = await supabase.auth.signUp({
        email: account.email,
        password: account.password,
        options: {
          data: {
            userType: account.userType,
            role: account.role,
            full_name: account.fullName
          }
        }
      });
      
      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`  ⚠️  User already exists - that's OK!`);
        } else {
          console.error(`  ❌ Error: ${error.message}`);
        }
      } else if (data.user) {
        console.log(`  ✅ Created ${account.role} account successfully`);
        console.log(`  📧 User ID: ${data.user.id}`);
      }
      
      console.log('');
    } catch (error) {
      console.error(`❌ Error processing ${account.email}:`, error.message);
    }
  }
  
  console.log('\n✅ Test account setup attempt complete!');
  console.log('\n📝 Test Credentials to use:');
  console.log('============================');
  testAccounts.forEach(account => {
    console.log(`${account.role.toUpperCase()}:`);
    console.log(`  Email: ${account.email}`);
    console.log(`  Password: ${account.password}`);
    console.log(`  User Type: ${account.userType}`);
    console.log('');
  });
  
  console.log('📌 Note: If accounts already existed, you can still use these credentials to log in.');
  console.log('📌 The user metadata (userType) determines which dashboard they see.');
}

// Run the setup
createTestAccounts().catch(console.error);