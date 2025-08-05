-- Fix database issues preventing new user creation
-- This migration resolves conflicts between multiple triggers and functions

-- 1. Drop all conflicting triggers first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;

-- 2. Drop conflicting functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.assign_default_role();

-- 3. Create a single, unified function to handle new user creation
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
    
    -- Assign the appropriate role
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

-- 4. Create a single trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Ensure the profiles table exists with proper structure
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    recovery_start_date DATE,
    email TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable RLS on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for profiles
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

-- 8. Ensure the user_roles table exists
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 9. Enable RLS on user_roles table
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for user_roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- 11. Ensure the audit_logs table exists (optional)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    details_encrypted TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Enable RLS on audit_logs table
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 13. Create RLS policies for audit_logs
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

-- 14. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- 15. Add comments for documentation
COMMENT ON FUNCTION public.handle_new_user() IS 'Handles new user creation with role assignment and profile creation';
COMMENT ON TABLE public.profiles IS 'User profiles with recovery information';
COMMENT ON TABLE public.user_roles IS 'User role assignments for access control';
COMMENT ON TABLE public.audit_logs IS 'Audit trail for security events';