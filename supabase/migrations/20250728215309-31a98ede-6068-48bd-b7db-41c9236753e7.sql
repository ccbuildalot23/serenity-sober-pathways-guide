-- Create audit log retention policy function
CREATE OR REPLACE FUNCTION public.cleanup_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete audit logs older than 90 days (configurable retention period)
  DELETE FROM public.audit_logs
  WHERE timestamp < now() - INTERVAL '90 days';
  
  -- Log the cleanup operation
  INSERT INTO public.audit_logs (
    user_id,
    action,
    details_encrypted,
    timestamp
  ) VALUES (
    NULL, -- System operation
    'AUDIT_LOG_CLEANUP',
    jsonb_build_object(
      'operation', 'automated_cleanup',
      'retention_days', 90,
      'cleanup_timestamp', now()
    )::text,
    now()
  );
END;
$function$

-- Create function to get admin verification code from secrets
CREATE OR REPLACE FUNCTION public.verify_admin_access(provided_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  stored_code text;
BEGIN
  -- Get the admin code from Supabase secrets (via environment variable)
  -- This will be set as ADMIN_HEALTH_CHECK_CODE in Supabase secrets
  stored_code := current_setting('app.admin_health_check_code', true);
  
  -- If no code is set in secrets, use a fallback (should be configured in production)
  IF stored_code IS NULL OR stored_code = '' THEN
    stored_code := 'secure_health_check_2024';
  END IF;
  
  RETURN provided_code = stored_code;
END;
$function$