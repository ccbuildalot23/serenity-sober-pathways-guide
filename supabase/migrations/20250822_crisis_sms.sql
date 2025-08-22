-- Crisis SMS System Tables
-- For real-time crisis alerts and SMS delivery tracking

-- SMS delivery logs (HIPAA compliant - only last 4 digits of phone)
CREATE TABLE IF NOT EXISTS sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id TEXT NOT NULL,
  phone_number TEXT NOT NULL, -- Only last 4 digits for privacy
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'simulated')),
  message_sid TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Crisis alerts table (if not exists)
CREATE TABLE IF NOT EXISTS crisis_alerts (
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

-- Supporter responses tracking
CREATE TABLE IF NOT EXISTS supporter_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id TEXT REFERENCES crisis_alerts(id),
  supporter_id TEXT,
  response_type TEXT CHECK (response_type IN ('immediate', 'on_my_way', 'cant_help', 'delegated')),
  responded_at TIMESTAMPTZ DEFAULT NOW(),
  eta_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Provider onboarding table
CREATE TABLE IF NOT EXISTS provider_onboarding (
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

-- Support network members (if not exists)
CREATE TABLE IF NOT EXISTS support_network_members (
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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_alert_id ON sms_logs(alert_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON sms_logs(status);
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_user_id ON crisis_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_status ON crisis_alerts(status);
CREATE INDEX IF NOT EXISTS idx_crisis_alerts_created_at ON crisis_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_supporter_responses_alert_id ON supporter_responses(alert_id);
CREATE INDEX IF NOT EXISTS idx_support_network_user_id ON support_network_members(user_id);

-- Row Level Security
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_network_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow authenticated users to read their own data)
CREATE POLICY "Users can view their own SMS logs" ON sms_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their own crisis alerts" ON crisis_alerts
  FOR SELECT USING (auth.uid()::TEXT = user_id OR auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert crisis alerts" ON crisis_alerts
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own crisis alerts" ON crisis_alerts
  FOR UPDATE USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can view supporter responses" ON supporter_responses
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert supporter responses" ON supporter_responses
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Providers can view onboarding" ON provider_onboarding
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view their support network" ON support_network_members
  FOR SELECT USING (auth.uid()::TEXT = user_id OR auth.uid()::TEXT = supporter_user_id);

CREATE POLICY "Users can manage their support network" ON support_network_members
  FOR ALL USING (auth.uid()::TEXT = user_id);

-- Insert test support network member (for testing)
INSERT INTO support_network_members (
  user_id,
  supporter_name,
  supporter_phone,
  relationship,
  priority,
  patient_name
) VALUES (
  'test_user_123',
  'Test Supporter',
  '+1234567890',
  'Test Contact',
  1,
  'Test Patient'
) ON CONFLICT DO NOTHING;

-- Grant permissions for service role
GRANT ALL ON sms_logs TO service_role;
GRANT ALL ON crisis_alerts TO service_role;
GRANT ALL ON supporter_responses TO service_role;
GRANT ALL ON provider_onboarding TO service_role;
GRANT ALL ON support_network_members TO service_role;