-- Recovery Planning Notification System

-- Notification feed table for in-app notifications
CREATE TABLE public.recovery_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'goal_due_reminder', 'milestone_achieved', 'streak_milestone', 
    'goal_completed', 'provider_feedback', 'progress_encouragement',
    'goal_overdue', 'weekly_summary', 'achievement_badge'
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}', -- Additional data like goal_id, milestone_id, etc.
  is_read BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  scheduled_for TIMESTAMP WITH TIME ZONE, -- For future notifications
  delivered_at TIMESTAMP WITH TIME ZONE, -- When actually shown to user
  delivery_methods JSONB DEFAULT '{"in_app": true, "email": false, "sms": false}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + INTERVAL '30 days')
);

-- Notification preferences for recovery planning
CREATE TABLE public.recovery_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  
  -- Goal reminders
  goal_reminders_enabled BOOLEAN DEFAULT true,
  goal_reminder_days_before JSONB DEFAULT '[1, 3, 7]', -- Days before due date
  goal_reminder_time TIME DEFAULT '09:00:00',
  
  -- Milestone celebrations
  milestone_celebrations_enabled BOOLEAN DEFAULT true,
  streak_notifications_enabled BOOLEAN DEFAULT true,
  streak_milestones JSONB DEFAULT '[3, 7, 14, 30, 60, 90, 180, 365]', -- Days
  
  -- Progress encouragement
  progress_encouragement_enabled BOOLEAN DEFAULT true,
  weekly_summary_enabled BOOLEAN DEFAULT true,
  weekly_summary_day INTEGER DEFAULT 0 CHECK (weekly_summary_day BETWEEN 0 AND 6), -- 0 = Sunday
  
  -- Delivery preferences
  delivery_methods JSONB DEFAULT '{"in_app": true, "email": false, "sms": false}',
  quiet_hours JSONB DEFAULT '{"enabled": true, "start_time": "22:00", "end_time": "08:00", "timezone": "UTC"}',
  daily_limit INTEGER DEFAULT 10, -- Max notifications per day
  
  -- Activity-based timing
  optimal_send_time TIME, -- Calculated from user activity patterns
  activity_pattern_data JSONB DEFAULT '{}', -- Store user activity insights
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notification delivery log for tracking and avoiding duplicates
CREATE TABLE public.notification_delivery_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id UUID NOT NULL REFERENCES public.recovery_notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('in_app', 'email', 'sms', 'push')),
  delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'failed')),
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User activity tracking for smart notification timing
CREATE TABLE public.user_activity_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  most_active_hours JSONB DEFAULT '[]', -- Array of hours (0-23) when user is most active
  check_in_times JSONB DEFAULT '[]', -- Historical check-in times to determine patterns
  engagement_score NUMERIC DEFAULT 0, -- Overall engagement score
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recovery_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_patterns ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notifications" 
ON public.recovery_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notification read status" 
ON public.recovery_notifications 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON public.recovery_notifications 
FOR INSERT 
WITH CHECK (true); -- Allow system to create notifications

CREATE POLICY "Users can manage their notification preferences" 
ON public.recovery_notification_preferences 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their delivery logs" 
ON public.notification_delivery_log 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage delivery logs" 
ON public.notification_delivery_log 
FOR ALL 
USING (true); -- Allow system operations

CREATE POLICY "Users can manage their activity patterns" 
ON public.user_activity_patterns 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_recovery_notifications_user_id ON public.recovery_notifications(user_id);
CREATE INDEX idx_recovery_notifications_scheduled ON public.recovery_notifications(scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX idx_recovery_notifications_unread ON public.recovery_notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_recovery_notifications_type ON public.recovery_notifications(notification_type);
CREATE INDEX idx_notification_delivery_log_status ON public.notification_delivery_log(delivery_status, created_at);

-- Update triggers
CREATE TRIGGER update_recovery_notification_preferences_updated_at
  BEFORE UPDATE ON public.recovery_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_activity_patterns_updated_at
  BEFORE UPDATE ON public.user_activity_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable real-time functionality
ALTER TABLE public.recovery_notifications REPLICA IDENTITY FULL;
ALTER TABLE public.recovery_notification_preferences REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.recovery_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.recovery_notification_preferences;

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION public.cleanup_expired_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  DELETE FROM public.recovery_notifications
  WHERE expires_at < now() AND is_read = true;
  
  -- Also clean up old delivery logs (keep for 90 days)
  DELETE FROM public.notification_delivery_log
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$;

-- Function to calculate optimal notification time based on user activity
CREATE OR REPLACE FUNCTION public.calculate_optimal_notification_time(user_uuid UUID)
RETURNS TIME
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  optimal_hour INTEGER;
  activity_data JSONB;
BEGIN
  -- Get user's activity pattern
  SELECT most_active_hours INTO activity_data
  FROM public.user_activity_patterns
  WHERE user_id = user_uuid;
  
  -- If no data, return default time (9 AM)
  IF activity_data IS NULL OR jsonb_array_length(activity_data) = 0 THEN
    RETURN '09:00:00'::TIME;
  END IF;
  
  -- Get the first most active hour
  optimal_hour := (activity_data->0)::INTEGER;
  
  -- Return as time
  RETURN make_time(optimal_hour, 0, 0);
END;
$$;