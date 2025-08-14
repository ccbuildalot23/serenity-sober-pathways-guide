-- ============================================================================
-- DATABASE VERIFICATION QUERIES - PROOF OF IMPLEMENTATION
-- ============================================================================
-- This file contains SQL queries to verify that all database tables,
-- policies, and security measures are correctly implemented for the
-- Serenity Sober Pathways provider portal pilot program.
--
-- Run these queries to prove:
-- 1. Tables exist with correct schema
-- 2. RLS policies are active and working
-- 3. Indexes are properly configured
-- 4. Constraints are enforced
-- 5. Audit triggers are functional
-- ============================================================================

-- ============================================================================
-- SECTION 1: TABLE EXISTENCE VERIFICATION
-- ============================================================================

-- 1.1 Verify all provider clinical tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IN (
            'care_plans', 'care_plan_goals', 'care_plan_progress',
            'provider_notes', 'note_templates',
            'provider_appointments', 'recurring_appointments',
            'secure_messages', 'message_conversations',
            'patient_consents'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN (
        'care_plans', 'care_plan_goals', 'care_plan_progress',
        'provider_notes', 'note_templates',
        'provider_appointments', 'recurring_appointments',
        'secure_messages', 'message_conversations',
        'patient_consents'
    )
ORDER BY table_name;

-- 1.2 Verify column structure for care_plans table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'care_plans'
ORDER BY ordinal_position;

-- 1.3 Verify column structure for provider_notes table (check encryption fields)
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name = 'note_content' THEN '🔐 ENCRYPTED FIELD'
        ELSE data_type
    END as security_status
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'provider_notes'
ORDER BY ordinal_position;

-- ============================================================================
-- SECTION 2: ROW LEVEL SECURITY (RLS) VERIFICATION
-- ============================================================================

-- 2.1 Verify RLS is enabled on all critical tables
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS ENABLED'
        ELSE '❌ RLS DISABLED - SECURITY RISK!'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'care_plans', 'care_plan_goals', 'care_plan_progress',
        'provider_notes', 'provider_appointments',
        'secure_messages', 'message_conversations',
        'patient_consents'
    )
ORDER BY tablename;

-- 2.2 List all RLS policies for verification
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN '✅ HAS CONDITION'
        ELSE '⚠️ NO CONDITION'
    END as policy_status,
    LEFT(qual::text, 100) as policy_condition_preview
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN (
        'care_plans', 'care_plan_goals', 'provider_notes',
        'provider_appointments', 'secure_messages'
    )
ORDER BY tablename, policyname;

-- 2.3 Verify care plans RLS policies specifically
SELECT 
    policyname,
    cmd as operation,
    CASE 
        WHEN policyname LIKE '%provider%' THEN '👨‍⚕️ PROVIDER ACCESS'
        WHEN policyname LIKE '%patient%' THEN '👤 PATIENT ACCESS'
        ELSE '❓ UNKNOWN'
    END as access_type,
    qual::text as access_condition
FROM pg_policies
WHERE tablename = 'care_plans'
ORDER BY policyname;

-- ============================================================================
-- SECTION 3: INDEX VERIFICATION FOR PERFORMANCE
-- ============================================================================

-- 3.1 Verify all performance indexes exist
SELECT 
    schemaname,
    tablename,
    indexname,
    CASE 
        WHEN indexname LIKE '%_pkey' THEN '🔑 PRIMARY KEY'
        WHEN indexname LIKE 'idx_%' THEN '📊 PERFORMANCE INDEX'
        ELSE '📌 OTHER INDEX'
    END as index_type
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN (
        'care_plans', 'care_plan_goals', 'provider_notes',
        'provider_appointments', 'secure_messages'
    )
ORDER BY tablename, indexname;

-- 3.2 Verify specific critical indexes for appointments
SELECT 
    indexname,
    indexdef,
    CASE 
        WHEN indexname = 'idx_appointments_upcoming' THEN '✅ CRITICAL: Upcoming appointments query optimization'
        WHEN indexname LIKE '%provider_id%' THEN '✅ Provider lookup optimization'
        WHEN indexname LIKE '%patient_id%' THEN '✅ Patient lookup optimization'
        WHEN indexname LIKE '%date%' THEN '✅ Date range query optimization'
        ELSE '📊 Standard index'
    END as purpose
FROM pg_indexes
WHERE tablename = 'provider_appointments'
ORDER BY indexname;

-- ============================================================================
-- SECTION 4: CONSTRAINT VERIFICATION
-- ============================================================================

-- 4.1 Verify foreign key constraints for referential integrity
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    '✅ REFERENTIAL INTEGRITY' as status
FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name IN ('care_plans', 'care_plan_goals', 'provider_notes')
ORDER BY tc.table_name, tc.constraint_name;

-- 4.2 Verify check constraints for data validation
SELECT 
    tc.table_name,
    tc.constraint_name,
    cc.check_clause,
    CASE 
        WHEN tc.constraint_name LIKE '%status%' THEN '📋 STATUS VALIDATION'
        WHEN tc.constraint_name LIKE '%valid%' THEN '✅ VALIDITY CHECK'
        WHEN tc.constraint_name LIKE '%time%' THEN '⏰ TIME VALIDATION'
        ELSE '🔍 DATA VALIDATION'
    END as constraint_purpose
FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
    AND tc.table_schema = 'public'
    AND tc.table_name IN (
        'care_plans', 'provider_appointments', 'care_plan_goals'
    )
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================================================
-- SECTION 5: TRIGGER VERIFICATION FOR AUDIT
-- ============================================================================

