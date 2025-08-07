-- Fix get_user_role function overloads and permissions
-- This ensures all variations of the function exist and have proper permissions

-- Drop existing grants that might be causing issues
DO $$
BEGIN
  -- Revoke any existing permissions to avoid conflicts
  REVOKE ALL ON FUNCTION public.get_user_role(UUID) FROM authenticated;
  REVOKE ALL ON FUNCTION public.get_user_role() FROM authenticated;
EXCEPTION
  WHEN undefined_function THEN
    -- Function doesn't exist, that's okay
    NULL;
END $$;

-- Create or replace the get_user_role function with UUID parameter (can be NULL)
CREATE OR REPLACE FUNCTION public.get_user_role(
  p_user_id UUID DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
  v_user_id UUID;
BEGIN
  -- Use provided user_id or current user
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN 'patient'; -- Default for non-authenticated
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
    RETURN 'patient';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a no-parameter version that explicitly calls the main function
CREATE OR REPLACE FUNCTION public.get_user_role() 
RETURNS TEXT AS $$
BEGIN
  RETURN public.get_user_role(NULL::UUID);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Ensure has_role functions exist with all needed overloads
-- Version with UUID and TEXT
CREATE OR REPLACE FUNCTION public.has_role(
  p_user_id UUID,
  p_role TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_role BOOLEAN;
BEGIN
  -- Validate role is valid
  IF p_role NOT IN ('patient', 'support_member', 'provider', 'admin') THEN
    RETURN FALSE;
  END IF;
  
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Check if the user has the specified role
  SELECT EXISTS(
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = p_user_id 
      AND role = p_role
    LIMIT 1
  ) INTO v_has_role;
  
  RETURN COALESCE(v_has_role, FALSE);
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Version with just TEXT (uses current user)
CREATE OR REPLACE FUNCTION public.has_role(
  p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_role(auth.uid(), p_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Ensure is_authenticated function exists
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Ensure is_provider_or_admin function exists with proper overloads
CREATE OR REPLACE FUNCTION public.is_provider_or_admin(
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = v_user_id
  LIMIT 1;
  
  RETURN v_role IN ('provider', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- No parameter version
CREATE OR REPLACE FUNCTION public.is_provider_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.is_provider_or_admin(NULL::UUID);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_provider_or_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_provider_or_admin() TO authenticated;

-- Also grant to anon for certain functions that might be needed during registration
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO anon;

-- Test that all functions work
DO $$
DECLARE
  test_result BOOLEAN;
  test_text TEXT;
BEGIN
  -- Test get_user_role functions
  test_text := public.get_user_role();
  test_text := public.get_user_role(NULL::UUID);
  test_text := public.get_user_role('00000000-0000-0000-0000-000000000000'::UUID);
  
  -- Test has_role functions
  test_result := public.has_role('patient');
  test_result := public.has_role('00000000-0000-0000-0000-000000000000'::UUID, 'patient');
  
  -- Test is_provider_or_admin functions
  test_result := public.is_provider_or_admin();
  test_result := public.is_provider_or_admin(NULL::UUID);
  test_result := public.is_provider_or_admin('00000000-0000-0000-0000-000000000000'::UUID);
  
  -- Test is_authenticated
  test_result := public.is_authenticated();
  
  RAISE NOTICE 'All role functions tested successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error testing role functions: %', SQLERRM;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION public.get_user_role(UUID) IS 'Get the role of a user (NULL uses current user)';
COMMENT ON FUNCTION public.get_user_role() IS 'Get the role of the current authenticated user';
COMMENT ON FUNCTION public.has_role(UUID, TEXT) IS 'Check if a specific user has a specific role';
COMMENT ON FUNCTION public.has_role(TEXT) IS 'Check if current user has a specific role';
COMMENT ON FUNCTION public.is_provider_or_admin(UUID) IS 'Check if a user has elevated privileges (NULL uses current user)';
COMMENT ON FUNCTION public.is_provider_or_admin() IS 'Check if current user has elevated privileges';
COMMENT ON FUNCTION public.is_authenticated() IS 'Check if there is an authenticated user in the current session';