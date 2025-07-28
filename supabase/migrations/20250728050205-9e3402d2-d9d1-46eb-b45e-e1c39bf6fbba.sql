-- Create community support tables for forums, stories, and sponsor matching

-- Create community_forums table for anonymous peer forums
CREATE TABLE public.community_forums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forum_posts table
CREATE TABLE public.forum_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  forum_id UUID NOT NULL REFERENCES public.community_forums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  anonymous_name TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_moderated BOOLEAN DEFAULT FALSE,
  moderation_status TEXT DEFAULT 'pending',
  flagged_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create forum_replies table
CREATE TABLE public.forum_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  anonymous_name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_moderated BOOLEAN DEFAULT FALSE,
  moderation_status TEXT DEFAULT 'pending',
  flagged_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create success_stories table
CREATE TABLE public.success_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  anonymous_name TEXT,
  is_anonymous BOOLEAN DEFAULT TRUE,
  recovery_duration_days INTEGER,
  story_category TEXT NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE,
  is_moderated BOOLEAN DEFAULT FALSE,
  moderation_status TEXT DEFAULT 'pending',
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sponsor_profiles table
CREATE TABLE public.sponsor_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  display_name TEXT NOT NULL,
  years_sober INTEGER NOT NULL,
  program_type TEXT NOT NULL, -- 'AA', 'NA', 'SMART', etc.
  recovery_approach TEXT,
  bio TEXT,
  location_general TEXT, -- Just city/state for privacy
  is_available BOOLEAN DEFAULT TRUE,
  max_sponsees INTEGER DEFAULT 3,
  current_sponsees INTEGER DEFAULT 0,
  meeting_preference TEXT, -- 'in_person', 'virtual', 'both'
  communication_style TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sponsor_matches table
CREATE TABLE public.sponsor_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsee_user_id UUID NOT NULL,
  sponsor_user_id UUID NOT NULL,
  match_score DECIMAL(3,2), -- 0.00 to 1.00
  status TEXT DEFAULT 'suggested', -- 'suggested', 'contacted', 'accepted', 'declined'
  matched_criteria JSONB,
  contact_initiated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create story_interactions table
CREATE TABLE public.story_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.success_stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  interaction_type TEXT NOT NULL, -- 'like', 'view', 'share'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id, interaction_type)
);

-- Enable RLS on all tables
ALTER TABLE public.community_forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_interactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for community_forums
CREATE POLICY "Anyone can view forums" 
ON public.community_forums 
FOR SELECT 
USING (true);

-- Create RLS policies for forum_posts
CREATE POLICY "Users can view approved posts" 
ON public.forum_posts 
FOR SELECT 
USING (moderation_status = 'approved' OR auth.uid() = user_id);

CREATE POLICY "Users can create their own posts" 
ON public.forum_posts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own posts" 
ON public.forum_posts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own posts" 
ON public.forum_posts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for forum_replies
CREATE POLICY "Users can view approved replies" 
ON public.forum_replies 
FOR SELECT 
USING (moderation_status = 'approved' OR auth.uid() = user_id);

CREATE POLICY "Users can create their own replies" 
ON public.forum_replies 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own replies" 
ON public.forum_replies 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own replies" 
ON public.forum_replies 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for success_stories
CREATE POLICY "Users can view approved stories" 
ON public.success_stories 
FOR SELECT 
USING (moderation_status = 'approved' OR auth.uid() = user_id);

CREATE POLICY "Users can create their own stories" 
ON public.success_stories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" 
ON public.success_stories 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" 
ON public.success_stories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for sponsor_profiles
CREATE POLICY "Users can view available sponsor profiles" 
ON public.sponsor_profiles 
FOR SELECT 
USING (is_available = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own sponsor profile" 
ON public.sponsor_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sponsor profile" 
ON public.sponsor_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sponsor profile" 
ON public.sponsor_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policies for sponsor_matches
CREATE POLICY "Users can view their own matches" 
ON public.sponsor_matches 
FOR SELECT 
USING (auth.uid() = sponsee_user_id OR auth.uid() = sponsor_user_id);

CREATE POLICY "Users can create sponsee matches" 
ON public.sponsor_matches 
FOR INSERT 
WITH CHECK (auth.uid() = sponsee_user_id);

CREATE POLICY "Users can update their own matches" 
ON public.sponsor_matches 
FOR UPDATE 
USING (auth.uid() = sponsee_user_id OR auth.uid() = sponsor_user_id);

-- Create RLS policies for story_interactions
CREATE POLICY "Users can view their own interactions" 
ON public.story_interactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own interactions" 
ON public.story_interactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interactions" 
ON public.story_interactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interactions" 
ON public.story_interactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_forum_posts_forum_id ON public.forum_posts(forum_id);
CREATE INDEX idx_forum_posts_moderation ON public.forum_posts(moderation_status);
CREATE INDEX idx_forum_replies_post_id ON public.forum_replies(post_id);
CREATE INDEX idx_success_stories_category ON public.success_stories(story_category);
CREATE INDEX idx_success_stories_moderation ON public.success_stories(moderation_status);
CREATE INDEX idx_sponsor_profiles_available ON public.sponsor_profiles(is_available);
CREATE INDEX idx_sponsor_profiles_program ON public.sponsor_profiles(program_type);
CREATE INDEX idx_sponsor_matches_sponsee ON public.sponsor_matches(sponsee_user_id);
CREATE INDEX idx_sponsor_matches_sponsor ON public.sponsor_matches(sponsor_user_id);

-- Create functions for updating counters
CREATE OR REPLACE FUNCTION public.update_post_reply_count()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_posts 
    SET reply_count = reply_count + 1,
        last_activity = NEW.created_at
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_posts 
    SET reply_count = reply_count - 1
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for reply count updates
CREATE TRIGGER update_post_reply_count_trigger
AFTER INSERT OR DELETE ON public.forum_replies
FOR EACH ROW EXECUTE FUNCTION public.update_post_reply_count();

-- Create function for updating story interactions
CREATE OR REPLACE FUNCTION public.update_story_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.interaction_type = 'like' THEN
      UPDATE success_stories 
      SET likes_count = likes_count + 1
      WHERE id = NEW.story_id;
    ELSIF NEW.interaction_type = 'view' THEN
      UPDATE success_stories 
      SET views_count = views_count + 1
      WHERE id = NEW.story_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.interaction_type = 'like' THEN
      UPDATE success_stories 
      SET likes_count = likes_count - 1
      WHERE id = OLD.story_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for story stats updates
CREATE TRIGGER update_story_stats_trigger
AFTER INSERT OR DELETE ON public.story_interactions
FOR EACH ROW EXECUTE FUNCTION public.update_story_stats();

-- Insert sample forum categories
INSERT INTO public.community_forums (category, title, description) VALUES
('general', 'General Support', 'Share experiences and support each other'),
('newcomers', 'Newcomers Corner', 'Safe space for those new to recovery'),
('milestones', 'Celebrating Milestones', 'Share your recovery achievements'),
('challenges', 'Overcoming Challenges', 'Discuss difficult situations and coping strategies'),
('daily_life', 'Daily Life in Recovery', 'How recovery affects everyday experiences'),
('family_friends', 'Family & Friends', 'Discuss relationships and rebuilding trust'),
('spirituality', 'Spirituality & Recovery', 'Explore spiritual aspects of recovery'),
('mental_health', 'Mental Health', 'Discuss dual diagnosis and mental wellness');