-- Create data retention policies table
CREATE TABLE public.data_retention_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_name TEXT NOT NULL,
  data_type TEXT NOT NULL,
  retention_period_days INTEGER NOT NULL,
  deletion_method TEXT NOT NULL DEFAULT 'soft_delete',
  jurisdiction TEXT NOT NULL DEFAULT 'general',
  auto_delete_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_days_before INTEGER NOT NULL DEFAULT 30,
  legal_hold_exempt BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Create data retention schedules table
CREATE TABLE public.data_retention_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  data_type TEXT NOT NULL,
  data_id UUID NOT NULL,
  retention_policy_id UUID NOT NULL,
  created_date DATE NOT NULL,
  scheduled_deletion_date DATE NOT NULL,
  notification_sent_date DATE,
  deletion_status TEXT NOT NULL DEFAULT 'scheduled',
  legal_hold_applied BOOLEAN NOT NULL DEFAULT false,
  deletion_completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create backup verification table
CREATE TABLE public.backup_verification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  backup_date DATE NOT NULL,
  backup_type TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  backup_size_bytes BIGINT,
  verification_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verification_completed_at TIMESTAMP WITH TIME ZONE,
  integrity_check_passed BOOLEAN,
  recovery_test_passed BOOLEAN,
  geographic_redundancy_verified BOOLEAN,
  error_details JSONB,
  verification_metrics JSONB DEFAULT '{}',
  next_verification_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create recovery drill schedules table
CREATE TABLE public.recovery_drill_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drill_name TEXT NOT NULL,
  drill_type TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  target_recovery_time_minutes INTEGER NOT NULL,
  actual_recovery_time_minutes INTEGER,
  success_criteria JSONB NOT NULL DEFAULT '{}',
  results JSONB DEFAULT '{}',
  conducted_by UUID,
  completed_at TIMESTAMP WITH TIME ZONE,
  next_drill_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create incident response table
CREATE TABLE public.incident_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_type TEXT NOT NULL,
  severity_level TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'detected',
  detection_method TEXT NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  detected_by UUID,
  incident_description TEXT NOT NULL,
  affected_systems JSONB DEFAULT '[]',
  affected_users_count INTEGER DEFAULT 0,
  data_types_affected JSONB DEFAULT '[]',
  breach_confirmed BOOLEAN DEFAULT false,
  regulatory_notification_required BOOLEAN DEFAULT false,
  notification_deadline TIMESTAMP WITH TIME ZONE,
  containment_actions JSONB DEFAULT '[]',
  resolution_actions JSONB DEFAULT '[]',
  lessons_learned TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create regulatory notifications table
CREATE TABLE public.regulatory_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  incident_id UUID NOT NULL,
  regulator_name TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notification_content TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  confirmation_received BOOLEAN DEFAULT false,
  reference_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance requirements table
CREATE TABLE public.compliance_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requirement_name TEXT NOT NULL,
  regulation_framework TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  compliance_status TEXT NOT NULL DEFAULT 'pending',
  priority_level TEXT NOT NULL DEFAULT 'medium',
  due_date DATE,
  assigned_to UUID,
  evidence_required TEXT,
  implementation_notes TEXT,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  next_review_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create compliance audit trails table
CREATE TABLE public.compliance_audit_trails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requirement_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  performed_by UUID NOT NULL,
  evidence_data JSONB DEFAULT '{}',
  compliance_score_before INTEGER,
  compliance_score_after INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Create compliance reports table
CREATE TABLE public.compliance_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,
  overall_compliance_score INTEGER NOT NULL,
  framework_scores JSONB NOT NULL DEFAULT '{}',
  critical_gaps INTEGER DEFAULT 0,
  high_priority_gaps INTEGER DEFAULT 0,
  upcoming_deadlines INTEGER DEFAULT 0,
  report_data JSONB NOT NULL DEFAULT '{}',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID
);

-- Enable RLS on all tables
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_drill_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regulatory_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_audit_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for data retention
CREATE POLICY "Admins can manage retention policies" ON public.data_retention_policies
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Users can view their retention schedules" ON public.data_retention_schedules
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage retention schedules" ON public.data_retention_schedules
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role IN ('admin', 'system')
));

-- Create RLS policies for backup verification
CREATE POLICY "Admins can manage backup verification" ON public.backup_verification_logs
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can manage recovery drills" ON public.recovery_drill_schedules
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create RLS policies for incident response
CREATE POLICY "Admins can manage incidents" ON public.incident_responses
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can manage regulatory notifications" ON public.regulatory_notifications
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create RLS policies for compliance
CREATE POLICY "Admins can manage compliance requirements" ON public.compliance_requirements
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Admins can view audit trails" ON public.compliance_audit_trails
FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "System can create audit trails" ON public.compliance_audit_trails
FOR INSERT WITH CHECK (auth.uid() = performed_by);

CREATE POLICY "Admins can manage compliance reports" ON public.compliance_reports
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create indexes for performance
CREATE INDEX idx_retention_schedules_user_id ON public.data_retention_schedules(user_id);
CREATE INDEX idx_retention_schedules_deletion_date ON public.data_retention_schedules(scheduled_deletion_date);
CREATE INDEX idx_retention_schedules_status ON public.data_retention_schedules(deletion_status);

CREATE INDEX idx_backup_verification_date ON public.backup_verification_logs(backup_date);
CREATE INDEX idx_backup_verification_status ON public.backup_verification_logs(verification_status);

CREATE INDEX idx_incident_responses_status ON public.incident_responses(status);
CREATE INDEX idx_incident_responses_detected_at ON public.incident_responses(detected_at);

CREATE INDEX idx_compliance_requirements_status ON public.compliance_requirements(compliance_status);
CREATE INDEX idx_compliance_requirements_due_date ON public.compliance_requirements(due_date);

-- Create triggers for updated_at
CREATE TRIGGER update_data_retention_policies_updated_at
  BEFORE UPDATE ON public.data_retention_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_incident_responses_updated_at
  BEFORE UPDATE ON public.incident_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_compliance_requirements_updated_at
  BEFORE UPDATE ON public.compliance_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();