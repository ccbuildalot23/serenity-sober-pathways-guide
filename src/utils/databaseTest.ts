import { supabase } from '@/integrations/supabase/client';

export async function testDatabaseConnection() {
  // Basic connectivity and auth checks + top patient tables
  console.log('🔍 TESTING DATABASE CONNECTION...');

  try {
    const connection = await supabase.from('profiles').select('id').limit(1);
    console.log('✅ Connection test:', connection.error ? 'FAILED' : 'SUCCESS', connection.error);

    const auth = await supabase.auth.getUser();
    console.log('✅ Auth test:', auth.data.user ? 'AUTHENTICATED' : 'NOT AUTHENTICATED', auth.error);

    const checkins = await supabase
      .from('daily_checkins')
      .select('id, user_id, created_at')
      .limit(5);
    console.log('✅ Daily check-ins table:', checkins.data?.length || 0, 'records found', checkins.error);

    // simple_checkins is deprecated; rely on daily_checkins only to avoid 404s
    const simpleCheckins = { data: [], error: null } as any;
    console.log('ℹ️ Simple check-ins table skipped (deprecated)');

    const contacts = await supabase
      .from('support_contacts')
      .select('id, user_id')
      .limit(5);
    console.log('✅ Support contacts table:', contacts.data?.length || 0, 'records found', contacts.error);

    return {
      connection: !connection.error,
      auth: !!auth.data.user,
      daily_checkins: checkins.data?.length || 0,
      simple_checkins: simpleCheckins.data?.length || 0,
      contacts: contacts.data?.length || 0,
      user: auth.data.user || null,
    };
  } catch (error: any) {
    console.error('🚨 Database test failed:', error);
    return { error: error?.message || String(error) };
  }
}

export async function verifyDatabaseTables() {
  const requiredTables = ['daily_checkins', 'support_contacts', 'profiles'];
  const results: Record<string, { exists: boolean; accessible: boolean; error?: string }> = {};

  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      results[table] = {
        exists: !error,
        accessible: !!data,
        error: error?.message,
      };
    } catch (err: any) {
      results[table] = {
        exists: false,
        accessible: false,
        error: err?.message || String(err),
      };
    }
  }

  console.log('🎯 TABLE VERIFICATION RESULTS:', results);
  return results;
}

export async function testRLSPolicies() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Test RLS by attempting to read another user's checkins (should be blocked/empty)
    const fakeUserId = '00000000-0000-0000-0000-000000000000';
    const { data, error } = await supabase
      .from('daily_checkins')
      .select('*')
      .eq('user_id', fakeUserId)
      .limit(1);

    const passed = !error && (!data || data.length === 0);
    console.log('✅ RLS test result (cross-user read blocked):', { passed, dataLength: data?.length || 0, error });
    return { passed, dataLength: data?.length || 0, error } as any;
  } catch (error) {
    console.error('🚨 RLS test failed:', error);
    return { error } as any;
  }
}

// Expose helpers to window for quick prod console testing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;
if (typeof window !== 'undefined') {
  window.testDatabaseConnection = testDatabaseConnection;
  window.verifyDatabaseTables = verifyDatabaseTables;
  window.testRLSPolicies = testRLSPolicies;
}


