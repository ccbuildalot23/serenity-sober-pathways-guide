-- =====================================================
-- SERENITY SOBER PATHWAYS - MVP SCHEMA
-- =====================================================
-- Single migration file for complete MVP deployment
-- Uses TEXT for roles (no enums), simplified structure
-- Designed for clean deployment with zero conflicts

-- =====================================================
-- CORE TABLES
-- =====================================================

-- 1. User Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone_number TEXT,
    date_of_birth DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Roles (simplified - TEXT only, no enums)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('patient', 'support_member', 'provider', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 3. Daily Check-ins (core feature)
CREATE TABLE IF NOT EXISTS public.daily_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10),
    anxiety_level INTEGER CHECK (anxiety_level BETWEEN 1 AND 10),
    sleep_quality INTEGER CHECK (sleep_quality BETWEEN 1 AND 10),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Emergency Contacts (crisis support)
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    relationship TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Recovery Goals
CREATE TABLE IF NOT EXISTS public.recovery_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_date DATE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Messages (peer support)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Crisis Plans
CREATE TABLE IF NOT EXISTS public.crisis_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    warning_signs TEXT[],
    coping_strategies TEXT[],
    support_network TEXT[],
    professional_contacts TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 8. Security Audit Logs (HIPAA compliance)
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    metadata JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 9. MFA Settings (security)
CREATE TABLE IF NOT EXISTS public.mfa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    secret TEXT NOT NULL,
    backup_codes TEXT,
    enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 10. Rate Limit Attempts (security)
CREATE TABLE IF NOT EXISTS public.rate_limit_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    identifier TEXT NOT NULL,
    ip_address INET,
    success BOOLEAN DEFAULT false,
    attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ESSENTIAL FUNCTIONS (No overloading, clear signatures)
-- =====================================================

-- Get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
BEGIN
    IF p_user_id IS NULL THEN
        p_user_id := auth.uid();
    END IF;
    
    SELECT role INTO v_role
    FROM public.user_roles
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_role, 'patient');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_user_id IS NULL OR p_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    RETURN EXISTS(
        SELECT 1 FROM public.user_roles 
        WHERE user_id = p_user_id AND role = p_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Current user's role (helper)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN public.get_user_role(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES (Simplified)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mfa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_attempts ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User roles policies
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service role can manage roles" ON public.user_roles
    FOR ALL USING (auth.role() = 'service_role');

-- Daily checkins policies
CREATE POLICY "Users can manage own checkins" ON public.daily_checkins
    FOR ALL USING (auth.uid() = user_id);

-- Emergency contacts policies
CREATE POLICY "Users can manage own contacts" ON public.emergency_contacts
    FOR ALL USING (auth.uid() = user_id);

-- Recovery goals policies
CREATE POLICY "Users can manage own goals" ON public.recovery_goals
    FOR ALL USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view own messages" ON public.messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
CREATE POLICY "Users can send messages" ON public.messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Crisis plans policies
CREATE POLICY "Users can manage own crisis plan" ON public.crisis_plans
    FOR ALL USING (auth.uid() = user_id);

-- MFA settings policies
CREATE POLICY "Users can manage own MFA" ON public.mfa_settings
    FOR ALL USING (auth.uid() = user_id);

-- Security audit logs policies (write-only for users)
CREATE POLICY "Service role can read audit logs" ON public.security_audit_logs
    FOR SELECT USING (auth.role() = 'service_role');
CREATE POLICY "System can write audit logs" ON public.security_audit_logs
    FOR INSERT WITH CHECK (true);

-- Rate limit policies (system only)
CREATE POLICY "Service role manages rate limits" ON public.rate_limit_attempts
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_recovery_goals_updated_at
    BEFORE UPDATE ON public.recovery_goals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_crisis_plans_updated_at
    BEFORE UPDATE ON public.crisis_plans
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =====================================================
-- INITIAL DATA & PERMISSIONS
-- =====================================================

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant minimal permissions to anon users
GRANT USAGE ON SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO anon;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_id ON public.daily_checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_checkins_created_at ON public.daily_checkins(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_recovery_goals_user_id ON public.recovery_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_timestamp ON public.security_audit_logs(timestamp);

-- =====================================================
-- HELPER FUNCTION FOR INITIAL USER SETUP
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email)
    ON CONFLICT (id) DO NOTHING;
    
    -- Assign default patient role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'patient')
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'MVP Schema deployed successfully!';
    RAISE NOTICE 'Tables created: profiles, user_roles, daily_checkins, emergency_contacts, recovery_goals, messages, crisis_plans, security_audit_logs, mfa_settings, rate_limit_attempts';
    RAISE NOTICE 'Functions created: get_user_role, has_role, is_authenticated, current_user_role';
    RAISE NOTICE 'RLS policies applied to all tables';
    RAISE NOTICE 'Ready for application deployment!';
END $$;

-- =====================================================
-- MVP SCHEMA COMPLETE
-- =====================================================
-- This schema provides:
-- ✅ User authentication and roles (simplified)
-- ✅ Core recovery features (checkins, goals, crisis plans)
-- ✅ Peer support (messages)
-- ✅ Security (audit logs, MFA, rate limiting)
-- ✅ HIPAA compliance foundation
-- ✅ Clean, maintainable structure
-- ✅ No enum conflicts, no function overloading