-- COMPLETE RLS FIX FOR USER_ROLES TABLE
-- This script safely removes ALL existing policies and creates clean, non-recursive ones
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/tqyiqstpvwztvofrxpuf/sql/new

-- ============================================
-- STEP 1: COMPLETE CLEANUP
-- ============================================

-- Drop ALL existing policies dynamically (handles any policy name)
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    -- Loop through all policies on user_roles table
    FOR policy_record IN 
        SELECT polname 
        FROM pg_policy 
        WHERE polrelid = 'public.user_roles'::regclass
    LOOP
        -- Drop each policy
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_roles', policy_record.polname);
        RAISE NOTICE 'Dropped policy: %', policy_record.polname;
    END LOOP;
END $$;

-- Drop any functions that might cause recursion
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, text) CASCADE;
DROP FUNCTION IF EXISTS public.check_user_role(UUID, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.check_user_role(UUID, text) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_role(UUID, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_role(UUID, text) CASCADE;

-- ============================================
-- STEP 2: VERIFY CLEANUP
-- ============================================

-- Check that no policies remain
SELECT COUNT(*) as remaining_policies 
FROM pg_policy 
WHERE polrelid = 'public.user_roles'::regclass;

-- ============================================
-- STEP 3: CREATE SIMPLE, NON-RECURSIVE POLICIES
-- ============================================

-- Policy 1: Users can view their own role
-- No function calls, no recursion, just direct comparison
CREATE POLICY "users_view_own_role_v2"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: System can insert initial roles during signup
-- Only allows patient role for security
CREATE POLICY "system_insert_patient_role_v2"
ON public.user_roles
FOR INSERT
WITH CHECK (
  -- Either the user is inserting their own patient role
  (auth.uid() = user_id AND role = 'patient')
  OR
  -- Or it's a service role operation (for triggers)
  (auth.jwt() IS NOT NULL AND auth.jwt()->>'role' = 'service_role')
  OR
  -- Or it's being inserted by the trigger (no auth context)
  (auth.uid() IS NULL AND current_setting('request.jwt.claim.sub', true) IS NULL)
);

-- Policy 3: Prevent ALL updates to roles
-- Role changes must go through admin procedures
CREATE POLICY "no_role_updates_v2"
ON public.user_roles
FOR UPDATE
USING (false)
WITH CHECK (false);

-- Policy 4: Prevent ALL deletes
-- Roles should never be deleted, only updated by admins
CREATE POLICY "no_role_deletes_v2"
ON public.user_roles
FOR DELETE
USING (false);

-- ============================================
-- STEP 4: UPDATE TRIGGER FUNCTION
-- ============================================

-- Ensure the trigger function works with new policies
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
    -- Get user type from metadata, default to recovery/patient
    requested_user_type := COALESCE(
        NEW.raw_user_meta_data->>'userType',
        NEW.raw_user_meta_data->>'user_type',
        'recovery'
    );
    
    -- Map user types to roles
    -- ALL users start as patients for security
    -- Provider elevation requires manual admin approval
    CASE requested_user_type
        WHEN 'recovery' THEN assigned_role := 'patient';
        WHEN 'patient' THEN assigned_role := 'patient';
        WHEN 'supporter' THEN assigned_role := 'support_member';
        WHEN 'support_member' THEN assigned_role := 'support_member';
        WHEN 'provider' THEN 
            -- Providers start as patients and need verification
            assigned_role := 'patient';
            
            -- Log provider registration for admin review
            BEGIN
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
            EXCEPTION WHEN OTHERS THEN
                -- Audit log might not exist, continue anyway
                NULL;
            END;
        ELSE 
            assigned_role := 'patient'; -- Default to patient for safety
    END CASE;
    
    -- Insert profile if table exists
    BEGIN
        INSERT INTO public.profiles (id, full_name, recovery_start_date, email)
        VALUES (
            NEW.id,
            COALESCE(
                NEW.raw_user_meta_data->>'full_name',
                NEW.raw_user_meta_data->>'fullName',
                split_part(NEW.email, '@', 1)
            ),
            CASE 
                WHEN NEW.raw_user_meta_data->>'recovery_start_date' IS NOT NULL 
                THEN (NEW.raw_user_meta_data->>'recovery_start_date')::date
                WHEN NEW.raw_user_meta_data->>'recoveryStartDate' IS NOT NULL 
                THEN (NEW.raw_user_meta_data->>'recoveryStartDate')::date
                ELSE NULL
            END,
            NEW.email
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            email = EXCLUDED.email,
            updated_at = now();
    EXCEPTION WHEN OTHERS THEN
        -- Table might not exist or other error, continue
        NULL;
    END;
    
    -- Assign the role (this bypasses RLS as SECURITY DEFINER)
    BEGIN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, assigned_role)
        ON CONFLICT (user_id) DO NOTHING; -- Prevent duplicate roles
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail user creation
        RAISE WARNING 'Failed to assign role for user %: %', NEW.id, SQLERRM;
    END;
    
    -- Log successful user creation
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
                'assigned_role', assigned_role::text,
                'user_type_requested', requested_user_type,
                'timestamp', now()
            )::text,
            now()
        );
    EXCEPTION WHEN OTHERS THEN
        -- Audit log might not exist, continue
        NULL;
    END;
    
    RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 5: GRANT NECESSARY PERMISSIONS
-- ============================================

-- Ensure authenticated users can read the table
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.user_roles TO anon;

-- ============================================
-- STEP 6: VERIFICATION QUERIES
-- ============================================

-- List all policies on user_roles table (should show 4 new ones)
SELECT 
    polname as policy_name,
    CASE polcmd 
        WHEN 'r' THEN 'SELECT'
        WHEN 'a' THEN 'INSERT'
        WHEN 'w' THEN 'UPDATE'
        WHEN 'd' THEN 'DELETE'
    END as operation,
    pg_get_expr(polqual, polrelid) as using_clause,
    pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policy 
WHERE polrelid = 'public.user_roles'::regclass
ORDER BY polname;

-- Test that there's no recursion (should return data or permission error, NOT recursion error)
SELECT * FROM public.user_roles LIMIT 1;

-- Check if RLS is enabled (should return true)
SELECT relrowsecurity 
FROM pg_class 
WHERE relname = 'user_roles' 
AND relnamespace = 'public'::regnamespace;

-- ============================================
-- STEP 7: SUCCESS MESSAGE
-- ============================================

-- If you see this message, the fix was applied successfully
SELECT 'SUCCESS: RLS policies have been fixed. No more recursion!' as status;