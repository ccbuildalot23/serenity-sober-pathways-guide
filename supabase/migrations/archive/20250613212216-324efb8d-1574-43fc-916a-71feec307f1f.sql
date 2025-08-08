
-- Create recovery goals table
CREATE TABLE public.recovery_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sobriety', 'health', 'relationships', 'career', 'personal', 'spiritual')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  target_date DATE NOT NULL,
  target_value INTEGER,
  current_value INTEGER DEFAULT 0,
  unit TEXT,
  milestones JSONB DEFAULT '[]'::jsonb,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  tags JSONB DEFAULT '[]'::jsonb,
  accountability_partner_id UUID,
  reminder_frequency TEXT DEFAULT 'weekly' CHECK (reminder_frequency IN ('daily', 'weekly', 'monthly', 'none')),
  next_reminder TIMESTAMP WITH TIME ZONE,
  pause_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create goal progress tracking table
CREATE TABLE public.goal_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES public.recovery_goals(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  value INTEGER NOT NULL,
  notes TEXT,
  mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 10),
  confidence_rating INTEGER CHECK (confidence_rating >= 1 AND confidence_rating <= 10),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create goal templates table
CREATE TABLE public.goal_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sobriety', 'health', 'relationships', 'career', 'personal', 'spiritual')),
  suggested_milestones JSONB DEFAULT '[]'::jsonb,
  default_duration_days INTEGER DEFAULT 90,
  tags JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.recovery_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recovery_goals
CREATE POLICY "Users can view their own recovery goals" 
  ON public.recovery_goals 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recovery goals" 
  ON public.recovery_goals 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recovery goals" 
  ON public.recovery_goals 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recovery goals" 
  ON public.recovery_goals 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for goal_progress
CREATE POLICY "Users can view their own goal progress" 
  ON public.goal_progress 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own goal progress" 
  ON public.goal_progress 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goal progress" 
  ON public.goal_progress 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goal progress" 
  ON public.goal_progress 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- RLS Policies for goal_templates (public read access)
CREATE POLICY "Anyone can view goal templates" 
  ON public.goal_templates 
  FOR SELECT 
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_recovery_goals_user_id ON public.recovery_goals(user_id);
CREATE INDEX idx_recovery_goals_status ON public.recovery_goals(status);
CREATE INDEX idx_recovery_goals_category ON public.recovery_goals(category);
CREATE INDEX idx_goal_progress_user_id ON public.goal_progress(user_id);
CREATE INDEX idx_goal_progress_goal_id ON public.goal_progress(goal_id);
CREATE INDEX idx_goal_progress_date ON public.goal_progress(date);
CREATE INDEX idx_goal_templates_category ON public.goal_templates(category);

-- Insert some default goal templates
INSERT INTO public.goal_templates (title, description, category, suggested_milestones, default_duration_days, tags) VALUES
('30-Day Sobriety Milestone', 'Achieve 30 consecutive days of sobriety', 'sobriety', 
 '[
   {"title": "7 Days Clean", "target_value": 7, "celebration_message": "One week strong! 🌟"},
   {"title": "14 Days Clean", "target_value": 14, "celebration_message": "Two weeks of strength! 💪"},
   {"title": "21 Days Clean", "target_value": 21, "celebration_message": "Three weeks - building habits! 🏗️"},
   {"title": "30 Days Clean", "target_value": 30, "celebration_message": "One month milestone! 🎉"}
 ]'::jsonb, 
 30, '["sobriety", "milestone", "30-days"]'::jsonb),

('Weekly Therapy Sessions', 'Attend consistent therapy sessions for mental health', 'health', 
 '[
   {"title": "First Month Complete", "target_value": 4, "celebration_message": "Great start to therapy! 🌱"},
   {"title": "Two Months Consistent", "target_value": 8, "celebration_message": "Building healthy habits! 💚"},
   {"title": "Three Months Strong", "target_value": 12, "celebration_message": "Incredible dedication! ⭐"}
 ]'::jsonb, 
 84, '["therapy", "mental-health", "consistency"]'::jsonb),

('Daily Exercise Routine', 'Establish and maintain a daily exercise habit', 'health', 
 '[
   {"title": "First Week Complete", "target_value": 7, "celebration_message": "Great start! 🏃‍♂️"},
   {"title": "Two Weeks Strong", "target_value": 14, "celebration_message": "Building momentum! 💪"},
   {"title": "One Month Achievement", "target_value": 30, "celebration_message": "Habit forming! 🎯"}
 ]'::jsonb, 
 90, '["exercise", "health", "daily-habits"]'::jsonb),

('Rebuild Family Relationships', 'Strengthen connections with family members', 'relationships', 
 '[
   {"title": "First Meaningful Conversation", "target_value": 1, "celebration_message": "Great first step! 💬"},
   {"title": "Weekly Check-ins Established", "target_value": 4, "celebration_message": "Building consistency! 📞"},
   {"title": "Family Activity Together", "target_value": 1, "celebration_message": "Quality time matters! 👨‍👩‍👧‍👦"}
 ]'::jsonb, 
 180, '["family", "communication", "healing"]'::jsonb),

('Career Development', 'Focus on professional growth and stability', 'career', 
 '[
   {"title": "Resume Updated", "target_value": 1, "celebration_message": "Ready to move forward! 📄"},
   {"title": "First Interview", "target_value": 1, "celebration_message": "Taking action! 🤝"},
   {"title": "Skill Development Course", "target_value": 1, "celebration_message": "Investing in yourself! 🎓"}
 ]'::jsonb, 
 120, '["career", "professional", "growth"]'::jsonb);

-- Create function to notify accountability partners
CREATE OR REPLACE FUNCTION public.notify_partner(
  partner_id UUID,
  notification_type TEXT,
  data JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- This is a placeholder function - in a real implementation, 
  -- you would integrate with your notification system
  INSERT INTO public.audit_logs (
    user_id,
    action,
    details_encrypted
  ) VALUES (
    partner_id,
    'PARTNER_NOTIFICATION_' || notification_type,
    data::text
  );
END;
$$;
