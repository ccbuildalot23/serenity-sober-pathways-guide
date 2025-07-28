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