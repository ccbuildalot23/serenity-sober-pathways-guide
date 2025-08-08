-- ============================================================================
-- CRITICAL NOTIFICATION SYSTEM SCHEMA
-- ============================================================================
-- Purpose: Enable real-time support network notifications via in-app and WhatsApp
-- Author: Serenity Recovery Platform
-- Date: 2025-08-07
-- ============================================================================

-- ============================================================================
-- 1. NOTIFICATION REQUESTS TABLE
-- ============================================================================
-- Tracks all support requests from users
CREATE TABLE IF NOT EXISTS public.notification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  urgency_level TEXT NOT NULL CHECK (urgency_level IN ('crisis', 'need_connection', 'celebrate', 'check_in')),
  message TEXT,
  custom_message TEXT, -- User's personal message to support network
  location JSONB, -- {latitude: number, longitude: number, accuracy: number}
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'notified', 'acknowledged', 'resolved', 'cancelled', 'expired')),
  
  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notified_at TIMESTAMPTZ,
  first_acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  
  -- Resolution
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  cancellation_reason TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}', -- Additional context
  notification_count INT DEFAULT 0,
  acknowledgment_count INT DEFAULT 0,
  
  -- Indexes for performance
  CONSTRAINT valid_dates CHECK (
    created_at <= COALESCE(notified_at, created_at) AND
    created_at <= COALESCE(first_acknowledged_at, created_at) AND
    created_at <= COALESCE(resolved_at, created_at)
  )
);

-- Indexes for query performance
CREATE INDEX idx_notification_requests_user_id ON public.notification_requests(user_id);
CREATE INDEX idx_notification_requests_status ON public.notification_requests(status);
CREATE INDEX idx_notification_requests_created_at ON public.notification_requests(created_at DESC);
CREATE INDEX idx_notification_requests_urgency ON public.notification_requests(urgency_level);

-- ============================================================================
-- 2. NOTIFICATION RECIPIENTS TABLE
-- ============================================================================
-- Tracks individual notifications sent to support network members
CREATE TABLE IF NOT EXISTS public.notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.notification_requests(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Channel information
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'whatsapp', 'email', 'push')),
  channel_identifier TEXT, -- phone number for WhatsApp, email address, device token, etc.
  
  -- Delivery tracking
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Response
  acknowledgment_message TEXT,
  acknowledgment_type TEXT CHECK (acknowledgment_type IN ('immediate', 'on_my_way', 'cant_help', 'delegated')),
  
  -- Status
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    delivery_status IN ('pending', 'queued', 'sent', 'delivered', 'read', 'acknowledged', 'failed', 'bounced')
  ),
  failure_reason TEXT,
  retry_count INT DEFAULT 0,
  
  -- WhatsApp specific
  whatsapp_message_id TEXT,
  whatsapp_conversation_id TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one notification per recipient per request per channel
  UNIQUE(request_id, recipient_id, channel)
);

-- Indexes
CREATE INDEX idx_notification_recipients_request_id ON public.notification_recipients(request_id);
CREATE INDEX idx_notification_recipients_recipient_id ON public.notification_recipients(recipient_id);
CREATE INDEX idx_notification_recipients_status ON public.notification_recipients(delivery_status);
CREATE INDEX idx_notification_recipients_channel ON public.notification_recipients(channel);

-- ============================================================================
-- 3. WHATSAPP OPT-INS TABLE
-- ============================================================================
-- Tracks WhatsApp consent and phone numbers
CREATE TABLE IF NOT EXISTS public.whatsapp_opt_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT '+1',
  
  -- Consent tracking
  opted_in_at TIMESTAMPTZ DEFAULT NOW(),
  opted_out_at TIMESTAMPTZ,
  consent_method TEXT CHECK (consent_method IN ('qr_code', 'sms_link', 'in_app', 'manual', 'imported')),
  consent_message TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'active', 'opted_out', 'blocked', 'invalid', 'expired')
  ),
  
  -- WhatsApp specific
  whatsapp_user_id TEXT, -- Meta's WhatsApp user ID
  whatsapp_profile_name TEXT,
  is_whatsapp_business BOOLEAN DEFAULT false,
  
  -- Verification
  verification_code TEXT,
  verified_at TIMESTAMPTZ,
  verification_attempts INT DEFAULT 0,
  
  -- Metadata
  last_message_at TIMESTAMPTZ,
  message_count INT DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id),
  UNIQUE(phone_number),
  CONSTRAINT valid_phone CHECK (phone_number ~ '^\+?[1-9]\d{1,14}$')
);