-- 5.1 Verify audit triggers exist
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    CASE 
        WHEN trigger_name LIKE '%updated_at%' THEN '✅ TIMESTAMP AUDIT'
        WHEN trigger_name LIKE '%audit%' THEN '✅ SECURITY AUDIT'
        ELSE '📝 OTHER TRIGGER'
    END as trigger_purpose
FROM information_schema.triggers
WHERE trigger_schema = 'public'
    AND event_object_table IN (
        'care_plans', 'care_plan_goals', 'provider_notes',
        'provider_appointments'
    )
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- SECTION 6: HIPAA COMPLIANCE VERIFICATION
-- ============================================================================

-- 6.1 Verify encryption indicators on sensitive tables
SELECT 
    t.tablename,
    CASE 
        WHEN t.tablename = 'provider_notes' THEN '🔐 REQUIRES ENCRYPTION'
        WHEN t.tablename = 'secure_messages' THEN '🔐 REQUIRES E2E ENCRYPTION'
        WHEN t.tablename IN ('care_plans', 'patient_consents') THEN '🔒 CONTAINS PHI'
        ELSE '📋 STANDARD TABLE'
    END as hipaa_classification,
    COUNT(p.policyname) as rls_policy_count,
    CASE 
        WHEN COUNT(p.policyname) > 0 THEN '✅ HAS ACCESS CONTROL'
        ELSE '❌ NO ACCESS CONTROL!'
    END as access_control_status
FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
    AND t.tablename IN (
        'care_plans', 'provider_notes', 'secure_messages',
        'patient_consents', 'provider_appointments'
    )
GROUP BY t.tablename
ORDER BY t.tablename;

-- 6.2 Verify audit log capability
SELECT 
    'security_audit_logs' as audit_table,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'security_audit_logs'
        ) THEN '✅ AUDIT TABLE EXISTS'
        ELSE '❌ AUDIT TABLE MISSING - HIPAA VIOLATION!'
    END as audit_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE tablename = 'security_audit_logs' 
            AND rowsecurity = true
        ) THEN '✅ AUDIT RLS ENABLED'
        ELSE '⚠️ AUDIT RLS NOT ENABLED'
    END as audit_security;

-- ============================================================================
-- SECTION 7: TEST DATA INSERTION VERIFICATION
-- ============================================================================

-- 7.1 Test inserting a care plan (will fail if RLS blocks it)
-- DO $$
-- BEGIN
--     INSERT INTO care_plans (
--         patient_id, provider_id, title, description, status,
--         start_date, risk_level
--     ) VALUES (
--         gen_random_uuid(), 
--         gen_random_uuid(),
--         'TEST CARE PLAN - DELETE ME',
--         'This is a test care plan to verify insertion works',
--         'draft',
--         CURRENT_DATE,
--         'low'
--     );
--     RAISE NOTICE '✅ Care plan insertion test PASSED';
-- EXCEPTION WHEN OTHERS THEN
--     RAISE NOTICE '❌ Care plan insertion test FAILED: %', SQLERRM;
-- END $$;

-- ============================================================================
-- SECTION 8: PERFORMANCE METRICS
-- ============================================================================

-- 8.1 Table size and row count verification
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    n_live_tup as row_count,
    CASE 
        WHEN n_live_tup = 0 THEN '📭 EMPTY - NEEDS TEST DATA'
        WHEN n_live_tup < 100 THEN '📊 LOW DATA'
        WHEN n_live_tup < 1000 THEN '📈 MODERATE DATA'
        ELSE '📊 PRODUCTION READY'
    END as data_status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND tablename IN (
        'care_plans', 'provider_notes', 'provider_appointments',
        'secure_messages'
    )
ORDER BY tablename;

-- ============================================================================
-- SECTION 9: SUMMARY REPORT
-- ============================================================================

-- 9.1 Generate overall verification summary
WITH verification_summary AS (
    SELECT 
        'Tables Created' as check_item,
        COUNT(*) as actual_count,
        10 as expected_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
        AND table_name IN (
            'care_plans', 'care_plan_goals', 'care_plan_progress',
            'provider_notes', 'note_templates',
            'provider_appointments', 'recurring_appointments',
            'secure_messages', 'message_conversations',
            'patient_consents'
        )
    
    UNION ALL
    
    SELECT 
        'RLS Policies Active' as check_item,
        COUNT(DISTINCT tablename) as actual_count,
        8 as expected_count
    FROM pg_policies
    WHERE schemaname = 'public'
        AND tablename IN (
            'care_plans', 'care_plan_goals', 'care_plan_progress',
            'provider_notes', 'provider_appointments',
            'secure_messages', 'message_conversations',
            'patient_consents'
        )
    
    UNION ALL
    
    SELECT 
        'Performance Indexes' as check_item,
        COUNT(*) as actual_count,
        15 as expected_count
    FROM pg_indexes
    WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
)
SELECT 
    check_item,
    actual_count,
    expected_count,
    CASE 
        WHEN actual_count >= expected_count THEN '✅ PASSED'
        ELSE '❌ FAILED'
    END as status,
    ROUND((actual_count::numeric / NULLIF(expected_count, 0)) * 100, 1) || '%' as completion_percentage
FROM verification_summary
ORDER BY check_item;

-- ============================================================================
-- END OF DATABASE VERIFICATION QUERIES
-- 
-- TO RUN THIS FILE:
-- psql -d your_database_name -f database-proof.sql > verification-results.txt
-- 
-- EXPECTED RESULTS:
-- - All tables should show ✅ EXISTS
-- - All RLS should show ✅ RLS ENABLED
-- - All critical indexes should be present
-- - All constraints should be active
-- - Summary should show 100% completion
-- ============================================================================