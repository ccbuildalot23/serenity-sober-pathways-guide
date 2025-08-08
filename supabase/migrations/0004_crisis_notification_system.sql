-- ============================================================================
-- CRISIS IN-APP NOTIFICATION SYSTEM ENHANCEMENT
-- ============================================================================
-- Purpose: Extend existing notification system with crisis-specific features
-- Integration: Connects to serenity-crisis-mcp server
-- Date: 2025-08-07
-- ============================================================================

-- ============================================================================
-- 1. CRISIS ALERT NOTIFICATIONS TABLE
-- ============================================================================
-- Specific table for crisis alerts with staggered timing and escalation
CREATE TABLE IF NOT EXISTS public.crisis_alert_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.notification_requests(id) ON DELETE CASCADE,
  
  -- Crisis specific fields
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  mcp_alert_id TEXT, -- Reference to MCP server alert ID
  
  -- Staggered timing configuration
  tier TEXT NOT NULL CHECK (tier IN ('primary', 'secondary', 'emergency')),
  delay_seconds INT NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ NOT NULL,
  
  -- Escalation tracking
  escalation_level INT DEFAULT 0,
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'sent', 'acknowledged', 'escalated', 'resolved', 'expired')
  ),
  
  -- Response tracking
  first_responder_id UUID REFERENCES auth.users(id),
  responder_count INT DEFAULT 0,
  resolution_type TEXT CHECK (
    resolution_type IN ('supporter_contact', 'professional_help', 'emergency_services', 'self_resolved')
  ),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one crisis alert per request
  UNIQUE(request_id)
);

-- Indexes for crisis alerts
CREATE INDEX idx_crisis_alerts_severity ON public.crisis_alert_notifications(severity);
CREATE INDEX idx_crisis_alerts_tier ON public.crisis_alert_notifications(tier);
CREATE INDEX idx_crisis_alerts_scheduled_at ON public.crisis_alert_notifications(scheduled_at);
CREATE INDEX idx_crisis_alerts_status ON public.crisis_alert_notifications(status);
CREATE INDEX idx_crisis_alerts_mcp_id ON public.crisis_alert_notifications(mcp_alert_id);

-- ============================================================================
-- 2. SUPPORTER RESPONSES TABLE
-- ============================================================================
-- Track detailed supporter responses to crisis alerts
CREATE TABLE IF NOT EXISTS public.supporter_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_alert_id UUID NOT NULL REFERENCES public.crisis_alert_notifications(id) ON DELETE CASCADE,
  supporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Response details
  response_type TEXT NOT NULL CHECK (
    response_type IN ('acknowledged', 'on_my_way', 'made_contact', 'needs_help', 'call_911', 'unavailable', 'delegated')
  ),
  
  -- Timing
  response_time_seconds INT, -- Time from notification to response
  responded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Contact details
  contact_method TEXT CHECK (contact_method IN ('phone_call', 'video_call', 'in_person', 'text_message')),
  contact_duration_minutes INT,
  contact_quality_rating INT CHECK (contact_quality_rating BETWEEN 1 AND 5),
  
  -- Location and availability
  supporter_location JSONB, -- {latitude, longitude, accuracy}
  estimated_arrival_time TIMESTAMPTZ,
  
  -- Message and notes
  message TEXT,
  private_notes TEXT, -- Only visible to supporter
  
  -- Coordination
  is_primary_responder BOOLEAN DEFAULT FALSE,
  coordination_status TEXT CHECK (
    coordination_status IN ('active', 'backup', 'delegated', 'relieved')
  ),
  delegated_to_id UUID REFERENCES auth.users(id),
  
  -- Follow-up
  follow_up_needed BOOLEAN DEFAULT FALSE,
  follow_up_scheduled_at TIMESTAMPTZ,
  follow_up_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique response per supporter per crisis
  UNIQUE(crisis_alert_id, supporter_id, response_type)
);