-- Indexes
CREATE INDEX idx_whatsapp_opt_ins_user_id ON public.whatsapp_opt_ins(user_id);
CREATE INDEX idx_whatsapp_opt_ins_phone ON public.whatsapp_opt_ins(phone_number);
CREATE INDEX idx_whatsapp_opt_ins_status ON public.whatsapp_opt_ins(status);

-- ============================================================================
-- 4. USER NOTIFICATION PREFERENCES TABLE
-- ============================================================================
-- User-specific notification settings
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Channel preferences
  channels_enabled JSONB DEFAULT '{
    "in_app": true,
    "push": true,
    "whatsapp": false,
    "email": true
  }'::jsonb,
  
  -- Quiet hours (stored in user's timezone)
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone TEXT DEFAULT 'America/New_York',
  
  -- Rate limiting
  max_notifications_per_day INT DEFAULT 20,
  max_notifications_per_hour INT DEFAULT 5,
  
  -- Emergency settings
  emergency_override BOOLEAN DEFAULT true, -- Override quiet hours for crisis
  
  -- Notification types
  notify_for_crisis BOOLEAN DEFAULT true,
  notify_for_connection BOOLEAN DEFAULT true,
  notify_for_celebration BOOLEAN DEFAULT true,
  notify_for_check_in BOOLEAN DEFAULT true,
  
  -- Auto-acknowledge settings
  auto_acknowledge_after_minutes INT, -- Auto-acknowledge if no response
  
  -- Sound/vibration preferences
  sound_enabled BOOLEAN DEFAULT true,
  vibration_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. SUPPORT NETWORK MEMBERS TABLE
-- ============================================================================
-- Enhanced emergency contacts with notification preferences
CREATE TABLE IF NOT EXISTS public.support_network_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Support member info
  supporter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  supporter_name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  relationship TEXT,
  
  -- Priority and availability
  priority_order INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false, -- Primary contact (e.g., sponsor)
  
  -- Channel preferences for this supporter
  preferred_channel TEXT DEFAULT 'in_app' CHECK (
    preferred_channel IN ('in_app', 'whatsapp', 'email', 'push')
  ),
  whatsapp_enabled BOOLEAN DEFAULT false,
  email_enabled BOOLEAN DEFAULT true,
  
  -- Notification settings
  notify_for_crisis BOOLEAN DEFAULT true,
  notify_for_connection BOOLEAN DEFAULT true,
  notify_for_celebration BOOLEAN DEFAULT true,
  notify_for_check_in BOOLEAN DEFAULT false,
  
  -- Availability
  available_hours_start TIME,
  available_hours_end TIME,
  available_days TEXT[], -- ['monday', 'tuesday', ...]
  
  -- Stats
  notifications_sent INT DEFAULT 0,
  notifications_acknowledged INT DEFAULT 0,
  average_response_time_minutes FLOAT,
  last_notified_at TIMESTAMPTZ,
  last_acknowledged_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  tags TEXT[],
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, supporter_user_id),
  CONSTRAINT valid_priority CHECK (priority_order > 0),
  CONSTRAINT valid_phone CHECK (phone_number IS NULL OR phone_number ~ '^\+?[1-9]\d{1,14}$'),
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes
CREATE INDEX idx_support_network_user_id ON public.support_network_members(user_id);
CREATE INDEX idx_support_network_supporter_id ON public.support_network_members(supporter_user_id);
CREATE INDEX idx_support_network_active ON public.support_network_members(is_active);
CREATE INDEX idx_support_network_priority ON public.support_network_members(priority_order);

