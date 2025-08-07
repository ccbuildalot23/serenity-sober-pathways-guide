-- Fix critical security vulnerability in user_roles RLS policy
-- This migration addresses the HIPAA compliance audit finding #1

-- Drop the insecure policy that allows unrestricted INSERT
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;

-- Create a secure policy that only allows:
-- 1. Users to insert their own initial role during signup
-- 2. Service role (backend functions) to insert roles
-- 3. Prevents privilege escalation by restricting role types
CREATE POLICY "Secure role insertion"
ON public.user_roles
FOR INSERT
WITH CHECK (
  -- Allow users to insert their own role
  (auth.uid() = user_id 
   -- Restrict to patient role only for self-insertion
   AND role = 'patient'
   -- Prevent duplicate roles
   AND NOT EXISTS (
     SELECT 1 FROM public.user_roles 
     WHERE user_id = auth.uid()
   ))
  OR
  -- Allow service role (used by triggers and edge functions)
  (auth.jwt() ->> 'role' = 'service_role')
);

-- Add additional security policy to prevent role elevation
-- Users cannot update their role to provider without verification
DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;

CREATE POLICY "Restricted role updates"
ON public.user_roles
FOR UPDATE
USING (
  -- Users can only update their own roles
  auth.uid() = user_id
)
WITH CHECK (
  -- Prevent self-elevation to provider role
  -- Provider role must be assigned through a verified process
  (role != 'provider' OR OLD.role = 'provider')
  AND
  -- Ensure user_id cannot be changed
  (user_id = OLD.user_id)
);

-- Add audit trigger for role changes
CREATE OR REPLACE FUNCTION audit_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log role changes to audit_logs table
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      details_encrypted,
      timestamp
    ) VALUES (
      NEW.user_id,
      'ROLE_ASSIGNED',
      jsonb_build_object(
        'role', NEW.role,
        'operation', TG_OP,
        'timestamp', now()
      )::text,
      now()
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.role != OLD.role THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      details_encrypted,
      timestamp
    ) VALUES (
      NEW.user_id,
      'ROLE_CHANGED',
      jsonb_build_object(
        'old_role', OLD.role,
        'new_role', NEW.role,
        'operation', TG_OP,
        'timestamp', now()
      )::text,
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to audit role changes
DROP TRIGGER IF EXISTS audit_user_role_changes ON public.user_roles;
CREATE TRIGGER audit_user_role_changes
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION audit_role_changes();

-- Add policy for providers to manage patient associations
CREATE POLICY "Providers can view patient associations"
ON public.user_roles
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  -- Providers can view roles of their associated patients
  EXISTS (
    SELECT 1 FROM public.provider_patient_associations ppa
    WHERE ppa.provider_id = auth.uid()
    AND ppa.patient_id = user_roles.user_id
    AND ppa.status = 'active'
  )
);

-- Update the handle_new_user function to work with the new secure policies
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    requested_user_type text;
    assigned_role app_role;
BEGIN
    -- Get the user type from metadata (default to 'recovery')
    requested_user_type := COALESCE(NEW.raw_user_meta_data ->> 'userType', 'recovery');
    
    -- Map user types to roles safely
    -- All new users start as patients for security
    -- Provider elevation requires separate verification process
    CASE requested_user_type
        WHEN 'recovery' THEN assigned_role := 'patient';
        WHEN 'supporter' THEN assigned_role := 'support_member';
        WHEN 'provider' THEN 
            -- Providers must be verified through a separate process
            -- Start them as patients and require admin approval
            assigned_role := 'patient';
            
            -- Log provider registration attempt for review
            INSERT INTO public.audit_logs (
                user_id,
                action,
                details_encrypted,
                timestamp
            ) VALUES (
                NEW.id,
                'PROVIDER_REGISTRATION_PENDING',
                jsonb_build_object(
                    'email', NEW.email,
                    'requested_role', 'provider',
                    'assigned_role', 'patient',
                    'requires_verification', true,
                    'timestamp', now()
                )::text,
                now()
            );
        ELSE assigned_role := 'patient';
    END CASE;
    
    -- Insert into profiles table
    BEGIN
        INSERT INTO public.profiles (id, full_name, recovery_start_date, email)
        VALUES (
            NEW.id,
            NEW.raw_user_meta_data ->> 'full_name',
            CASE 
                WHEN NEW.raw_user_meta_data ->> 'recovery_start_date' IS NOT NULL 
                THEN (NEW.raw_user_meta_data ->> 'recovery_start_date')::date
                ELSE NULL
            END,
            NEW.email
        );
    EXCEPTION WHEN undefined_table THEN
        NULL; -- Profiles table doesn't exist, skip
    END;
    
    -- Assign the appropriate role using SECURITY DEFINER context
    -- This bypasses RLS as it runs with elevated privileges
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, assigned_role);
    
    -- Log the role assignment
    BEGIN
        INSERT INTO public.audit_logs (
            user_id,
            action,
            details_encrypted,
            timestamp
        ) VALUES (
            NEW.id,
            'USER_REGISTERED',
            jsonb_build_object(
                'assigned_role', assigned_role,
                'user_type_requested', requested_user_type,
                'timestamp', now()
            )::text,
            now()
        );
    EXCEPTION WHEN undefined_table THEN
        NULL; -- Audit logs table doesn't exist, skip
    END;
    
    RETURN NEW;
END;
$$;

-- Add comment explaining the security model
COMMENT ON POLICY "Secure role insertion" ON public.user_roles IS 
'Prevents privilege escalation by restricting self-insertion to patient role only. Service role can insert any role type for admin operations.';

COMMENT ON POLICY "Restricted role updates" ON public.user_roles IS 
'Prevents users from self-elevating to provider role. Provider verification must go through a separate admin process.';

COMMENT ON FUNCTION handle_new_user() IS 
'Handles new user registration with secure role assignment. Provider requests are logged for manual verification.';