/**
 * Quick test script to verify Supabase connection
 * Run with: node test-supabase-connection.js
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase connection...');
console.log('URL:', supabaseUrl ? '✅ Found' : '❌ Missing');
console.log('Key:', supabaseKey ? '✅ Found' : '❌ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Missing environment variables!');
  console.log('Please ensure .env.local contains:');
  console.log('VITE_SUPABASE_URL=your-url');
  console.log('VITE_SUPABASE_ANON_KEY=your-key');
  process.exit(1);
}

try {
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test basic connection by checking auth
  const { data, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('\n❌ Connection failed:', error.message);
  } else {
    console.log('\n✅ Successfully connected to Supabase!');
    console.log('Ready to deploy your MVP!');
  }
} catch (err) {
  console.error('\n❌ Connection error:', err.message);
}