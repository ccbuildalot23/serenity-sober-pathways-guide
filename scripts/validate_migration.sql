-- Validation script for 20250112_fix_checkin_events_trigger.sql
-- This script can be used to test the migration logic

-- Test 1: Verify function exists and has correct attributes
SELECT 
    routine_name,
    routine_type,
    security_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'log_daily_checkin_event';

-- Test 2: Verify trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name = 'trg_log_daily_checkin_event';

-- Test 3: Verify RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'checkin_events' 
ORDER BY policyname;

-- Test 4: Verify table structure and constraints
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'checkin_events'
ORDER BY ordinal_position;

-- Test 5: Check constraints
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'checkin_events';

-- Test 6: Verify indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'checkin_events';

-- Test 7: Test the counter function (if user exists)
SELECT public.get_user_checkin_count('00000000-0000-0000-0000-000000000000'::uuid) as test_count;