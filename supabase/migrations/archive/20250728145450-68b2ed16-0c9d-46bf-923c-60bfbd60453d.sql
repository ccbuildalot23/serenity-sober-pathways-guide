-- Enable real-time for moderation_queue table
ALTER TABLE public.moderation_queue REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.moderation_queue;

-- Enable real-time for forum posts and replies
ALTER TABLE public.forum_posts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_posts;

ALTER TABLE public.forum_replies REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_replies;

-- Enable real-time for success stories
ALTER TABLE public.success_stories REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.success_stories;

-- Create real-time notifications table
CREATE TABLE public.realtime_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for notifications
ALTER TABLE public.realtime_notifications ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
ON public.realtime_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.realtime_notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.realtime_notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- Enable real-time for notifications
ALTER TABLE public.realtime_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.realtime_notifications;

-- Create user presence table for online status
CREATE TABLE public.user_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  forum_id UUID,
  status TEXT NOT NULL DEFAULT 'online',
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for presence
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Presence policies
CREATE POLICY "Users can view all presence data"
ON public.user_presence
FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own presence"
ON public.user_presence
FOR ALL
USING (auth.uid() = user_id);

-- Enable real-time for presence
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- Add indexes for performance
CREATE INDEX idx_realtime_notifications_user_id ON public.realtime_notifications(user_id);
CREATE INDEX idx_realtime_notifications_created_at ON public.realtime_notifications(created_at);
CREATE INDEX idx_user_presence_user_id ON public.user_presence(user_id);
CREATE INDEX idx_user_presence_forum_id ON public.user_presence(forum_id);
CREATE INDEX idx_user_presence_status ON public.user_presence(status);