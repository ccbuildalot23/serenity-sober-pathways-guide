-- Fix security warnings by setting search_path for functions

-- Update the support stats function with proper security
CREATE OR REPLACE FUNCTION update_support_stats()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.support_stats (date, total_requests, crisis_requests, connection_requests, tough_day_requests, practice_requests)
  VALUES (CURRENT_DATE, 0, 0, 0, 0, 0)
  ON CONFLICT (date) DO UPDATE SET
    total_requests = public.support_stats.total_requests + 1,
    crisis_requests = public.support_stats.crisis_requests + CASE WHEN NEW.request_type = 'crisis' THEN 1 ELSE 0 END,
    connection_requests = public.support_stats.connection_requests + CASE WHEN NEW.request_type = 'connection' THEN 1 ELSE 0 END,
    tough_day_requests = public.support_stats.tough_day_requests + CASE WHEN NEW.request_type = 'tough_day' THEN 1 ELSE 0 END,
    practice_requests = public.support_stats.practice_requests + CASE WHEN NEW.request_type IN ('practice', 'check_in', 'wellness_check') THEN 1 ELSE 0 END,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Update the cleanup function with proper security
CREATE OR REPLACE FUNCTION cleanup_old_support_requests()
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.support_requests 
  SET deleted_at = NOW()
  WHERE created_at < NOW() - INTERVAL '24 hours'
  AND deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.support_privacy_settings 
    WHERE user_id = public.support_requests.user_id 
    AND auto_delete_history_hours = 24
  );
END;
$$;