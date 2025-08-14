-- =====================================================
-- SERENITY PILOT FEATURES - HIPAA COMPLIANT SCHEMA
-- =====================================================
-- Date: 2025-01-14
-- Description: Comprehensive schema for care plans, provider notes, and appointments
-- Features: RLS policies, encryption support, audit logging, conflict prevention
-- =====================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CARE PLANS SYSTEM
-- =====================================================

-- Care Plans table
CREATE TABLE IF NOT EXISTS public.care_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    provider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'paused', 'archived')),
    start_date DATE NOT NULL,
    end_date DATE,
    review_date DATE,
    diagnosis_codes TEXT[],
    treatment_approach TEXT,
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    version INTEGER DEFAULT 1,
    parent_plan_id UUID REFERENCES public.care_plans(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    updated_by UUID REFERENCES auth.users(id) NOT NULL,
    
    -- Indexes for performance
    CONSTRAINT care_plans_dates_check CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Care Plan Goals table
CREATE TABLE IF NOT EXISTS public.care_plan_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_plan_id UUID REFERENCES public.care_plans(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    target_date DATE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority INTEGER DEFAULT 0,
    measurable_target JSONB,
    success_criteria TEXT,
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_update_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Care Plan Progress Notes table
CREATE TABLE IF NOT EXISTS public.care_plan_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_plan_id UUID REFERENCES public.care_plans(id) ON DELETE CASCADE NOT NULL,
    goal_id UUID REFERENCES public.care_plan_goals(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES auth.users(id) NOT NULL,
    note_type VARCHAR(50) CHECK (note_type IN ('progress', 'setback', 'milestone', 'review', 'adjustment')),
    note_text TEXT NOT NULL,
    mood_score INTEGER CHECK (mood_score BETWEEN 1 AND 10),
    engagement_level VARCHAR(20) CHECK (engagement_level IN ('low', 'medium', 'high')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PROVIDER NOTES SYSTEM (WITH ENCRYPTION SUPPORT)
-- =====================================================

-- Provider Notes table (encrypted content)
CREATE TABLE IF NOT EXISTS public.provider_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    appointment_id UUID,
    care_plan_id UUID REFERENCES public.care_plans(id),
    note_type VARCHAR(50) NOT NULL CHECK (note_type IN ('session', 'progress', 'assessment', 'discharge', 'intake', 'crisis', 'medication', 'other')),
    note_content TEXT NOT NULL, -- Will be encrypted at application layer
    session_date DATE NOT NULL,
    session_duration_minutes INTEGER,
    session_type VARCHAR(50) CHECK (session_type IN ('individual', 'group', 'family', 'telehealth', 'phone', 'crisis')),
    presenting_issues TEXT[],
    interventions_used TEXT[],
    patient_response TEXT,
    risk_assessment JSONB,
    is_billable BOOLEAN DEFAULT true,
    cpt_codes TEXT[],
    is_signed BOOLEAN DEFAULT false,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    
    -- Ensure signed notes have a signature timestamp
    CONSTRAINT signed_notes_must_have_timestamp CHECK (
        (is_signed = false) OR (is_signed = true AND signed_at IS NOT NULL)
    )
);

-- Note Templates table
CREATE TABLE IF NOT EXISTS public.note_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    note_type VARCHAR(50) NOT NULL,
    template_content TEXT NOT NULL,
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Global templates don't have a provider
    CONSTRAINT template_ownership CHECK (
        (is_global = true AND provider_id IS NULL) OR
        (is_global = false AND provider_id IS NOT NULL)
    )
);

-- =====================================================
-- APPOINTMENTS SYSTEM (WITH CONFLICT PREVENTION)
-- =====================================================

-- Appointments table
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    appointment_type VARCHAR(100) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60
    ) STORED,
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled')),
    location_type VARCHAR(50) CHECK (location_type IN ('in_person', 'telehealth', 'phone')),
    location_details TEXT,
    title VARCHAR(255),
    description TEXT,
    booking_notes TEXT,
    provider_notes TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB,
    parent_appointment_id UUID REFERENCES public.appointments(id),
    video_link TEXT,
    waiting_room_enabled BOOLEAN DEFAULT true,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Prevent double booking
    CONSTRAINT valid_time_range CHECK (end_time > start_time),
    CONSTRAINT no_time_travel CHECK (start_time >= created_at),
    
    -- Ensure cancelled appointments have cancellation timestamp
    CONSTRAINT cancelled_appointments_timestamp CHECK (
        (status != 'cancelled') OR (status = 'cancelled' AND cancelled_at IS NOT NULL)
    )
);

-- Appointment Change Requests table
CREATE TABLE IF NOT EXISTS public.appointment_change_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
    requested_by UUID REFERENCES auth.users(id) NOT NULL,
    request_type VARCHAR(50) CHECK (request_type IN ('reschedule', 'cancel')),
    reason TEXT,
    new_start_time TIMESTAMPTZ,
    new_end_time TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    provider_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    
    -- Reschedule requests must have new times
    CONSTRAINT reschedule_must_have_times CHECK (
        (request_type != 'reschedule') OR 
        (request_type = 'reschedule' AND new_start_time IS NOT NULL AND new_end_time IS NOT NULL)
    )
);

