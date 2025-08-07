-- Add video session support and queue optimization (updated)
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

-- Enable RLS on video sessions table if not already enabled
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'peer_video_sessions'
  ) THEN
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
  END IF;
END $$;

-- Add queue scheduling support columns
ALTER TABLE public.peer_support_queue 
ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS callback_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS callback_phone TEXT,
ADD COLUMN IF NOT EXISTS wait_started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS last_position_update TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update function to calculate estimated wait times
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