-- ============================================================================
-- 6. NOTIFICATION TEMPLATES TABLE
-- ============================================================================
-- Store WhatsApp and email templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'push')),
  urgency_level TEXT CHECK (urgency_level IN ('crisis', 'need_connection', 'celebrate', 'check_in')),
  
  -- Template content
  subject TEXT, -- For email
  body_template TEXT NOT NULL, -- Supports {{variables}}
  footer_template TEXT,
  
  -- WhatsApp specific
  whatsapp_template_name TEXT, -- Meta's template name
  whatsapp_template_id TEXT, -- Meta's template ID
  whatsapp_approval_status TEXT CHECK (
    whatsapp_approval_status IN ('pending', 'approved', 'rejected')
  ),
  
  -- Variables
  required_variables TEXT[], -- ['user_name', 'message', etc.]
  
  -- Settings
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default templates
INSERT INTO public.notification_templates (name, channel, urgency_level, body_template, required_variables) VALUES
('crisis_whatsapp', 'whatsapp', 'crisis', 
 '🆘 {{user_name}} has requested immediate support in their recovery journey. They need to hear from you now. Reply ACK to acknowledge or open Serenity app.', 
 ARRAY['user_name']),
('connection_whatsapp', 'whatsapp', 'need_connection', 
 '💚 {{user_name}} would appreciate a check-in when you have a moment. No emergency, just connection needed.', 
 ARRAY['user_name']),
('celebration_whatsapp', 'whatsapp', 'celebrate', 
 '🎉 {{user_name}} just hit a recovery milestone: {{message}}! Share in their joy!', 
 ARRAY['user_name', 'message']);

-- ============================================================================
-- 7. NOTIFICATION ANALYTICS TABLE
-- ============================================================================
-- Track notification performance metrics
CREATE TABLE IF NOT EXISTS public.notification_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  hour INT CHECK (hour >= 0 AND hour <= 23),
  
  -- Metrics
  total_requests INT DEFAULT 0,
  crisis_requests INT DEFAULT 0,
  connection_requests INT DEFAULT 0,
  celebration_requests INT DEFAULT 0,
  
  -- Channel metrics
  in_app_sent INT DEFAULT 0,
  whatsapp_sent INT DEFAULT 0,
  email_sent INT DEFAULT 0,
  push_sent INT DEFAULT 0,
  
  -- Response metrics
  total_acknowledged INT DEFAULT 0,
  avg_response_time_seconds FLOAT,
  fastest_response_seconds FLOAT,
  slowest_response_seconds FLOAT,
  
  -- Success rates
  delivery_rate FLOAT, -- Percentage delivered
  read_rate FLOAT, -- Percentage read
  acknowledgment_rate FLOAT, -- Percentage acknowledged
  
  -- WhatsApp specific
  whatsapp_opt_ins INT DEFAULT 0,
  whatsapp_opt_outs INT DEFAULT 0,
  whatsapp_failures INT DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint for date/hour combination
  UNIQUE(date, hour)
);

-- Index for date-based queries
CREATE INDEX idx_notification_analytics_date ON public.notification_analytics(date DESC);

-- ============================================================================
-- 8. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.notification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_opt_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_network_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_analytics ENABLE ROW LEVEL SECURITY;

-- Notification Requests policies
CREATE POLICY "Users can view their own requests" ON public.notification_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own requests" ON public.notification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own requests" ON public.notification_requests
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Support members can view requests they're notified about" ON public.notification_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.notification_recipients nr
      WHERE nr.request_id = id AND nr.recipient_id = auth.uid()
    )
  );

-- Notification Recipients policies
CREATE POLICY "Recipients can view their notifications" ON public.notification_recipients
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Recipients can acknowledge notifications" ON public.notification_recipients
  FOR UPDATE USING (auth.uid() = recipient_id);

CREATE POLICY "Request owners can view all recipients" ON public.notification_recipients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.notification_requests nr
      WHERE nr.id = request_id AND nr.user_id = auth.uid()
    )
  );

-- WhatsApp Opt-ins policies
CREATE POLICY "Users can manage their own opt-ins" ON public.whatsapp_opt_ins
  FOR ALL USING (auth.uid() = user_id);

-- User Notification Preferences policies
CREATE POLICY "Users can manage their own preferences" ON public.user_notification_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Support Network policies
CREATE POLICY "Users can manage their support network" ON public.support_network_members
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Support members can view networks they're part of" ON public.support_network_members
  FOR SELECT USING (auth.uid() = supporter_user_id);

-- Templates - read only for all authenticated users
CREATE POLICY "All users can view active templates" ON public.notification_templates
  FOR SELECT USING (is_active = true);

