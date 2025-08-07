-- CRITICAL SECURITY FIX FOR USER_ROLES TABLE
-- Apply this directly in Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/tqyiqstpvwztvofrxpuf/sql/new

-- Step 1: Drop the insecure policy
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;

-- Step 2: Create secure insertion policy
CREATE POLICY "Secure role insertion"
ON public.user_roles
FOR INSERT
WITH CHECK (
  -- Allow users to insert their own role
  (auth.uid() = user_id 
   AND role = 'patient'
   AND NOT EXISTS (
     SELECT 1 FROM public.user_roles 
     WHERE user_id = auth.uid()
   ))
  OR
  -- Allow service role
  (auth.jwt() ->> 'role' = 'service_role')
);

-- Step 3: Update the role update policy
DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;

CREATE POLICY "Restricted role updates"
ON public.user_roles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  (role != 'provider' OR OLD.role = 'provider')
  AND (user_id = OLD.user_id)
);

-- Step 4: Add audit trigger for role changes
CREATE OR REPLACE FUNCTION audit_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (
      user_id, action, details_encrypted, timestamp
    ) VALUES (
      NEW.user_id, 'ROLE_ASSIGNED',
      jsonb_build_object('role', NEW.role, 'operation', TG_OP, 'timestamp', now())::text,
      now()
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.role != OLD.role THEN
    INSERT INTO public.audit_logs (
      user_id, action, details_encrypted, timestamp
    ) VALUES (
      NEW.user_id, 'ROLE_CHANGED',
      jsonb_build_object('old_role', OLD.role, 'new_role', NEW.role, 'operation', TG_OP, 'timestamp', now())::text,
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_user_role_changes ON public.user_roles;
CREATE TRIGGER audit_user_role_changes
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION audit_role_changes();

-- Step 5: Update handle_new_user function
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
    requested_user_type := COALESCE(NEW.raw_user_meta_data ->> 'userType', 'recovery');
    
    -- All new users start as patients for security
    CASE requested_user_type
        WHEN 'recovery' THEN assigned_role := 'patient';
        WHEN 'supporter' THEN assigned_role := 'support_member';
        WHEN 'provider' THEN 
            assigned_role := 'patient'; -- Requires verification
            
            INSERT INTO public.audit_logs (
                user_id, action, details_encrypted, timestamp
            ) VALUES (
                NEW.id, 'PROVIDER_REGISTRATION_PENDING',
                jsonb_build_object('email', NEW.email, 'requested_role', 'provider', 
                                 'assigned_role', 'patient', 'requires_verification', true)::text,
                now()
            );
        ELSE assigned_role := 'patient';
    END CASE;
    
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
        NULL;
    END;
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, assigned_role);
    
    BEGIN
        INSERT INTO public.audit_logs (
            user_id, action, details_encrypted, timestamp
        ) VALUES (
            NEW.id, 'USER_REGISTERED',
            jsonb_build_object('assigned_role', assigned_role, 
                             'user_type_requested', requested_user_type)::text,
            now()
        );
    EXCEPTION WHEN undefined_table THEN
        NULL;
    END;
    
    RETURN NEW;
END;
$$;

-- Verify the fix was applied
SELECT 
    polname as policy_name,
    polcmd as operation,
    pg_get_expr(polqual, polrelid) as using_clause,
    pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policy 
WHERE polrelid = 'user_roles'::regclass
ORDER BY polname;