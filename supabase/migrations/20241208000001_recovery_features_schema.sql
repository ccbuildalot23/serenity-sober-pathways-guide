-- Recovery Features Database Schema
-- This migration adds tables for the 8 core recovery features

-- HALT Assessments Table
CREATE TABLE IF NOT EXISTS halt_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    hungry INTEGER NOT NULL CHECK (hungry >= 1 AND hungry <= 10),
    angry INTEGER NOT NULL CHECK (angry >= 1 AND angry <= 10),
    lonely INTEGER NOT NULL CHECK (lonely >= 1 AND lonely <= 10),
    tired INTEGER NOT NULL CHECK (tired >= 1 AND tired <= 10),
    total_score INTEGER GENERATED ALWAYS AS (hungry + angry + lonely + tired) STORED,
    is_crisis BOOLEAN GENERATED ALWAYS AS (
        (hungry >= 8 AND angry >= 8) OR 
        (hungry >= 8 AND lonely >= 8) OR 
        (hungry >= 8 AND tired >= 8) OR 
        (angry >= 8 AND lonely >= 8) OR 
        (angry >= 8 AND tired >= 8) OR 
        (lonely >= 8 AND tired >= 8) OR
        (hungry + angry + lonely + tired >= 32)
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security for HALT assessments
ALTER TABLE halt_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own HALT assessments" ON halt_assessments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own HALT assessments" ON halt_assessments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Craving Sessions Table
CREATE TABLE IF NOT EXISTS craving_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    intensity_before INTEGER NOT NULL CHECK (intensity_before >= 1 AND intensity_before <= 10),
    intensity_after INTEGER CHECK (intensity_after >= 1 AND intensity_after <= 10),
    duration INTEGER DEFAULT 0, -- in seconds
    completed BOOLEAN DEFAULT FALSE,
    distraction_used TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security for craving sessions
ALTER TABLE craving_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own craving sessions" ON craving_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own craving sessions" ON craving_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own craving sessions" ON craving_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Playing It Forward Sessions Table
CREATE TABLE IF NOT EXISTS playing_forward_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    selected_goals TEXT[] NOT NULL,
    path_explored TEXT NOT NULL CHECK (path_explored IN ('using', 'staying_clean')),
    is_vulnerable BOOLEAN DEFAULT FALSE,
    timeframe_reached TEXT CHECK (timeframe_reached IN ('immediate', 'oneDay', 'oneWeek', 'oneMonth')),
    session_duration INTEGER DEFAULT 0, -- in seconds
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security for playing forward sessions
ALTER TABLE playing_forward_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own playing forward sessions" ON playing_forward_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own playing forward sessions" ON playing_forward_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playing forward sessions" ON playing_forward_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Saved Meetings Table
CREATE TABLE IF NOT EXISTS saved_meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meeting_id TEXT NOT NULL,
    meeting_name TEXT,
    meeting_location TEXT,
    meeting_time TEXT,
    meeting_type TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, meeting_id)
);

-- Row Level Security for saved meetings
ALTER TABLE saved_meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved meetings" ON saved_meetings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved meetings" ON saved_meetings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved meetings" ON saved_meetings
    FOR DELETE USING (auth.uid() = user_id);

-- Meeting Attendance Table
CREATE TABLE IF NOT EXISTS meeting_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    meeting_id TEXT NOT NULL,
    meeting_name TEXT,
    meeting_type TEXT,
    attended_at TIMESTAMPTZ DEFAULT NOW(),
    duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security for meeting attendance
ALTER TABLE meeting_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meeting attendance" ON meeting_attendance
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meeting attendance" ON meeting_attendance
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enhanced Check-in Emotions Table (for one-tap emotional scale)
CREATE TABLE IF NOT EXISTS checkin_emotions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    checkin_id UUID REFERENCES daily_checkins(id) ON DELETE CASCADE,
    emotion_type TEXT NOT NULL, -- 'happy', 'sad', 'angry', 'anxious', 'hopeful', etc.
    intensity INTEGER NOT NULL CHECK (intensity >= 1 AND intensity <= 10),
    context_tags TEXT[], -- ['craving', 'lonely', 'tired', 'celebrating', etc.]
    quick_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security for checkin emotions
ALTER TABLE checkin_emotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkin emotions" ON checkin_emotions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checkin emotions" ON checkin_emotions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Recovery Milestones Table (for enhanced sobriety tracker)
CREATE TABLE IF NOT EXISTS recovery_milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    milestone_days INTEGER NOT NULL,
    milestone_type TEXT NOT NULL, -- 'sobriety', 'meeting_attendance', 'check_in_streak'
    achieved_at TIMESTAMPTZ DEFAULT NOW(),
    celebration_message TEXT,
    shared BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security for recovery milestones
ALTER TABLE recovery_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recovery milestones" ON recovery_milestones
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recovery milestones" ON recovery_milestones
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Support Network Notifications Table
CREATE TABLE IF NOT EXISTS support_network_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL, -- 'crisis_alert', 'milestone_celebration', 'support_request'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'crisis')),
    action_required BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security for support network notifications
ALTER TABLE support_network_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON support_network_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Supporters can view notifications they're assigned to" ON support_network_notifications
    FOR SELECT USING (auth.uid() = supporter_id);

