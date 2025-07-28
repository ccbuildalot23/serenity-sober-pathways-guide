-- Create accountability partnership system tables

-- Accountability partnerships table
CREATE TABLE public.accountability_partnerships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  partner_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  partnership_agreement JSONB NOT NULL DEFAULT '{}',
  encrypted_agreement_hash TEXT,
  check_in_schedule JSONB NOT NULL DEFAULT '{}',
  privacy_settings JSONB NOT NULL DEFAULT '{
    "share_mood": true,
    "share_progress": true,
    "share_goals": false,
    "share_streaks": true,
    "notification_level": "summary"
  }',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, partner_id)
);

-- Partnership check-ins table for accountability tracking
CREATE TABLE public.partnership_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id UUID NOT NULL REFERENCES public.accountability_partnerships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  checkin_date DATE NOT NULL,
  encrypted_data TEXT NOT NULL, -- Encrypted progress data
  shared_summary JSONB NOT NULL DEFAULT '{}', -- Non-sensitive summary for partner
  reminder_sent BOOLEAN DEFAULT false,
  acknowledged_by_partner BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(partnership_id, user_id, checkin_date)
);

-- Partnership notifications table for privacy-respecting notifications
CREATE TABLE public.partnership_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partnership_id UUID NOT NULL REFERENCES public.accountability_partnerships(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('checkin_completed', 'checkin_reminder', 'streak_milestone', 'support_needed', 'partnership_request')),
  message TEXT NOT NULL, -- Privacy-safe message
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mutual support agreements template
CREATE TABLE public.support_agreement_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  template_content JSONB NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accountability_partnerships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partnership_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_agreement_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for accountability_partnerships
CREATE POLICY "Users can view their own partnerships" 
ON public.accountability_partnerships 
FOR SELECT 
USING (auth.uid() = requester_id OR auth.uid() = partner_id);

CREATE POLICY "Users can create partnership requests" 
ON public.accountability_partnerships 
FOR INSERT 
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Partners can update partnership status" 
ON public.accountability_partnerships 
FOR UPDATE 
USING (auth.uid() = partner_id OR auth.uid() = requester_id);

CREATE POLICY "Users can delete their own partnerships" 
ON public.accountability_partnerships 
FOR DELETE 
USING (auth.uid() = requester_id OR auth.uid() = partner_id);

-- RLS Policies for partnership_checkins
CREATE POLICY "Users can view their partnership checkins" 
ON public.partnership_checkins 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  auth.uid() IN (
    SELECT CASE 
      WHEN requester_id = auth.uid() THEN partner_id 
      ELSE requester_id 
    END 
    FROM accountability_partnerships 
    WHERE id = partnership_checkins.partnership_id
  )
);

CREATE POLICY "Users can create their own checkins" 
ON public.partnership_checkins 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checkins" 
ON public.partnership_checkins 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for partnership_notifications
CREATE POLICY "Users can view their own notifications" 
ON public.partnership_notifications 
FOR SELECT 
USING (auth.uid() = recipient_id);

CREATE POLICY "Users can create notifications for their partnerships" 
ON public.partnership_notifications 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their notification read status" 
ON public.partnership_notifications 
FOR UPDATE 
USING (auth.uid() = recipient_id);

-- RLS Policies for support_agreement_templates
CREATE POLICY "Anyone can view default templates" 
ON public.support_agreement_templates 
FOR SELECT 
USING (is_default = true OR auth.uid() = created_by);

CREATE POLICY "Users can create their own templates" 
ON public.support_agreement_templates 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- Create updated_at trigger
CREATE TRIGGER update_accountability_partnerships_updated_at
BEFORE UPDATE ON public.accountability_partnerships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default support agreement templates
INSERT INTO public.support_agreement_templates (title, description, template_content, is_default) VALUES
('Basic Recovery Partnership', 'A simple accountability partnership for daily check-ins', '{
  "commitments": [
    "Check in daily with my partner",
    "Share my recovery progress honestly",
    "Provide support without judgment",
    "Respect my partner''s privacy and boundaries"
  ],
  "expectations": [
    "Daily mood and wellness check-ins",
    "Weekly goal progress sharing", 
    "Immediate support during difficult times",
    "Celebration of milestones and achievements"
  ],
  "boundaries": [
    "We will not share personal details outside this partnership",
    "We respect each other''s recovery journey",
    "We maintain professional boundaries",
    "We can end this partnership at any time"
  ],
  "emergency_protocol": {
    "crisis_indicators": ["Sudden mood changes", "Isolation behaviors", "Missed check-ins for 3+ days"],
    "response_steps": ["Check in within 2 hours", "Encourage professional help if needed", "Respect their autonomy"]
  }
}', true),

('Intensive Support Partnership', 'A comprehensive partnership for those needing more frequent support', '{
  "commitments": [
    "Check in twice daily (morning and evening)",
    "Weekly video calls for deeper connection",
    "Share detailed recovery metrics",
    "Provide immediate crisis support"
  ],
  "expectations": [
    "Twice daily check-ins with mood, energy, and challenges",
    "Weekly 30-minute video call",
    "Sharing of specific recovery goals and progress",
    "24/7 crisis support availability"
  ],
  "boundaries": [
    "All shared information remains confidential",
    "We respect each other''s time and availability",
    "Professional help is encouraged when needed",
    "Either party can adjust intensity level"
  ],
  "emergency_protocol": {
    "crisis_indicators": ["Severe mood drop", "Suicidal ideation", "Relapse warning signs"],
    "response_steps": ["Immediate contact", "Crisis hotline referral", "Professional intervention if necessary"]
  }
}', true);