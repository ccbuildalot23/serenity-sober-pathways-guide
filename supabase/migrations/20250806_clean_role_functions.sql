-- Clean up and recreate all role-related functions to avoid conflicts
-- This migration drops all existing functions and recreates them properly

-- First, drop all existing role-related functions to avoid conflicts
DROP FUNCTION IF EXISTS public.get_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(app_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.is_provider_or_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_provider_or_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_authenticated() CASCADE;

-- Ensure app_role type exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('patient', 'support_member', 'provider', 'admin');
  END IF;
END $$;

-- Create get_user_role function with optional UUID parameter
-- This single function handles both cases (with and without parameter)
CREATE OR REPLACE FUNCTION public.get_user_role(
  p_user_id UUID DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
  v_user_id UUID;
BEGIN
  -- Use provided user_id or current user
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- If no user_id available, return default
  IF v_user_id IS NULL THEN
    RETURN 'patient';
  END IF;
  
  -- Get the user's role
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = v_user_id
  LIMIT 1;
  
  -- Default to 'patient' if no role found
  RETURN COALESCE(v_role, 'patient');
EXCEPTION
  WHEN OTHERS THEN
    -- Return default on any error
    RETURN 'patient';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create has_role function with UUID and TEXT parameters
CREATE OR REPLACE FUNCTION public.has_role(
  p_user_id UUID,
  p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Validate role is valid
  IF p_role NOT IN ('patient', 'support_member', 'provider', 'admin') THEN
    RETURN FALSE;
  END IF;
  
  -- Check if the user has the specified role
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

-- Create has_any_role function for current user with TEXT parameter
-- Different name to avoid overload conflicts
CREATE OR REPLACE FUNCTION public.has_any_role(
  p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_role(auth.uid(), p_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create is_authenticated function
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create is_provider_or_admin function with optional UUID
CREATE OR REPLACE FUNCTION public.is_provider_or_admin(
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
BEGIN
  -- Use provided user_id or current user
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- If no user_id available, return false
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get user's role
  v_role := public.get_user_role(v_user_id);
  
  -- Check if role is elevated
  RETURN v_role IN ('provider', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create helper function to check current user's role
-- This avoids ambiguity with overloading
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN public.get_user_role(NULL::UUID);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create helper to check if current user has a specific role
CREATE OR REPLACE FUNCTION public.current_user_has_role(
  p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_role(auth.uid(), p_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_provider_or_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_role(TEXT) TO authenticated;

-- Grant certain functions to anon role for registration/login flows
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon;

-- Create backwards compatibility views/functions for legacy code
-- These wrap the new functions to maintain compatibility

-- Legacy has_role with single parameter (for current user)
CREATE OR REPLACE FUNCTION public.has_role(
  p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.current_user_has_role(p_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;

-- Test all functions to ensure they work
DO $$
DECLARE
  test_uuid UUID := '00000000-0000-0000-0000-000000000000'::UUID;
  test_result BOOLEAN;
  test_text TEXT;
BEGIN
  -- Test get_user_role
  test_text := public.get_user_role();  -- Should work with default parameter
  test_text := public.get_user_role(NULL);  -- Should work with explicit NULL
  test_text := public.get_user_role(test_uuid);  -- Should work with UUID
  
  -- Test current_user_role
  test_text := public.current_user_role();  -- Should work
  
  -- Test has_role
  test_result := public.has_role(test_uuid, 'patient');  -- Should work with UUID and role
  test_result := public.has_role('patient');  -- Should work with just role (legacy)
  
  -- Test has_any_role and current_user_has_role
  test_result := public.has_any_role('patient');  -- Should work
  test_result := public.current_user_has_role('patient');  -- Should work
  
  -- Test is_provider_or_admin
  test_result := public.is_provider_or_admin();  -- Should work with default
  test_result := public.is_provider_or_admin(NULL);  -- Should work with NULL
  test_result := public.is_provider_or_admin(test_uuid);  -- Should work with UUID
  
  -- Test is_authenticated
  test_result := public.is_authenticated();  -- Should work
  
  RAISE NOTICE 'All role functions created and tested successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error testing role functions: %', SQLERRM;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION public.get_user_role(UUID) IS 'Get role of specified user (NULL = current user)';
COMMENT ON FUNCTION public.has_role(UUID, TEXT) IS 'Check if specified user has specified role';
COMMENT ON FUNCTION public.has_role(TEXT) IS 'Check if current user has specified role (legacy compatibility)';
COMMENT ON FUNCTION public.has_any_role(TEXT) IS 'Check if current user has specified role';
COMMENT ON FUNCTION public.is_authenticated() IS 'Check if user is authenticated';
COMMENT ON FUNCTION public.is_provider_or_admin(UUID) IS 'Check if user has elevated privileges';
COMMENT ON FUNCTION public.current_user_role() IS 'Get current authenticated user role';
COMMENT ON FUNCTION public.current_user_has_role(TEXT) IS 'Check if current user has specified role';