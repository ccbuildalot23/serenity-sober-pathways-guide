import { createClient } from '@supabase/supabase-js';

// This script verifies that the database tables exist and are properly configured
async function verifyDatabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 Verifying database tables...\n');

  const tables = [
    'daily_checkins',
    'support_network_members',
    'support_requests',
    'support_responses',
    'supported_persons'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ Table ${table}: ${error.message}`);
      } else {
        console.log(`✅ Table ${table}: Exists and accessible`);
      }
    } catch (err) {
      console.log(`❌ Table ${table}: ${err.message}`);
    }
  }

  console.log('\n🔍 Checking for sample data...\n');

  // Check for any check-ins
  try {
    const { data: checkins, error } = await supabase
      .from('daily_checkins')
      .select('id, user_id, checkin_date, mood_rating')
      .limit(5);

    if (error) {
      console.log(`❌ Error checking daily_checkins: ${error.message}`);
    } else {
      console.log(`✅ Found ${checkins?.length || 0} check-ins in database`);
      if (checkins && checkins.length > 0) {
        console.log('Sample check-ins:', checkins);
      }
    }
  } catch (err) {
    console.log(`❌ Error checking daily_checkins: ${err.message}`);
  }

  // Check for support network members
  try {
    const { data: members, error } = await supabase
      .from('support_network_members')
      .select('id, user_id, supporter_id, relationship')
      .limit(5);

    if (error) {
      console.log(`❌ Error checking support_network_members: ${error.message}`);
    } else {
      console.log(`✅ Found ${members?.length || 0} support network members in database`);
      if (members && members.length > 0) {
        console.log('Sample members:', members);
      }
    }
  } catch (err) {
    console.log(`❌ Error checking support_network_members: ${err.message}`);
  }

  console.log('\n🔍 Database verification complete!');
}

verifyDatabase().catch(console.error);
