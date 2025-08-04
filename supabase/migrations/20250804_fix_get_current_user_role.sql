-- Fix get_current_user_role function if it doesn't exist
-- This ensures patient users can access the dashboard

-- Drop the function if it exists to recreate it
DROP FUNCTION IF EXISTS public.get_current_user_role();

-- Recreate the function with proper error handling
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS app_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Try to get the user's role
  SELECT role INTO user_role
  FROM public.user_roles 
  WHERE user_id = auth.uid() 
  LIMIT 1;
  
  -- If no role found, return 'patient' as default
  IF user_role IS NULL THEN
    -- Try to insert a default patient role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (auth.uid(), 'patient')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Return patient role
    RETURN 'patient'::app_role;
  END IF;
  
  RETURN user_role;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- Also ensure the trigger for auto-assigning roles is working
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;

CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert patient role for new user
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'patient')
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.assign_default_role();

-- Fix any existing users without roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'patient'::app_role
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT (user_id, role) DO NOTHING;