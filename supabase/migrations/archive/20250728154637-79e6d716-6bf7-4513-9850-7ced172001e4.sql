-- Enhanced Success Stories Platform Database Schema

-- Update existing success_stories table or create new enhanced version
DROP TABLE IF EXISTS public.success_stories CASCADE;

CREATE TABLE public.success_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  anonymity_level TEXT DEFAULT 'full_name' CHECK (anonymity_level IN ('full_name', 'first_name', 'anonymous')),
  sharing_level TEXT DEFAULT 'public' CHECK (sharing_level IN ('public', 'community', 'providers_only')),
  category TEXT NOT NULL,
  substance_type TEXT,
  recovery_length_days INTEGER,
  age_group TEXT,
  photo_url TEXT,
  audio_url TEXT,
  timeline_data JSONB DEFAULT '[]'::jsonb,
  milestones JSONB DEFAULT '[]'::jsonb,
  
  -- Privacy and expiration
  expires_at TIMESTAMP WITH TIME ZONE,
  consent_for_featuring BOOLEAN DEFAULT false,
  
  -- Engagement metrics
  likes_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  helps_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  
  -- Status and moderation
  status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'approved', 'rejected', 'expired')),
  moderation_notes TEXT,
  featured_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create story interactions table
CREATE TABLE public.story_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  story_id UUID NOT NULL REFERENCES public.success_stories(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('like', 'view', 'help', 'save', 'share')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, story_id, interaction_type)
);

-- Create story comments table
CREATE TABLE public.story_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.success_stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  anonymous_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  parent_comment_id UUID REFERENCES public.story_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create story tags table
CREATE TABLE public.story_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.success_stories(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(story_id, tag)
);

-- Create story awards table
CREATE TABLE public.story_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.success_stories(id) ON DELETE CASCADE,
  award_type TEXT NOT NULL CHECK (award_type IN ('monthly_featured', 'most_helpful', 'inspiring', 'courage', 'hope')),
  awarded_date DATE DEFAULT CURRENT_DATE,
  awarded_by UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user story preferences table
CREATE TABLE public.user_story_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  preferred_substances TEXT[],
  preferred_age_groups TEXT[],
  preferred_recovery_lengths TEXT[],
  allow_private_messages BOOLEAN DEFAULT false,
  email_on_comment BOOLEAN DEFAULT true,
  email_on_feature BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_story_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for success_stories
CREATE POLICY "Users can view approved public stories" ON public.success_stories
  FOR SELECT USING (
    status = 'approved' AND 
    (sharing_level = 'public' OR 
     (sharing_level = 'community' AND auth.uid() IS NOT NULL) OR
     (sharing_level = 'providers_only' AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'provider'::app_role)))
  );

CREATE POLICY "Users can view their own stories" ON public.success_stories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own stories" ON public.success_stories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stories" ON public.success_stories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stories" ON public.success_stories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for story_interactions
CREATE POLICY "Users can view story interactions" ON public.story_interactions
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own interactions" ON public.story_interactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interactions" ON public.story_interactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interactions" ON public.story_interactions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for story_comments
CREATE POLICY "Users can view approved comments" ON public.story_comments
  FOR SELECT USING (status = 'approved' OR auth.uid() = user_id);

CREATE POLICY "Users can create comments" ON public.story_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.story_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.story_comments
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for story_tags
CREATE POLICY "Users can view story tags" ON public.story_tags
  FOR SELECT USING (true);

CREATE POLICY "Users can manage tags for their stories" ON public.story_tags
  FOR ALL USING (story_id IN (SELECT id FROM success_stories WHERE user_id = auth.uid()));

-- RLS Policies for story_awards
CREATE POLICY "Users can view story awards" ON public.story_awards
  FOR SELECT USING (true);

-- RLS Policies for user_story_preferences
CREATE POLICY "Users can manage their own preferences" ON public.user_story_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_success_stories_status ON public.success_stories(status);
CREATE INDEX idx_success_stories_category ON public.success_stories(category);
CREATE INDEX idx_success_stories_substance ON public.success_stories(substance_type);
CREATE INDEX idx_success_stories_created_at ON public.success_stories(created_at DESC);
CREATE INDEX idx_story_interactions_user_story ON public.story_interactions(user_id, story_id);
CREATE INDEX idx_story_comments_story_id ON public.story_comments(story_id);