-- Notification Service Database Schema
-- HIPAA-compliant notification system with audit logging and encryption
-- Created: 2025-01-22

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Notification types enum
CREATE TYPE notification_type AS ENUM (
    'crisis',
    'check_in', 
    'goal_deadline',
    'appointment',
    'community',
    'provider',
    'system'
);

-- Notification status enum
CREATE TYPE notification_status AS ENUM (
    'queued',
    'sent',
    'delivered',
    'read',
    'acknowledged',
    'dismissed',
    'failed',
    'expired'
);

-- Communication channels enum
CREATE TYPE notification_channel AS ENUM (
    'in_app',
    'email',
    'sms',
    'whatsapp',
    'push'
);

-- Crisis severity levels
CREATE TYPE crisis_severity AS ENUM (
    'low',
    'medium', 
    'high',
    'critical',
    'emergency'
);

-- Crisis response types
CREATE TYPE crisis_response_type AS ENUM (
    'immediate',
    'on_my_way',
    'cant_help',
    'acknowledged'
);

-- Core notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    type notification_type NOT NULL,
    priority INTEGER NOT NULL DEFAULT 3 CHECK (priority >= 1 AND priority <= 4),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    status notification_status DEFAULT 'queued',
    channels notification_channel[] DEFAULT '{}',
    template_id UUID,
    template_data JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    scheduled_for TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    idempotency_key VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Audit fields for HIPAA compliance
    created_by UUID,
    audit_trail JSONB DEFAULT '[]',
    
    -- Indexes for performance
    INDEX idx_notifications_user_id (user_id),
    INDEX idx_notifications_status (status),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_scheduled_for (scheduled_for),
    INDEX idx_notifications_created_at (created_at)
);

-- Scheduled notifications table
CREATE TABLE scheduled_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    schedule_type VARCHAR(50) NOT NULL, -- 'once', 'daily', 'weekly', 'monthly', 'cron'
    cron_expression VARCHAR(100),
    next_run_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_run_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    max_occurrences INTEGER,
    current_occurrences INTEGER DEFAULT 0,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_scheduled_notifications_next_run (next_run_at),
    INDEX idx_scheduled_notifications_user_id (user_id),
    INDEX idx_scheduled_notifications_active (is_active)
);

-- Notification delivery logs for tracking and analytics
CREATE TABLE notification_delivery_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL,
    status notification_status NOT NULL,
    provider VARCHAR(100), -- 'twilio', 'sendgrid', 'firebase', etc.
    provider_message_id VARCHAR(255),
    recipient_address TEXT NOT NULL, -- email, phone, device_token, etc.
    attempt_count INTEGER DEFAULT 1,
    error_message TEXT,
    response_data JSONB,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    cost_cents INTEGER DEFAULT 0,
    
    -- Performance indexes
    INDEX idx_delivery_logs_notification_id (notification_id),
    INDEX idx_delivery_logs_channel (channel),
    INDEX idx_delivery_logs_status (status),
    INDEX idx_delivery_logs_sent_at (sent_at)
);

-- User notification preferences
CREATE TABLE notification_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE,
    channels JSONB NOT NULL DEFAULT '{"in_app": true, "email": true, "sms": false, "whatsapp": false, "push": false}',
    quiet_hours JSONB DEFAULT '{"enabled": false, "start": "22:00", "end": "08:00", "timezone": "UTC"}',
    rate_limits JSONB DEFAULT '{"maxPerDay": 50, "maxPerHour": 10, "emergencyOverride": true}',
    categories JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_preferences_user_id (user_id)
);

-- Templates for reusable notification content
CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type notification_type NOT NULL,
    channel notification_channel NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    variables TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(name, type, channel),
    INDEX idx_templates_type (type),
    INDEX idx_templates_channel (channel),
    INDEX idx_templates_active (is_active)
);

-- Queue tables for different notification types
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    to_email TEXT NOT NULL,
    from_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    html_body TEXT,
    text_body TEXT,
    template_id VARCHAR(100),
    template_data JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 3,
    max_attempts INTEGER DEFAULT 3,
    attempt_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_email_queue_status (status),
    INDEX idx_email_queue_scheduled_for (scheduled_for),
    INDEX idx_email_queue_priority (priority)
);

CREATE TABLE sms_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    to_phone TEXT NOT NULL,
    from_phone TEXT,
    message TEXT NOT NULL,
    priority INTEGER DEFAULT 3,
    max_attempts INTEGER DEFAULT 3,
    attempt_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    provider VARCHAR(50) DEFAULT 'twilio',
    provider_message_id VARCHAR(255),
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_sms_queue_status (status),
    INDEX idx_sms_queue_scheduled_for (scheduled_for),
    INDEX idx_sms_queue_priority (priority)
);

