-- Add video session support and queue optimization
CREATE TABLE IF NOT EXISTS public.peer_video_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  peer_supporter_id UUID NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'video' CHECK (session_type IN ('video', 'audio')),
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended', 'cancelled')),
  room_id TEXT,
  recording_consent BOOLEAN DEFAULT false,
  recording_url TEXT,
  quality_score INTEGER CHECK (quality_score BETWEEN 1 AND 5),
  technical_issues JSONB DEFAULT '[]'::jsonb,
  duration_minutes INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add video session policies
ALTER TABLE public.peer_video_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own video sessions" 
ON public.peer_video_sessions 
FOR SELECT 
USING ((auth.uid() = user_id) OR (auth.uid() = peer_supporter_id));

CREATE POLICY "Users can create their own video sessions" 
ON public.peer_video_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Participants can update video sessions" 
ON public.peer_video_sessions 
FOR UPDATE 
USING ((auth.uid() = user_id) OR (auth.uid() = peer_supporter_id));

-- Add queue scheduling support
ALTER TABLE public.peer_support_queue 
ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS callback_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS callback_phone TEXT,
ADD COLUMN IF NOT EXISTS wait_started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_position_update TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add supporter availability scheduling
CREATE TABLE IF NOT EXISTS public.supporter_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supporter_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supporter_id, day_of_week, start_time)
);

-- Add supporter schedule policies
ALTER TABLE public.supporter_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supporters can manage their own schedules" 
ON public.supporter_schedules 
FOR ALL 
USING (auth.uid() = supporter_id);

CREATE POLICY "Anyone can view supporter schedules" 
ON public.supporter_schedules 
FOR SELECT 
USING (true);

-- Add session history and quality tracking
CREATE TABLE IF NOT EXISTS public.session_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('chat', 'video', 'audio')),
  auto_summary TEXT,
  key_topics JSONB DEFAULT '[]'::jsonb,
  sentiment_score DECIMAL(3,2) CHECK (sentiment_score BETWEEN -1 AND 1),
  escalation_triggers JSONB DEFAULT '[]'::jsonb,
  follow_up_needed BOOLEAN DEFAULT false,
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID, -- supporter who reviewed the summary
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Add session summary policies
ALTER TABLE public.session_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supporters can view session summaries" 
ON public.session_summaries 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM peer_chat_sessions pcs 
  WHERE pcs.id = session_summaries.session_id 
  AND pcs.peer_supporter_id = auth.uid()
));

CREATE POLICY "Supporters can create session summaries" 
ON public.session_summaries 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM peer_chat_sessions pcs 
  WHERE pcs.id = session_summaries.session_id 
  AND pcs.peer_supporter_id = auth.uid()
));

-- Add flag system for concerning conversations
CREATE TABLE IF NOT EXISTS public.session_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  flag_type TEXT NOT NULL CHECK (flag_type IN ('safety_concern', 'inappropriate_content', 'crisis_indicator', 'quality_issue')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  flagged_by UUID NOT NULL,
  flagged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  resolution_notes TEXT
);

-- Add session flags policies
ALTER TABLE public.session_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supporters can flag sessions" 
ON public.session_flags 
FOR INSERT 
WITH CHECK (auth.uid() = flagged_by);

CREATE POLICY "Supporters can view flags for their sessions" 
ON public.session_flags 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM peer_chat_sessions pcs 
  WHERE pcs.id = session_flags.session_id 
  AND pcs.peer_supporter_id = auth.uid()
));

-- Add supporter performance metrics
CREATE TABLE IF NOT EXISTS public.supporter_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supporter_id UUID NOT NULL,
  metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_sessions INTEGER DEFAULT 0,
  average_session_duration DECIMAL(10,2),
  average_rating DECIMAL(3,2),
  escalation_rate DECIMAL(5,4),
  response_time_avg DECIMAL(10,2), -- in seconds
  user_satisfaction_score DECIMAL(3,2),
  flags_received INTEGER DEFAULT 0,
  schedule_adherence DECIMAL(3,2), -- percentage
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(supporter_id, metric_date)
);

-- Add supporter metrics policies
ALTER TABLE public.supporter_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supporters can view their own metrics" 
ON public.supporter_metrics 
FOR SELECT 
USING (auth.uid() = supporter_id);

-- Add trigger to update timestamps
CREATE TRIGGER update_supporter_schedules_updated_at
  BEFORE UPDATE ON public.supporter_schedules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_peer_video_sessions_updated_at
  BEFORE UPDATE ON public.peer_video_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supporter_metrics_updated_at
  BEFORE UPDATE ON public.supporter_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add function to calculate estimated wait times based on historical data
CREATE OR REPLACE FUNCTION public.calculate_queue_wait_time(priority_level text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    available_supporters integer;
    queue_ahead integer;
    avg_session_duration decimal;
    estimated_minutes integer;
BEGIN
    -- Count available supporters
    SELECT COUNT(*) INTO available_supporters
    FROM peer_supporters 
    WHERE is_available = true 
    AND current_chat_count < max_concurrent_chats;
    
    -- If no supporters available, return default high wait time
    IF available_supporters = 0 THEN
        RETURN 45;
    END IF;
    
    -- Count users ahead in queue with same or higher priority
    SELECT COUNT(*) INTO queue_ahead
    FROM peer_support_queue
    WHERE (
        (priority_level = 'normal' AND priority IN ('crisis', 'high', 'normal')) OR
        (priority_level = 'high' AND priority IN ('crisis', 'high')) OR
        (priority_level = 'crisis' AND priority = 'crisis')
    );
    
    -- Get average session duration from last 24 hours
    SELECT COALESCE(AVG(duration_minutes), 15) INTO avg_session_duration
    FROM peer_chat_sessions
    WHERE started_at >= now() - INTERVAL '24 hours'
    AND duration_minutes IS NOT NULL;
    
    -- Calculate estimated wait time
    estimated_minutes := CEIL((queue_ahead::decimal / available_supporters) * avg_session_duration);
    
    -- Apply priority modifiers
    CASE priority_level
        WHEN 'crisis' THEN 
            estimated_minutes := GREATEST(1, estimated_minutes * 0.1);
        WHEN 'high' THEN 
            estimated_minutes := GREATEST(2, estimated_minutes * 0.5);
        ELSE 
            estimated_minutes := GREATEST(5, estimated_minutes);
    END CASE;
    
    RETURN estimated_minutes;
END;
$function$;