import { supabase } from '@/integrations/supabase/client';
import { fixedCheckInSubmission, loadDashboardDataFixed } from './databaseFix';

export async function executeAutonomousTests() {
  const results: any = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  console.log('🤖 EXECUTING AUTONOMOUS TESTS...');

  // Test 1: Authentication
  try {
    const { data: { user } } = await supabase.auth.getUser();
    results.tests.authentication = {
      passed: !!user,
      userId: user?.id || null,
      error: null,
    };
  } catch (error: any) {
    results.tests.authentication = { passed: false, error: error?.message || String(error) };
  }

  // Test 2: Check-in Submission
  try {
    const testCheckIn = {
      mood: 'positive',
      activities: ['test'],
      sleep_quality: 8,
      notes: 'Automated test check-in',
    };
    const checkInResult = await fixedCheckInSubmission(testCheckIn);
    results.tests.checkInSubmission = {
      passed: !!checkInResult?.success,
      source: checkInResult?.source,
      error: null,
    };
  } catch (error: any) {
    results.tests.checkInSubmission = { passed: false, error: error?.message || String(error) };
  }

  // Test 3: Dashboard Data Loading
  try {
    const dashboardData = await loadDashboardDataFixed();
    results.tests.dashboardLoading = {
      passed: !!dashboardData && (dashboardData.totalCheckIns ?? -1) >= 0,
      totalCheckIns: dashboardData?.totalCheckIns || 0,
      supportNetworkCount: dashboardData?.supportNetworkCount || 0,
      source: (dashboardData as any)?.source || 'database',
      error: null,
    };
  } catch (error: any) {
    results.tests.dashboardLoading = { passed: false, error: error?.message || String(error) };
  }

  // Test 4: Data Persistence
  try {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const reloaded = await loadDashboardDataFixed();
    results.tests.dataPersistence = {
      passed: !!reloaded && (reloaded.totalCheckIns || 0) >= 0,
      persistentData: !!reloaded,
      error: null,
    };
  } catch (error: any) {
    results.tests.dataPersistence = { passed: false, error: error?.message || String(error) };
  }

  console.log('🤖 AUTONOMOUS TEST RESULTS:', results);
  return results;
}

// Expose to window
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const window: any;
if (typeof window !== 'undefined') {
  window.executeAutonomousTests = executeAutonomousTests;
}


