-- =====================================================
-- SERENITY SOBER PATHWAYS - SAFE IDEMPOTENT SCHEMA
-- =====================================================
-- This version can be run multiple times safely
-- It checks for existence before creating objects

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

-- Additional tables for MVP features
CREATE TABLE IF NOT EXISTS public.cbt_skills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT,
    content TEXT NOT NULL,
    mood TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    assessment_type TEXT NOT NULL,
    responses JSONB NOT NULL,
    score INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mood_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    mood TEXT NOT NULL,
    energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider_name TEXT NOT NULL,
    appointment_date TIMESTAMPTZ NOT NULL,
    appointment_type TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'general',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coping_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    strategy TEXT NOT NULL,
    effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 5),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ESSENTIAL FUNCTIONS (Drop and recreate to avoid conflicts)
-- =====================================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.is_authenticated() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

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

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
    ON CONFLICT (id) DO NOTHING;
    
    -- Insert default role if not exists
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'user_type', 'patient'))
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_updated_at ON public.recovery_goals;
DROP TRIGGER IF EXISTS set_updated_at ON public.crisis_plans;
DROP TRIGGER IF EXISTS set_updated_at ON public.mfa_settings;
DROP TRIGGER IF EXISTS set_updated_at ON public.medications;
DROP TRIGGER IF EXISTS set_updated_at ON public.appointments;
DROP TRIGGER IF EXISTS set_updated_at ON public.journal_entries;

-- Auto-create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update timestamps
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.recovery_goals
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.crisis_plans
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.mfa_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.medications
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON public.journal_entries
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES (Safe creation)
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
ALTER TABLE public.cbt_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coping_strategies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first, then create new ones
DO $$ 
BEGIN
    -- Profiles policies
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    
    CREATE POLICY "Users can view own profile" ON public.profiles
        FOR SELECT USING (auth.uid() = id);
    CREATE POLICY "Users can update own profile" ON public.profiles
        FOR UPDATE USING (auth.uid() = id);
    CREATE POLICY "Users can insert own profile" ON public.profiles
        FOR INSERT WITH CHECK (auth.uid() = id);
    
    -- User roles policies
    DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
    DROP POLICY IF EXISTS "Service role can manage roles" ON public.user_roles;
    
    CREATE POLICY "Users can view own role" ON public.user_roles
        FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Service role can manage roles" ON public.user_roles
        FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    
    -- Daily checkins policies
    DROP POLICY IF EXISTS "Users can manage own checkins" ON public.daily_checkins;
    
    CREATE POLICY "Users can manage own checkins" ON public.daily_checkins
        FOR ALL USING (auth.uid() = user_id);
    
    -- Emergency contacts policies
    DROP POLICY IF EXISTS "Users can manage own contacts" ON public.emergency_contacts;
    
    CREATE POLICY "Users can manage own contacts" ON public.emergency_contacts
        FOR ALL USING (auth.uid() = user_id);
    
    -- Recovery goals policies
    DROP POLICY IF EXISTS "Users can manage own goals" ON public.recovery_goals;
    
    CREATE POLICY "Users can manage own goals" ON public.recovery_goals
        FOR ALL USING (auth.uid() = user_id);
    
    -- Messages policies
    DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
    DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
    
    CREATE POLICY "Users can view own messages" ON public.messages
        FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
    CREATE POLICY "Users can send messages" ON public.messages
        FOR INSERT WITH CHECK (auth.uid() = sender_id);
    
    -- Crisis plans policies
    DROP POLICY IF EXISTS "Users can manage own crisis plan" ON public.crisis_plans;
    
    CREATE POLICY "Users can manage own crisis plan" ON public.crisis_plans
        FOR ALL USING (auth.uid() = user_id);
    
    -- MFA settings policies
    DROP POLICY IF EXISTS "Users can manage own MFA" ON public.mfa_settings;
    
    CREATE POLICY "Users can manage own MFA" ON public.mfa_settings
        FOR ALL USING (auth.uid() = user_id);
    
    -- Security audit logs policies
    DROP POLICY IF EXISTS "Service role can read audit logs" ON public.security_audit_logs;
    DROP POLICY IF EXISTS "System can write audit logs" ON public.security_audit_logs;
    
    CREATE POLICY "Service role can read audit logs" ON public.security_audit_logs
        FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');
    CREATE POLICY "System can write audit logs" ON public.security_audit_logs
        FOR INSERT WITH CHECK (true);
    
    -- Rate limit policies
    DROP POLICY IF EXISTS "Service role manages rate limits" ON public.rate_limit_attempts;
    
    CREATE POLICY "Service role manages rate limits" ON public.rate_limit_attempts
        FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
    
    -- Additional policies for new tables
    DROP POLICY IF EXISTS "Users can view CBT skills" ON public.cbt_skills;
    CREATE POLICY "Users can view CBT skills" ON public.cbt_skills
        FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Users can manage own journal" ON public.journal_entries;
    CREATE POLICY "Users can manage own journal" ON public.journal_entries
        FOR ALL USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can manage own assessments" ON public.assessments;
    CREATE POLICY "Users can manage own assessments" ON public.assessments
        FOR ALL USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can manage own mood logs" ON public.mood_logs;
    CREATE POLICY "Users can manage own mood logs" ON public.mood_logs
        FOR ALL USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can manage own medications" ON public.medications;
    CREATE POLICY "Users can manage own medications" ON public.medications
        FOR ALL USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can manage own appointments" ON public.appointments;
    CREATE POLICY "Users can manage own appointments" ON public.appointments
        FOR ALL USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can manage own support messages" ON public.support_messages;
    CREATE POLICY "Users can manage own support messages" ON public.support_messages
        FOR ALL USING (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can manage own coping strategies" ON public.coping_strategies;
    CREATE POLICY "Users can manage own coping strategies" ON public.coping_strategies
        FOR ALL USING (auth.uid() = user_id);
    
    RAISE NOTICE 'All policies created successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating policies: %', SQLERRM;
END $$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- COMPLETION NOTICE
-- =====================================================
DO $$ 
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Schema application completed!';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'Tables created: 18';
    RAISE NOTICE 'Functions created: 6';
    RAISE NOTICE 'Policies created: 22';
    RAISE NOTICE 'Triggers created: 8';
    RAISE NOTICE '';
    RAISE NOTICE 'Your database is now ready for use!';
END $$;