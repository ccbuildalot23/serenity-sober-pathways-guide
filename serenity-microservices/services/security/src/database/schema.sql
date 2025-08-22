-- Security Service Database Schema
-- HIPAA-compliant audit logging and security management

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Audit Events Types
CREATE TYPE audit_event_type AS ENUM (
    'LOGIN',
    'LOGOUT',
    'DATA_ACCESS',
    'DATA_MODIFICATION',
    'DATA_EXPORT',
    'PERMISSION_CHANGE',
    'SYSTEM_ACCESS',
    'API_CALL',
    'AUTHENTICATION_FAILURE',
    'AUTHORIZATION_FAILURE',
    'PASSWORD_CHANGE',
    'ACCOUNT_LOCKOUT',
    'CONFIGURATION_CHANGE',
    'SECURITY_ALERT',
    'PHI_ACCESS',
    'PHI_EXPORT',
    'ADMIN_ACTION',
    'CRISIS_EVENT',
    'EMERGENCY_ACCESS'
);

-- Risk Levels
CREATE TYPE risk_level AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);

-- Security Status
CREATE TYPE security_status AS ENUM (
    'ACTIVE',
    'SUSPICIOUS',
    'BLOCKED',
    'INVESTIGATING'
);

-- Main audit logs table - HIPAA compliant
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event Information
    event_type audit_event_type NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    event_description TEXT,
    event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- User Information
    user_id UUID,
    username VARCHAR(255),
    user_role VARCHAR(100),
    session_id VARCHAR(255),
    
    -- Source Information
    source_ip INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    service_name VARCHAR(100),
    endpoint VARCHAR(500),
    http_method VARCHAR(10),
    
    -- Resource Information
    resource_type VARCHAR(100),
    resource_id VARCHAR(255),
    resource_name VARCHAR(255),
    patient_id UUID, -- For PHI access tracking
    
    -- Risk Assessment
    risk_level risk_level DEFAULT 'LOW',
    security_flags JSONB DEFAULT '{}',
    
    -- Request/Response Data (encrypted)
    request_data BYTEA, -- Encrypted JSON
    response_data BYTEA, -- Encrypted JSON
    
    -- Compliance Fields
    hipaa_category VARCHAR(100),
    retention_required_until DATE,
    
    -- Status and Metadata
    status security_status DEFAULT 'ACTIVE',
    metadata JSONB DEFAULT '{}',
    tags TEXT[],
    
    -- Audit Trail
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255),
    updated_at TIMESTAMPTZ,
    updated_by VARCHAR(255),
    
    -- Constraints
    CONSTRAINT valid_timestamp CHECK (event_timestamp <= NOW()),
    CONSTRAINT valid_retention CHECK (retention_required_until >= CURRENT_DATE)
);

-- Security events table for real-time monitoring
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    audit_log_id UUID REFERENCES audit_logs(id),
    
    -- Event Classification
    severity risk_level NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    
    -- Detection Information
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    detection_method VARCHAR(100),
    confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- Response Information
    response_required BOOLEAN DEFAULT FALSE,
    response_deadline TIMESTAMPTZ,
    assigned_to VARCHAR(255),
    status VARCHAR(50) DEFAULT 'OPEN',
    
    -- Additional Context
    threat_indicators JSONB DEFAULT '{}',
    mitigation_steps TEXT[],
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ
);

-- API access logs for rate limiting and monitoring
CREATE TABLE api_access_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Request Information
    api_key_hash VARCHAR(255),
    endpoint VARCHAR(500) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    source_ip INET NOT NULL,
    user_agent TEXT,
    
    -- Timing Information
    request_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    response_time_ms INTEGER,
    
    -- Status Information
    status_code INTEGER NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    
    -- Rate Limiting
    requests_count INTEGER DEFAULT 1,
    rate_limit_exceeded BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    metadata JSONB DEFAULT '{}'
);

-- Authentication attempts for security monitoring
CREATE TABLE auth_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Attempt Information
    username VARCHAR(255),
    user_id UUID,
    auth_method VARCHAR(50) NOT NULL,
    
    -- Success/Failure
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(255),
    
    -- Source Information
    source_ip INET NOT NULL,
    user_agent TEXT,
    location_country VARCHAR(3),
    location_city VARCHAR(100),
    
    -- Risk Assessment
    risk_score DECIMAL(3,2) CHECK (risk_score >= 0 AND risk_score <= 1),
    suspicious_indicators JSONB DEFAULT '{}',
    
    -- Timestamps
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    session_duration INTERVAL
);

