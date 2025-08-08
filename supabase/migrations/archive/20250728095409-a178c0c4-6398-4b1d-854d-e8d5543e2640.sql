-- Fix function search path security warning
CREATE OR REPLACE FUNCTION update_checkin_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_uuid uuid;
  new_streak integer := 0;
  total_count integer;
  avg_mood numeric;
  last_checkin_date date;
BEGIN
  user_uuid := NEW.user_id;
  
  -- Calculate total checkins
  SELECT COUNT(*) INTO total_count
  FROM public.daily_checkins 
  WHERE user_id = user_uuid AND is_complete = true;
  
  -- Calculate average mood
  SELECT AVG(mood_rating) INTO avg_mood
  FROM public.daily_checkins 
  WHERE user_id = user_uuid AND mood_rating IS NOT NULL;
  
  -- Calculate current streak
  WITH consecutive_days AS (
    SELECT checkin_date,
           checkin_date - (ROW_NUMBER() OVER (ORDER BY checkin_date DESC))::integer AS group_date
    FROM public.daily_checkins
    WHERE user_id = user_uuid 
    AND is_complete = true
    AND checkin_date >= CURRENT_DATE - INTERVAL '365 days'
    ORDER BY checkin_date DESC
  ),
  streak_groups AS (
    SELECT group_date, COUNT(*) as consecutive_count
    FROM consecutive_days
    GROUP BY group_date
    ORDER BY group_date DESC
  )
  SELECT COALESCE(consecutive_count, 0) INTO new_streak
  FROM streak_groups
  LIMIT 1;
  
  -- Get last checkin date
  SELECT MAX(checkin_date) INTO last_checkin_date
  FROM public.daily_checkins 
  WHERE user_id = user_uuid AND is_complete = true;
  
  -- Upsert stats
  INSERT INTO public.checkin_stats (user_id, total_checkins, streak_count, last_checkin, average_mood, updated_at)
  VALUES (user_uuid, total_count, new_streak, last_checkin_date, avg_mood, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_checkins = EXCLUDED.total_checkins,
    streak_count = EXCLUDED.streak_count,
    last_checkin = EXCLUDED.last_checkin,
    average_mood = EXCLUDED.average_mood,
    updated_at = now();
    
  RETURN NEW;
END;
$$;