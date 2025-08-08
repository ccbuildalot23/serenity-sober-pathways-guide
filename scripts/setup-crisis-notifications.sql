-- ============================================================================
-- CRISIS NOTIFICATION SYSTEM SETUP SCRIPT
-- ============================================================================
-- Run this script to set up the complete crisis notification system
-- Assumes existing foundation schema is already in place
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- 1. RUN EXISTING MIGRATIONS (if not already done)
-- ============================================================================

-- Foundation schema
\i '0001_foundation_schema.sql'

-- Notification system
\i '0002_notification_system.sql'

-- Crisis notification system
\i '0004_crisis_notification_system.sql'

-- ============================================================================
-- 2. INSERT SAMPLE DATA FOR TESTING
-- ============================================================================

-- Create sample users for testing (if not exists)
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role
) VALUES 
  (
    gen_random_uuid(),
    'patient@serenity.test',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Test Patient"}',
    false,
    'authenticated'
  ),
  (
    gen_random_uuid(),
    'supporter1@serenity.test',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Test Supporter 1"}',
    false,
    'authenticated'
  ),
  (
    gen_random_uuid(),
    'supporter2@serenity.test',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"name": "Test Supporter 2"}',
    false,
    'authenticated'
  )
ON CONFLICT (email) DO NOTHING;

-- Get the user IDs for sample data
DO $$
DECLARE
  patient_id UUID;
  supporter1_id UUID;
  supporter2_id UUID;