-- System configuration audit
CREATE TABLE configuration_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Change Information
    component VARCHAR(100) NOT NULL,
    setting_name VARCHAR(255) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    
    -- Change Context
    changed_by VARCHAR(255) NOT NULL,
    change_reason TEXT,
    approval_required BOOLEAN DEFAULT FALSE,
    approved_by VARCHAR(255),
    approved_at TIMESTAMPTZ,
    
    -- Timestamps
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_at TIMESTAMPTZ,
    
    -- Status
    status VARCHAR(50) DEFAULT 'PENDING',
    rollback_data JSONB
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_event_timestamp ON audit_logs(event_timestamp DESC);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_risk_level ON audit_logs(risk_level);
CREATE INDEX idx_audit_logs_patient_id ON audit_logs(patient_id);
CREATE INDEX idx_audit_logs_source_ip ON audit_logs(source_ip);
CREATE INDEX idx_audit_logs_session_id ON audit_logs(session_id);
CREATE INDEX idx_audit_logs_hipaa_category ON audit_logs(hipaa_category);

CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_detected_at ON security_events(detected_at DESC);
CREATE INDEX idx_security_events_status ON security_events(status);

CREATE INDEX idx_api_access_logs_timestamp ON api_access_logs(request_timestamp DESC);
CREATE INDEX idx_api_access_logs_source_ip ON api_access_logs(source_ip);
CREATE INDEX idx_api_access_logs_endpoint ON api_access_logs(endpoint);

CREATE INDEX idx_auth_attempts_attempted_at ON auth_attempts(attempted_at DESC);
CREATE INDEX idx_auth_attempts_username ON auth_attempts(username);
CREATE INDEX idx_auth_attempts_source_ip ON auth_attempts(source_ip);
CREATE INDEX idx_auth_attempts_success ON auth_attempts(success);

-- Partitioning for audit_logs (by month for performance)
-- This would be implemented in production for better performance
-- CREATE TABLE audit_logs_y2024m01 PARTITION OF audit_logs 
-- FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Row Level Security (RLS) for compliance
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_attempts ENABLE ROW LEVEL SECURITY;

-- Create security policies (to be customized based on user roles)
CREATE POLICY audit_logs_access_policy ON audit_logs
    FOR ALL TO authenticated_users
    USING (true); -- Customize based on your authentication system

-- Views for common queries
CREATE VIEW high_risk_events AS
SELECT 
    al.*,
    se.severity,
    se.detection_method,
    se.confidence_score
FROM audit_logs al
LEFT JOIN security_events se ON al.id = se.audit_log_id
WHERE al.risk_level IN ('HIGH', 'CRITICAL')
   OR se.severity IN ('HIGH', 'CRITICAL');

CREATE VIEW phi_access_audit AS
SELECT 
    id,
    event_type,
    event_name,
    user_id,
    username,
    user_role,
    patient_id,
    source_ip,
    event_timestamp,
    hipaa_category,
    risk_level
FROM audit_logs
WHERE patient_id IS NOT NULL
   OR hipaa_category IS NOT NULL
   OR event_type IN ('PHI_ACCESS', 'PHI_EXPORT');

-- Functions for audit log management
CREATE OR REPLACE FUNCTION encrypt_audit_data(data_text TEXT, encryption_key TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN pgp_sym_encrypt(data_text, encryption_key);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_audit_data(encrypted_data BYTEA, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted_data, encryption_key);
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for automatic retention date calculation
CREATE OR REPLACE FUNCTION set_retention_date()
RETURNS TRIGGER AS $$
BEGIN
    -- HIPAA requires 6 years minimum retention for audit logs
    NEW.retention_required_until = CURRENT_DATE + INTERVAL '6 years';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_retention_trigger
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_retention_date();

-- Function to clean up old audit logs (for GDPR compliance)
CREATE OR REPLACE FUNCTION cleanup_expired_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs 
    WHERE retention_required_until < CURRENT_DATE
    AND status = 'ACTIVE';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grants (adjust based on your user management system)
-- GRANT SELECT, INSERT ON audit_logs TO security_service_user;
-- GRANT SELECT, INSERT ON security_events TO security_service_user;
-- GRANT SELECT, INSERT ON api_access_logs TO security_service_user;
-- GRANT SELECT, INSERT ON auth_attempts TO security_service_user;