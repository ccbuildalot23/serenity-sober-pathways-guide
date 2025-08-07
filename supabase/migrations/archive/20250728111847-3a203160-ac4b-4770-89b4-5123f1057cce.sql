-- Add comprehensive RLS policies for all collaboration tables

-- Recovery Plans Policies
CREATE POLICY "Patients can view their own plans" 
ON public.recovery_plans 
FOR SELECT 
USING (auth.uid() = patient_id OR auth.uid() = created_by);

CREATE POLICY "Collaborators can view shared plans" 
ON public.recovery_plans 
FOR SELECT 
USING (
  id IN (
    SELECT plan_id FROM public.plan_collaborators 
    WHERE collaborator_id = auth.uid() AND status = 'accepted'
  )
);

CREATE POLICY "Users can create their own plans" 
ON public.recovery_plans 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Plan owners and editors can update plans" 
ON public.recovery_plans 
FOR UPDATE 
USING (
  auth.uid() = created_by OR 
  id IN (
    SELECT plan_id FROM public.plan_collaborators 
    WHERE collaborator_id = auth.uid() 
    AND status = 'accepted' 
    AND (role IN ('editor', 'owner') OR permissions->>'edit_goals' = 'true')
  )
);

-- Plan Collaborators Policies
CREATE POLICY "Plan owners can manage collaborators" 
ON public.plan_collaborators 
FOR ALL 
USING (
  plan_id IN (
    SELECT id FROM public.recovery_plans 
    WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Users can view their own collaborations" 
ON public.plan_collaborators 
FOR SELECT 
USING (auth.uid() = collaborator_id);

-- Plan Comments Policies
CREATE POLICY "Collaborators can view plan comments" 
ON public.plan_comments 
FOR SELECT 
USING (
  plan_id IN (
    SELECT id FROM public.recovery_plans 
    WHERE patient_id = auth.uid() OR created_by = auth.uid()
  ) OR
  plan_id IN (
    SELECT plan_id FROM public.plan_collaborators 
    WHERE collaborator_id = auth.uid() AND status = 'accepted'
  )
);

CREATE POLICY "Collaborators can add comments" 
ON public.plan_comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = author_id AND (
    plan_id IN (
      SELECT id FROM public.recovery_plans 
      WHERE patient_id = auth.uid() OR created_by = auth.uid()
    ) OR
    plan_id IN (
      SELECT plan_id FROM public.plan_collaborators 
      WHERE collaborator_id = auth.uid() 
      AND status = 'accepted' 
      AND permissions->>'add_comments' = 'true'
    )
  )
);

CREATE POLICY "Authors can update their own comments" 
ON public.plan_comments 
FOR UPDATE 
USING (auth.uid() = author_id);

-- Plan Versions Policies
CREATE POLICY "Collaborators can view plan versions" 
ON public.plan_versions 
FOR SELECT 
USING (
  plan_id IN (
    SELECT id FROM public.recovery_plans 
    WHERE patient_id = auth.uid() OR created_by = auth.uid()
  ) OR
  plan_id IN (
    SELECT plan_id FROM public.plan_collaborators 
    WHERE collaborator_id = auth.uid() AND status = 'accepted'
  )
);

CREATE POLICY "System can insert version history" 
ON public.plan_versions 
FOR INSERT 
WITH CHECK (true); -- Allow system to track changes

-- Provider Templates Policies
CREATE POLICY "Providers can manage their own templates" 
ON public.provider_templates 
FOR ALL 
USING (auth.uid() = provider_id);

CREATE POLICY "Users can view shared templates" 
ON public.provider_templates 
FOR SELECT 
USING (is_shared = true OR auth.uid() = provider_id);

-- Clinical Notes Policies (Provider-only)
CREATE POLICY "Providers can manage their own clinical notes" 
ON public.clinical_notes 
FOR ALL 
USING (auth.uid() = provider_id);

CREATE POLICY "Only providers can view clinical notes" 
ON public.clinical_notes 
FOR SELECT 
USING (
  auth.uid() = provider_id AND 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'provider'
  )
);

-- Editing Sessions Policies
CREATE POLICY "Users can manage their own editing sessions" 
ON public.editing_sessions 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Collaborators can view active editing sessions" 
ON public.editing_sessions 
FOR SELECT 
USING (
  plan_id IN (
    SELECT id FROM public.recovery_plans 
    WHERE patient_id = auth.uid() OR created_by = auth.uid()
  ) OR
  plan_id IN (
    SELECT plan_id FROM public.plan_collaborators 
    WHERE collaborator_id = auth.uid() AND status = 'accepted'
  )
);

-- Add indexes and triggers
CREATE INDEX IF NOT EXISTS idx_recovery_plans_patient_id ON public.recovery_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_recovery_plans_created_by ON public.recovery_plans(created_by);
CREATE INDEX IF NOT EXISTS idx_plan_collaborators_plan_id ON public.plan_collaborators(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_collaborators_collaborator_id ON public.plan_collaborators(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_plan_comments_plan_id ON public.plan_comments(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_comments_goal_id ON public.plan_comments(goal_id);
CREATE INDEX IF NOT EXISTS idx_editing_sessions_plan_id ON public.editing_sessions(plan_id);

-- Add update triggers
CREATE TRIGGER update_recovery_plans_updated_at
  BEFORE UPDATE ON public.recovery_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plan_collaborators_updated_at
  BEFORE UPDATE ON public.plan_collaborators
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();