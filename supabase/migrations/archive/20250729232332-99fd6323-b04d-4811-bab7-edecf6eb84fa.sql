-- Security Fix Phase 1: Critical Vulnerability Fixes

-- 1. Fix Crisis Prediction Patterns - Replace overly permissive policy
DROP POLICY IF EXISTS "System can manage prediction patterns" ON public.crisis_prediction_patterns;

CREATE POLICY "Users can view their own patterns only" 
ON public.crisis_prediction_patterns 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Providers can manage prediction patterns" 
ON public.crisis_prediction_patterns 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'provider'::app_role
  )
);

-- 2. Remove hardcoded admin verification function and replace with role-based
DROP FUNCTION IF EXISTS public.verify_admin_access(text);

CREATE OR REPLACE FUNCTION public.verify_admin_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'provider'::app_role
  );
END;
$$;

-- 3. Add admin access audit logging
CREATE OR REPLACE FUNCTION public.log_admin_access(action_type text, details jsonb DEFAULT '{}')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow if user has admin role
  IF NOT public.verify_admin_role() THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;
  
  INSERT INTO public.audit_logs (
    user_id,
    action,
    details_encrypted,
    timestamp
  ) VALUES (
    auth.uid(),
    'ADMIN_ACCESS_' || action_type,
    details::text,
    NOW()
  );
END;
$$;

-- 4. Create function to validate rate limiting for crisis alerts
CREATE OR REPLACE FUNCTION public.check_crisis_alert_rate_limit(user_uuid uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  alert_count integer;
BEGIN
  -- Check alerts in last 5 minutes
  SELECT COUNT(*) INTO alert_count
  FROM public.crisis_alerts
  WHERE user_id = user_uuid
  AND alert_time >= NOW() - INTERVAL '5 minutes';
  
  -- Allow max 3 alerts per 5 minutes
  RETURN alert_count < 3;
END;
$$;

-- 5. Add input validation trigger for crisis plans
CREATE OR REPLACE FUNCTION public.validate_crisis_plan_input()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate plan content length
  IF LENGTH(NEW.plan_encrypted) > 50000 THEN
    RAISE EXCEPTION 'Crisis plan content too large';
  END IF;
  
  -- Ensure user_id matches authenticated user
  IF NEW.user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: Cannot create plans for other users';
  END IF;
  
  RETURN NEW;
END;
$$;