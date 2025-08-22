-- User Notification Preferences Table
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Channel preferences
  channels JSONB DEFAULT '{
    "in_app": true,
    "email": false,
    "sms": false,
    "push": false,
    "whatsapp": false
  }'::jsonb,
  
  -- Quiet hours settings
  quiet_hours JSONB DEFAULT '{
    "enabled": false,
    "start": "22:00",
    "end": "08:00",
    "timezone": "UTC"
  }'::jsonb,
  
  -- Rate limiting settings
  rate_limits JSONB DEFAULT '{
    "max_per_day": 50,
    "max_per_hour": 10,
    "emergency_override": true
  }'::jsonb,
  
  -- Category preferences
  categories JSONB DEFAULT '{
    "daily_checkins": true,
    "crisis_alerts": true,
    "support_requests": true,
    "milestones": true,
    "partnership_updates": true,
    "system_updates": false
  }'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one preference per user
  UNIQUE(user_id)
);

-- WhatsApp Opt-in Table (if not exists)
CREATE TABLE IF NOT EXISTS whatsapp_opt_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  opt_in_status BOOLEAN DEFAULT false,
  verification_code TEXT,
  verified_at TIMESTAMPTZ,
  opt_in_date TIMESTAMPTZ DEFAULT NOW(),
  opt_out_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one phone number per user
  UNIQUE(user_id, phone_number)
);

-- Notification Rate Limit Tracking
CREATE TABLE IF NOT EXISTS notification_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tracking counters
  hourly_count INTEGER DEFAULT 0,
  daily_count INTEGER DEFAULT 0,
  
  -- Reset timestamps
  hourly_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
  daily_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 day',
  
  -- Last notification sent
  last_notification_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one record per user
  UNIQUE(user_id)
);

-- Channel Opt-ins Table (for multiple channels per user)
CREATE TABLE IF NOT EXISTS channel_opt_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  identifier TEXT NOT NULL, -- email address, phone number, device token, etc.
  verified BOOLEAN DEFAULT false,
  verification_code TEXT,
  verified_at TIMESTAMPTZ,
  opted_in_at TIMESTAMPTZ DEFAULT NOW(),
  opted_out_at TIMESTAMPTZ,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique channel+identifier per user
  UNIQUE(user_id, channel, identifier)
);

-- Indexes for performance
CREATE INDEX idx_user_notification_preferences_user_id ON user_notification_preferences(user_id);
CREATE INDEX idx_whatsapp_opt_ins_user_id ON whatsapp_opt_ins(user_id);
CREATE INDEX idx_notification_rate_limits_user_id ON notification_rate_limits(user_id);
CREATE INDEX idx_channel_opt_ins_user_id ON channel_opt_ins(user_id);
CREATE INDEX idx_channel_opt_ins_channel ON channel_opt_ins(channel);

-- RLS Policies
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_opt_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_opt_ins ENABLE ROW LEVEL SECURITY;

-- Users can only view and update their own preferences
CREATE POLICY "Users can view own preferences" ON user_notification_preferences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON user_notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON user_notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only manage their own opt-ins
CREATE POLICY "Users can view own WhatsApp opt-ins" ON whatsapp_opt_ins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own WhatsApp opt-ins" ON whatsapp_opt_ins
  FOR ALL USING (auth.uid() = user_id);

-- Users can only view their own rate limits
CREATE POLICY "Users can view own rate limits" ON notification_rate_limits
  FOR SELECT USING (auth.uid() = user_id);

-- System can manage rate limits
CREATE POLICY "System can manage rate limits" ON notification_rate_limits
  FOR ALL USING (true);

-- Users can manage their own channel opt-ins
CREATE POLICY "Users can manage own channel opt-ins" ON channel_opt_ins
  FOR ALL USING (auth.uid() = user_id);

-- Function to check rate limits before sending notification
CREATE OR REPLACE FUNCTION check_notification_rate_limit(
  p_user_id UUID,
  p_is_emergency BOOLEAN DEFAULT false
) RETURNS BOOLEAN AS $$
DECLARE
  v_preferences user_notification_preferences;
  v_rate_limits notification_rate_limits;
  v_can_send BOOLEAN := true;
BEGIN
  -- Get user preferences
  SELECT * INTO v_preferences
  FROM user_notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences, use defaults
  IF v_preferences IS NULL THEN
    RETURN true;
  END IF;
  
  -- Check if emergency override is enabled
  IF p_is_emergency AND (v_preferences.rate_limits->>'emergency_override')::boolean THEN
    RETURN true;
  END IF;
  
  -- Get or create rate limit record
  INSERT INTO notification_rate_limits (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT * INTO v_rate_limits
  FROM notification_rate_limits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Reset counters if needed
  IF v_rate_limits.hourly_reset_at < NOW() THEN
    UPDATE notification_rate_limits
    SET hourly_count = 0,
        hourly_reset_at = NOW() + INTERVAL '1 hour'
    WHERE user_id = p_user_id;
    v_rate_limits.hourly_count := 0;
  END IF;
  
  IF v_rate_limits.daily_reset_at < NOW() THEN
    UPDATE notification_rate_limits
    SET daily_count = 0,
        daily_reset_at = NOW() + INTERVAL '1 day'
    WHERE user_id = p_user_id;
    v_rate_limits.daily_count := 0;
  END IF;
  
  -- Check rate limits
  IF v_rate_limits.hourly_count >= (v_preferences.rate_limits->>'max_per_hour')::integer THEN
    v_can_send := false;
  END IF;
  
  IF v_rate_limits.daily_count >= (v_preferences.rate_limits->>'max_per_day')::integer THEN
    v_can_send := false;
  END IF;
  
  -- If can send, increment counters
  IF v_can_send THEN
    UPDATE notification_rate_limits
    SET hourly_count = hourly_count + 1,
        daily_count = daily_count + 1,
        last_notification_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN v_can_send;
END;
$$ LANGUAGE plpgsql;

-- Function to check if notification should be sent based on quiet hours
CREATE OR REPLACE FUNCTION check_quiet_hours(
  p_user_id UUID,
  p_is_urgent BOOLEAN DEFAULT false
) RETURNS BOOLEAN AS $$
DECLARE
  v_preferences user_notification_preferences;
  v_current_time TIME;
  v_start_time TIME;
  v_end_time TIME;
BEGIN
  -- Urgent notifications always go through
  IF p_is_urgent THEN
    RETURN true;
  END IF;
  
  -- Get user preferences
  SELECT * INTO v_preferences
  FROM user_notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences or quiet hours disabled, allow
  IF v_preferences IS NULL OR NOT (v_preferences.quiet_hours->>'enabled')::boolean THEN
    RETURN true;
  END IF;
  
  -- Get current time in user's timezone
  v_current_time := CURRENT_TIME AT TIME ZONE COALESCE(
    v_preferences.quiet_hours->>'timezone',
    'UTC'
  );
  
  v_start_time := (v_preferences.quiet_hours->>'start')::time;
  v_end_time := (v_preferences.quiet_hours->>'end')::time;
  
  -- Check if current time is within quiet hours
  IF v_start_time < v_end_time THEN
    -- Quiet hours don't cross midnight
    RETURN v_current_time < v_start_time OR v_current_time >= v_end_time;
  ELSE
    -- Quiet hours cross midnight
    RETURN v_current_time < v_start_time AND v_current_time >= v_end_time;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_whatsapp_opt_ins_updated_at
  BEFORE UPDATE ON whatsapp_opt_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_notification_rate_limits_updated_at
  BEFORE UPDATE ON notification_rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_channel_opt_ins_updated_at
  BEFORE UPDATE ON channel_opt_ins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();