-- Fix remaining database functions with proper search_path

-- Update get_recovery_streak function
CREATE OR REPLACE FUNCTION public.get_recovery_streak(user_uuid uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result JSONB;
    current_streak INTEGER := 0;
    longest_streak INTEGER := 0;
    recovery_start DATE;
    total_days INTEGER := 0;
BEGIN
    -- Check if the user exists in the profiles table
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = user_uuid) THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Get recovery start date from profile
    SELECT recovery_start_date INTO recovery_start
    FROM profiles 
    WHERE id = user_uuid;

    -- Calculate total days in recovery
    IF recovery_start IS NOT NULL THEN
        total_days := CURRENT_DATE - recovery_start;
    END IF;

    -- Calculate current streak
    WITH daily_checkins_ordered AS (
        SELECT checkin_date,
               ROW_NUMBER() OVER (ORDER BY checkin_date DESC) as rn,
               checkin_date - (ROW_NUMBER() OVER (ORDER BY checkin_date DESC) || ' days')::INTERVAL as streak_group
        FROM daily_checkins
        WHERE user_id = user_uuid
        AND checkin_date >= CURRENT_DATE - INTERVAL '365 days'
        ORDER BY checkin_date DESC
    ),
    streak_groups AS (
        SELECT streak_group, COUNT(*) as streak_length
        FROM daily_checkins_ordered
        GROUP BY streak_group
        ORDER BY streak_group DESC
    )
    SELECT COALESCE(MAX(streak_length), 0) INTO current_streak
    FROM streak_groups
    LIMIT 1;

    -- Calculate longest streak
    WITH daily_checkins_ordered AS (
        SELECT checkin_date,
               checkin_date - (ROW_NUMBER() OVER (ORDER BY checkin_date) || ' days')::INTERVAL as streak_group
        FROM daily_checkins
        WHERE user_id = user_uuid
        ORDER BY checkin_date
    ),
    streak_groups AS (
        SELECT COUNT(*) as streak_length
        FROM daily_checkins_ordered
        GROUP BY streak_group
    )
    SELECT COALESCE(MAX(streak_length), 0) INTO longest_streak
    FROM streak_groups;

    -- Build result
    SELECT jsonb_build_object(
        'current_streak_days', current_streak,
        'longest_streak_days', longest_streak,
        'total_recovery_days', total_days,
        'recovery_start_date', recovery_start,
        'completion_rate_30_days', (
            SELECT ROUND(
                (COUNT(*)::DECIMAL / 30) * 100, 1
            )
            FROM daily_checkins
            WHERE user_id = user_uuid
            AND checkin_date >= CURRENT_DATE - INTERVAL '30 days'
        )
    ) INTO result;

    RETURN result;
END;
$$;

-- Update generate_daily_insights function
CREATE OR REPLACE FUNCTION public.generate_daily_insights(user_uuid uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result JSONB;
    mood_trend TEXT;
    energy_trend TEXT;
    craving_risk TEXT;
    insight_message TEXT;
BEGIN
    -- Analyze mood trend
    WITH recent_mood AS (
        SELECT AVG(mood_rating) as avg_mood
        FROM daily_checkins
        WHERE user_id = user_uuid
        AND checkin_date >= CURRENT_DATE - INTERVAL '7 days'
    ),
    previous_mood AS (
        SELECT AVG(mood_rating) as avg_mood
        FROM daily_checkins  
        WHERE user_id = user_uuid
        AND checkin_date >= CURRENT_DATE - INTERVAL '14 days'
        AND checkin_date < CURRENT_DATE - INTERVAL '7 days'
    )
    SELECT 
        CASE 
            WHEN r.avg_mood > p.avg_mood + 0.5 THEN 'improving'
            WHEN r.avg_mood < p.avg_mood - 0.5 THEN 'declining' 
            ELSE 'stable'
        END INTO mood_trend
    FROM recent_mood r, previous_mood p;

    -- Analyze energy trend
    WITH recent_energy AS (
        SELECT AVG(energy_rating) as avg_energy
        FROM daily_checkins
        WHERE user_id = user_uuid
        AND checkin_date >= CURRENT_DATE - INTERVAL '7 days'
    ),
    previous_energy AS (
        SELECT AVG(energy_rating) as avg_energy
        FROM daily_checkins
        WHERE user_id = user_uuid
        AND checkin_date >= CURRENT_DATE - INTERVAL '14 days'
        AND checkin_date < CURRENT_DATE - INTERVAL '7 days'
    )
    SELECT 
        CASE 
            WHEN r.avg_energy > p.avg_energy + 0.5 THEN 'increasing'
            WHEN r.avg_energy < p.avg_energy - 0.5 THEN 'decreasing'
            ELSE 'stable'
        END INTO energy_trend
    FROM recent_energy r, previous_energy p;

    -- Assess craving risk
    WITH recent_cravings AS (
        SELECT COUNT(*) as craving_count,
               AVG(intensity) as avg_intensity
        FROM craving_logs
        WHERE user_id = user_uuid
        AND created_at >= CURRENT_DATE - INTERVAL '3 days'
    )
    SELECT 
        CASE 
            WHEN craving_count >= 3 AND avg_intensity >= 7 THEN 'high'
            WHEN craving_count >= 2 OR avg_intensity >= 5 THEN 'moderate'
            ELSE 'low'
        END INTO craving_risk
    FROM recent_cravings;

    -- Generate insight message
    insight_message := 
        CASE 
            WHEN mood_trend = 'improving' AND energy_trend = 'increasing' THEN
                'Great news! Your mood and energy are both trending upward. Keep up the excellent work!'
            WHEN mood_trend = 'declining' OR energy_trend = 'decreasing' THEN
                'Your recent patterns suggest you might benefit from extra support. Consider reaching out to your support network.'
            WHEN craving_risk = 'high' THEN
                'Your craving intensity has been higher lately. This is a great time to practice your coping skills.'
            ELSE
                'You are maintaining steady progress in your recovery. Consistency is key!'
        END;

    -- Build result
    SELECT jsonb_build_object(
        'mood_trend', COALESCE(mood_trend, 'insufficient_data'),
        'energy_trend', COALESCE(energy_trend, 'insufficient_data'), 
        'craving_risk_level', COALESCE(craving_risk, 'low'),
        'insight_message', insight_message,
        'recommendations', jsonb_build_array(
            CASE WHEN craving_risk = 'high' THEN 'Practice grounding techniques' END,
            CASE WHEN mood_trend = 'declining' THEN 'Consider scheduling therapy' END,
            CASE WHEN energy_trend = 'decreasing' THEN 'Focus on sleep and exercise' END
        ) - 'null'::jsonb,
        'generated_at', CURRENT_TIMESTAMP
    ) INTO result;

    RETURN result;
END;
$$;