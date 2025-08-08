-- Create comprehensive recovery planning collaboration system
-- Step 1: Core recovery planning tables with collaboration features

-- Recovery plans table with version control
CREATE TABLE public.recovery_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_by UUID NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 1,
  is_collaborative BOOLEAN NOT NULL DEFAULT false,
  last_edited_by UUID,
  last_edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Plan collaborators for provider access management
CREATE TABLE public.plan_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.recovery_plans(id) ON DELETE CASCADE,
  collaborator_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'approver', 'owner')),
  permissions JSONB NOT NULL DEFAULT '{"view_goals": true, "edit_goals": false, "add_comments": true, "approve_goals": false, "view_clinical_notes": false}',
  invited_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(plan_id, collaborator_id)
);

-- Recovery goals with approval workflow
CREATE TABLE public.recovery_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.recovery_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('sobriety', 'mental_health', 'physical_health', 'relationships', 'career', 'personal_growth')),
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Comments system for provider feedback
CREATE TABLE public.plan_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.recovery_plans(id) ON DELETE CASCADE,
  goal_id UUID REFERENCES public.recovery_goals(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.plan_comments(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'general' CHECK (comment_type IN ('general', 'suggestion', 'approval_request', 'clinical_note')),
  is_resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Version history tracking
CREATE TABLE public.plan_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.recovery_plans(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  changes_summary TEXT,
  changed_by UUID NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('goal_added', 'goal_modified', 'goal_deleted', 'plan_updated', 'collaborator_added', 'collaborator_removed')),
  previous_data JSONB,
  current_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(plan_id, version_number)
);

-- Provider templates library
CREATE TABLE public.provider_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  template_data JSONB NOT NULL,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Clinical notes (provider-only visibility)
CREATE TABLE public.clinical_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.recovery_plans(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  note_type TEXT NOT NULL CHECK (note_type IN ('assessment', 'progress', 'concern', 'recommendation')),
  content TEXT NOT NULL,
  is_confidential BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Progress review scheduling
CREATE TABLE public.progress_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.recovery_plans(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  review_type TEXT NOT NULL CHECK (review_type IN ('weekly', 'monthly', 'quarterly', 'milestone')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Real-time editing sessions tracking
CREATE TABLE public.editing_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID NOT NULL REFERENCES public.recovery_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  editing_section TEXT, -- 'goals', 'overview', 'specific_goal_id'
  
  UNIQUE(plan_id, user_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Enable Row Level Security
ALTER TABLE public.recovery_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.editing_sessions ENABLE ROW LEVEL SECURITY;