-- Serenity Platform Database Initialization Script
-- HIPAA-Compliant Healthcare Database Schema

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS crisis;
CREATE SCHEMA IF NOT EXISTS notification;
CREATE SCHEMA IF NOT EXISTS audit;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Auth Service Tables
CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    phone_number VARCHAR(20),
    mfa_secret TEXT,
    mfa_enabled BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    account_locked BOOLEAN DEFAULT false,
    failed_login_attempts INTEGER DEFAULT 0,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth.user_roles (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES auth.roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS auth.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crisis Service Tables
CREATE TABLE IF NOT EXISTS crisis.incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    severity_level INTEGER CHECK (severity_level BETWEEN 1 AND 5),
    status VARCHAR(50) DEFAULT 'active',
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    description TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crisis.emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    contact_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20) NOT NULL,
    contact_email VARCHAR(255),
    relationship VARCHAR(100),
    priority_level INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crisis.safety_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    plan_name VARCHAR(255),
    warning_signs TEXT[],
    coping_strategies TEXT[],
    support_network JSONB,
    professional_contacts JSONB,
    safe_environment_steps TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Service Tables
CREATE TABLE IF NOT EXISTS notification.templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE NOT NULL,
    subject VARCHAR(500),
    body_html TEXT,
    body_text TEXT,
    variables JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification.sent_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    template_id UUID REFERENCES notification.templates(id),
    channel VARCHAR(50) NOT NULL, -- email, sms, push
    recipient VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notification.user_preferences (
    user_id UUID PRIMARY KEY,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    crisis_alerts BOOLEAN DEFAULT true,
    appointment_reminders BOOLEAN DEFAULT true,
    check_in_reminders BOOLEAN DEFAULT true,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log Table (HIPAA Compliance)
CREATE TABLE IF NOT EXISTS audit.access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    action VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    request_body JSONB,
    response_status INTEGER,
    phi_accessed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON auth.users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON auth.sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON crisis.incidents(user_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON crisis.incidents(status);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user ON crisis.emergency_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_messages_user ON notification.sent_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_messages_status ON notification.sent_messages(status);
CREATE INDEX IF NOT EXISTS idx_access_logs_user ON audit.access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_created ON audit.access_logs(created_at);

-- Insert default roles
INSERT INTO auth.roles (name, description) VALUES 
    ('patient', 'Patient user with access to personal health features'),
    ('provider', 'Healthcare provider with patient management access'),
    ('supporter', 'Support person with limited patient access'),
    ('admin', 'System administrator with full access')
ON CONFLICT (name) DO NOTHING;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION audit.log_changes() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit.access_logs (
        user_id,
        resource_type,
        resource_id,
        action,
        request_body,
        phi_accessed,
        created_at
    ) VALUES (
        current_setting('app.current_user_id', true)::UUID,
        TG_TABLE_NAME,
        NEW.id::TEXT,
        TG_OP,
        to_jsonb(NEW),
        true,
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to PHI tables
DROP TRIGGER IF EXISTS audit_users_changes ON auth.users;
CREATE TRIGGER audit_users_changes 
    AFTER INSERT OR UPDATE OR DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

DROP TRIGGER IF EXISTS audit_incidents_changes ON crisis.incidents;
CREATE TRIGGER audit_incidents_changes 
    AFTER INSERT OR UPDATE OR DELETE ON crisis.incidents
    FOR EACH ROW EXECUTE FUNCTION audit.log_changes();

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA auth TO serenity_user;
GRANT USAGE ON SCHEMA crisis TO serenity_user;
GRANT USAGE ON SCHEMA notification TO serenity_user;
GRANT USAGE ON SCHEMA audit TO serenity_user;

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO serenity_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA crisis TO serenity_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA notification TO serenity_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA audit TO serenity_user;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO serenity_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA crisis TO serenity_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA notification TO serenity_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA audit TO serenity_user;