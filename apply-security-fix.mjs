import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Supabase credentials from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing required environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function applySecurityFix() {
  console.log('🔐 Applying critical security fix via direct API...\n');

  // The SQL statements to execute
  const sqlStatements = [
    // Drop insecure policy
    `DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles`,
    
    // Create secure insertion policy
    `CREATE POLICY "Secure role insertion"
     ON public.user_roles
     FOR INSERT
     WITH CHECK (
       (auth.uid() = user_id 
        AND role = 'patient'
        AND NOT EXISTS (
          SELECT 1 FROM public.user_roles 
          WHERE user_id = auth.uid()
        ))
       OR
       (auth.jwt() ->> 'role' = 'service_role')
     )`,
    
    // Update role update policy
    `DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles`,
    
    `CREATE POLICY "Restricted role updates"
     ON public.user_roles
     FOR UPDATE
     USING (auth.uid() = user_id)
     WITH CHECK (
       (role != 'provider' OR OLD.role = 'provider')
       AND (user_id = OLD.user_id)
     )`
  ];

  console.log('📝 Attempting to apply fix through Supabase Management API...\n');
  
  // Try using the Supabase Management API
  const projectRef = supabaseUrl.split('.')[0].split('//')[1];
  const accessToken = process.env.SUPABASE_MANAGEMENT_TOKEN;
  
  for (let i = 0; i < sqlStatements.length; i++) {
    const sql = sqlStatements[i];
    const preview = sql.substring(0, 50).replace(/\n/g, ' ');
    console.log(`[${i + 1}/${sqlStatements.length}] ${preview}...`);
    
    try {
      // Try Supabase Management API
      const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql })
      });
      
      if (response.ok) {
        console.log('   ✅ Success');
      } else {
        const error = await response.text();
        console.log(`   ⚠️  API Response: ${response.status} - Will need manual application`);
      }
    } catch (err) {
      console.log(`   ⚠️  Cannot apply via API - ${err.message}`);
    }
  }
  
  console.log('\n📋 Manual Application Instructions:');
  console.log('═══════════════════════════════════\n');
  console.log('The Supabase CLI cannot directly execute SQL on the remote database.');
  console.log('You need to apply the fix manually:\n');
  console.log('1. Open Supabase SQL Editor:');
  console.log(`   ${supabaseUrl.replace('https://', 'https://supabase.com/dashboard/project/').split('.')[0]}/sql/new\n`);
  console.log('2. Copy and paste the contents of APPLY_SECURITY_FIX.sql\n');
  console.log('3. Click "Run" to execute the SQL\n');
  console.log('4. Verify the fix by checking the policies on user_roles table');
}

// Test connection
async function testConnection() {
  console.log('🔍 Testing connection to Supabase...\n');
  
  try {
    // Try to query user_roles to test connection
    const { data, error } = await supabase
      .from('user_roles')
      .select('count')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.log('❌ Connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Connection successful!\n');
    
    // Try to check current policies
    console.log('📊 Attempting to check current policies...\n');
    
    // Note: We can't directly query pg_policy from client SDK
    // This would need to be done through SQL Editor
    console.log('   ℹ️  Policy inspection requires SQL Editor access\n');
    
    return true;
  } catch (err) {
    console.log('❌ Connection error:', err.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║   Supabase Security Fix Application   ║');
  console.log('╚═══════════════════════════════════════╝\n');
  console.log(`Project: ${supabaseUrl.split('.')[0].split('//')[1]}`);
  console.log(`URL: ${supabaseUrl}`);
  console.log('Environment: Production\n');
  console.log('─────────────────────────────────────────\n');
  
  // Test connection first
  const connected = await testConnection();
  
  if (connected) {
    console.log('⚡ Proceeding with security fix application...\n');
  }
  
  // Try to apply fix
  await applySecurityFix();
  
  console.log('\n─────────────────────────────────────────');
  console.log('\n⚠️  IMPORTANT: Due to Supabase security restrictions,');
  console.log('   SQL DDL statements (CREATE/DROP POLICY) must be');
  console.log('   executed through the Supabase Dashboard SQL Editor.');
  console.log('\n✅ The fix has been prepared and is ready to apply.');
  console.log('   Please follow the manual instructions above.');
}

main().catch(console.error);