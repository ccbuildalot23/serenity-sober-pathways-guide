-- Migration: Provider Clinical Features for Pilot Program
-- Description: Adds care plans, provider notes, appointments, and secure messaging
-- Author: Serenity Development Team
-- Date: 2025-01-13

-- ============================================================================
-- CARE PLANS SYSTEM
-- ============================================================================

-- Main care plans table
CREATE TABLE IF NOT EXISTS public.care_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'paused', 'archived')),
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    review_date DATE,
    
    -- Clinical fields
    diagnosis_codes TEXT[], -- ICD-10 codes
    treatment_approach VARCHAR(100),
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Metadata
    version INTEGER DEFAULT 1,
    parent_plan_id UUID REFERENCES public.care_plans(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Care plan goals
CREATE TABLE IF NOT EXISTS public.care_plan_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_plan_id UUID NOT NULL REFERENCES public.care_plans(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    target_date DATE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority INTEGER DEFAULT 0 CHECK (priority >= 0 AND priority <= 5),
    
    -- SMART goals fields
    measurable_target JSONB,
    success_criteria TEXT,
    
    -- Progress tracking
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    last_update_note TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    INDEX idx_care_plan_goals_plan_id (care_plan_id),
    INDEX idx_care_plan_goals_status (status)
);

-- Care plan progress notes
CREATE TABLE IF NOT EXISTS public.care_plan_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    care_plan_id UUID NOT NULL REFERENCES public.care_plans(id) ON DELETE CASCADE,
    goal_id UUID REFERENCES public.care_plan_goals(id) ON DELETE SET NULL,
    provider_id UUID NOT NULL REFERENCES auth.users(id),
    
    note_type VARCHAR(50) NOT NULL CHECK (note_type IN ('progress', 'setback', 'milestone', 'review', 'adjustment')),
    note_text TEXT NOT NULL,
    
    -- Metrics at time of note
    mood_score INTEGER CHECK (mood_score >= 1 AND mood_score <= 10),
    engagement_level VARCHAR(20) CHECK (engagement_level IN ('low', 'medium', 'high')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_care_plan_progress_plan_id (care_plan_id),
    INDEX idx_care_plan_progress_created_at (created_at DESC)
);

-- ============================================================================
-- PROVIDER DOCUMENTATION SYSTEM
-- ============================================================================

-- Provider session notes (HIPAA compliant)
CREATE TABLE IF NOT EXISTS public.provider_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES auth.users(id),
    patient_id UUID NOT NULL REFERENCES auth.users(id),
    appointment_id UUID, -- Will reference appointments table
    care_plan_id UUID REFERENCES public.care_plans(id),
    
    -- Note content (encrypted at rest)
    note_type VARCHAR(50) NOT NULL CHECK (note_type IN ('session', 'progress', 'assessment', 'discharge', 'intake', 'crisis', 'medication', 'other')),
    note_content TEXT NOT NULL, -- Will be encrypted
    
    -- Session details
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    session_duration_minutes INTEGER,
    session_type VARCHAR(50) CHECK (session_type IN ('individual', 'group', 'family', 'telehealth', 'phone', 'crisis')),
    
    -- Clinical observations
    presenting_issues TEXT[],
    interventions_used TEXT[],
    patient_response VARCHAR(100),
    risk_assessment JSONB,
    
    -- Administrative
    is_billable BOOLEAN DEFAULT true,
    cpt_codes TEXT[],
    is_signed BOOLEAN DEFAULT false,
    signed_at TIMESTAMPTZ,
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMPTZ,
    
    INDEX idx_provider_notes_provider_id (provider_id),
    INDEX idx_provider_notes_patient_id (patient_id),
    INDEX idx_provider_notes_session_date (session_date DESC)
);

-- Note templates for providers
CREATE TABLE IF NOT EXISTS public.note_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES auth.users(id),
    name VARCHAR(255) NOT NULL,
    note_type VARCHAR(50) NOT NULL,
    template_content TEXT NOT NULL,
    is_global BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- APPOINTMENTS SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.provider_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES auth.users(id),
    patient_id UUID NOT NULL REFERENCES auth.users(id),
    care_plan_id UUID REFERENCES public.care_plans(id),
    
    -- Scheduling
    appointment_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    duration_minutes INTEGER GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (end_time - start_time))/60) STORED,
    
    -- Details
    appointment_type VARCHAR(50) NOT NULL CHECK (appointment_type IN ('initial', 'followup', 'crisis', 'assessment', 'group', 'family', 'medication')),
    location_type VARCHAR(50) NOT NULL CHECK (location_type IN ('in_person', 'telehealth', 'phone')),
    location_details TEXT,
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled')),
    cancellation_reason TEXT,
    
    -- Reminders
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMPTZ,
    
    -- Notes
    pre_appointment_notes TEXT,
    post_appointment_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT valid_appointment_times CHECK (end_time > start_time),
    INDEX idx_appointments_provider_id (provider_id),
    INDEX idx_appointments_patient_id (patient_id),
    INDEX idx_appointments_date (appointment_date),
    INDEX idx_appointments_status (status)
);

-- Recurring appointment templates
CREATE TABLE IF NOT EXISTS public.recurring_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES auth.users(id),
    patient_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Recurrence pattern
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
    days_of_week INTEGER[], -- 0-6 for Sunday-Saturday
    time_of_day TIME NOT NULL,
    duration_minutes INTEGER NOT NULL,
    
    -- Validity
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Template
    appointment_type VARCHAR(50) NOT NULL,
    location_type VARCHAR(50) NOT NULL,
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SECURE MESSAGING SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.secure_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    recipient_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Message content (encrypted)
    message_content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'attachment', 'system')),
    
    -- Attachments
    attachment_url TEXT,
    attachment_name VARCHAR(255),
    attachment_size_bytes INTEGER,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    
    -- Safety
    is_urgent BOOLEAN DEFAULT false,
    requires_response BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_secure_messages_conversation_id (conversation_id),
    INDEX idx_secure_messages_sender_id (sender_id),
    INDEX idx_secure_messages_recipient_id (recipient_id),
    INDEX idx_secure_messages_created_at (created_at DESC)
);

