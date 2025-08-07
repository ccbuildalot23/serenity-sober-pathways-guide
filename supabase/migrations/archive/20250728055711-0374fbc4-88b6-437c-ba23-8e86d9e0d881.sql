-- Create comprehensive recovery planning system tables

-- Recovery plan templates table
CREATE TABLE public.recovery_plan_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('sobriety', 'mental_health', 'wellness', 'relationships', 'career', 'spiritual')),
  template_data JSONB NOT NULL DEFAULT '{}',
  evidence_based_source TEXT,
  difficulty_level TEXT NOT NULL DEFAULT 'beginner' CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  estimated_duration_weeks INTEGER DEFAULT 12,
  is_default BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User recovery plans table
CREATE TABLE public.user_recovery_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  template_id UUID REFERENCES public.recovery_plan_templates(id),
  plan_data JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  start_date DATE,
  target_completion_date DATE,
  completion_percentage DECIMAL DEFAULT 0,
  shared_with_provider BOOLEAN DEFAULT false,
  shared_with_partners JSONB DEFAULT '[]',
  clinical_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recovery goals table (SMART goals format)
CREATE TABLE public.recovery_plan_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.user_recovery_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('specific', 'measurable', 'achievable', 'relevant', 'time_bound')),
  smart_criteria JSONB NOT NULL DEFAULT '{
    "specific": "",
    "measurable": "",
    "achievable": "",
    "relevant": "",
    "time_bound": ""
  }',
  target_value DECIMAL,
  current_value DECIMAL DEFAULT 0,
  unit_of_measure TEXT,
  priority_order INTEGER DEFAULT 0,
  category TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled')),
  reminder_frequency TEXT DEFAULT 'weekly' CHECK (reminder_frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  next_reminder_date DATE,
  completion_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Recovery milestones table
CREATE TABLE public.recovery_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.user_recovery_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  goal_id UUID REFERENCES public.recovery_plan_goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  milestone_date DATE NOT NULL,
  achievement_criteria TEXT,
  is_achieved BOOLEAN DEFAULT false,
  achieved_date DATE,
  celebration_type TEXT CHECK (celebration_type IN ('badge', 'certificate', 'notification', 'reward')),
  celebration_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Provider integration table for clinical sharing
CREATE TABLE public.provider_plan_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.user_recovery_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  provider_email TEXT NOT NULL,
  provider_name TEXT,
  access_level TEXT NOT NULL DEFAULT 'view' CHECK (access_level IN ('view', 'comment', 'collaborate')),
  expiry_date DATE,
  invitation_sent_at TIMESTAMP WITH TIME ZONE,
  access_granted_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recovery_plan_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recovery_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_plan_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_plan_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recovery_plan_templates
CREATE POLICY "Anyone can view default templates" 
ON public.recovery_plan_templates 
FOR SELECT 
USING (is_default = true OR auth.uid() = created_by);

CREATE POLICY "Users can create their own templates" 
ON public.recovery_plan_templates 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

-- RLS Policies for user_recovery_plans
CREATE POLICY "Users can view their own recovery plans" 
ON public.user_recovery_plans 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recovery plans" 
ON public.user_recovery_plans 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recovery plans" 
ON public.user_recovery_plans 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recovery plans" 
ON public.user_recovery_plans 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for recovery_plan_goals
CREATE POLICY "Users can view their own recovery goals" 
ON public.recovery_plan_goals 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recovery goals" 
ON public.recovery_plan_goals 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recovery goals" 
ON public.recovery_plan_goals 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recovery goals" 
ON public.recovery_plan_goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for recovery_milestones
CREATE POLICY "Users can view their own recovery milestones" 
ON public.recovery_milestones 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recovery milestones" 
ON public.recovery_milestones 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recovery milestones" 
ON public.recovery_milestones 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for provider_plan_access
CREATE POLICY "Users can manage their provider access" 
ON public.provider_plan_access 
FOR ALL 
USING (auth.uid() = user_id);

-- Create updated_at triggers
CREATE TRIGGER update_recovery_plan_templates_updated_at
BEFORE UPDATE ON public.recovery_plan_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_recovery_plans_updated_at
BEFORE UPDATE ON public.user_recovery_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_recovery_plan_goals_updated_at
BEFORE UPDATE ON public.recovery_plan_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default evidence-based recovery plan templates
INSERT INTO public.recovery_plan_templates (title, description, category, template_data, evidence_based_source, difficulty_level, estimated_duration_weeks, is_default) VALUES
('30-Day Foundation Plan', 'Evidence-based 30-day recovery foundation with SMART goals', 'sobriety', '{
  "phases": [
    {
      "name": "Week 1: Stabilization",
      "goals": [
        {
          "title": "Complete Daily Check-ins",
          "smart": {
            "specific": "Complete mood and wellness check-in every day",
            "measurable": "7 out of 7 days per week",
            "achievable": "Simple 5-minute daily check-in",
            "relevant": "Establishes self-awareness and routine",
            "time_bound": "Every day for 7 days"
          },
          "category": "routine"
        },
        {
          "title": "Build Support Network",
          "smart": {
            "specific": "Identify and connect with 3 supportive people",
            "measurable": "3 contacts added to support network",
            "achievable": "Family, friends, or support group members",
            "relevant": "Support is crucial for recovery success",
            "time_bound": "By end of week 1"
          },
          "category": "social"
        }
      ]
    },
    {
      "name": "Week 2-4: Foundation Building",
      "goals": [
        {
          "title": "Develop Coping Strategies",
          "smart": {
            "specific": "Learn and practice 5 healthy coping mechanisms",
            "measurable": "5 different techniques practiced weekly",
            "achievable": "Breathing, meditation, exercise, journaling, calling support",
            "relevant": "Essential for managing triggers and stress",
            "time_bound": "Practice each technique at least 3 times per week"
          },
          "category": "skills"
        }
      ]
    }
  ],
  "milestones": [
    {"day": 7, "title": "One Week Strong", "description": "Completed first week of recovery plan"},
    {"day": 14, "title": "Two Week Milestone", "description": "Maintained consistency for two weeks"},
    {"day": 30, "title": "30-Day Foundation Complete", "description": "Successfully completed foundation plan"}
  ]
}', 'Evidence-based recovery literature and SAMHSA guidelines', 'beginner', 4, true),

('90-Day Comprehensive Recovery', 'Comprehensive 90-day recovery program with clinical integration', 'sobriety', '{
  "phases": [
    {
      "name": "Phase 1: Detox & Stabilization (Days 1-30)",
      "goals": [
        {
          "title": "Medical Stabilization",
          "smart": {
            "specific": "Complete medical assessment and follow treatment recommendations",
            "measurable": "Attend 100% of medical appointments",
            "achievable": "Weekly check-ins with healthcare provider",
            "relevant": "Physical health foundation for recovery",
            "time_bound": "Complete within first 30 days"
          },
          "category": "medical"
        },
        {
          "title": "Daily Structure",
          "smart": {
            "specific": "Establish consistent daily routine",
            "measurable": "Follow structured schedule 6 out of 7 days",
            "achievable": "Set wake time, meals, activities, and sleep time",
            "relevant": "Structure supports recovery stability",
            "time_bound": "Maintain for 30 consecutive days"
          },
          "category": "routine"
        }
      ]
    },
    {
      "name": "Phase 2: Skill Building (Days 31-60)",
      "goals": [
        {
          "title": "Cognitive Behavioral Skills",
          "smart": {
            "specific": "Complete CBT modules for addiction recovery",
            "measurable": "Finish 8 CBT skill-building sessions",
            "achievable": "2 sessions per week with practice",
            "relevant": "CBT is evidence-based for addiction treatment",
            "time_bound": "Complete within 30 days"
          },
          "category": "therapy"
        }
      ]
    },
    {
      "name": "Phase 3: Integration (Days 61-90)",
      "goals": [
        {
          "title": "Relapse Prevention Plan",
          "smart": {
            "specific": "Develop comprehensive relapse prevention strategy",
            "measurable": "Document triggers, warning signs, and response plans",
            "achievable": "Work with counselor to create personalized plan",
            "relevant": "Prevention planning reduces relapse risk",
            "time_bound": "Complete by day 90"
          },
          "category": "prevention"
        }
      ]
    }
  ],
  "milestones": [
    {"day": 30, "title": "30-Day Foundation", "description": "Completed stabilization phase"},
    {"day": 60, "title": "60-Day Skills Mastery", "description": "Developed core recovery skills"},
    {"day": 90, "title": "90-Day Recovery Achievement", "description": "Comprehensive recovery plan completed"}
  ]
}', 'SAMHSA Treatment Improvement Protocols (TIP)', 'intermediate', 12, true),

('Mental Health Integration Plan', 'Dual diagnosis recovery plan integrating mental health and addiction treatment', 'mental_health', '{
  "phases": [
    {
      "name": "Assessment & Diagnosis",
      "goals": [
        {
          "title": "Comprehensive Mental Health Assessment",
          "smart": {
            "specific": "Complete dual diagnosis assessment with qualified professional",
            "measurable": "Receive formal assessment report",
            "achievable": "Schedule within 2 weeks",
            "relevant": "Understanding co-occurring conditions is essential",
            "time_bound": "Complete within 14 days"
          },
          "category": "assessment"
        }
      ]
    },
    {
      "name": "Integrated Treatment",
      "goals": [
        {
          "title": "Medication Management",
          "smart": {
            "specific": "Work with psychiatrist for medication optimization",
            "measurable": "Attend 100% of medication appointments",
            "achievable": "Monthly psychiatrist visits",
            "relevant": "Medication compliance improves outcomes",
            "time_bound": "Monthly for 6 months"
          },
          "category": "medical"
        }
      ]
    }
  ],
  "milestones": [
    {"day": 14, "title": "Assessment Complete", "description": "Completed comprehensive mental health assessment"},
    {"day": 60, "title": "Treatment Stabilization", "description": "Achieved medication and therapy stability"},
    {"day": 180, "title": "Integrated Recovery", "description": "Successfully managing dual diagnosis"}
  ]
}', 'SAMHSA TIP 42: Substance Abuse Treatment for Persons With Co-Occurring Disorders', 'advanced', 24, true);