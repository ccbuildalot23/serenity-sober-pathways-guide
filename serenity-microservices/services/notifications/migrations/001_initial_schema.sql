-- Notification Service Database Schema
-- HIPAA-compliant notification tracking and management

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE notification_type AS ENUM (
  'crisis_alert',
  'checkin_reminder',
  'appointment_reminder',
  'medication_reminder',
  'milestone_celebration',
  'support_message',
  'system_notification',
  'security_alert',
  'backup_notification'
);

CREATE TYPE notification_channel AS ENUM (
  'email',
  'sms',
  'push',
  'in_app',
  'voice'
);

CREATE TYPE notification_priority AS ENUM (
  'low',
  'normal',
  'high',
  'critical',
  'emergency'
);

CREATE TYPE notification_status AS ENUM (
  'pending',
  'queued',
  'processing',
  'sent',
  'delivered',
  'failed',
  'cancelled',
  'expired'
);

-- Notification templates table
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  subject TEXT,
  body TEXT NOT NULL,
  html_body TEXT,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  is_hipaa_compliant BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  UNIQUE(name, version)
);

-- User notification preferences table
CREATE TABLE user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  email_address VARCHAR(255),
  email_verified BOOLEAN DEFAULT false,
  sms_enabled BOOLEAN DEFAULT true,
  sms_phone_number VARCHAR(20),
  sms_verified BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  push_device_tokens JSONB DEFAULT '[]',
  in_app_enabled BOOLEAN DEFAULT true,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone VARCHAR(50),
  type_preferences JSONB DEFAULT '{}',
  emergency_override BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification logs table (main tracking table)
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL,
  user_id UUID NOT NULL,
  type notification_type NOT NULL,
  channel notification_channel NOT NULL,
  status notification_status DEFAULT 'pending',
  priority notification_priority DEFAULT 'normal',
  template_id UUID REFERENCES notification_templates(id),
  data JSONB NOT NULL DEFAULT '{}',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  metadata JSONB DEFAULT '{}',
  is_hipaa_compliant BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for performance
  INDEX idx_notification_logs_user_id (user_id),
  INDEX idx_notification_logs_status (status),
  INDEX idx_notification_logs_type (type),
  INDEX idx_notification_logs_channel (channel),
  INDEX idx_notification_logs_scheduled_at (scheduled_at),
  INDEX idx_notification_logs_created_at (created_at),
  INDEX idx_notification_logs_notification_id (notification_id)
);

-- Audit trail table for HIPAA compliance
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_log_id UUID REFERENCES notification_logs(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  action VARCHAR(100) NOT NULL,
  user_id UUID,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  
  -- Indexes
  INDEX idx_audit_logs_notification_log_id (notification_log_id),
  INDEX idx_audit_logs_timestamp (timestamp),
  INDEX idx_audit_logs_action (action),
  INDEX idx_audit_logs_user_id (user_id)
);

-- Delivery status tracking table
CREATE TABLE delivery_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_log_id UUID REFERENCES notification_logs(id) ON DELETE CASCADE,
  status notification_status NOT NULL,
  channel notification_channel NOT NULL,
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  error_details JSONB,
  delivery_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes
  INDEX idx_delivery_status_notification_log_id (notification_log_id),
  INDEX idx_delivery_status_status (status),
  INDEX idx_delivery_status_next_retry_at (next_retry_at)
);

-- Notification queue table (for async processing)
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type VARCHAR(50) NOT NULL DEFAULT 'notification',
  payload JSONB NOT NULL,
  priority INTEGER DEFAULT 5,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  process_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  
  -- Indexes
  INDEX idx_notification_queue_process_at (process_at),
  INDEX idx_notification_queue_priority (priority),
  INDEX idx_notification_queue_type (type),
  INDEX idx_notification_queue_attempts (attempts)
);

-- Notification metrics aggregation table
CREATE TABLE notification_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  hour INTEGER CHECK (hour >= 0 AND hour <= 23),
  type notification_type,
  channel notification_channel,
  status notification_status,
  count INTEGER DEFAULT 0,
  avg_delivery_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint for aggregation
  UNIQUE(date, hour, type, channel, status),
  
  -- Indexes
  INDEX idx_notification_metrics_date (date),
  INDEX idx_notification_metrics_type (type),
  INDEX idx_notification_metrics_channel (channel),
  INDEX idx_notification_metrics_status (status)
);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notification_templates_updated_at 
  BEFORE UPDATE ON notification_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at 
  BEFORE UPDATE ON user_notification_preferences 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_logs_updated_at 
  BEFORE UPDATE ON notification_logs 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_delivery_status_updated_at 
  BEFORE UPDATE ON delivery_status 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create audit log entries
CREATE OR REPLACE FUNCTION create_audit_log()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (notification_log_id, action, details)
    VALUES (NEW.id, 'created', to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (notification_log_id, action, details)
    VALUES (NEW.id, 'updated', jsonb_build_object(
      'old', to_jsonb(OLD),
      'new', to_jsonb(NEW)
    ));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (notification_log_id, action, details)
    VALUES (OLD.id, 'deleted', to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

-- Create audit trigger for notification_logs
CREATE TRIGGER notification_logs_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON notification_logs
  FOR EACH ROW EXECUTE FUNCTION create_audit_log();

-- Create function to clean up old data (HIPAA compliance)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  retention_days INTEGER := 2555; -- 7 years for HIPAA
  deleted_count INTEGER;
BEGIN
  DELETE FROM notification_logs 
  WHERE created_at < NOW() - INTERVAL '1 day' * retention_days;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Also clean up orphaned records
  DELETE FROM delivery_status 
  WHERE notification_log_id NOT IN (SELECT id FROM notification_logs);
  
  DELETE FROM audit_logs 
  WHERE notification_log_id NOT IN (SELECT id FROM notification_logs);
  
  RETURN deleted_count;
END;
$$ language 'plpgsql';

-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_notification_logs_composite_status_priority 
  ON notification_logs (status, priority, scheduled_at);

CREATE INDEX CONCURRENTLY idx_notification_logs_user_created_desc 
  ON notification_logs (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_audit_logs_timestamp_desc 
  ON audit_logs (timestamp DESC);

-- Add comments for documentation
COMMENT ON TABLE notification_templates IS 'HIPAA-compliant notification templates';
COMMENT ON TABLE notification_logs IS 'Main notification tracking table with full audit trail';
COMMENT ON TABLE audit_logs IS 'HIPAA audit trail for all notification activities';
COMMENT ON TABLE user_notification_preferences IS 'User preferences for notification delivery';
COMMENT ON TABLE delivery_status IS 'Detailed delivery tracking and retry logic';
COMMENT ON TABLE notification_queue IS 'Async processing queue for notifications';
COMMENT ON TABLE notification_metrics IS 'Aggregated metrics for reporting and analytics';