-- Crisis Notification System Schema
-- Week 1: In-App Notifications MVP
-- Integrates with existing crisis MCP system

-- Notification queue table for all crisis alerts
CREATE TABLE IF NOT EXISTS crisis_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_event_id UUID REFERENCES crisis_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  supporter_id UUID REFERENCES auth.users(id),
  
  -- Notification details
  type TEXT NOT NULL CHECK (type IN ('crisis_alert', 'response_request', 'acknowledgment', 'escalation', 'resolution')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical', 'emergency')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Delivery configuration
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'whatsapp', 'email', 'push')),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  scheduled_for TIMESTAMPTZ,
  
  -- Staggered timing support (30s/90s/3min delays)
  delay_seconds INTEGER DEFAULT 0,
  tier_level INTEGER DEFAULT 1 CHECK (tier_level BETWEEN 1 AND 3),
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'sending', 'delivered', 'failed', 'acknowledged', 'expired')),
  delivered_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Supporter responses and acknowledgments
CREATE TABLE IF NOT EXISTS crisis_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES crisis_notifications(id) ON DELETE CASCADE,
  crisis_event_id UUID REFERENCES crisis_events(id) ON DELETE CASCADE,
  supporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Response details
  response_type TEXT NOT NULL CHECK (response_type IN ('acknowledged', 'responding', 'on_way', 'made_contact', 'unavailable', 'escalate')),
  response_message TEXT,
  eta_minutes INTEGER,
  
  -- Coordination tracking
  is_primary_responder BOOLEAN DEFAULT FALSE,
  coordination_notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one primary responder per crisis
  UNIQUE(crisis_event_id, is_primary_responder) WHERE is_primary_responder = TRUE
);

-- Real-time delivery tracking
CREATE TABLE IF NOT EXISTS notification_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID REFERENCES crisis_notifications(id) ON DELETE CASCADE,
  
  -- WebSocket/Push delivery details
  connection_id TEXT,
  device_token TEXT,
  
  -- Delivery status
  delivered BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  
  -- Error tracking
  error_message TEXT,
  error_count INTEGER DEFAULT 0,
  last_error_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Escalation tracking
CREATE TABLE IF NOT EXISTS crisis_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_event_id UUID REFERENCES crisis_events(id) ON DELETE CASCADE,
  
  -- Escalation details
  from_tier INTEGER NOT NULL,
  to_tier INTEGER NOT NULL,
  escalation_reason TEXT NOT NULL,
  escalated_by UUID REFERENCES auth.users(id),
  
  -- Professional services
  emergency_services_contacted BOOLEAN DEFAULT FALSE,
  professional_contact_id UUID,
  professional_response TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification templates for consistent messaging
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template details
  template_key TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  
  -- Message templates
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  
  -- Channel-specific templates
  whatsapp_template TEXT,
  email_template TEXT,
  push_template TEXT,
  
  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  variables JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support network availability
CREATE TABLE IF NOT EXISTS supporter_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Availability status
  is_available BOOLEAN DEFAULT TRUE,
  status TEXT CHECK (status IN ('available', 'busy', 'in_crisis', 'offline')),
  status_message TEXT,
  
  -- Response preferences
  max_concurrent_crises INTEGER DEFAULT 1,
  preferred_severity_levels TEXT[],
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  
  -- Stats
  current_active_crises INTEGER DEFAULT 0,
  last_response_at TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supporter_id)
);

-- Indexes for performance
CREATE INDEX idx_notifications_user ON crisis_notifications(user_id);
CREATE INDEX idx_notifications_status ON crisis_notifications(status);
CREATE INDEX idx_notifications_scheduled ON crisis_notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_notifications_crisis ON crisis_notifications(crisis_event_id);
CREATE INDEX idx_responses_crisis ON crisis_responses(crisis_event_id);
CREATE INDEX idx_responses_supporter ON crisis_responses(supporter_id);
CREATE INDEX idx_delivery_notification ON notification_delivery(notification_id);
CREATE INDEX idx_escalations_crisis ON crisis_escalations(crisis_event_id);
CREATE INDEX idx_availability_supporter ON supporter_availability(supporter_id);

-- RLS Policies for security
ALTER TABLE crisis_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE crisis_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE supporter_availability ENABLE ROW LEVEL SECURITY;

-- Users can see their own notifications
CREATE POLICY "Users can view own notifications" ON crisis_notifications
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = supporter_id);

-- Users can create notifications for their crises
CREATE POLICY "Users can create crisis notifications" ON crisis_notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Supporters can respond to notifications
CREATE POLICY "Supporters can respond" ON crisis_responses
  FOR ALL USING (auth.uid() = supporter_id);

-- Users can see responses to their crises
CREATE POLICY "Users can view crisis responses" ON crisis_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crisis_events 
      WHERE crisis_events.id = crisis_responses.crisis_event_id 
      AND crisis_events.user_id = auth.uid()
    )
  );

-- Delivery tracking visible to involved parties
CREATE POLICY "View delivery status" ON notification_delivery
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crisis_notifications 
      WHERE crisis_notifications.id = notification_delivery.notification_id
      AND (crisis_notifications.user_id = auth.uid() OR crisis_notifications.supporter_id = auth.uid())
    )
  );

-- Escalations visible to involved parties
CREATE POLICY "View escalations" ON crisis_escalations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM crisis_events 
      WHERE crisis_events.id = crisis_escalations.crisis_event_id 
      AND (crisis_events.user_id = auth.uid() OR 
           EXISTS (
             SELECT 1 FROM crisis_responses 
             WHERE crisis_responses.crisis_event_id = crisis_events.id 
             AND crisis_responses.supporter_id = auth.uid()
           ))
    )
  );

-- Templates visible to all authenticated users
CREATE POLICY "View templates" ON notification_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Supporters can manage their availability
CREATE POLICY "Manage own availability" ON supporter_availability
  FOR ALL USING (auth.uid() = supporter_id);

-- Real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE crisis_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE crisis_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE supporter_availability;

-- Insert default notification templates
INSERT INTO notification_templates (template_key, type, severity, title_template, message_template) VALUES
  ('crisis_alert_critical', 'crisis_alert', 'critical', '🆘 Urgent: {{user_name}} needs immediate support', '{{user_name}} is experiencing a critical situation and needs your immediate support. Please respond as soon as possible.'),
  ('crisis_alert_high', 'crisis_alert', 'high', '⚠️ {{user_name}} needs support', '{{user_name}} is going through a difficult time and could use your support. They reached out for help.'),
  ('response_acknowledged', 'acknowledgment', 'medium', '✅ {{supporter_name}} has seen your alert', '{{supporter_name}} has acknowledged your request for support and is coordinating a response.'),
  ('responder_on_way', 'acknowledgment', 'medium', '🚗 {{supporter_name}} is on the way', '{{supporter_name}} is heading your way. ETA: {{eta_minutes}} minutes.'),
  ('escalation_notice', 'escalation', 'high', '📢 Alert escalated to additional supporters', 'Your support request has been escalated to ensure you get the help you need.'),
  ('resolution_confirm', 'resolution', 'low', '💚 Crisis resolved', 'The crisis has been marked as resolved. Thank you to everyone who helped.')
ON CONFLICT (template_key) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_crisis_notifications_updated_at BEFORE UPDATE ON crisis_notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crisis_responses_updated_at BEFORE UPDATE ON crisis_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supporter_availability_updated_at BEFORE UPDATE ON supporter_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();