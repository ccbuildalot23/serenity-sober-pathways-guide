-- Create comprehensive notification infrastructure tables

-- Notification templates for managing reusable content
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'check_in', 'goal_deadline', 'appointment', 'crisis', 'community', 'provider', 'system'
  channel TEXT NOT NULL, -- 'in_app', 'email', 'sms', 'push'
  subject_template TEXT,
  body_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- Available template variables
  is_active BOOLEAN DEFAULT true,
  language_code TEXT DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notification delivery queue for managing outbound notifications
CREATE TABLE public.notification_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  template_id UUID REFERENCES public.notification_templates(id),
  channel TEXT NOT NULL,
  priority INTEGER DEFAULT 3, -- 1=urgent, 2=high, 3=normal, 4=low
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed', 'cancelled'
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  variables JSONB DEFAULT '{}'::jsonb, -- Template variable values
  subject TEXT,
  body TEXT NOT NULL,
  recipient_address TEXT, -- email/phone for external channels
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notification preferences for user customization
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  
  -- Channel preferences per notification type
  check_in_channels JSONB DEFAULT '["in_app"]'::jsonb,
  goal_deadline_channels JSONB DEFAULT '["in_app", "email"]'::jsonb,
  appointment_channels JSONB DEFAULT '["in_app", "email", "sms"]'::jsonb,
  crisis_channels JSONB DEFAULT '["in_app", "email", "sms", "push"]'::jsonb,
  community_channels JSONB DEFAULT '["in_app"]'::jsonb,
  provider_channels JSONB DEFAULT '["in_app", "email"]'::jsonb,
  system_channels JSONB DEFAULT '["in_app", "email"]'::jsonb,
  
  -- Quiet hours configuration
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  quiet_hours_timezone TEXT DEFAULT 'UTC',
  
  -- Frequency capping
  max_daily_notifications INTEGER DEFAULT 10,
  max_hourly_notifications INTEGER DEFAULT 3,
  batch_similar_notifications BOOLEAN DEFAULT true,
  batch_delay_minutes INTEGER DEFAULT 15,
  
  -- Other preferences
  language_preference TEXT DEFAULT 'en',
  emergency_override BOOLEAN DEFAULT true,
  optimal_delivery_enabled BOOLEAN DEFAULT true,
  
  -- Unsubscribe tracking
  unsubscribed_types JSONB DEFAULT '[]'::jsonb,
  global_unsubscribe BOOLEAN DEFAULT false,
  unsubscribe_token UUID DEFAULT gen_random_uuid(),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notification delivery analytics
CREATE TABLE public.notification_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_id UUID REFERENCES public.notification_queue(id),
  template_id UUID REFERENCES public.notification_templates(id),
  channel TEXT NOT NULL,
  type TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'sent', 'delivered', 'opened', 'clicked', 'failed', 'unsubscribed'
  event_data JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- A/B testing framework for notifications
CREATE TABLE public.notification_ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  notification_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  variant_a_template_id UUID REFERENCES public.notification_templates(id),
  variant_b_template_id UUID REFERENCES public.notification_templates(id),
  traffic_split DECIMAL DEFAULT 0.5, -- 0.5 = 50/50 split
  is_active BOOLEAN DEFAULT true,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  success_metric TEXT DEFAULT 'open_rate', -- 'open_rate', 'click_rate', 'conversion_rate'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notification batching groups
CREATE TABLE public.notification_batches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  batch_type TEXT NOT NULL, -- 'similar_content', 'time_based', 'priority_based'
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notification_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_batches ENABLE ROW LEVEL SECURITY;

-- RLS policies for notification_templates (admin managed, users can read)
CREATE POLICY "Anyone can view active templates" 
ON public.notification_templates 
FOR SELECT 
USING (is_active = true);

-- RLS policies for notification_queue (users can view their own)
CREATE POLICY "Users can view their own notifications" 
ON public.notification_queue 
FOR SELECT 
USING (auth.uid() = user_id);

-- RLS policies for notification_preferences (users manage their own)
CREATE POLICY "Users can manage their own preferences" 
ON public.notification_preferences 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS policies for notification_analytics (users can view their own)
CREATE POLICY "Users can view their own analytics" 
ON public.notification_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

-- RLS policies for notification_ab_tests (read-only for users)
CREATE POLICY "Users can view active A/B tests" 
ON public.notification_ab_tests 
FOR SELECT 
USING (is_active = true);

-- RLS policies for notification_batches (users can view their own)
CREATE POLICY "Users can view their own batches" 
ON public.notification_batches 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_notification_queue_user_scheduled ON public.notification_queue(user_id, scheduled_for);
CREATE INDEX idx_notification_queue_status_priority ON public.notification_queue(status, priority);
CREATE INDEX idx_notification_analytics_user_timestamp ON public.notification_analytics(user_id, timestamp);
CREATE INDEX idx_notification_preferences_user ON public.notification_preferences(user_id);

-- Create trigger for updating timestamps
CREATE TRIGGER update_notification_templates_updated_at
BEFORE UPDATE ON public.notification_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();