import { supabase } from '@/integrations/supabase/client';
import { testDatabaseConnection } from './databaseTest';

// Lightweight wrappers so we can reuse app services without circular UI imports
async function loadDashboardDataInternal() {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error('User not authenticated');

  const { data: checkIns } = await supabase
    .from('daily_checkins')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const { data: contacts } = await supabase
    .from('support_contacts')
    .select('*')
    .eq('user_id', user.id);

  const streak = calculateStreak(checkIns || []);
  return {
    totalCheckIns: checkIns?.length || 0,
    supportNetworkCount: contacts?.length || 0,
    currentStreak: streak,
    lastCheckIn: checkIns?.[0]?.created_at || null,
    recentCheckIns: (checkIns || []).slice(0, 5),
  };
}

function calculateStreak(checkIns: Array<{ created_at?: string }>) {
  if (!checkIns || checkIns.length === 0) return 0;
  const sorted = [...checkIns].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < sorted.length; i++) {
    const checkInDate = new Date(sorted[i].created_at || 0);
    const daysDiff = Math.floor((today.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff === streak) streak++; else break;
  }
  return streak;
}

async function handleCheckInSubmissionInternal() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const now = new Date();
  const record = {
    user_id: user.id,
    checkin_date: now.toISOString().slice(0, 10),
    mood_rating: 4,
    energy_rating: 4,
    hope_rating: 4,
    sobriety_confidence: 4,
    recovery_importance: 4,
    recovery_strength: 4,
    support_needed: 'no',
    phq2_q1_response: 0,
    phq2_q2_response: 0,
    phq2_score: 0,
    gad2_q1_response: 0,
    gad2_q2_response: 0,
    gad2_score: 0,
    completed_sections: JSON.stringify(['mood', 'wellness']),
    is_complete: true,
    notes: 'Automated patient journey test',
  } as any;

  const { data, error } = await supabase
    .from('daily_checkins')
    .upsert(record, { onConflict: 'user_id,checkin_date', ignoreDuplicates: false })
    .select('*')
    .single();
  if (error) throw error;
  return { success: true, data };
}

async function addSupportContactInternal() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const { data, error } = await supabase
    .from('support_contacts')
    .insert({
      user_id: user.id,
      _name: 'Test Contact',
      _phone_number: '+15550123',
      _relationship: 'friend',
      _priority_order: 1,
    })
    .select('*')
    .single();
  if (error) throw error;
  return { success: true, data };
}

export async function testCompletePatientJourney() {
  console.log('🎯 STARTING COMPLETE PATIENT JOURNEY TEST...');
  const results = {
    auth: false,
    dashboard: false,
    checkIn: false,
    supportNetwork: false,
    dataPersist: false,
  };

  try {
    const db = await testDatabaseConnection();
    results.auth = !!db.user;
    console.log('✅ Auth test:', results.auth ? 'PASS' : 'FAIL');

    const dashboard = await loadDashboardDataInternal();
    results.dashboard = !!dashboard;
    console.log('✅ Dashboard test:', results.dashboard ? 'PASS' : 'FAIL');

    const checkInResult = await handleCheckInSubmissionInternal();
    results.checkIn = checkInResult.success;
    console.log('✅ Check-in test:', results.checkIn ? 'PASS' : 'FAIL');

    const contactResult = await addSupportContactInternal();
    results.supportNetwork = contactResult.success;
    console.log('✅ Support network test:', results.supportNetwork ? 'PASS' : 'FAIL');

    await new Promise(r => setTimeout(r, 1500));
    const verification = await loadDashboardDataInternal();
    results.dataPersist = (verification?.totalCheckIns || 0) > 0;
    console.log('✅ Data persistence test:', results.dataPersist ? 'PASS' : 'FAIL');

    console.log('🎯 COMPLETE TEST RESULTS:', results);
    return results;
  } catch (error: any) {
    console.error('🚨 PATIENT JOURNEY TEST FAILED:', error);
    return { error: error?.message || String(error), results };
  }
}

// Expose to window for quick console execution
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;
if (typeof window !== 'undefined') {
  window.testCompletePatientJourney = testCompletePatientJourney;
}