CREATE TABLE whatsapp_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    to_phone TEXT NOT NULL,
    template_name VARCHAR(100),
    template_language VARCHAR(10) DEFAULT 'en',
    template_components JSONB DEFAULT '[]',
    message_type VARCHAR(50) DEFAULT 'template', -- 'template', 'text', 'media'
    message_text TEXT,
    media_url TEXT,
    priority INTEGER DEFAULT 3,
    max_attempts INTEGER DEFAULT 3,
    attempt_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    provider_message_id VARCHAR(255),
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_whatsapp_queue_status (status),
    INDEX idx_whatsapp_queue_scheduled_for (scheduled_for),
    INDEX idx_whatsapp_queue_priority (priority)
);

CREATE TABLE push_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    device_tokens TEXT[] NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    icon VARCHAR(255),
    badge INTEGER,
    sound VARCHAR(100),
    click_action VARCHAR(255),
    data JSONB DEFAULT '{}',
    priority VARCHAR(20) DEFAULT 'normal', -- 'normal', 'high'
    max_attempts INTEGER DEFAULT 3,
    attempt_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    provider VARCHAR(50) DEFAULT 'fcm', -- 'fcm', 'apns', 'web'
    scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_push_queue_status (status),
    INDEX idx_push_queue_scheduled_for (scheduled_for),
    INDEX idx_push_queue_priority (priority)
);

-- Push notification subscriptions
CREATE TABLE push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    device_type VARCHAR(50) NOT NULL, -- 'web', 'ios', 'android'
    device_token TEXT NOT NULL,
    endpoint TEXT,
    auth_key TEXT,
    p256dh_key TEXT,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, device_token),
    INDEX idx_push_subscriptions_user_id (user_id),
    INDEX idx_push_subscriptions_active (is_active)
);

-- Crisis management tables
CREATE TABLE crisis_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    severity crisis_severity NOT NULL,
    trigger_type VARCHAR(50) NOT NULL, -- 'manual', 'voice', 'shake', 'pattern'
    message TEXT,
    location_data JSONB,
    supporter_ids UUID[] DEFAULT '{}',
    escalation_level INTEGER DEFAULT 1,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_crisis_alerts_user_id (user_id),
    INDEX idx_crisis_alerts_severity (severity),
    INDEX idx_crisis_alerts_resolved (is_resolved),
    INDEX idx_crisis_alerts_created_at (created_at)
);

CREATE TABLE crisis_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_id UUID NOT NULL REFERENCES crisis_alerts(id) ON DELETE CASCADE,
    supporter_id UUID NOT NULL,
    response_type crisis_response_type NOT NULL,
    message TEXT,
    eta_minutes INTEGER,
    location_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_crisis_responses_alert_id (alert_id),
    INDEX idx_crisis_responses_supporter_id (supporter_id)
);

-- Notification events for analytics and tracking
CREATE TABLE notification_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'created', 'sent', 'delivered', 'read', 'clicked', 'failed'
    channel notification_channel,
    user_id UUID NOT NULL,
    device_info JSONB,
    location_data JSONB,
    user_agent TEXT,
    ip_address INET,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_events_notification_id (notification_id),
    INDEX idx_events_event_type (event_type),
    INDEX idx_events_user_id (user_id),
    INDEX idx_events_created_at (created_at)
);

-- Rate limiting table
CREATE TABLE rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    channel notification_channel NOT NULL,
    period VARCHAR(20) NOT NULL, -- 'minute', 'hour', 'day'
    count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, channel, period, window_start),
    INDEX idx_rate_limits_user_channel (user_id, channel),
    INDEX idx_rate_limits_window (window_start)
);

-- Webhook configurations
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    url TEXT NOT NULL,
    events TEXT[] NOT NULL,
    secret VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_webhooks_user_id (user_id),
    INDEX idx_webhooks_active (is_active)
);

-- Webhook delivery attempts
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    attempt_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_webhook_deliveries_webhook_id (webhook_id),
    INDEX idx_webhook_deliveries_created_at (created_at)
);

-- HIPAA audit logs for all notification activities
CREATE TABLE notification_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL, -- 'notification', 'template', 'preference'
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    performed_by UUID NOT NULL,
    phi_accessed BOOLEAN DEFAULT false,
    access_reason VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    INDEX idx_audit_logs_user_id (user_id),
    INDEX idx_audit_logs_resource_type (resource_type),
    INDEX idx_audit_logs_created_at (created_at),
    INDEX idx_audit_logs_performed_by (performed_by)
);

-- Row Level Security (RLS) policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can only see their own notifications" ON notifications
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Providers can see patient notifications they manage" ON notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'provider'
            AND EXISTS (
                SELECT 1 FROM provider_patient_relationships ppr
                WHERE ppr.provider_id = p.id 
                AND ppr.patient_id = notifications.user_id
                AND ppr.is_active = true
            )
        )
    );

-- RLS policies for preferences
CREATE POLICY "Users can only manage their own preferences" ON notification_preferences
    FOR ALL USING (user_id = auth.uid());

-- RLS policies for push subscriptions
CREATE POLICY "Users can only manage their own subscriptions" ON push_subscriptions
    FOR ALL USING (user_id = auth.uid());

-- RLS policies for crisis alerts
CREATE POLICY "Users can see their own crisis alerts" ON crisis_alerts
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Supporters can see crisis alerts they're assigned to" ON crisis_alerts
    FOR SELECT USING (auth.uid() = ANY(supporter_ids));

