-- QUICK DATABASE SETUP
-- Copy and paste this entire file into Supabase SQL Editor
-- Go to: https://osfgyoupkmjbxwodsoqh.supabase.co/dashboard/project/osfgyoupkmjbxwodsoqh/sql

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS supporter_responses CASCADE;
DROP TABLE IF EXISTS sms_logs CASCADE;
DROP TABLE IF EXISTS crisis_alerts CASCADE;
DROP TABLE IF EXISTS provider_onboarding CASCADE;
DROP TABLE IF EXISTS support_network_members CASCADE;

-- Create tables
CREATE TABLE crisis_alerts (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical', 'emergency')),
  message TEXT,
  location JSONB,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'responded', 'resolved', 'escalated')),
  sms_sent BOOLEAN DEFAULT FALSE,
  sms_delivered_at TIMESTAMPTZ,
  responder_phone TEXT,
  first_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'simulated')),
  message_sid TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE supporter_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id TEXT REFERENCES crisis_alerts(id),
  supporter_id TEXT,
  response_type TEXT CHECK (response_type IN ('immediate', 'on_my_way', 'cant_help', 'delegated')),
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  eta_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE provider_onboarding (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_name TEXT NOT NULL,
  npi TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  temp_password TEXT,
  onboarded_at TIMESTAMPTZ DEFAULT NOW(),
  first_login_at TIMESTAMPTZ,
  simplepractice_connected BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE support_network_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  supporter_name TEXT NOT NULL,
  supporter_phone TEXT,
  supporter_email TEXT,
  supporter_user_id TEXT,
  relationship TEXT,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  patient_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_crisis_alerts_user_id ON crisis_alerts(user_id);
CREATE INDEX idx_crisis_alerts_status ON crisis_alerts(status);
CREATE INDEX idx_sms_logs_alert_id ON sms_logs(alert_id);
CREATE INDEX idx_supporter_responses_alert_id ON supporter_responses(alert_id);

-- Insert test data
INSERT INTO support_network_members (
  user_id,
  supporter_name,
  supporter_phone,
  relationship,
  priority,
  patient_name
) VALUES 
  ('test_user', 'Primary Contact', '+12404199375', 'Self', 1, 'Test Patient'),
  ('test_user', 'Backup Contact', '+12025551234', 'Friend', 2, 'Test Patient');

-- Verify tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('crisis_alerts', 'sms_logs', 'supporter_responses', 'provider_onboarding', 'support_network_members');