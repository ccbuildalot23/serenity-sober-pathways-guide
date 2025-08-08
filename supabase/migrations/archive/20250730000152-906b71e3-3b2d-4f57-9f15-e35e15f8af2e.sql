-- Security Enhancement: Complete User Role Management
-- Add comprehensive RLS policies for user_roles table

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "System can assign default roles" ON public.user_roles;

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

-- Enhanced security function to check admin/provider privileges
CREATE OR REPLACE FUNCTION public.verify_provider_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'provider'::app_role
  );
END;
$$;

-- Function to get user's highest privilege level
CREATE OR REPLACE FUNCTION public.get_user_privilege_level()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_roles_array text[];
BEGIN
  SELECT array_agg(role::text) INTO user_roles_array
  FROM public.user_roles 
  WHERE user_id = auth.uid();
  
  -- Return highest privilege level
  IF 'provider' = ANY(user_roles_array) THEN
    RETURN 'provider';
  ELSIF 'support_member' = ANY(user_roles_array) THEN
    RETURN 'support_member';
  ELSE
    RETURN 'patient';
  END IF;
END;
$$;