-- Indexes for supporter responses
CREATE INDEX idx_supporter_responses_crisis_id ON public.supporter_responses(crisis_alert_id);
CREATE INDEX idx_supporter_responses_supporter_id ON public.supporter_responses(supporter_id);
CREATE INDEX idx_supporter_responses_type ON public.supporter_responses(response_type);
CREATE INDEX idx_supporter_responses_time ON public.supporter_responses(responded_at DESC);

-- ============================================================================
-- 3. NOTIFICATION QUEUE TABLE
-- ============================================================================
-- Queue system for processing notifications with priority and retry logic
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Reference
  crisis_alert_id UUID REFERENCES public.crisis_alert_notifications(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Queue information
  priority INT NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10), -- 1 = highest
  queue_type TEXT NOT NULL CHECK (queue_type IN ('immediate', 'staggered', 'escalation', 'retry')),
  
  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,
  process_after TIMESTAMPTZ DEFAULT NOW(),
  
  -- Processing status
  status TEXT NOT NULL DEFAULT 'queued' CHECK (
    status IN ('queued', 'processing', 'sent', 'delivered', 'failed', 'cancelled')
  ),
  
  -- Retry logic
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  retry_delay_seconds INT DEFAULT 30,
  last_error TEXT,
  
  -- Notification details
  notification_payload JSONB NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'push', 'email', 'whatsapp')),
  
  -- Processing timestamps
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_started_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for notification queue
CREATE INDEX idx_notification_queue_scheduled_for ON public.notification_queue(scheduled_for) WHERE status = 'queued';
CREATE INDEX idx_notification_queue_status ON public.notification_queue(status);
CREATE INDEX idx_notification_queue_priority ON public.notification_queue(priority, scheduled_for);
CREATE INDEX idx_notification_queue_crisis_id ON public.notification_queue(crisis_alert_id);
CREATE INDEX idx_notification_queue_retry ON public.notification_queue(next_retry_at) WHERE status = 'failed' AND retry_count < max_retries;

-- ============================================================================
-- 4. REAL-TIME NOTIFICATION DELIVERY STATUS
-- ============================================================================
-- Track real-time delivery status for WebSocket notifications
CREATE TABLE IF NOT EXISTS public.realtime_delivery_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_queue_id UUID NOT NULL REFERENCES public.notification_queue(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- WebSocket connection tracking
  connection_id TEXT,
  socket_id TEXT,
  
  -- Delivery confirmation
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ, -- Client acknowledged receipt
  read_at TIMESTAMPTZ, -- User viewed notification
  acknowledged_at TIMESTAMPTZ, -- User took action
  
  -- Client information
  user_agent TEXT,
  client_ip INET,
  client_platform TEXT,
  
  -- Real-time events
  delivery_events JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(notification_queue_id, recipient_id)
);

-- Index for real-time tracking
CREATE INDEX idx_realtime_delivery_recipient ON public.realtime_delivery_status(recipient_id);
CREATE INDEX idx_realtime_delivery_connection ON public.realtime_delivery_status(connection_id);

-- ============================================================================
-- 5. CRISIS ESCALATION LOGS
-- ============================================================================
-- Track escalation decisions and outcomes
CREATE TABLE IF NOT EXISTS public.crisis_escalation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crisis_alert_id UUID NOT NULL REFERENCES public.crisis_alert_notifications(id) ON DELETE CASCADE,
  
  -- Escalation details
  escalation_type TEXT NOT NULL CHECK (
    escalation_type IN ('next_tier', 'professional', 'emergency_services', 'timeout', 'manual')
  ),
  triggered_by TEXT CHECK (
    triggered_by IN ('system_timeout', 'no_response', 'supporter_request', 'severity_increase', 'manual_override')
  ),
  
  -- Context
  previous_tier TEXT,
  new_tier TEXT,
  reason TEXT NOT NULL,
  decision_maker_id UUID REFERENCES auth.users(id), -- If manual escalation
  
  -- Results
  contacts_notified INT DEFAULT 0,
  services_engaged TEXT[], -- ['911', 'crisis_hotline', 'mental_health_team']
  outcome TEXT,
  
  -- Professional involvement
  professional_contacted BOOLEAN DEFAULT FALSE,
  professional_contact_info JSONB,
  
  -- Emergency services
  emergency_services_called BOOLEAN DEFAULT FALSE,
  emergency_call_time TIMESTAMPTZ,
  emergency_reference_number TEXT,
  
  escalated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for escalation tracking
