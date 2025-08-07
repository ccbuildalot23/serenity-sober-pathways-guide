-- Fix infinite recursion in RLS policies on user_roles table
-- This migration resolves the circular dependency causing "Database error saving new user"

-- 1. Drop all existing RLS policies on user_roles table
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Providers can view patient roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- 2. Drop the problematic has_role function that's causing recursion
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role);

-- 3. Create a simpler, non-recursive has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS boolean
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Create simple, non-recursive RLS policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- 5. Allow the system to insert roles (needed for new user creation)
CREATE POLICY "System can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (true);

-- 6. Allow users to update their own roles (if needed)
CREATE POLICY "Users can update own roles"
ON public.user_roles
FOR UPDATE
USING (auth.uid() = user_id);

-- 7. Fix any other RLS policies that might reference the problematic has_role function
-- Update profiles policies to be simpler
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 8. Fix audit_logs policies
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own audit logs"
ON public.audit_logs
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- 9. Ensure the handle_new_user function doesn't have any RLS issues
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
    CASE requested_user_type
        WHEN 'recovery' THEN assigned_role := 'patient';
        WHEN 'supporter' THEN assigned_role := 'support_member';
        WHEN 'provider' THEN assigned_role := 'patient'; -- Start as patient for security
        ELSE assigned_role := 'patient';
    END CASE;
    
    -- Insert into profiles table (if it exists)
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
        -- Profiles table doesn't exist, skip it
        NULL;
    END;
    
    -- Assign the appropriate role (this should now work without recursion)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, assigned_role);
    
    -- Log the role assignment (if audit_logs table exists)
    BEGIN
        INSERT INTO public.audit_logs (
            user_id,
            action,
            details_encrypted,
            timestamp
        ) VALUES (
            NEW.id,
            'USER_ROLE_ASSIGNED',
            jsonb_build_object(
                'assigned_role', assigned_role,
                'user_type_requested', requested_user_type,
                'timestamp', now()
            )::text,
            now()
        );
    EXCEPTION WHEN undefined_table THEN
        -- Audit logs table doesn't exist, skip it
        NULL;
    END;
    
    RETURN NEW;
END;
$$;

-- 10. Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 11. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- 12. Add helpful comments
COMMENT ON FUNCTION public.has_role(UUID, app_role) IS 'Simple role check function without recursion';
COMMENT ON FUNCTION public.handle_new_user() IS 'Handles new user creation with role assignment';
COMMENT ON TABLE public.user_roles IS 'User role assignments with fixed RLS policies'; 