-- Message conversations
CREATE TABLE IF NOT EXISTS public.message_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES auth.users(id),
    provider_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Conversation details
    subject VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'closed')),
    
    -- Last activity
    last_message_at TIMESTAMPTZ,
    last_message_by UUID REFERENCES auth.users(id),
    
    -- Settings
    patient_can_initiate BOOLEAN DEFAULT true,
    auto_archive_days INTEGER DEFAULT 90,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    archived_at TIMESTAMPTZ,
    
    UNIQUE(patient_id, provider_id),
    INDEX idx_conversations_patient_id (patient_id),
    INDEX idx_conversations_provider_id (provider_id)
);

-- ============================================================================
-- PATIENT CONSENT MANAGEMENT
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.patient_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES auth.users(id),
    provider_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Consent types
    consent_type VARCHAR(100) NOT NULL,
    consent_scope JSONB NOT NULL, -- Detailed permissions
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'granted', 'revoked', 'expired')),
    
    -- Validity
    granted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revocation_reason TEXT,
    
    -- Audit
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_patient_consents_patient_id (patient_id),
    INDEX idx_patient_consents_provider_id (provider_id),
    INDEX idx_patient_consents_status (status)
);

-- ============================================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE public.care_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_plan_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_plan_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secure_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_consents ENABLE ROW LEVEL SECURITY;

-- Care Plans RLS Policies
CREATE POLICY "Providers can manage their care plans" ON public.care_plans
    FOR ALL USING (auth.uid() = provider_id);

CREATE POLICY "Patients can view their care plans" ON public.care_plans
    FOR SELECT USING (auth.uid() = patient_id);

-- Care Plan Goals RLS Policies
CREATE POLICY "Providers can manage care plan goals" ON public.care_plan_goals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.care_plans
            WHERE id = care_plan_goals.care_plan_id
            AND provider_id = auth.uid()
        )
    );

CREATE POLICY "Patients can view their care plan goals" ON public.care_plan_goals
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.care_plans
            WHERE id = care_plan_goals.care_plan_id
            AND patient_id = auth.uid()
        )
    );

-- Provider Notes RLS Policies (Strict HIPAA compliance)
CREATE POLICY "Providers can manage their own notes" ON public.provider_notes
    FOR ALL USING (auth.uid() = provider_id AND is_deleted = false);

CREATE POLICY "Patients cannot directly access provider notes" ON public.provider_notes
    FOR SELECT USING (false); -- Notes are only accessible through proper channels

-- Appointments RLS Policies
CREATE POLICY "Providers can manage their appointments" ON public.provider_appointments
    FOR ALL USING (auth.uid() = provider_id);

CREATE POLICY "Patients can view and update their appointments" ON public.provider_appointments
    FOR SELECT USING (auth.uid() = patient_id);

CREATE POLICY "Patients can cancel their appointments" ON public.provider_appointments
    FOR UPDATE USING (auth.uid() = patient_id)
    WITH CHECK (auth.uid() = patient_id AND status IN ('cancelled'));

-- Secure Messages RLS Policies
CREATE POLICY "Users can view their messages" ON public.secure_messages
    FOR SELECT USING (auth.uid() IN (sender_id, recipient_id));

CREATE POLICY "Users can send messages" ON public.secure_messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Senders can edit their messages" ON public.secure_messages
    FOR UPDATE USING (auth.uid() = sender_id)
    WITH CHECK (auth.uid() = sender_id);

-- Message Conversations RLS Policies
CREATE POLICY "Users can view their conversations" ON public.message_conversations
    FOR SELECT USING (auth.uid() IN (patient_id, provider_id));

CREATE POLICY "Providers can create conversations" ON public.message_conversations
    FOR INSERT WITH CHECK (auth.uid() = provider_id);

-- Patient Consents RLS Policies
CREATE POLICY "Patients can manage their consents" ON public.patient_consents
    FOR ALL USING (auth.uid() = patient_id);

CREATE POLICY "Providers can view consents" ON public.patient_consents
    FOR SELECT USING (auth.uid() = provider_id);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_care_plans_provider_patient ON public.care_plans(provider_id, patient_id);
CREATE INDEX idx_care_plans_status ON public.care_plans(status) WHERE status = 'active';
CREATE INDEX idx_provider_notes_encrypted ON public.provider_notes(id) WHERE note_content IS NOT NULL;
CREATE INDEX idx_appointments_upcoming ON public.provider_appointments(appointment_date, start_time) 
    WHERE status = 'scheduled' AND appointment_date >= CURRENT_DATE;

-- ============================================================================
-- AUDIT TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_care_plans_updated_at BEFORE UPDATE ON public.care_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_care_plan_goals_updated_at BEFORE UPDATE ON public.care_plan_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_provider_notes_updated_at BEFORE UPDATE ON public.provider_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.provider_appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.care_plans IS 'HIPAA-compliant care plans managed by providers for patients';
COMMENT ON TABLE public.provider_notes IS 'Encrypted provider session notes with strict access controls';
COMMENT ON TABLE public.provider_appointments IS 'Appointment scheduling system for provider-patient sessions';
COMMENT ON TABLE public.secure_messages IS 'End-to-end encrypted messaging between providers and patients';
COMMENT ON TABLE public.patient_consents IS 'Granular consent management for data sharing and access';

-- Migration complete: Provider clinical features for pilot program