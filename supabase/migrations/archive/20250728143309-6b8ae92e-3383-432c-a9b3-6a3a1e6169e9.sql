-- Create missing tables that don't exist yet

-- First, try to create user reputation table (may already exist)
CREATE TABLE IF NOT EXISTS public.user_reputation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  total_karma INTEGER NOT NULL DEFAULT 0,
  post_karma INTEGER NOT NULL DEFAULT 0,
  comment_karma INTEGER NOT NULL DEFAULT 0,
  helpful_votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;

-- Create content reactions table (may already exist)
CREATE TABLE IF NOT EXISTS public.content_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'reply', 'story')),
  content_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('helpful', 'supportive', 'inspiring', 'understanding')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_reactions ENABLE ROW LEVEL SECURITY;

-- Create content reports table (may already exist)
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reported_by UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'reply', 'story')),
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'action_taken', 'dismissed')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Create user blocks table (may already exist)
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Add RLS policies if they don't exist
DO $$ 
BEGIN
  -- User reputation policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_reputation' AND policyname = 'Users can view all reputation data') THEN
    CREATE POLICY "Users can view all reputation data" 
    ON public.user_reputation 
    FOR SELECT 
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_reputation' AND policyname = 'System can manage reputation') THEN
    CREATE POLICY "System can manage reputation" 
    ON public.user_reputation 
    FOR ALL 
    USING (true);
  END IF;

  -- Content reactions policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_reactions' AND policyname = 'Users can create their own reactions') THEN
    CREATE POLICY "Users can create their own reactions" 
    ON public.content_reactions 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_reactions' AND policyname = 'Users can view all reactions') THEN
    CREATE POLICY "Users can view all reactions" 
    ON public.content_reactions 
    FOR SELECT 
    USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_reactions' AND policyname = 'Users can delete their own reactions') THEN
    CREATE POLICY "Users can delete their own reactions" 
    ON public.content_reactions 
    FOR DELETE 
    USING (auth.uid() = user_id);
  END IF;

  -- Content reports policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_reports' AND policyname = 'Users can create content reports') THEN
    CREATE POLICY "Users can create content reports" 
    ON public.content_reports 
    FOR INSERT 
    WITH CHECK (auth.uid() = reported_by);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_reports' AND policyname = 'Users can view their own reports') THEN
    CREATE POLICY "Users can view their own reports" 
    ON public.content_reports 
    FOR SELECT 
    USING (auth.uid() = reported_by);
  END IF;

  -- User blocks policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_blocks' AND policyname = 'Users can manage their own blocks') THEN
    CREATE POLICY "Users can manage their own blocks" 
    ON public.user_blocks 
    FOR ALL 
    USING (auth.uid() = blocker_id);
  END IF;
END $$;