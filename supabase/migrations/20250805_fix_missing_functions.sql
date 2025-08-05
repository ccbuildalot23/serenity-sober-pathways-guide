-- Fix missing database functions and ensure all required functions exist

-- Ensure get_current_user_role function exists
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1),
    'patient'::public.app_role
  )
$$;

-- Ensure get_recovery_streak function exists (if not already created)
CREATE OR REPLACE FUNCTION public.get_recovery_streak(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  streak_count INTEGER := 0;
  last_checkin_date DATE;
  current_date_var DATE := CURRENT_DATE;
BEGIN
  -- Get the most recent checkin date
  SELECT MAX(checkin_date)::DATE INTO last_checkin_date
  FROM public.daily_checkins
  WHERE user_id = user_uuid AND is_complete = true;
  
  -- If no checkins, return 0
  IF last_checkin_date IS NULL THEN
    RETURN 0;
  END IF;
  
  -- If last checkin wasn't today or yesterday, streak is broken
  IF last_checkin_date < current_date_var - INTERVAL '1 day' THEN
    RETURN 0;
  END IF;
  
  -- Count consecutive days backwards from last checkin
  WITH RECURSIVE streak_days AS (
    SELECT 
      checkin_date::DATE as check_date,
      1 as day_count
    FROM public.daily_checkins
    WHERE user_id = user_uuid 
      AND is_complete = true
      AND checkin_date::DATE = last_checkin_date
    
    UNION ALL
    
    SELECT 
      dc.checkin_date::DATE,
      sd.day_count + 1
    FROM streak_days sd
    JOIN public.daily_checkins dc ON 
      dc.user_id = user_uuid 
      AND dc.is_complete = true
      AND dc.checkin_date::DATE = sd.check_date - INTERVAL '1 day'
    WHERE sd.check_date > current_date_var - INTERVAL '365 days'
  )
  SELECT MAX(day_count) INTO streak_count FROM streak_days;
  
  RETURN COALESCE(streak_count, 0);
END;
$$;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_recovery_streak(UUID) TO authenticated;

-- Ensure audit_logs table exists (for error boundary logging)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  details_encrypted TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for audit_logs
CREATE POLICY "Users can insert their own audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000000');

CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Ensure daily_checkins table has proper indexes
CREATE INDEX IF NOT EXISTS idx_daily_checkins_user_date 
ON public.daily_checkins(user_id, checkin_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_checkins_complete 
ON public.daily_checkins(user_id, is_complete) 
WHERE is_complete = true;

-- Ensure crisis_events table has proper indexes
CREATE INDEX IF NOT EXISTS idx_crisis_events_user_created 
ON public.crisis_events(user_id, created_at DESC);

-- Ensure support_contacts table has proper indexes
CREATE INDEX IF NOT EXISTS idx_support_contacts_user 
ON public.support_contacts(user_id);

-- Ensure security_audit_logs has proper structure
ALTER TABLE public.security_audit_logs 
ALTER COLUMN user_id DROP NOT NULL;

-- Add helpful comment
COMMENT ON FUNCTION public.get_current_user_role() IS 'Returns the current authenticated user role, defaults to patient if not found';
COMMENT ON FUNCTION public.get_recovery_streak(UUID) IS 'Calculates the current recovery streak in days for a given user';