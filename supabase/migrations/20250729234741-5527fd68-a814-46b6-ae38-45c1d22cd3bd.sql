-- Comprehensive Crisis Support System Database Schema

-- Support request types and tracking
CREATE TYPE support_request_type AS ENUM ('connection', 'tough_day', 'crisis', 'check_in', 'practice', 'wellness_check');

CREATE TABLE IF NOT EXISTS support_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  request_type support_request_type NOT NULL,
  message_sent TEXT NOT NULL,
  contacts_notified INTEGER DEFAULT 0,
  response_count INTEGER DEFAULT 0,
  anonymous_send BOOLEAN DEFAULT false,
  sponsor_only BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- Policies for support_requests
CREATE POLICY "Users can manage their own support requests" 
ON support_requests 
FOR ALL 
USING (auth.uid() = user_id);

-- Message templates for customization
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  template_name VARCHAR(100) NOT NULL,
  template_category VARCHAR(50) NOT NULL,
  message_text TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Policies for message_templates
CREATE POLICY "Users can manage their own message templates" 
ON message_templates 
FOR ALL 
USING (auth.uid() = user_id);

-- Helper availability for reciprocal support
CREATE TABLE IF NOT EXISTS helper_availability (
  user_id UUID PRIMARY KEY,
  is_available BOOLEAN DEFAULT false,
  availability_hours JSONB DEFAULT '{"start": "09:00", "end": "21:00"}'::jsonb,
  helped_count INTEGER DEFAULT 0,
  last_helped TIMESTAMP WITH TIME ZONE,
  notification_preferences JSONB DEFAULT '{"crisis": true, "tough_day": true, "connection": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE helper_availability ENABLE ROW LEVEL SECURITY;

-- Policies for helper_availability
CREATE POLICY "Users can manage their own helper availability" 
ON helper_availability 
FOR ALL 
USING (auth.uid() = user_id);

-- Privacy settings for support system
CREATE TABLE IF NOT EXISTS support_privacy_settings (
  user_id UUID PRIMARY KEY,
  pause_alerts_until TIMESTAMP WITH TIME ZONE,
  auto_delete_history_hours INTEGER DEFAULT 24,
  incognito_mode BOOLEAN DEFAULT false,
  escalation_delay_minutes INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE support_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Policies for support_privacy_settings
CREATE POLICY "Users can manage their own privacy settings" 
ON support_privacy_settings 
FOR ALL 
USING (auth.uid() = user_id);

-- Anonymous community statistics (no user data)
CREATE TABLE IF NOT EXISTS support_stats (
  date DATE PRIMARY KEY DEFAULT CURRENT_DATE,
  total_requests INTEGER DEFAULT 0,
  crisis_requests INTEGER DEFAULT 0,
  connection_requests INTEGER DEFAULT 0,
  tough_day_requests INTEGER DEFAULT 0,
  practice_requests INTEGER DEFAULT 0,
  average_response_minutes INTEGER DEFAULT 0,
  peak_hour INTEGER DEFAULT 20,
  total_helpers_available INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Anyone can read stats (public data)
ALTER TABLE support_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read support stats" 
ON support_stats 
FOR SELECT 
USING (true);

-- Positive reinforcement tracking
CREATE TABLE IF NOT EXISTS positive_reinforcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  support_request_id UUID REFERENCES support_requests(id),
  reinforcement_type VARCHAR(50) NOT NULL, -- 'immediate', 'one_hour', 'twenty_four_hour', 'weekly'
  message TEXT NOT NULL,
  delivered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE positive_reinforcements ENABLE ROW LEVEL SECURITY;

-- Policies for positive_reinforcements
CREATE POLICY "Users can view their own reinforcements" 
ON positive_reinforcements 
FOR ALL 
USING (auth.uid() = user_id);

-- Practice session tracking (separate from crisis)
CREATE TABLE IF NOT EXISTS practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_type VARCHAR(50) NOT NULL, -- 'weekly_prompt', 'daily_checkin', 'wellness_check'
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  streak_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

-- Policies for practice_sessions
CREATE POLICY "Users can manage their own practice sessions" 
ON practice_sessions 
FOR ALL 
USING (auth.uid() = user_id);

-- Insert default message templates
INSERT INTO message_templates (user_id, template_name, template_category, message_text, is_default) VALUES
(gen_random_uuid(), 'After Crisis Recovery', 'post_crisis', 'Thanks for being there. I''m safe now.', true),
(gen_random_uuid(), 'Morning After Support', 'post_crisis', 'Yesterday was hard but I made it through. Thanks for your support.', true),
(gen_random_uuid(), 'No Questions Needed', 'crisis', 'I need support. No questions needed right now.', true),
(gen_random_uuid(), 'Work Safe Message', 'general', 'Personal matter - need to step away. Will explain later.', true),
(gen_random_uuid(), 'Gratitude Message', 'gratitude', 'Your support means everything. One day at a time.', true),
(gen_random_uuid(), 'Simple Connection', 'connection', 'Hi, just need to hear from someone friendly today.', true),
(gen_random_uuid(), 'Tough Day Support', 'tough_day', 'Having a challenging day but managing. Would love to connect when you''re free.', true);

-- Function to update support stats
CREATE OR REPLACE FUNCTION update_support_stats()
RETURNS trigger AS $$
BEGIN
  INSERT INTO support_stats (date, total_requests, crisis_requests, connection_requests, tough_day_requests, practice_requests)
  VALUES (CURRENT_DATE, 0, 0, 0, 0, 0)
  ON CONFLICT (date) DO UPDATE SET
    total_requests = support_stats.total_requests + 1,
    crisis_requests = support_stats.crisis_requests + CASE WHEN NEW.request_type = 'crisis' THEN 1 ELSE 0 END,
    connection_requests = support_stats.connection_requests + CASE WHEN NEW.request_type = 'connection' THEN 1 ELSE 0 END,
    tough_day_requests = support_stats.tough_day_requests + CASE WHEN NEW.request_type = 'tough_day' THEN 1 ELSE 0 END,
    practice_requests = support_stats.practice_requests + CASE WHEN NEW.request_type IN ('practice', 'check_in', 'wellness_check') THEN 1 ELSE 0 END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update stats
CREATE TRIGGER update_support_stats_trigger
  AFTER INSERT ON support_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_support_stats();

-- Function to clean up old support requests (privacy)
CREATE OR REPLACE FUNCTION cleanup_old_support_requests()
RETURNS void AS $$
BEGIN
  UPDATE support_requests 
  SET deleted_at = NOW()
  WHERE created_at < NOW() - INTERVAL '24 hours'
  AND deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM support_privacy_settings 
    WHERE user_id = support_requests.user_id 
    AND auto_delete_history_hours = 24
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;