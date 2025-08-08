const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Your Supabase credentials
const supabaseUrl = 'https://tqyiqstpvwztvofrxpuf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWlxc3Rwdnd6dHZvZnJ4cHVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTI4MjE3OSwiZXhwIjoyMDY0ODU4MTc5fQ.HDbZEUEykfX4E45g8KSOUGYnPoIhIEUEsvwDZ56Itsk';

// Create Supabase client with service role key for admin access
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false
  }
});

async function applySecurityFix() {
  console.log('🔐 Applying critical security fix to user_roles table...\n');

  // Read the SQL file
  const sqlFilePath = path.join(__dirname, 'APPLY_SECURITY_FIX.sql');
  const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

  // Split SQL into individual statements (by semicolon followed by newline)
  const statements = sqlContent
    .split(/;\s*\n/)
    .filter(stmt => stmt.trim() && !stmt.trim().startsWith('--'))
    .map(stmt => stmt.trim() + ';');

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip comments and empty statements
    if (!statement || statement.startsWith('--')) continue;

    // Extract first few words for logging
    const preview = statement.substring(0, 50).replace(/\n/g, ' ');
    
    try {
      console.log(`[${i + 1}/${statements.length}] Executing: ${preview}...`);
      
      // Execute the SQL statement using the admin client
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: statement
      }).catch(async (_err) => {
        // If RPC doesn't exist, try direct execution through REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sql_query: statement })
        });
        
        if (!response.ok) {
          // Try alternative approach - direct to database
          return { error: 'RPC not available, use SQL Editor' };
        }
        return response.json();
      });

      if (error) {
        console.error(`   ❌ Error: ${error.message || error}`);
        errorCount++;
        
        // For certain errors, we might want to continue
        if (error.message && error.message.includes('already exists')) {
          console.log('   ⚠️  Object already exists, continuing...');
        }
      } else {
        console.log('   ✅ Success');
        successCount++;
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Successful statements: ${successCount}`);
  console.log(`   ❌ Failed statements: ${errorCount}`);

  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. This might be because:');
    console.log('   1. The fix was already partially applied');
    console.log('   2. Direct SQL execution is not enabled');
    console.log('   3. You need to use the Supabase SQL Editor');
    console.log('\n📝 To apply manually:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/tqyiqstpvwztvofrxpuf/sql/new');
    console.log('   2. Copy the contents of APPLY_SECURITY_FIX.sql');
    console.log('   3. Paste and run in the SQL Editor');
  } else {
    console.log('\n🎉 Security fix successfully applied!');
  }
}

// Alternative: Check current policies
async function checkPolicies() {
  console.log('\n🔍 Checking current RLS policies on user_roles table...\n');
  
  // Query for checking policies (commented out as not currently used)
  // const query = `
  //   SELECT 
  //     polname as policy_name,
  //     polcmd as operation,
  //     pg_get_expr(polqual, polrelid) as using_clause,
  //     pg_get_expr(polwithcheck, polrelid) as with_check_clause
  //   FROM pg_policy 
  //   WHERE polrelid = 'user_roles'::regclass
  //   ORDER BY polname;
  // `;

  const { error } = await supabase
    .from('user_roles')
    .select('*')
    .limit(0); // Just to test connection

  if (error) {
    console.error('Connection test failed:', error.message);
    console.log('\n⚠️  Cannot connect directly. Please use the Supabase SQL Editor.');
    return;
  }

  console.log('✅ Connection successful!');
  console.log('\nNow attempting to apply the security fix...\n');
}

// Run the fix
async function main() {
  console.log('🚀 Supabase Security Fix Tool\n');
  console.log('Project: tqyiqstpvwztvofrxpuf (Serenity1)');
  console.log('Region: us-east-2\n');
  
  // First check connection
  await checkPolicies();
  
  // Then try to apply fix
  await applySecurityFix();
}

main().catch(console.error);