CREATE INDEX idx_crisis_escalation_alert_id ON public.crisis_escalation_logs(crisis_alert_id);
CREATE INDEX idx_crisis_escalation_type ON public.crisis_escalation_logs(escalation_type);
CREATE INDEX idx_crisis_escalation_time ON public.crisis_escalation_logs(escalated_at DESC);

-- ============================================================================
-- 6. ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.crisis_alert_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supporter_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_delivery_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crisis_escalation_logs ENABLE ROW LEVEL SECURITY;

-- Crisis Alert Notifications policies
CREATE POLICY "Users can view their own crisis alerts" ON public.crisis_alert_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.notification_requests nr
      WHERE nr.id = request_id AND nr.user_id = auth.uid()
    )
  );

CREATE POLICY "Support members can view crisis alerts they're involved in" ON public.crisis_alert_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.notification_recipients ntr
      JOIN public.notification_requests nr ON ntr.request_id = nr.id
      WHERE nr.id = request_id AND ntr.recipient_id = auth.uid()
    )
  );

-- Supporter Responses policies
CREATE POLICY "Supporters can manage their own responses" ON public.supporter_responses
  FOR ALL USING (auth.uid() = supporter_id);

CREATE POLICY "Crisis owners can view all responses" ON public.supporter_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.crisis_alert_notifications can
      JOIN public.notification_requests nr ON can.request_id = nr.id
      WHERE can.id = crisis_alert_id AND nr.user_id = auth.uid()
    )
  );

-- Notification Queue policies (system managed, read-only for users)
CREATE POLICY "Service role manages notification queue" ON public.notification_queue
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Recipients can view their queued notifications" ON public.notification_queue
  FOR SELECT USING (auth.uid() = recipient_id);

-- Real-time Delivery Status policies
CREATE POLICY "Recipients can view their delivery status" ON public.realtime_delivery_status
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Service role manages delivery status" ON public.realtime_delivery_status
  FOR ALL USING (auth.role() = 'service_role');

-- Crisis Escalation Logs policies
CREATE POLICY "Crisis owners can view escalation logs" ON public.crisis_escalation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.crisis_alert_notifications can
      JOIN public.notification_requests nr ON can.request_id = nr.id
      WHERE can.id = crisis_alert_id AND nr.user_id = auth.uid()
    )
  );

CREATE POLICY "Support members can view escalation logs for their crises" ON public.crisis_escalation_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.supporter_responses sr
      WHERE sr.crisis_alert_id = crisis_alert_id AND sr.supporter_id = auth.uid()
    )
  );

-- ============================================================================
-- 7. FUNCTIONS FOR CRISIS NOTIFICATION MANAGEMENT
-- ============================================================================

