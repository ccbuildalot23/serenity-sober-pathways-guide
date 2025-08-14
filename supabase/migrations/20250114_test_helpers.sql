-- =====================================================
-- TEST HELPER FUNCTIONS FOR PILOT FEATURES
-- =====================================================
-- These functions are used for testing and verification
-- They should be removed or restricted in production
-- =====================================================

-- Function to get table information
CREATE OR REPLACE FUNCTION get_table_info(table_name TEXT)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'columns', (
            SELECT array_agg(column_name)
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND information_schema.columns.table_name = get_table_info.table_name
        ),
        'foreign_keys', (
            SELECT array_agg(
                json_build_object(
                    'column', kcu.column_name,
                    'references', kcu.foreign_table_name || '(' || kcu.foreign_column_name || ')'
                )
            )
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND tc.table_name = get_table_info.table_name
        ),
        'indexes', (
            SELECT array_agg(indexname)
            FROM pg_indexes
            WHERE schemaname = 'public'
            AND pg_indexes.tablename = get_table_info.table_name
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if RLS is enabled
CREATE OR REPLACE FUNCTION check_rls_enabled(table_name TEXT)
RETURNS JSON AS $$
DECLARE
    is_enabled BOOLEAN;
    policy_count INTEGER;
BEGIN
    SELECT rowsecurity
    INTO is_enabled
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = check_rls_enabled.table_name;
    
    SELECT COUNT(*)
    INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = check_rls_enabled.table_name;
    
    RETURN json_build_object(
        'rls_enabled', is_enabled,
        'policy_count', policy_count
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify indexes
CREATE OR REPLACE FUNCTION verify_indexes()
RETURNS TABLE (
    table_name TEXT,
    index_name TEXT,
    index_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        i.tablename::TEXT,
        i.indexname::TEXT,
        am.amname::TEXT
    FROM pg_indexes i
    JOIN pg_class c ON c.relname = i.indexname
    JOIN pg_am am ON am.oid = c.relam
    WHERE i.schemaname = 'public'
    AND i.tablename IN (
        'care_plans', 'care_plan_goals', 'care_plan_progress',
        'provider_notes', 'note_templates',
        'appointments', 'appointment_change_requests',
        'appointment_reminders', 'appointment_waitlist',
        'provider_availability'
    )
    ORDER BY i.tablename, i.indexname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify constraints
CREATE OR REPLACE FUNCTION verify_constraints()
RETURNS TABLE (
    table_name TEXT,
    constraint_name TEXT,
    constraint_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.table_name::TEXT,
        tc.constraint_name::TEXT,
        tc.constraint_type::TEXT
    FROM information_schema.table_constraints tc
    WHERE tc.table_schema = 'public'
    AND tc.table_name IN (
        'care_plans', 'care_plan_goals', 'care_plan_progress',
        'provider_notes', 'note_templates',
        'appointments', 'appointment_change_requests',
        'appointment_reminders', 'appointment_waitlist',
        'provider_availability'
    )
    ORDER BY tc.table_name, tc.constraint_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to count audit logs
CREATE OR REPLACE FUNCTION count_audit_logs(
    p_table_name TEXT DEFAULT NULL,
    p_operation TEXT DEFAULT NULL,
    p_user_id UUID DEFAULT NULL,
    p_from_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '1 day'
)
RETURNS INTEGER AS $$
DECLARE
    log_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO log_count
    FROM security_audit_logs
    WHERE timestamp >= p_from_date
    AND (p_table_name IS NULL OR metadata->>'table' = p_table_name)
    AND (p_operation IS NULL OR metadata->>'operation' = p_operation)
    AND (p_user_id IS NULL OR user_id = p_user_id);
    
    RETURN log_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify trigger existence
CREATE OR REPLACE FUNCTION verify_triggers()
RETURNS TABLE (
    table_name TEXT,
    trigger_name TEXT,
    event_type TEXT,
    function_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.event_object_table::TEXT,
        t.trigger_name::TEXT,
        t.event_manipulation::TEXT,
        t.action_statement::TEXT
    FROM information_schema.triggers t
    WHERE t.event_object_schema = 'public'
    AND t.event_object_table IN (
        'care_plans', 'care_plan_goals', 'care_plan_progress',
        'provider_notes', 'note_templates',
        'appointments', 'appointment_change_requests',
        'appointment_reminders', 'appointment_waitlist',
        'provider_availability'
    )
    ORDER BY t.event_object_table, t.trigger_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users (for testing)
GRANT EXECUTE ON FUNCTION get_table_info(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_rls_enabled(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_indexes() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_constraints() TO authenticated;
GRANT EXECUTE ON FUNCTION count_audit_logs(TEXT, TEXT, UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_triggers() TO authenticated;

-- Verification output
DO $$
DECLARE
    index_count INTEGER;
    constraint_count INTEGER;
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count FROM verify_indexes();
    SELECT COUNT(*) INTO constraint_count FROM verify_constraints();
    SELECT COUNT(*) INTO trigger_count FROM verify_triggers();
    
    RAISE NOTICE 'Test helpers created successfully';
    RAISE NOTICE 'Indexes: %, Constraints: %, Triggers: %', 
                 index_count, constraint_count, trigger_count;
END $$;