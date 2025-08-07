-- Create missing community tables

-- User reputation/karma system
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

-- Anonymous username management
CREATE TABLE public.anonymous_usernames (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  anonymous_name TEXT NOT NULL,
  forum_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, forum_id)
);

-- Post reactions (likes, helpful, etc.)
CREATE TABLE public.post_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('helpful', 'supportive', 'inspiring', 'understanding')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id, reaction_type)
);

-- Content reporting system
CREATE TABLE public.content_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reported_by UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'reply', 'story')),
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User blocking system
CREATE TABLE public.user_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Topic following
CREATE TABLE public.topic_following (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  forum_id UUID NOT NULL,
  notification_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, forum_id)
);

-- Community challenges
CREATE TABLE public.community_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  goal_target INTEGER,
  participant_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI moderation logs
CREATE TABLE public.ai_moderation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL,
  content_id UUID NOT NULL,
  moderation_result JSONB NOT NULL,
  confidence_score DECIMAL(3,2),
  action_taken TEXT,
  reviewed_by_human BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Story interactions
CREATE TABLE public.story_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  story_id UUID NOT NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'view', 'help')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, story_id, interaction_type)
);

-- Enable RLS on all tables
ALTER TABLE public.user_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_usernames ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_following ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_moderation_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_interactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_reputation
CREATE POLICY "Users can view all reputation" ON public.user_reputation FOR SELECT USING (true);
CREATE POLICY "Users can update their own reputation" ON public.user_reputation FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can manage reputation" ON public.user_reputation FOR ALL USING (true);

-- RLS Policies for anonymous_usernames
CREATE POLICY "Users can manage their own anonymous names" ON public.anonymous_usernames FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for post_reactions
CREATE POLICY "Users can view all reactions" ON public.post_reactions FOR SELECT USING (true);
CREATE POLICY "Users can manage their own reactions" ON public.post_reactions FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for content_reports
CREATE POLICY "Users can create reports" ON public.content_reports FOR INSERT WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "Users can view their own reports" ON public.content_reports FOR SELECT USING (auth.uid() = reported_by);
CREATE POLICY "Moderators can view all reports" ON public.content_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- RLS Policies for user_blocks
CREATE POLICY "Users can manage their own blocks" ON public.user_blocks FOR ALL USING (auth.uid() = blocker_id);

-- RLS Policies for topic_following
CREATE POLICY "Users can manage their own follows" ON public.topic_following FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for community_challenges
CREATE POLICY "Everyone can view active challenges" ON public.community_challenges FOR SELECT USING (is_active = true);
CREATE POLICY "Users can create challenges" ON public.community_challenges FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creators can update their challenges" ON public.community_challenges FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for ai_moderation_logs
CREATE POLICY "Moderators can view moderation logs" ON public.ai_moderation_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- RLS Policies for story_interactions
CREATE POLICY "Users can view all interactions" ON public.story_interactions FOR SELECT USING (true);
CREATE POLICY "Users can manage their own interactions" ON public.story_interactions FOR ALL USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_user_reputation_updated_at
  BEFORE UPDATE ON public.user_reputation
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing triggers for forum posts and success stories
CREATE TRIGGER update_post_reply_count_trigger
  AFTER INSERT OR DELETE ON public.forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_post_reply_count();

CREATE TRIGGER update_story_stats_trigger
  AFTER INSERT OR DELETE ON public.story_interactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_story_stats();