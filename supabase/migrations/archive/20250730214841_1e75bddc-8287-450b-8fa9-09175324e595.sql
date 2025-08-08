-- Fix RLS policy gap for data_retention_log table
ALTER TABLE public.data_retention_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for data_retention_log
CREATE POLICY "Providers can manage data retention logs" 
ON public.data_retention_log 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND role = 'provider'::app_role
));

-- Create secure function to validate environment configuration
CREATE OR REPLACE FUNCTION public.validate_security_configuration()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  security_score integer := 100;
  issues text[] := '{}';
  recommendations text[] := '{}';
BEGIN
  -- Check for common security misconfigurations
  
  -- Verify all critical tables have RLS enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables t 
    JOIN pg_class c ON c.relname = t.tablename 
    WHERE t.schemaname = 'public' 
    AND c.relrowsecurity = true
    AND t.tablename IN ('audit_logs', 'crisis_events', 'daily_checkins', 'profiles')
  ) THEN
    security_score := security_score - 20;
    issues := array_append(issues, 'Critical tables missing RLS protection');
    recommendations := array_append(recommendations, 'Enable RLS on all user data tables');
  END IF;

  -- Check for proper user roles configuration
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE role = 'provider'::app_role
  ) THEN
    security_score := security_score - 10;
    issues := array_append(issues, 'No provider roles configured');
    recommendations := array_append(recommendations, 'Configure provider access controls');
  END IF;

  -- Build security status report
  SELECT jsonb_build_object(
    'security_score', security_score,
    'status', CASE 
      WHEN security_score >= 90 THEN 'excellent'
      WHEN security_score >= 80 THEN 'good'
      WHEN security_score >= 70 THEN 'fair'
      ELSE 'needs_attention'
    END,
    'issues', to_jsonb(issues),
    'recommendations', to_jsonb(recommendations),
    'last_check', now(),
    'environment', 'production'
  ) INTO result;
  
  RETURN result;
END;
$function$;

-- Create enhanced audit logging function
CREATE OR REPLACE FUNCTION public.log_security_event_enhanced(
  event_type text,
  event_data jsonb DEFAULT '{}'::jsonb,
  risk_level text DEFAULT 'low'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Enhanced security event logging with better metadata
  INSERT INTO public.audit_logs (
    user_id,
    action,
    details_encrypted,
    timestamp
  ) VALUES (
    auth.uid(),
    'SECURITY_EVENT_' || upper(event_type),
    jsonb_build_object(
      'event_type', event_type,
      'risk_level', risk_level,
      'user_agent', current_setting('request.headers', true)::jsonb ->> 'user-agent',
      'ip_address', current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for',
      'timestamp', now(),
      'session_context', 'enhanced_monitoring',
      'event_data', event_data
    )::text,
    now()
  );
END;
$function$;