CREATE POLICY "Users can insert notifications for their supporters" ON support_network_notifications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Supporters can update assigned notifications" ON support_network_notifications
    FOR UPDATE USING (auth.uid() = supporter_id);

-- Crisis Integration Events Table
CREATE TABLE IF NOT EXISTS crisis_integration_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trigger_source TEXT NOT NULL, -- 'halt_assessment', 'craving_timer', 'checkin_pattern', 'peer_chat'
    trigger_data JSONB,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'crisis')),
    crisis_system_activated BOOLEAN DEFAULT FALSE,
    support_network_notified BOOLEAN DEFAULT FALSE,
    response_actions TEXT[],
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security for crisis integration events
ALTER TABLE crisis_integration_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own crisis integration events" ON crisis_integration_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crisis integration events" ON crisis_integration_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Providers can view crisis events for their patients" ON crisis_integration_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_provider_relationships upr
            WHERE upr.patient_id = user_id 
            AND upr.provider_id = auth.uid()
            AND upr.status = 'active'
        )
    );

-- Indexes for performance
CREATE INDEX idx_halt_assessments_user_created ON halt_assessments(user_id, created_at DESC);
CREATE INDEX idx_halt_assessments_crisis ON halt_assessments(user_id, is_crisis, created_at DESC);
CREATE INDEX idx_craving_sessions_user_created ON craving_sessions(user_id, created_at DESC);
CREATE INDEX idx_craving_sessions_completed ON craving_sessions(user_id, completed, created_at DESC);
CREATE INDEX idx_playing_forward_user_vulnerable ON playing_forward_sessions(user_id, is_vulnerable, created_at DESC);
CREATE INDEX idx_meeting_attendance_user_type ON meeting_attendance(user_id, meeting_type, attended_at DESC);
CREATE INDEX idx_support_notifications_user_read ON support_network_notifications(user_id, read_at, severity);
CREATE INDEX idx_crisis_events_user_severity ON crisis_integration_events(user_id, severity, created_at DESC);

-- Functions for analytics

-- Get HALT assessment trends
CREATE OR REPLACE FUNCTION get_halt_trends(
    user_uuid UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    assessment_date DATE,
    avg_hungry NUMERIC,
    avg_angry NUMERIC,
    avg_lonely NUMERIC,
    avg_tired NUMERIC,
    crisis_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        created_at::DATE as assessment_date,
        AVG(hungry) as avg_hungry,
        AVG(angry) as avg_angry,
        AVG(lonely) as avg_lonely,
        AVG(tired) as avg_tired,
        COUNT(*) FILTER (WHERE is_crisis = true) as crisis_count
    FROM halt_assessments
    WHERE user_id = user_uuid
    AND created_at >= NOW() - (days_back || ' days')::INTERVAL
    GROUP BY created_at::DATE
    ORDER BY assessment_date DESC;
$$;

-- Get craving session success rate
CREATE OR REPLACE FUNCTION get_craving_success_rate(
    user_uuid UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_sessions BIGINT,
    completed_sessions BIGINT,
    success_rate NUMERIC,
    avg_intensity_reduction NUMERIC
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE completed = true) as completed_sessions,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                ROUND((COUNT(*) FILTER (WHERE completed = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 1)
            ELSE 0 
        END as success_rate,
        AVG(intensity_before - COALESCE(intensity_after, intensity_before)) FILTER (WHERE completed = true) as avg_intensity_reduction
    FROM craving_sessions
    WHERE user_id = user_uuid
    AND created_at >= NOW() - (days_back || ' days')::INTERVAL;
$$;

-- Get meeting attendance streak
CREATE OR REPLACE FUNCTION get_meeting_streak(
    user_uuid UUID
)
RETURNS TABLE (
    current_streak INTEGER,
    longest_streak INTEGER,
    total_meetings BIGINT,
    favorite_meeting_type TEXT
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    WITH attendance_dates AS (
        SELECT DISTINCT attended_at::DATE as attendance_date
        FROM meeting_attendance
        WHERE user_id = user_uuid
        ORDER BY attendance_date DESC
    ),
    streak_calc AS (
        SELECT 
            attendance_date,
            ROW_NUMBER() OVER (ORDER BY attendance_date DESC) - 
            EXTRACT(DAY FROM NOW()::DATE - attendance_date) as streak_group
        FROM attendance_dates
    ),
    current_streak_calc AS (
        SELECT COUNT(*) as current_streak
        FROM streak_calc
        WHERE streak_group = 0
    ),
    meeting_stats AS (
        SELECT 
            COUNT(*) as total_meetings,
            MODE() WITHIN GROUP (ORDER BY meeting_type) as favorite_meeting_type
        FROM meeting_attendance
        WHERE user_id = user_uuid
    )
    SELECT 
        COALESCE(cs.current_streak, 0)::INTEGER as current_streak,
        0::INTEGER as longest_streak, -- TODO: Calculate longest streak
        ms.total_meetings,
        ms.favorite_meeting_type
    FROM current_streak_calc cs
    CROSS JOIN meeting_stats ms;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_halt_trends(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_craving_success_rate(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_meeting_streak(UUID) TO authenticated;