-- Security Enhancement: Complete User Role Management
-- Enhanced RLS policies for user_roles table with proper cleanup

-- First, drop ALL existing policies to start clean
DO $$
DECLARE
    pol_name text;
BEGIN
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'user_roles' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', pol_name);
    END LOOP;
END $$;

-- Enhanced RLS policies for user_roles table
-- Users can view their own roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Only providers/admins can view all roles (for management purposes)
CREATE POLICY "Providers can view all user roles" 
ON public.user_roles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'provider'::app_role
  )
);

-- Only providers can assign roles (INSERT)
CREATE POLICY "Providers can assign user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'provider'::app_role
  )
);

-- Only providers can modify roles (UPDATE)
CREATE POLICY "Providers can modify user roles" 
ON public.user_roles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'provider'::app_role
  )
);

-- Only providers can remove roles (DELETE) 
CREATE POLICY "Providers can remove user roles" 
ON public.user_roles 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = 'provider'::app_role
  )
);

-- Create audit logging function for role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log role assignments/changes
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      details_encrypted,
      timestamp
    ) VALUES (
      auth.uid(),
      'ROLE_ASSIGNED',
      jsonb_build_object(
        'target_user_id', NEW.user_id,
        'role_assigned', NEW.role,
        'assigned_by', auth.uid(),
        'timestamp', now()
      )::text,
      now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      details_encrypted,
      timestamp
    ) VALUES (
      auth.uid(),
      'ROLE_MODIFIED',
      jsonb_build_object(
        'target_user_id', NEW.user_id,
        'old_role', OLD.role,
        'new_role', NEW.role,
        'modified_by', auth.uid(),
        'timestamp', now()
      )::text,
      now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      details_encrypted,
      timestamp
    ) VALUES (
      auth.uid(),
      'ROLE_REMOVED',
      jsonb_build_object(
        'target_user_id', OLD.user_id,
        'role_removed', OLD.role,
        'removed_by', auth.uid(),
        'timestamp', now()
      )::text,
      now()
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role change auditing
DROP TRIGGER IF EXISTS audit_role_changes ON public.user_roles;
CREATE TRIGGER audit_role_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_change();