-- RLS policies for audit logs
CREATE POLICY "Users can see their own audit logs" ON notification_audit_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can see all audit logs" ON notification_audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p 
            WHERE p.id = auth.uid() 
            AND p.role = 'admin'
        )
    );

-- Functions and triggers for audit logging
CREATE OR REPLACE FUNCTION audit_notification_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO notification_audit_logs (
            user_id, action, resource_type, resource_id, new_values, performed_by
        ) VALUES (
            NEW.user_id, 'CREATE', 'notification', NEW.id, 
            to_jsonb(NEW), COALESCE(NEW.created_by, NEW.user_id)
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO notification_audit_logs (
            user_id, action, resource_type, resource_id, old_values, new_values, performed_by
        ) VALUES (
            NEW.user_id, 'UPDATE', 'notification', NEW.id, 
            to_jsonb(OLD), to_jsonb(NEW), COALESCE(NEW.created_by, NEW.user_id)
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notification_audit_logs (
            user_id, action, resource_type, resource_id, old_values, performed_by
        ) VALUES (
            OLD.user_id, 'DELETE', 'notification', OLD.id, 
            to_jsonb(OLD), OLD.user_id
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for audit logging
CREATE TRIGGER audit_notifications_trigger
    AFTER INSERT OR UPDATE OR DELETE ON notifications
    FOR EACH ROW EXECUTE FUNCTION audit_notification_changes();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_preferences_updated_at BEFORE UPDATE ON notification_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON notification_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance optimization
CREATE INDEX CONCURRENTLY idx_notifications_composite_status_user 
    ON notifications (status, user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_notifications_composite_type_priority 
    ON notifications (type, priority, scheduled_for);

CREATE INDEX CONCURRENTLY idx_delivery_logs_composite 
    ON notification_delivery_logs (channel, status, sent_at DESC);

-- Create partial indexes for active records
CREATE INDEX CONCURRENTLY idx_push_subscriptions_active_user 
    ON push_subscriptions (user_id) WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_crisis_alerts_unresolved 
    ON crisis_alerts (user_id, created_at DESC) WHERE is_resolved = false;

-- Insert default notification templates
INSERT INTO notification_templates (name, type, channel, subject, body, variables, is_system) VALUES
('Crisis Alert Email', 'crisis', 'email', '🚨 {{userName}} needs immediate support', 
 '<h2>Crisis Alert</h2><p>{{userName}} has triggered a crisis alert and needs immediate support.</p><p><strong>Message:</strong> {{message}}</p><p><strong>Time:</strong> {{timestamp}}</p><p><strong>Location:</strong> {{location}}</p><p>Please respond as soon as possible.</p>',
 ARRAY['userName', 'message', 'timestamp', 'location'], true),

('Crisis Alert SMS', 'crisis', 'sms', null,
 '🚨 CRISIS ALERT: {{userName}} needs immediate support. Message: {{message}}. Please respond ASAP.',
 ARRAY['userName', 'message'], true),

('Crisis Alert WhatsApp', 'crisis', 'whatsapp', null,
 '🚨 *CRISIS ALERT* 🚨\n\n{{userName}} needs immediate support.\n\n*Message:* {{message}}\n*Time:* {{timestamp}}\n\nPlease respond as soon as possible.',
 ARRAY['userName', 'message', 'timestamp'], true),

('Check-in Reminder', 'check_in', 'push', null,
 'Time for your daily check-in! Take a moment to reflect on how you''re feeling today.',
 ARRAY[], true),

('Appointment Reminder', 'appointment', 'email', 'Upcoming Appointment - {{providerName}}',
 '<h2>Appointment Reminder</h2><p>You have an upcoming appointment with {{providerName}}.</p><p><strong>Date:</strong> {{appointmentDate}}</p><p><strong>Time:</strong> {{appointmentTime}}</p><p><strong>Location:</strong> {{location}}</p>',
 ARRAY['providerName', 'appointmentDate', 'appointmentTime', 'location'], true);

-- Insert default user preferences for system
INSERT INTO notification_preferences (user_id, channels, categories) VALUES
('00000000-0000-0000-0000-000000000000', 
 '{"in_app": true, "email": true, "sms": true, "whatsapp": true, "push": true}',
 '{"crisis": ["in_app", "sms", "whatsapp"], "check_in": ["in_app", "push"], "appointment": ["email", "push"], "community": ["in_app"], "provider": ["email"], "system": ["in_app"]}');

-- Create materialized view for notification analytics
CREATE MATERIALIZED VIEW notification_analytics AS
SELECT 
    DATE(created_at) as date,
    type,
    status,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
    ROUND(AVG(EXTRACT(EPOCH FROM (delivered_at - created_at))), 2) as avg_delivery_time_seconds
FROM notifications 
GROUP BY DATE(created_at), type, status;

CREATE UNIQUE INDEX idx_notification_analytics_unique 
    ON notification_analytics (date, type, status);

-- Create function to refresh analytics
CREATE OR REPLACE FUNCTION refresh_notification_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY notification_analytics;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

COMMIT;