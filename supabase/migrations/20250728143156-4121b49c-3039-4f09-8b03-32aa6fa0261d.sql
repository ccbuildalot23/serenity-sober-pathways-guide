-- Create user reputation table
CREATE TABLE public.user_reputation (
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

-- Create RLS policies
CREATE POLICY "Users can view all reputation data" 
ON public.user_reputation 
FOR SELECT 
USING (true);

CREATE POLICY "Users can update their own reputation" 
ON public.user_reputation 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage reputation" 
ON public.user_reputation 
FOR ALL 
USING (true);

-- Create content reactions table
CREATE TABLE public.content_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'reply', 'story')),
  content_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('helpful', 'supportive', 'inspiring', 'understanding')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_reactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for reactions
CREATE POLICY "Users can create their own reactions" 
ON public.content_reactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all reactions" 
ON public.content_reactions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can delete their own reactions" 
ON public.content_reactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create content reports table
CREATE TABLE public.content_reports (
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

-- Create RLS policies for reports
CREATE POLICY "Users can create content reports" 
ON public.content_reports 
FOR INSERT 
WITH CHECK (auth.uid() = reported_by);

CREATE POLICY "Users can view their own reports" 
ON public.content_reports 
FOR SELECT 
USING (auth.uid() = reported_by);

-- Create user blocks table
CREATE TABLE public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for blocks
CREATE POLICY "Users can manage their own blocks" 
ON public.user_blocks 
FOR ALL 
USING (auth.uid() = blocker_id);

-- Create story interactions table
CREATE TABLE public.story_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  story_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'view', 'help')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, story_id, interaction_type)
);

-- Enable RLS
ALTER TABLE public.story_interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for story interactions
CREATE POLICY "Users can create their own interactions" 
ON public.story_interactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view all interactions" 
ON public.story_interactions 
FOR SELECT 
USING (true);

-- Add triggers for updating stats
CREATE TRIGGER update_user_reputation_updated_at
BEFORE UPDATE ON public.user_reputation
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();