-- Appointment Reminders table
CREATE TABLE IF NOT EXISTS public.appointment_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE NOT NULL,
    reminder_type VARCHAR(50) CHECK (reminder_type IN ('24hr', '2hr', '15min', 'custom')),
    reminder_method VARCHAR(50) CHECK (reminder_method IN ('email', 'sms', 'push', 'in_app')),
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    message_content TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointment Waitlist table
CREATE TABLE IF NOT EXISTS public.appointment_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    appointment_type VARCHAR(100),
    preferred_date DATE,
    preferred_time_start TIME,
    preferred_time_end TIME,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'contacted', 'scheduled', 'expired', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    contacted_at TIMESTAMPTZ
);

-- Provider Availability table
CREATE TABLE IF NOT EXISTS public.provider_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday, 6 = Saturday
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    effective_from DATE DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_availability_time CHECK (end_time > start_time),
    CONSTRAINT valid_effective_dates CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Care Plans indexes
CREATE INDEX idx_care_plans_patient ON public.care_plans(patient_id);
CREATE INDEX idx_care_plans_provider ON public.care_plans(provider_id);
CREATE INDEX idx_care_plans_status ON public.care_plans(status);
CREATE INDEX idx_care_plans_review_date ON public.care_plans(review_date);

-- Care Plan Goals indexes
CREATE INDEX idx_care_plan_goals_plan ON public.care_plan_goals(care_plan_id);
CREATE INDEX idx_care_plan_goals_status ON public.care_plan_goals(status);

-- Provider Notes indexes
CREATE INDEX idx_provider_notes_provider ON public.provider_notes(provider_id);
CREATE INDEX idx_provider_notes_patient ON public.provider_notes(patient_id);
CREATE INDEX idx_provider_notes_session_date ON public.provider_notes(session_date);
CREATE INDEX idx_provider_notes_signed ON public.provider_notes(is_signed);
CREATE INDEX idx_provider_notes_deleted ON public.provider_notes(is_deleted);

-- Appointments indexes
CREATE INDEX idx_appointments_provider ON public.appointments(provider_id);
CREATE INDEX idx_appointments_patient ON public.appointments(patient_id);
CREATE INDEX idx_appointments_start_time ON public.appointments(start_time);
CREATE INDEX idx_appointments_status ON public.appointments(status);

-- Prevent double booking with exclusion constraint
ALTER TABLE public.appointments 
ADD CONSTRAINT prevent_double_booking 
EXCLUDE USING gist (
    provider_id WITH =,
    tstzrange(start_time, end_time) WITH &&
) WHERE (status NOT IN ('cancelled', 'no_show'));

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_plan_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_plan_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;

-- Care Plans RLS Policies
CREATE POLICY "Providers can manage their care plans" ON public.care_plans
    FOR ALL USING (auth.uid() = provider_id);

CREATE POLICY "Patients can view their care plans" ON public.care_plans
    FOR SELECT USING (auth.uid() = patient_id);

-- Care Plan Goals RLS Policies
CREATE POLICY "Users can view goals for their care plans" ON public.care_plan_goals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.care_plans cp
            WHERE cp.id = care_plan_goals.care_plan_id
            AND (cp.provider_id = auth.uid() OR cp.patient_id = auth.uid())
        )
    );

CREATE POLICY "Providers can manage goals" ON public.care_plan_goals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.care_plans cp
            WHERE cp.id = care_plan_goals.care_plan_id
            AND cp.provider_id = auth.uid()
        )
    );

-- Provider Notes RLS Policies
CREATE POLICY "Providers can manage their notes" ON public.provider_notes
    FOR ALL USING (auth.uid() = provider_id);

CREATE POLICY "Patients can view their signed notes" ON public.provider_notes
    FOR SELECT USING (auth.uid() = patient_id AND is_signed = true AND is_deleted = false);

-- Note Templates RLS Policies
CREATE POLICY "Providers can manage their templates" ON public.note_templates
    FOR ALL USING (auth.uid() = provider_id OR is_global = true);

CREATE POLICY "Everyone can view global templates" ON public.note_templates
    FOR SELECT USING (is_global = true);

-- Appointments RLS Policies
CREATE POLICY "Users can view their appointments" ON public.appointments
    FOR SELECT USING (auth.uid() = provider_id OR auth.uid() = patient_id);

CREATE POLICY "Providers can manage appointments" ON public.appointments
    FOR ALL USING (auth.uid() = provider_id);

CREATE POLICY "Patients can create appointments" ON public.appointments
    FOR INSERT WITH CHECK (auth.uid() = patient_id);

-- Appointment Change Requests RLS Policies
CREATE POLICY "Users can create change requests for their appointments" ON public.appointment_change_requests
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.id = appointment_change_requests.appointment_id
            AND (a.provider_id = auth.uid() OR a.patient_id = auth.uid())
        )
    );