-- Function to create crisis alert notification
CREATE OR REPLACE FUNCTION public.create_crisis_alert_notification(
  p_request_id UUID,
  p_severity TEXT,
  p_mcp_alert_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_crisis_alert_id UUID;
  v_supporter RECORD;
  v_delay_base INT;
  v_severity_multiplier FLOAT;
BEGIN
  -- Validate severity
  IF p_severity NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'Invalid severity level: %', p_severity;
  END IF;

  -- Create crisis alert notification
  INSERT INTO public.crisis_alert_notifications (
    request_id,
    severity,
    mcp_alert_id,
    tier,
    delay_seconds,
    scheduled_at,
    status
  ) VALUES (
    p_request_id,
    p_severity,
    p_mcp_alert_id,
    'primary',
    0,
    NOW(),
    'scheduled'
  ) RETURNING id INTO v_crisis_alert_id;

  -- Get severity multiplier for staggered timing
  v_severity_multiplier := CASE p_severity
    WHEN 'critical' THEN 0.5
    WHEN 'high' THEN 1.0
    WHEN 'medium' THEN 2.0
    WHEN 'low' THEN 4.0
  END;

  -- Queue notifications for support network with staggered timing
  FOR v_supporter IN
    SELECT 
      snm.*,
      CASE snm.priority_order
        WHEN 1 THEN 'primary'
        WHEN 2 THEN 'secondary'
        ELSE 'emergency'
      END as tier,
      CASE snm.priority_order
        WHEN 1 THEN 30  -- Primary: 30 seconds
        WHEN 2 THEN 90  -- Secondary: 90 seconds  
        ELSE 180        -- Emergency: 3 minutes
      END as base_delay
    FROM public.support_network_members snm
    JOIN public.notification_requests nr ON snm.user_id = nr.user_id
    WHERE nr.id = p_request_id
      AND snm.is_active = true
      AND (
        (p_severity = 'critical' AND snm.notify_for_crisis = true) OR
        (p_severity = 'high' AND snm.notify_for_crisis = true) OR
        (p_severity IN ('medium', 'low') AND snm.notify_for_connection = true)
      )
    ORDER BY snm.priority_order
  LOOP
    -- Calculate staggered delay
    v_delay_base := ROUND(v_supporter.base_delay * v_severity_multiplier);
    
    -- Queue notification
    INSERT INTO public.notification_queue (
      crisis_alert_id,
      recipient_id,
      priority,
      queue_type,
      scheduled_for,
      notification_payload,
      channel
    ) VALUES (
      v_crisis_alert_id,
      v_supporter.supporter_user_id,
      CASE p_severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'medium' THEN 3
        ELSE 4
      END,
      'staggered',
      NOW() + (v_delay_base || ' seconds')::INTERVAL,
      jsonb_build_object(
        'type', 'crisis_alert',
        'severity', p_severity,
        'tier', v_supporter.tier,
        'supporter_name', v_supporter.supporter_name,
        'relationship', v_supporter.relationship
      ),
      v_supporter.preferred_channel
    );
  END LOOP;

  RETURN v_crisis_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record supporter response
CREATE OR REPLACE FUNCTION public.record_supporter_response(
  p_crisis_alert_id UUID,
  p_response_type TEXT,
  p_message TEXT DEFAULT NULL,
  p_location JSONB DEFAULT NULL,
  p_estimated_arrival TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_response_id UUID;
  v_response_time_seconds INT;
  v_crisis_created_at TIMESTAMPTZ;
  v_supporter_count INT;
BEGIN
  -- Get crisis alert creation time
  SELECT can.created_at INTO v_crisis_created_at
  FROM public.crisis_alert_notifications can
  WHERE can.id = p_crisis_alert_id;

  IF v_crisis_created_at IS NULL THEN
    RAISE EXCEPTION 'Crisis alert not found: %', p_crisis_alert_id;
  END IF;

  -- Calculate response time
  v_response_time_seconds := EXTRACT(EPOCH FROM (NOW() - v_crisis_created_at))::INT;

  -- Insert response
  INSERT INTO public.supporter_responses (
    crisis_alert_id,
    supporter_id,
    response_type,
    response_time_seconds,
    supporter_location,
    estimated_arrival_time,
    message,
    is_primary_responder,
    coordination_status
  ) VALUES (
    p_crisis_alert_id,
    auth.uid(),
    p_response_type,
    v_response_time_seconds,
    p_location,
    p_estimated_arrival,
    p_message,
    FALSE, -- Will be updated by coordination logic
    'active'
  ) RETURNING id INTO v_response_id;

  -- Update crisis alert status and counts
  SELECT COUNT(*) INTO v_supporter_count
  FROM public.supporter_responses
  WHERE crisis_alert_id = p_crisis_alert_id;

  UPDATE public.crisis_alert_notifications
  SET 
    responder_count = v_supporter_count,
    status = CASE 
      WHEN p_response_type = 'made_contact' THEN 'acknowledged'
      WHEN p_response_type = 'call_911' THEN 'escalated'
      WHEN status = 'scheduled' THEN 'acknowledged'
      ELSE status
    END,
    first_responder_id = CASE 
      WHEN first_responder_id IS NULL AND p_response_type = 'made_contact' 
      THEN auth.uid()
      ELSE first_responder_id
    END,
    updated_at = NOW()
  WHERE id = p_crisis_alert_id;

  -- Cancel pending notifications if contact made
  IF p_response_type = 'made_contact' THEN
    UPDATE public.notification_queue
    SET 
      status = 'cancelled',
      updated_at = NOW()
    WHERE crisis_alert_id = p_crisis_alert_id
      AND status IN ('queued', 'processing')
      AND recipient_id != auth.uid();
  END IF;

  RETURN v_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to escalate crisis alert
CREATE OR REPLACE FUNCTION public.escalate_crisis_alert(
  p_crisis_alert_id UUID,
  p_escalation_type TEXT,
  p_reason TEXT,
  p_contacts_notified INT DEFAULT 0
)
RETURNS UUID AS $$
DECLARE
  v_escalation_id UUID;
  v_current_tier TEXT;
  v_new_tier TEXT;
BEGIN
  -- Get current tier
  SELECT tier INTO v_current_tier
  FROM public.crisis_alert_notifications
  WHERE id = p_crisis_alert_id;

  -- Determine new tier
  v_new_tier := CASE p_escalation_type
    WHEN 'next_tier' THEN 
      CASE v_current_tier
        WHEN 'primary' THEN 'secondary'
        WHEN 'secondary' THEN 'emergency'
        ELSE 'emergency'
      END
    WHEN 'professional' THEN 'emergency'
    WHEN 'emergency_services' THEN 'emergency'
    ELSE v_current_tier
  END;

  -- Create escalation log
  INSERT INTO public.crisis_escalation_logs (
    crisis_alert_id,
    escalation_type,
    triggered_by,
    previous_tier,
    new_tier,
    reason,
    contacts_notified,
    emergency_services_called,
    emergency_call_time
  ) VALUES (
    p_crisis_alert_id,
    p_escalation_type,
    'manual_override',
    v_current_tier,
    v_new_tier,
    p_reason,
    p_contacts_notified,
    p_escalation_type = 'emergency_services',
    CASE WHEN p_escalation_type = 'emergency_services' THEN NOW() ELSE NULL END
  ) RETURNING id INTO v_escalation_id;

  -- Update crisis alert
  UPDATE public.crisis_alert_notifications
  SET 
    tier = v_new_tier,
    status = 'escalated',
    escalation_level = escalation_level + 1,
    escalated_at = NOW(),
    escalation_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_crisis_alert_id;

  RETURN v_escalation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

-- Update timestamp triggers
CREATE TRIGGER update_crisis_alerts_updated_at
  BEFORE UPDATE ON public.crisis_alert_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_supporter_responses_updated_at
  BEFORE UPDATE ON public.supporter_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_notification_queue_updated_at
  BEFORE UPDATE ON public.notification_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_realtime_delivery_updated_at
  BEFORE UPDATE ON public.realtime_delivery_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- 9. PERMISSIONS
-- ============================================================================

-- Grant permissions
GRANT ALL ON public.crisis_alert_notifications TO authenticated;
GRANT ALL ON public.supporter_responses TO authenticated;
GRANT ALL ON public.notification_queue TO authenticated;
GRANT ALL ON public.realtime_delivery_status TO authenticated;
GRANT ALL ON public.crisis_escalation_logs TO authenticated;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION public.create_crisis_alert_notification(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_supporter_response(UUID, TEXT, TEXT, JSONB, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_crisis_alert(UUID, TEXT, TEXT, INT) TO authenticated;

-- ============================================================================
-- CRISIS NOTIFICATION SYSTEM COMPLETE
-- ============================================================================