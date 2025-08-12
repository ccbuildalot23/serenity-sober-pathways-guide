-- Test script for checkin_events trigger functionality
-- Run this after applying the migration to verify everything works

-- Step 1: Check if trigger function exists with SECURITY DEFINER
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.routines 
        WHERE routine_name = 'log_daily_checkin_event' 
        AND security_type = 'DEFINER'
    ) THEN
        RAISE NOTICE '✅ Trigger function exists with SECURITY DEFINER';
    ELSE
        RAISE WARNING '❌ Trigger function missing or not configured with SECURITY DEFINER';
    END IF;
END $$;

-- Step 2: Check if trigger exists and is active
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'trg_log_daily_checkin_event'
        AND event_object_table = 'daily_checkins'
    ) THEN
        RAISE NOTICE '✅ Trigger exists on daily_checkins table';
    ELSE
        RAISE WARNING '❌ Trigger missing on daily_checkins table';
    END IF;
END $$;

-- Step 3: Check RLS policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'checkin_events';
    
    IF policy_count >= 5 THEN
        RAISE NOTICE '✅ RLS policies configured (% policies found)', policy_count;
    ELSE
        RAISE WARNING '❌ Insufficient RLS policies (only % found, expected 5)', policy_count;
    END IF;
END $$;

-- Step 4: Test the counter function
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    SELECT public.get_user_checkin_count('00000000-0000-0000-0000-000000000000'::uuid) INTO test_count;
    RAISE NOTICE '✅ Counter function works (returned %)', test_count;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '❌ Counter function failed: %', SQLERRM;
END $$;

-- Step 5: Simulate a real checkin flow (if you have a test user)
-- This demonstrates the complete flow from daily_checkin to checkin_event

-- First, let's see the current state
SELECT 
    'Current checkin_events count: ' || COUNT(*)::text as status
FROM public.checkin_events;

-- List the RLS policies that are active
SELECT 
    'Policy: ' || policyname || ' | Type: ' || cmd || ' | Permissive: ' || permissive::text as policy_info
FROM pg_policies 
WHERE tablename = 'checkin_events'
ORDER BY policyname;

-- Show trigger details
SELECT 
    'Trigger: ' || trigger_name || ' | Table: ' || event_object_table || ' | Timing: ' || action_timing || ' | Event: ' || string_agg(event_manipulation, ', ') as trigger_info
FROM information_schema.triggers 
WHERE trigger_name = 'trg_log_daily_checkin_event'
GROUP BY trigger_name, event_object_table, action_timing;

-- Final summary
RAISE NOTICE '';
RAISE NOTICE '=== MIGRATION TEST SUMMARY ===';
RAISE NOTICE 'Migration file: 20250112_fix_checkin_events_trigger.sql';
RAISE NOTICE 'Key features:';
RAISE NOTICE '  - SECURITY DEFINER function to bypass RLS';
RAISE NOTICE '  - Comprehensive error handling';  
RAISE NOTICE '  - 5 RLS policies for proper access control';
RAISE NOTICE '  - Counter function for progress tracking';
RAISE NOTICE '  - Data validation constraints';
RAISE NOTICE '  - Performance indexes';
RAISE NOTICE '';
RAISE NOTICE 'To test with real data:';
RAISE NOTICE '1. Create a test user or use existing user ID';
RAISE NOTICE '2. Insert into daily_checkins table';  
RAISE NOTICE '3. Verify corresponding event appears in checkin_events';
RAISE NOTICE '4. Use get_user_checkin_count() to see total count';