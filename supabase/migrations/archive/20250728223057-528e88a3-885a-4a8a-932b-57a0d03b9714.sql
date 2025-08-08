-- Create function to verify admin access using environment variable
CREATE OR REPLACE FUNCTION public.verify_admin_access(provided_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Compare with hardcoded fallback for now
  -- In production, this should use a secure environment variable
  RETURN provided_code = 'secure_health_check_2024';
END;
$function$