-- Analytics - admins only (implement your admin check)
CREATE POLICY "Admins can view analytics" ON public.notification_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 9. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_notification_recipients_updated_at BEFORE UPDATE ON public.notification_recipients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_whatsapp_opt_ins_updated_at BEFORE UPDATE ON public.whatsapp_opt_ins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_preferences_updated_at BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_network_members_updated_at BEFORE UPDATE ON public.support_network_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create user preferences
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-create preferences for new users
CREATE TRIGGER create_notification_preferences_for_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- Function to update notification request stats
CREATE OR REPLACE FUNCTION update_notification_request_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Update notification count
    UPDATE public.notification_requests
    SET notification_count = notification_count + 1
    WHERE id = NEW.request_id;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if acknowledged
    IF OLD.acknowledged_at IS NULL AND NEW.acknowledged_at IS NOT NULL THEN
      UPDATE public.notification_requests
      SET 
        acknowledgment_count = acknowledgment_count + 1,
        first_acknowledged_at = COALESCE(first_acknowledged_at, NEW.acknowledged_at),
        status = CASE 
          WHEN status = 'notified' THEN 'acknowledged'
          ELSE status
        END
      WHERE id = NEW.request_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update stats when recipients change
CREATE TRIGGER update_request_stats_on_recipient_change
  AFTER INSERT OR UPDATE ON public.notification_recipients
  FOR EACH ROW EXECUTE FUNCTION update_notification_request_stats();

-- ============================================================================
-- 10. HELPER FUNCTIONS
-- ============================================================================

-- Function to request support
CREATE OR REPLACE FUNCTION request_support(
  p_urgency_level TEXT,
  p_message TEXT DEFAULT NULL,
  p_location JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
  v_supporter RECORD;
BEGIN
  -- Create the request
  INSERT INTO public.notification_requests (
    user_id,
    urgency_level,
    custom_message,
    location,
    status
  ) VALUES (
    auth.uid(),
    p_urgency_level,
    p_message,
    p_location,
    'pending'
  ) RETURNING id INTO v_request_id;
  
  -- Queue notifications for all active support members
  FOR v_supporter IN 
    SELECT * FROM public.support_network_members
    WHERE user_id = auth.uid()
      AND is_active = true
      AND (
        (p_urgency_level = 'crisis' AND notify_for_crisis = true) OR
        (p_urgency_level = 'need_connection' AND notify_for_connection = true) OR
        (p_urgency_level = 'celebrate' AND notify_for_celebration = true) OR
        (p_urgency_level = 'check_in' AND notify_for_check_in = true)
      )
    ORDER BY priority_order
  LOOP
    -- Create recipient record for each support member
    INSERT INTO public.notification_recipients (
      request_id,
      recipient_id,
      channel,
      channel_identifier
    ) VALUES (
      v_request_id,
      v_supporter.supporter_user_id,
      v_supporter.preferred_channel,
      CASE 
        WHEN v_supporter.preferred_channel = 'whatsapp' THEN v_supporter.phone_number
        WHEN v_supporter.preferred_channel = 'email' THEN v_supporter.email
        ELSE NULL
      END
    );
  END LOOP;
  
  -- Update request status
  UPDATE public.notification_requests
  SET status = 'notified', notified_at = NOW()
  WHERE id = v_request_id;
  
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to acknowledge support request
CREATE OR REPLACE FUNCTION acknowledge_support_request(
  p_request_id UUID,
  p_message TEXT DEFAULT NULL,
  p_acknowledgment_type TEXT DEFAULT 'immediate'
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update the recipient record
  UPDATE public.notification_recipients
  SET 
    acknowledged_at = NOW(),
    acknowledgment_message = p_message,
    acknowledgment_type = p_acknowledgment_type,
    delivery_status = 'acknowledged'
  WHERE request_id = p_request_id
    AND recipient_id = auth.uid()
    AND acknowledged_at IS NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 11. INITIAL DATA AND FINAL SETUP
-- ============================================================================

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Create indexes for Realtime subscriptions
CREATE INDEX idx_notification_requests_realtime ON public.notification_requests(user_id, status, created_at DESC);
CREATE INDEX idx_notification_recipients_realtime ON public.notification_recipients(recipient_id, delivery_status, created_at DESC);

-- ============================================================================
-- END OF NOTIFICATION SYSTEM SCHEMA
-- ============================================================================