-- Fix the remaining function with proper search_path

-- Update get_mood_trends function
CREATE OR REPLACE FUNCTION public.get_mood_trends(user_uuid uuid, days_back integer DEFAULT 30)
RETURNS TABLE(checkin_date date, mood_rating numeric, energy_rating numeric, hope_rating numeric, trend_direction text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    WITH daily_averages AS (
        SELECT 
            dc.checkin_date,
            dc.mood_rating,
            dc.energy_rating,
            dc.hope_rating,
            LAG(dc.mood_rating) OVER (ORDER BY dc.checkin_date) as prev_mood
        FROM daily_checkins dc
        WHERE dc.user_id = user_uuid 
        AND dc.checkin_date >= CURRENT_DATE - (days_back || ' days')::INTERVAL
        AND dc.mood_rating IS NOT NULL
        ORDER BY dc.checkin_date
    )
    SELECT 
        da.checkin_date,
        da.mood_rating,
        da.energy_rating, 
        da.hope_rating,
        CASE 
            WHEN da.prev_mood IS NULL THEN 'baseline'
            WHEN da.mood_rating > da.prev_mood THEN 'improving'
            WHEN da.mood_rating < da.prev_mood THEN 'declining'
            ELSE 'stable'
        END::TEXT as trend_direction
    FROM daily_averages da;
END;
$$;

-- Also fix the get_daily_trends function
CREATE OR REPLACE FUNCTION public.get_daily_trends(user_uuid uuid, days_back integer)
RETURNS TABLE(checkin_date date, mood_rating integer, energy_rating integer, hope_rating integer, trend_direction text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN QUERY
    WITH daily_averages AS (
        SELECT 
            dc.checkin_date,
            dc.mood_rating,
            dc.energy_rating,
            dc.hope_rating,
            LAG(dc.mood_rating) OVER (ORDER BY dc.checkin_date) as prev_mood
        FROM daily_checkins dc
        WHERE dc.user_id = user_uuid 
        AND dc.checkin_date >= CURRENT_DATE - (days_back || ' days')::INTERVAL
        AND dc.mood_rating IS NOT NULL
        ORDER BY dc.checkin_date
    )
    SELECT 
        da.checkin_date,
        da.mood_rating,
        da.energy_rating, 
        da.hope_rating,
        CASE 
            WHEN da.prev_mood IS NULL THEN 'baseline'
            WHEN da.mood_rating > da.prev_mood THEN 'improving'
            WHEN da.mood_rating < da.prev_mood THEN 'declining'
            ELSE 'stable'
        END::TEXT as trend_direction
    FROM daily_averages da;
END;
$$;