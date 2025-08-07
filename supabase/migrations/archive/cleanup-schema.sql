-- =====================================================
-- CLEANUP SCRIPT - Remove existing schema objects
-- =====================================================
-- Run this BEFORE applying the MVP schema to avoid conflicts
-- WARNING: This will DROP all data in these tables!

-- Drop all existing policies first
DO $$ 
BEGIN
    -- Profiles policies
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    
    -- User roles policies
    DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
    DROP POLICY IF EXISTS "Service role can manage roles" ON public.user_roles;
    
    -- Daily checkins policies
    DROP POLICY IF EXISTS "Users can manage own checkins" ON public.daily_checkins;
    
    -- Emergency contacts policies
    DROP POLICY IF EXISTS "Users can manage own contacts" ON public.emergency_contacts;
    
    -- Recovery goals policies
    DROP POLICY IF EXISTS "Users can manage own goals" ON public.recovery_goals;
    
    -- Messages policies
    DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
    DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
    
    -- Crisis plans policies
    DROP POLICY IF EXISTS "Users can manage own crisis plan" ON public.crisis_plans;
    
    -- MFA settings policies
    DROP POLICY IF EXISTS "Users can manage own MFA" ON public.mfa_settings;
    
    -- Security audit logs policies
    DROP POLICY IF EXISTS "Service role can read audit logs" ON public.security_audit_logs;
    DROP POLICY IF EXISTS "System can write audit logs" ON public.security_audit_logs;
    
    -- Rate limit policies
    DROP POLICY IF EXISTS "Service role manages rate limits" ON public.rate_limit_attempts;
    
    RAISE NOTICE 'All policies dropped successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at ON public.recovery_goals;
DROP TRIGGER IF EXISTS set_updated_at ON public.crisis_plans;
DROP TRIGGER IF EXISTS set_updated_at ON public.mfa_settings;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.is_authenticated() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

-- Drop tables (in reverse dependency order)
DROP TABLE IF EXISTS public.rate_limit_attempts CASCADE;
DROP TABLE IF EXISTS public.mfa_settings CASCADE;
DROP TABLE IF EXISTS public.security_audit_logs CASCADE;
DROP TABLE IF EXISTS public.crisis_plans CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.recovery_goals CASCADE;
DROP TABLE IF EXISTS public.emergency_contacts CASCADE;
DROP TABLE IF EXISTS public.daily_checkins CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Additional tables that might exist from other migrations
DROP TABLE IF EXISTS public.cbt_skills CASCADE;
DROP TABLE IF EXISTS public.journal_entries CASCADE;
DROP TABLE IF EXISTS public.assessments CASCADE;
DROP TABLE IF EXISTS public.mood_logs CASCADE;
DROP TABLE IF EXISTS public.medications CASCADE;
DROP TABLE IF EXISTS public.appointments CASCADE;
DROP TABLE IF EXISTS public.support_messages CASCADE;
DROP TABLE IF EXISTS public.coping_strategies CASCADE;

-- Drop any remaining functions that might exist
DROP FUNCTION IF EXISTS public.create_user_profile(UUID, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_id_by_email(TEXT) CASCADE;

-- Notify completion
DO $$ 
BEGIN
    RAISE NOTICE 'Schema cleanup completed successfully!';
    RAISE NOTICE 'You can now safely apply the MVP_COMPLETE_SCHEMA.sql';
END $$;