CREATE POLICY "Users can view change requests for their appointments" ON public.appointment_change_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.appointments a
            WHERE a.id = appointment_change_requests.appointment_id
            AND (a.provider_id = auth.uid() OR a.patient_id = auth.uid())
        )
    );

-- Provider Availability RLS Policies
CREATE POLICY "Providers can manage their availability" ON public.provider_availability
    FOR ALL USING (auth.uid() = provider_id);

CREATE POLICY "Everyone can view provider availability" ON public.provider_availability
    FOR SELECT USING (is_available = true);

-- =====================================================
-- AUDIT TRIGGERS
-- =====================================================

-- Updated timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_care_plans_updated_at BEFORE UPDATE ON public.care_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_care_plan_goals_updated_at BEFORE UPDATE ON public.care_plan_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_notes_updated_at BEFORE UPDATE ON public.provider_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit log trigger for sensitive operations
CREATE OR REPLACE FUNCTION audit_sensitive_operation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.security_audit_logs (
        event_type,
        user_id,
        metadata,
        risk_level
    ) VALUES (
        TG_OP || '_' || TG_TABLE_NAME,
        auth.uid(),
        jsonb_build_object(
            'table', TG_TABLE_NAME,
            'operation', TG_OP,
            'record_id', CASE 
                WHEN TG_OP = 'DELETE' THEN OLD.id
                ELSE NEW.id
            END,
            'timestamp', NOW()
        ),
        CASE 
            WHEN TG_TABLE_NAME = 'provider_notes' THEN 'high'
            WHEN TG_TABLE_NAME = 'care_plans' THEN 'medium'
            ELSE 'low'
        END
    );
    RETURN CASE
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to sensitive tables
CREATE TRIGGER audit_care_plans AFTER INSERT OR UPDATE OR DELETE ON public.care_plans
    FOR EACH ROW EXECUTE FUNCTION audit_sensitive_operation();

CREATE TRIGGER audit_provider_notes AFTER INSERT OR UPDATE OR DELETE ON public.provider_notes
    FOR EACH ROW EXECUTE FUNCTION audit_sensitive_operation();

CREATE TRIGGER audit_appointments AFTER INSERT OR UPDATE OR DELETE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION audit_sensitive_operation();

-- =====================================================
-- STORED PROCEDURES FOR COMPLEX OPERATIONS
-- =====================================================

-- Function to check appointment conflicts
CREATE OR REPLACE FUNCTION check_appointment_conflicts(
    p_provider_id UUID,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    conflict_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO conflict_count
    FROM public.appointments
    WHERE provider_id = p_provider_id
    AND status NOT IN ('cancelled', 'no_show')
    AND (p_exclude_appointment_id IS NULL OR id != p_exclude_appointment_id)
    AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time);
    
    RETURN conflict_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get available appointment slots
CREATE OR REPLACE FUNCTION get_available_slots(
    p_provider_id UUID,
    p_date DATE,
    p_duration_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
    slot_start TIMESTAMPTZ,
    slot_end TIMESTAMPTZ
) AS $$
DECLARE
    availability RECORD;
    current_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
    slot_duration INTERVAL;
BEGIN
    slot_duration := (p_duration_minutes || ' minutes')::INTERVAL;
    
    -- Get provider's availability for the day of week
    FOR availability IN 
        SELECT * FROM public.provider_availability
        WHERE provider_id = p_provider_id
        AND day_of_week = EXTRACT(DOW FROM p_date)
        AND is_available = true
        AND p_date BETWEEN effective_from AND COALESCE(effective_to, '9999-12-31'::DATE)
    LOOP
        current_time := p_date::TIMESTAMPTZ + availability.start_time;
        end_time := p_date::TIMESTAMPTZ + availability.end_time;
        
        -- Generate slots within availability window
        WHILE current_time + slot_duration <= end_time LOOP
            -- Check if slot is available (no conflicts)
            IF NOT check_appointment_conflicts(
                p_provider_id, 
                current_time, 
                current_time + slot_duration
            ) THEN
                slot_start := current_time;
                slot_end := current_time + slot_duration;
                RETURN NEXT;
            END IF;
            
            -- Move to next slot (30-minute increments)
            current_time := current_time + INTERVAL '30 minutes';
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANTS FOR SERVICE ACCOUNT
-- =====================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify tables were created
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'care_plans', 'care_plan_goals', 'care_plan_progress',
        'provider_notes', 'note_templates',
        'appointments', 'appointment_change_requests', 
        'appointment_reminders', 'appointment_waitlist',
        'provider_availability'
    );
    
    RAISE NOTICE 'Created % pilot feature tables', table_count;
END $$;

-- Verify RLS is enabled
DO $$
DECLARE
    rls_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO rls_count
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename IN (
        'care_plans', 'care_plan_goals', 'care_plan_progress',
        'provider_notes', 'note_templates',
        'appointments', 'appointment_change_requests', 
        'appointment_reminders', 'appointment_waitlist',
        'provider_availability'
    )
    AND rowsecurity = true;
    
    RAISE NOTICE 'RLS enabled on % tables', rls_count;
END $$;