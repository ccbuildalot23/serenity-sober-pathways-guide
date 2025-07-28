-- Create forum posts table (extend existing)
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2);
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS ai_moderation_status TEXT DEFAULT 'pending' CHECK (ai_moderation_status IN ('pending', 'approved', 'flagged', 'auto_approved'));
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS crisis_flagged BOOLEAN DEFAULT false;
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS keyword_flags JSONB DEFAULT '[]';
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE public.forum_posts ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

-- Create user reputation table
CREATE TABLE public.user_reputation (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  reputation_score INTEGER DEFAULT 0,
  helpful_posts_count INTEGER DEFAULT 0,
  reported_posts_count INTEGER DEFAULT 0,
  badges JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create anonymous usernames table
CREATE TABLE public.anonymous_usernames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  anonymous_name TEXT NOT NULL,
  avatar_seed TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create post reactions table
CREATE TABLE public.post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('helpful', 'supportive', 'inspiring', 'understanding')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, reaction_type)
);

-- Create content reports table
CREATE TABLE public.content_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reported_by UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'reply', 'story')),
  content_id UUID NOT NULL,
  report_reason TEXT NOT NULL,
  report_details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  moderator_id UUID,
  moderator_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create user blocks table
CREATE TABLE public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Create AI moderation logs table
CREATE TABLE public.ai_moderation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  ai_model TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  flags_detected JSONB DEFAULT '[]',
  action_taken TEXT,
  human_review_required BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create success stories table
CREATE TABLE public.success_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  story_type TEXT NOT NULL DEFAULT 'written' CHECK (story_type IN ('written', 'audio', 'video')),
  media_url TEXT,
  anonymity_level TEXT NOT NULL DEFAULT 'anonymous' CHECK (anonymity_level IN ('full_name', 'first_name', 'anonymous')),
  sharing_level TEXT NOT NULL DEFAULT 'community' CHECK (sharing_level IN ('public', 'community', 'providers_only')),
  milestones JSONB DEFAULT '[]',
  timeline JSONB DEFAULT '[]',
  substance_type TEXT,
  recovery_length TEXT,
  age_group TEXT,
  is_featured BOOLEAN DEFAULT false,
  feature_consent BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  helps_count INTEGER DEFAULT 0,
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create story interactions table
CREATE TABLE public.story_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL,
  user_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'view', 'help', 'save')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id, interaction_type)
);

-- Create topic following table
CREATE TABLE public.topic_following (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  topic_type TEXT NOT NULL CHECK (topic_type IN ('forum', 'post', 'category')),
  topic_id UUID NOT NULL,
  notification_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, topic_type, topic_id)
);

-- Create community challenges table
CREATE TABLE public.community_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  participants_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_usernames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_following ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_challenges ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own reputation" ON public.user_reputation FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their anonymous username" ON public.anonymous_usernames FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own reactions" ON public.post_reactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can create reports" ON public.content_reports FOR INSERT WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "Users can manage their blocks" ON public.user_blocks FOR ALL USING (auth.uid() = blocker_id);
CREATE POLICY "Users can view approved stories" ON public.success_stories FOR SELECT USING (moderation_status = 'approved' OR auth.uid() = user_id);
CREATE POLICY "Users can create their own stories" ON public.success_stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their story interactions" ON public.story_interactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their topic following" ON public.topic_following FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active challenges" ON public.community_challenges FOR SELECT USING (is_active = true);

-- Create indexes for performance
CREATE INDEX idx_forum_posts_moderation ON public.forum_posts(ai_moderation_status, created_at);
CREATE INDEX idx_success_stories_moderation ON public.success_stories(moderation_status, created_at);
CREATE INDEX idx_user_reputation_score ON public.user_reputation(reputation_score DESC);
CREATE INDEX idx_story_interactions_type ON public.story_interactions(story_id, interaction_type);

-- Create function to generate anonymous usernames
CREATE OR REPLACE FUNCTION public.generate_anonymous_username()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  adjectives TEXT[] := ARRAY['Brave', 'Hopeful', 'Strong', 'Peaceful', 'Calm', 'Gentle', 'Bright', 'Kind', 'Wise', 'Steady'];
  nouns TEXT[] := ARRAY['Warrior', 'Traveler', 'Seeker', 'Builder', 'Helper', 'Guardian', 'Friend', 'Guide', 'Healer', 'Phoenix'];
  random_number INTEGER;
BEGIN
  random_number := floor(random() * 1000)::INTEGER;
  RETURN adjectives[1 + floor(random() * array_length(adjectives, 1))] || 
         nouns[1 + floor(random() * array_length(nouns, 1))] || 
         random_number::TEXT;
END;
$$;