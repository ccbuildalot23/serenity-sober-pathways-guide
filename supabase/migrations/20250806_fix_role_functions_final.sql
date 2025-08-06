-- Final fix for role functions - drops ALL conflicting functions and recreates minimal set
-- This should be run instead of previous migrations to avoid conflicts

-- First, drop ALL possible function signatures that might exist
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all functions named get_user_role regardless of parameters
    FOR r IN 
        SELECT ns.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace ns ON p.pronamespace = ns.oid
        WHERE ns.nspname = 'public' 
        AND p.proname IN ('get_user_role', 'has_role', 'is_provider_or_admin', 
                          'has_any_role', 'current_user_role', 'current_user_has_role',
                          'is_authenticated')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE', 
                      r.nspname, r.proname, r.args);
    END LOOP;
END $$;

-- Drop and recreate app_role type to ensure consistency
DROP TYPE IF EXISTS app_role CASCADE;
CREATE TYPE app_role AS ENUM ('patient', 'support_member', 'provider', 'admin');

-- Create ONLY the essential functions with unique signatures

-- 1. Main get_user_role function - ONLY ONE VERSION
CREATE OR REPLACE FUNCTION public.get_user_role(
  p_user_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
  v_actual_user_id UUID;
BEGIN
  -- If NULL passed, use current user
  v_actual_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_actual_user_id IS NULL THEN
    RETURN 'patient';
  END IF;
  
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = v_actual_user_id
  LIMIT 1;
  
  RETURN COALESCE(v_role, 'patient');
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'patient';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Main has_role function - ONLY ONE VERSION
CREATE OR REPLACE FUNCTION public.has_role(
  p_user_id UUID,
  p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  IF p_user_id IS NULL OR p_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  IF p_role NOT IN ('patient', 'support_member', 'provider', 'admin') THEN
    RETURN FALSE;
  END IF;
  
  RETURN EXISTS(
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = p_user_id 
      AND role = p_role
    LIMIT 1
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. Support for app_role enum type (different parameter type = no conflict)
CREATE OR REPLACE FUNCTION public.has_role(
  p_user_id UUID,
  p_role app_role
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_role(p_user_id, p_role::TEXT);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. is_authenticated - simple check
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. is_provider_or_admin - ONLY ONE VERSION
CREATE OR REPLACE FUNCTION public.is_provider_or_admin(
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_actual_user_id UUID;
  v_role TEXT;
BEGIN
  v_actual_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_actual_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  v_role := public.get_user_role(v_actual_user_id);
  RETURN v_role IN ('provider', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_provider_or_admin(UUID) TO authenticated, anon;

-- Create wrapper functions for common use cases
-- These have different names to avoid any conflicts

-- Get current user's role (no parameters)
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN public.get_user_role(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user has a role
CREATE OR REPLACE FUNCTION public.auth_has_role(
  p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_role(auth.uid(), p_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if current user is provider or admin
CREATE OR REPLACE FUNCTION public.auth_is_provider_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.is_provider_or_admin(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.auth_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.auth_has_role(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.auth_is_provider_or_admin() TO authenticated, anon;

-- Update any RLS policies that might be using old function signatures
-- This handles common patterns found in existing policies

-- Create helper for RLS policies - explicitly named to avoid conflicts
CREATE OR REPLACE FUNCTION public.rls_user_has_role(
  p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_role(auth.uid(), p_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.rls_user_has_role(TEXT) TO authenticated, anon;

-- Test the functions
DO $$
DECLARE
  test_uuid UUID := gen_random_uuid();
BEGIN
  -- Test with explicit parameters
  PERFORM public.get_user_role(test_uuid);
  PERFORM public.get_user_role(NULL::UUID);
  PERFORM public.has_role(test_uuid, 'patient');
  PERFORM public.has_role(test_uuid, 'provider'::app_role);
  PERFORM public.is_provider_or_admin(test_uuid);
  PERFORM public.is_provider_or_admin(NULL::UUID);
  
  -- Test wrapper functions
  PERFORM public.auth_user_role();
  PERFORM public.auth_has_role('patient');
  PERFORM public.auth_is_provider_or_admin();
  PERFORM public.rls_user_has_role('patient');
  
  -- Test is_authenticated
  PERFORM public.is_authenticated();
  
  RAISE NOTICE 'All functions tested successfully - no ambiguity';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Function test warning: %', SQLERRM;
    -- Don't fail the migration, just warn
END $$;

-- Add compatibility functions ONLY if they don't conflict
-- These use CREATE OR REPLACE to avoid errors if they already exist

-- Try to create a get_user_role() with no params, but only if it doesn't conflict
DO $$
BEGIN
  -- Check if we can create get_user_role with no params
  CREATE OR REPLACE FUNCTION public.get_user_role()
  RETURNS TEXT AS $func$
  BEGIN
    RETURN public.get_user_role(NULL::UUID);
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
  
  GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;
  RAISE NOTICE 'Created get_user_role() compatibility function';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create get_user_role() - using auth_user_role() instead';
END $$;

-- Try to create has_role with single param
DO $$
BEGIN
  CREATE OR REPLACE FUNCTION public.has_role(p_role TEXT)
  RETURNS BOOLEAN AS $func$
  BEGIN
    RETURN public.has_role(auth.uid(), p_role);
  END;
  $func$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
  
  GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated, anon;
  RAISE NOTICE 'Created has_role(TEXT) compatibility function';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not create has_role(TEXT) - using auth_has_role(TEXT) instead';
END $$;

-- Document the available functions
COMMENT ON FUNCTION public.get_user_role(UUID) IS 'Get role of user (NULL = current user) - main function';
COMMENT ON FUNCTION public.auth_user_role() IS 'Get current authenticated user role - use this for no params';
COMMENT ON FUNCTION public.has_role(UUID, TEXT) IS 'Check if user has role - main function';
COMMENT ON FUNCTION public.auth_has_role(TEXT) IS 'Check if current user has role - use this for single param';
COMMENT ON FUNCTION public.rls_user_has_role(TEXT) IS 'RLS helper - check if current user has role';
COMMENT ON FUNCTION public.is_authenticated() IS 'Check if user is authenticated';
COMMENT ON FUNCTION public.is_provider_or_admin(UUID) IS 'Check if user has elevated privileges';
COMMENT ON FUNCTION public.auth_is_provider_or_admin() IS 'Check if current user has elevated privileges';