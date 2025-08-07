-- Create real-time peer support chat system

-- Peer supporter profiles and availability
CREATE TABLE public.peer_supporters (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT,
    certifications JSONB DEFAULT '[]'::jsonb,
    specialties JSONB DEFAULT '[]'::jsonb,
    languages JSONB DEFAULT '["English"]'::jsonb,
    is_available BOOLEAN DEFAULT true,
    max_concurrent_chats INTEGER DEFAULT 3,
    current_chat_count INTEGER DEFAULT 0,
    total_chats_completed INTEGER DEFAULT 0,
    average_rating DECIMAL DEFAULT 0,
    availability_schedule JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat sessions between users and peer supporters
CREATE TABLE public.peer_chat_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    peer_supporter_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting', -- waiting, active, ended, escalated
    priority TEXT NOT NULL DEFAULT 'normal', -- normal, high, crisis
    started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE,
    wait_time_minutes INTEGER,
    duration_minutes INTEGER,
    escalated_to_crisis BOOLEAN DEFAULT false,
    escalation_reason TEXT,
    user_rating INTEGER, -- 1-5 stars
    user_feedback TEXT,
    supporter_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Chat messages within sessions
CREATE TABLE public.peer_chat_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    sender_id UUID NOT NULL,
    sender_type TEXT NOT NULL, -- 'user' or 'supporter'
    message_text TEXT NOT NULL,
    message_type TEXT DEFAULT 'text', -- text, image, file, system
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Queue management for waiting users
CREATE TABLE public.peer_support_queue (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal', -- normal, high, crisis
    issue_description TEXT,
    preferred_supporter_id UUID,
    queue_position INTEGER,
    estimated_wait_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Video session scheduling (placeholder for future)
CREATE TABLE public.peer_video_sessions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    peer_supporter_id UUID NOT NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    status TEXT DEFAULT 'scheduled', -- scheduled, confirmed, completed, cancelled
    meeting_link TEXT,
    preparation_notes TEXT,
    session_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Typing indicators for real-time chat
CREATE TABLE public.peer_chat_typing (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id UUID NOT NULL,
    is_typing BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(session_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.peer_supporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_support_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.peer_chat_typing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for peer_supporters
CREATE POLICY "Anyone can view available supporters" 
ON public.peer_supporters FOR SELECT 
USING (is_available = true);

CREATE POLICY "Supporters can manage their own profile" 
ON public.peer_supporters FOR ALL 
USING (auth.uid() = user_id);

-- RLS Policies for peer_chat_sessions
CREATE POLICY "Users can view their own chat sessions" 
ON public.peer_chat_sessions FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = peer_supporter_id);

CREATE POLICY "Users can create their own chat sessions" 
ON public.peer_chat_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Participants can update their sessions" 
ON public.peer_chat_sessions FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = peer_supporter_id);

-- RLS Policies for peer_chat_messages
CREATE POLICY "Participants can view session messages" 
ON public.peer_chat_messages FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM peer_chat_sessions 
        WHERE id = session_id 
        AND (user_id = auth.uid() OR peer_supporter_id = auth.uid())
    )
);

CREATE POLICY "Participants can send messages" 
ON public.peer_chat_messages FOR INSERT 
WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM peer_chat_sessions 
        WHERE id = session_id 
        AND (user_id = auth.uid() OR peer_supporter_id = auth.uid())
    )
);

-- RLS Policies for peer_support_queue
CREATE POLICY "Users can view their own queue status" 
ON public.peer_support_queue FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add themselves to queue" 
ON public.peer_support_queue FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their queue entry" 
ON public.peer_support_queue FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for peer_video_sessions
CREATE POLICY "Participants can view their video sessions" 
ON public.peer_video_sessions FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = peer_supporter_id);

CREATE POLICY "Users can create video sessions" 
ON public.peer_video_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Participants can update video sessions" 
ON public.peer_video_sessions FOR UPDATE 
USING (auth.uid() = user_id OR auth.uid() = peer_supporter_id);

-- RLS Policies for peer_chat_typing
CREATE POLICY "Participants can view typing indicators" 
ON public.peer_chat_typing FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM peer_chat_sessions 
        WHERE id = session_id 
        AND (user_id = auth.uid() OR peer_supporter_id = auth.uid())
    )
);

CREATE POLICY "Users can update their typing status" 
ON public.peer_chat_typing FOR ALL 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_peer_supporters_availability ON peer_supporters(is_available, current_chat_count);
CREATE INDEX idx_peer_chat_sessions_status ON peer_chat_sessions(status, created_at);
CREATE INDEX idx_peer_chat_messages_session ON peer_chat_messages(session_id, created_at);
CREATE INDEX idx_peer_support_queue_priority ON peer_support_queue(priority, created_at);
CREATE INDEX idx_peer_chat_typing_session ON peer_chat_typing(session_id, updated_at);

-- Function to update supporter chat count
CREATE OR REPLACE FUNCTION update_supporter_chat_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
        UPDATE peer_supporters 
        SET current_chat_count = current_chat_count + 1
        WHERE user_id = NEW.peer_supporter_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status IN ('ended', 'escalated') THEN
        UPDATE peer_supporters 
        SET current_chat_count = current_chat_count - 1,
            total_chats_completed = total_chats_completed + 1
        WHERE user_id = NEW.peer_supporter_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update supporter chat count
CREATE TRIGGER update_supporter_chat_count_trigger
    AFTER INSERT OR UPDATE ON peer_chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_supporter_chat_count();

-- Function to update supporter average rating
CREATE OR REPLACE FUNCTION update_supporter_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_rating IS NOT NULL THEN
        UPDATE peer_supporters 
        SET average_rating = (
            SELECT AVG(user_rating) 
            FROM peer_chat_sessions 
            WHERE peer_supporter_id = NEW.peer_supporter_id 
            AND user_rating IS NOT NULL
        )
        WHERE user_id = NEW.peer_supporter_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update supporter rating
CREATE TRIGGER update_supporter_rating_trigger
    AFTER UPDATE ON peer_chat_sessions
    FOR EACH ROW
    WHEN (NEW.user_rating IS NOT NULL)
    EXECUTE FUNCTION update_supporter_rating();

-- Function to clean up old typing indicators
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
    DELETE FROM peer_chat_typing 
    WHERE updated_at < NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql;

-- Function to get next user in queue
CREATE OR REPLACE FUNCTION get_next_queue_user(supporter_id UUID)
RETURNS UUID AS $$
DECLARE
    next_user_id UUID;
BEGIN
    SELECT user_id INTO next_user_id
    FROM peer_support_queue
    WHERE (preferred_supporter_id IS NULL OR preferred_supporter_id = supporter_id)
    ORDER BY 
        CASE priority 
            WHEN 'crisis' THEN 1 
            WHEN 'high' THEN 2 
            ELSE 3 
        END,
        created_at ASC
    LIMIT 1;
    
    IF next_user_id IS NOT NULL THEN
        DELETE FROM peer_support_queue WHERE user_id = next_user_id;
    END IF;
    
    RETURN next_user_id;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger for all tables
CREATE TRIGGER update_peer_supporters_updated_at
    BEFORE UPDATE ON peer_supporters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_peer_chat_sessions_updated_at
    BEFORE UPDATE ON peer_chat_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_peer_video_sessions_updated_at
    BEFORE UPDATE ON peer_video_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();