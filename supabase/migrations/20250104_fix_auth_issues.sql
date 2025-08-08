-- Comprehensive fix for authentication issues
-- This migration fixes the infinite recursion in user_roles and user creation errors

-- 1. First, drop all problematic policies on user_roles
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Secure role assignment" ON public.user_roles;
DROP POLICY IF EXISTS "Prevent role updates" ON public.user_roles;
DROP POLICY IF EXISTS "Only providers can delete roles" ON public.user_roles;

-- 2. Create simple, non-recursive policies for user_roles
-- Allow users to read their own role
CREATE POLICY "Users can read own role"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Allow the system (via handle_new_user function) to insert roles
-- This policy allows inserts when the user_id matches the current user
-- OR when there's no authenticated user (system level operations)
CREATE POLICY "System can insert roles"
ON public.user_roles
FOR INSERT
WITH CHECK (
    user_id = auth.uid() 
    OR auth.uid() IS NULL
);

-- Prevent any updates to roles (security requirement)
CREATE POLICY "No role updates allowed"
ON public.user_roles
FOR UPDATE
USING (false);

-- Only allow role deletion by the system
CREATE POLICY "System can delete roles"
ON public.user_roles
FOR DELETE
USING (false);

-- 3. Fix the handle_new_user function to avoid RLS issues
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    requested_user_type text;
    assigned_role app_role;
BEGIN
    -- Get the user type from metadata
    requested_user_type := COALESCE(NEW.raw_user_meta_data ->> 'userType', 'recovery');
    
    -- Map user types to roles
    CASE requested_user_type
        WHEN 'recovery' THEN assigned_role := 'patient';
        WHEN 'supporter' THEN assigned_role := 'support_member';
        WHEN 'provider' THEN assigned_role := 'provider'; -- For MVP, allow provider directly
        ELSE assigned_role := 'patient';
    END CASE;
    
    -- Insert into profiles table (with explicit column list to avoid conflicts)
    INSERT INTO public.profiles (id, full_name, email, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
        NEW.email,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO NOTHING; -- Prevent duplicate key errors
    
    -- Assign the appropriate role (with conflict handling)
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (NEW.id, assigned_role, NOW())
    ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicate key errors
    
    -- Log the signup (simplified to avoid dependency issues)
    BEGIN
        INSERT INTO public.audit_logs (
            user_id,
            action,
            details_encrypted,
            timestamp
        ) VALUES (
            NEW.id,
            'USER_SIGNUP',
            jsonb_build_object(
                'user_type', requested_user_type,
                'assigned_role', assigned_role::text
            )::text,
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        -- Ignore audit log errors to not break signup
        NULL;
    END;
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- 4. Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 5. Fix RLS on profiles table to prevent cascading issues
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (id = auth.uid());

CREATE POLICY "System can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (id = auth.uid() OR auth.uid() IS NULL);

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.user_roles TO postgres, service_role;
GRANT SELECT ON public.user_roles TO anon, authenticated;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO anon; -- For signup

-- 7. Ensure get_current_user_role function works properly
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT role::text
    FROM public.user_roles
    WHERE user_id = auth.uid()
    LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated, anon;