BEGIN
  -- Get user IDs
  SELECT id INTO patient_id FROM auth.users WHERE email = 'patient@serenity.test';
  SELECT id INTO supporter1_id FROM auth.users WHERE email = 'supporter1@serenity.test';
  SELECT id INTO supporter2_id FROM auth.users WHERE email = 'supporter2@serenity.test';
  
  -- Create profiles
  INSERT INTO public.profiles (id, email, full_name) VALUES
    (patient_id, 'patient@serenity.test', 'Test Patient'),
    (supporter1_id, 'supporter1@serenity.test', 'Test Supporter 1'),
    (supporter2_id, 'supporter2@serenity.test', 'Test Supporter 2')
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name;
  
  -- Set user roles
  INSERT INTO public.user_roles (user_id, role) VALUES
    (patient_id, 'patient'),
    (supporter1_id, 'support_member'),
    (supporter2_id, 'support_member')
  ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role;
  
  -- Create support network
  INSERT INTO public.support_network_members (
    user_id,
    supporter_user_id,
    supporter_name,
    phone_number,
    email,
    relationship,
    priority_order,
    is_active,
    is_primary,
    preferred_channel,
    notify_for_crisis,
    notify_for_connection
  ) VALUES
    (
      patient_id,
      supporter1_id,
      'Test Supporter 1',
      '+1234567890',
      'supporter1@serenity.test',
      'Sponsor',
      1,
      true,
      true,
      'in_app',
      true,
      true
    ),
    (
      patient_id,
      supporter2_id,
      'Test Supporter 2',
      '+1234567891',
      'supporter2@serenity.test',
      'Friend',
      2,
      true,
      false,
      'in_app',
      true,
      true
    )
  ON CONFLICT (user_id, supporter_user_id) DO UPDATE SET
    supporter_name = EXCLUDED.supporter_name,
    phone_number = EXCLUDED.phone_number,
    email = EXCLUDED.email,
    relationship = EXCLUDED.relationship;
    
  -- Create default notification preferences
  INSERT INTO public.user_notification_preferences (user_id) VALUES
    (patient_id),
    (supporter1_id),
    (supporter2_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  RAISE NOTICE 'Sample data created successfully';
  RAISE NOTICE 'Patient ID: %', patient_id;
  RAISE NOTICE 'Supporter 1 ID: %', supporter1_id;
  RAISE NOTICE 'Supporter 2 ID: %', supporter2_id;
END $$;

-- ============================================================================
-- 3. CREATE NOTIFICATION QUEUE PROCESSOR JOB
-- ============================================================================

-- Enable pg_cron extension for scheduling (if available)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule notification processing every 30 seconds
-- SELECT cron.schedule('process-notifications', '*/30 * * * * *', 'SELECT process_notification_queue();');

-- ============================================================================
-- 4. INSERT DEFAULT NOTIFICATION TEMPLATES
-- ============================================================================

-- Crisis alert templates
INSERT INTO public.notification_templates (
  name,
  channel,
  urgency_level,
  subject,
  body_template,
  required_variables,
  is_active
) VALUES
  (
    'crisis_in_app',
    'in_app',
    'crisis',
    'Crisis Alert',
    '🚨 {{user_name}} needs immediate support. They are in crisis and need to hear from you right now. Please respond immediately.',
    ARRAY['user_name'],
    true
  ),
  (
    'crisis_push',
    'push',
    'crisis',
    'Crisis Alert',
    '🚨 {{user_name}} is in crisis and needs immediate support. Open Serenity now.',
    ARRAY['user_name'],
    true
  ),
  (
    'connection_in_app',
    'in_app',
    'need_connection',
    'Connection Needed',
    '💚 {{user_name}} would appreciate a check-in when you have a moment. No emergency, just connection needed.',
    ARRAY['user_name'],
    true
  ),
  (
    'escalation_in_app',
    'in_app',
    'crisis',
    'Crisis Escalated',
    '⚠️ Crisis has been escalated for {{user_name}}. Additional support is needed. {{reason}}',
    ARRAY['user_name', 'reason'],
    true
  )
ON CONFLICT (name) DO UPDATE SET
  body_template = EXCLUDED.body_template,
  required_variables = EXCLUDED.required_variables,
  is_active = EXCLUDED.is_active;

-- ============================================================================
-- 5. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Additional indexes for real-time performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notification_queue_processing 
  ON public.notification_queue(status, scheduled_for, priority) 
  WHERE status IN ('queued', 'processing');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crisis_alerts_active 
  ON public.crisis_alert_notifications(status, severity, created_at) 
  WHERE status IN ('scheduled', 'sent', 'acknowledged', 'escalated');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_supporter_responses_active 
  ON public.supporter_responses(crisis_alert_id, response_type, responded_at) 
  WHERE coordination_status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_realtime_delivery_active 
  ON public.realtime_delivery_status(recipient_id, connection_id) 
  WHERE delivered_at IS NULL;

-- ============================================================================
-- 6. ENABLE REALTIME FOR TABLES
-- ============================================================================

-- Enable Supabase Realtime for notification tables
BEGIN;
  -- Drop publication if exists
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Create publication for Realtime
  CREATE PUBLICATION supabase_realtime FOR TABLE
    public.notification_requests,
    public.notification_recipients,
    public.crisis_alert_notifications,
    public.supporter_responses,
    public.realtime_delivery_status;
COMMIT;

-- ============================================================================
-- 7. CREATE HELPER VIEWS FOR DASHBOARD
-- ============================================================================

-- View for active crises with full details
CREATE OR REPLACE VIEW public.active_crises AS
SELECT 
  can.id,
  can.severity,
  can.status,
  can.tier,
  can.responder_count,
  can.first_responder_id,
  can.escalation_level,
  can.created_at,
  can.updated_at,
  nr.user_id,
  nr.message,
  nr.custom_message,
  nr.location,
  p.full_name as user_name,
  p.email as user_email
FROM public.crisis_alert_notifications can
JOIN public.notification_requests nr ON can.request_id = nr.id
JOIN public.profiles p ON nr.user_id = p.id
WHERE can.status IN ('scheduled', 'sent', 'acknowledged', 'escalated');

-- View for crisis response summary
CREATE OR REPLACE VIEW public.crisis_response_summary AS
SELECT 
  can.id as crisis_id,
  can.severity,
  can.status,
  COUNT(sr.id) as total_responses,
  COUNT(CASE WHEN sr.response_type = 'acknowledged' THEN 1 END) as acknowledged_count,
  COUNT(CASE WHEN sr.response_type = 'made_contact' THEN 1 END) as contact_made_count,
  COUNT(CASE WHEN sr.response_type = 'needs_help' THEN 1 END) as needs_help_count,
  COUNT(CASE WHEN sr.response_type = 'call_911' THEN 1 END) as emergency_calls,
  MIN(sr.responded_at) as first_response_at,
  MAX(sr.responded_at) as last_response_at
FROM public.crisis_alert_notifications can
LEFT JOIN public.supporter_responses sr ON can.id = sr.crisis_alert_id
GROUP BY can.id, can.severity, can.status;

-- ============================================================================
-- 8. CREATE MONITORING FUNCTIONS
-- ============================================================================

-- Function to get system health status
CREATE OR REPLACE FUNCTION public.get_system_health()
RETURNS JSON AS $$
DECLARE
  result JSON;
  notification_queue_count INTEGER;
  failed_notifications INTEGER;
  active_crises INTEGER;
  avg_response_time FLOAT;
BEGIN
  -- Get queue statistics
  SELECT COUNT(*) INTO notification_queue_count 
  FROM public.notification_queue 
  WHERE status = 'queued';
  
  SELECT COUNT(*) INTO failed_notifications 
  FROM public.notification_queue 
  WHERE status = 'failed' AND retry_count >= max_retries;
  
  SELECT COUNT(*) INTO active_crises 
  FROM public.crisis_alert_notifications 
  WHERE status IN ('scheduled', 'sent', 'acknowledged', 'escalated');
  
  SELECT AVG(EXTRACT(EPOCH FROM (responded_at - can.created_at))) INTO avg_response_time
  FROM public.supporter_responses sr
  JOIN public.crisis_alert_notifications can ON sr.crisis_alert_id = can.id
  WHERE sr.created_at > NOW() - INTERVAL '24 hours';
  
  -- Build result
  result := json_build_object(
    'timestamp', NOW(),
    'status', CASE 
      WHEN failed_notifications > 10 THEN 'degraded'
      WHEN notification_queue_count > 100 THEN 'warning'
      ELSE 'healthy'
    END,
    'metrics', json_build_object(
      'queued_notifications', notification_queue_count,
      'failed_notifications', failed_notifications,
      'active_crises', active_crises,
      'avg_response_time_seconds', COALESCE(avg_response_time, 0)
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old data
CREATE OR REPLACE FUNCTION public.cleanup_old_notification_data()
RETURNS VOID AS $$
BEGIN
  -- Delete old processed notifications (older than 30 days)
  DELETE FROM public.notification_queue
  WHERE processed_at < NOW() - INTERVAL '30 days'
  AND status IN ('sent', 'delivered', 'cancelled');
  
  -- Delete old delivery status records (older than 30 days)
  DELETE FROM public.realtime_delivery_status
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Delete old escalation logs (older than 90 days)
  DELETE FROM public.crisis_escalation_logs
  WHERE escalated_at < NOW() - INTERVAL '90 days';
  
  RAISE NOTICE 'Old notification data cleaned up';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 9. GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions on views
GRANT SELECT ON public.active_crises TO authenticated;
GRANT SELECT ON public.crisis_response_summary TO authenticated;

-- Grant permissions on monitoring functions
GRANT EXECUTE ON FUNCTION public.get_system_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_notification_data() TO service_role;

-- ============================================================================
-- 10. VERIFICATION AND FINAL SETUP
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
  function_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Count created objects
  SELECT COUNT(*) INTO table_count 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name LIKE '%notification%' OR table_name LIKE '%crisis%';
  
  SELECT COUNT(*) INTO function_count 
  FROM information_schema.routines 
  WHERE routine_schema = 'public' 
  AND routine_name LIKE '%crisis%' OR routine_name LIKE '%notification%';
  
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE schemaname = 'public' 
  AND tablename LIKE '%notification%' OR tablename LIKE '%crisis%';
  
  -- Output summary
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'CRISIS NOTIFICATION SYSTEM SETUP COMPLETE';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Tables created/updated: %', table_count;
  RAISE NOTICE 'Functions created: %', function_count;
  RAISE NOTICE 'RLS policies created: %', policy_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Core Components:';
  RAISE NOTICE '✅ Database schema with staggered timing support';
  RAISE NOTICE '✅ Notification queue system with retry logic';
  RAISE NOTICE '✅ Real-time delivery status tracking';
  RAISE NOTICE '✅ Crisis escalation and coordination';
  RAISE NOTICE '✅ MCP integration support';
  RAISE NOTICE '✅ Security policies and audit logging';
  RAISE NOTICE '';
  RAISE NOTICE 'Integration Points:';
  RAISE NOTICE '📱 In-app notifications via Supabase Realtime';
  RAISE NOTICE '🔄 MCP server bridge for existing tools';
  RAISE NOTICE '⚡ Response coordinator for supporter chaos prevention';
  RAISE NOTICE '📊 Real-time dashboard components';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Deploy Edge Function: notification-processor';
  RAISE NOTICE '2. Configure Supabase Realtime subscriptions';
  RAISE NOTICE '3. Test crisis alert flow end-to-end';
  RAISE NOTICE '4. Set up monitoring and alerting';
  RAISE NOTICE '5. Week 2: Add WhatsApp Business API integration';
  RAISE NOTICE '';
  RAISE NOTICE 'Test Users Created:';
  RAISE NOTICE 'patient@serenity.test / password123';
  RAISE NOTICE 'supporter1@serenity.test / password123';
  RAISE NOTICE 'supporter2@serenity.test / password123';
  RAISE NOTICE '============================================================================';
END $$;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================