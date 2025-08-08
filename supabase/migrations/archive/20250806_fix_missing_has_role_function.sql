-- Fix missing has_role function that is referenced in other parts of the codebase
-- This function is needed for checking user roles throughout the application

-- First, ensure the app_role type exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('patient', 'support_member', 'provider', 'admin');
  END IF;
END $$;

-- Create the has_role function that was missing
CREATE OR REPLACE FUNCTION public.has_role(
  p_user_id UUID,
  p_role app_role
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_role BOOLEAN;
BEGIN
  -- Check if the user has the specified role
  SELECT EXISTS(
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = p_user_id 
      AND role = p_role::TEXT
  ) INTO v_has_role;
  
  RETURN COALESCE(v_has_role, FALSE);
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't expose internal details
    RAISE WARNING 'Error checking role for user %: %', p_user_id, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create an overloaded version that uses the current user
CREATE OR REPLACE FUNCTION public.has_role(
  p_role app_role
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_role(auth.uid(), p_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Also create a simpler version that accepts text for compatibility
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
  
  -- Check if the user has the specified role
  SELECT EXISTS(
    SELECT 1 
    FROM public.user_roles 
    WHERE user_id = p_user_id 
      AND role = p_role
  ) INTO v_has_role;
  
  RETURN COALESCE(v_has_role, FALSE);
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't expose internal details
    RAISE WARNING 'Error checking role for user %: %', p_user_id, SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a version for current user with text parameter
CREATE OR REPLACE FUNCTION public.has_role(
  p_role TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_role(auth.uid(), p_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create helper function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(
  p_user_id UUID DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
  v_user_id UUID;
BEGIN
  -- Use provided user_id or current user
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Get the user's role
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = v_user_id;
  
  -- Default to 'patient' if no role found
  RETURN COALESCE(v_role, 'patient');
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'patient';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create function to check if user is a provider or admin
CREATE OR REPLACE FUNCTION public.is_provider_or_admin(
  p_user_id UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_role TEXT;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  SELECT role INTO v_role
  FROM public.user_roles
  WHERE user_id = v_user_id;
  
  RETURN v_role IN ('provider', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_provider_or_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_provider_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO authenticated;

-- Add comments for documentation
COMMENT ON FUNCTION public.has_role(UUID, app_role) IS 'Check if a user has a specific role (app_role enum version)';
COMMENT ON FUNCTION public.has_role(app_role) IS 'Check if current user has a specific role (app_role enum version)';
COMMENT ON FUNCTION public.has_role(UUID, TEXT) IS 'Check if a user has a specific role (text version)';
COMMENT ON FUNCTION public.has_role(TEXT) IS 'Check if current user has a specific role (text version)';
COMMENT ON FUNCTION public.get_user_role IS 'Get the role of a user (defaults to current user)';
COMMENT ON FUNCTION public.is_provider_or_admin IS 'Check if user has elevated privileges';
COMMENT ON FUNCTION public.is_authenticated IS 'Check if there is an authenticated user';

-- Verify the functions work
DO $$
BEGIN
  -- Test that functions exist and can be called
  PERFORM public.has_role('00000000-0000-0000-0000-000000000000'::UUID, 'patient'::app_role);
  PERFORM public.has_role('00000000-0000-0000-0000-000000000000'::UUID, 'patient'::TEXT);
  PERFORM public.get_user_role('00000000-0000-0000-0000-000000000000'::UUID);
  PERFORM public.is_provider_or_admin('00000000-0000-0000-0000-000000000000'::UUID);
  RAISE NOTICE 'All role functions created successfully';
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating role functions: %', SQLERRM;
END $$;