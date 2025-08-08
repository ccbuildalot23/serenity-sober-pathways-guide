-- Fix database function security - add proper search_path to all functions

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, recovery_start_date, email)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    CASE 
      WHEN new.raw_user_meta_data ->> 'recovery_start_date' IS NOT NULL 
      THEN (new.raw_user_meta_data ->> 'recovery_start_date')::date
      ELSE NULL
    END,
    new.email
  );
  RETURN new;
END;
$$;

-- Update log_security_violation function
CREATE OR REPLACE FUNCTION public.log_security_violation(violation_type text, details jsonb DEFAULT NULL::jsonb)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    details_encrypted,
    timestamp
  ) VALUES (
    auth.uid(),
    'SECURITY_VIOLATION_' || violation_type,
    details::text,
    NOW()
  );
END;
$$;

-- Update notify_partner function
CREATE OR REPLACE FUNCTION public.notify_partner(partner_id uuid, notification_type text, data jsonb)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    details_encrypted
  ) VALUES (
    partner_id,
    'PARTNER_NOTIFICATION_' || notification_type,
    data::text
  );
END;
$$;

-- Update analyze_craving_patterns function
CREATE OR REPLACE FUNCTION public.analyze_craving_patterns(user_uuid uuid)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    result JSONB;
    peak_hours JSONB;
    peak_days JSONB;
    common_triggers JSONB;
    avg_intensity DECIMAL;
BEGIN
    -- Calculate peak hours
    SELECT jsonb_agg(hour_of_day) INTO peak_hours
    FROM (
        SELECT EXTRACT(HOUR FROM created_at)::INTEGER as hour_of_day,
               AVG(intensity) as avg_intensity
        FROM craving_logs 
        WHERE user_id = user_uuid 
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY EXTRACT(HOUR FROM created_at)
        ORDER BY avg_intensity DESC
        LIMIT 3
    ) peak_hour_data;

    -- Calculate peak days of week
    SELECT jsonb_agg(day_name) INTO peak_days
    FROM (
        SELECT 
            CASE EXTRACT(DOW FROM created_at)::INTEGER
                WHEN 0 THEN 'Sunday'
                WHEN 1 THEN 'Monday' 
                WHEN 2 THEN 'Tuesday'
                WHEN 3 THEN 'Wednesday'
                WHEN 4 THEN 'Thursday'
                WHEN 5 THEN 'Friday'
                WHEN 6 THEN 'Saturday'
            END as day_name,
            COUNT(*) as frequency
        FROM craving_logs 
        WHERE user_id = user_uuid 
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY EXTRACT(DOW FROM created_at)
        ORDER BY frequency DESC
        LIMIT 2
    ) peak_day_data;

    -- Get common triggers
    SELECT jsonb_agg(DISTINCT trigger_item) INTO common_triggers
    FROM (
        SELECT jsonb_array_elements_text(triggers) as trigger_item
        FROM craving_logs 
        WHERE user_id = user_uuid 
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND triggers IS NOT NULL
    ) trigger_data;

    -- Calculate average intensity
    SELECT AVG(intensity) INTO avg_intensity
    FROM craving_logs 
    WHERE user_id = user_uuid 
    AND created_at >= CURRENT_DATE - INTERVAL '30 days';

    -- Build final result
    SELECT jsonb_build_object(
        'peak_hours', COALESCE(peak_hours, '[]'::jsonb),
        'peak_days', COALESCE(peak_days, '[]'::jsonb),
        'common_triggers', COALESCE(common_triggers, '[]'::jsonb),
        'average_intensity', COALESCE(avg_intensity, 0),
        'total_cravings', (
            SELECT COUNT(*) 
            FROM craving_logs 
            WHERE user_id = user_uuid 
            AND created_at >= CURRENT_DATE - INTERVAL '30 days'
        ),
        'analysis_period_days', 30
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Update calculate_skill_mastery function
CREATE OR REPLACE FUNCTION public.calculate_skill_mastery(user_uuid uuid, skill_category_param text)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    session_count INTEGER;
    avg_effectiveness DECIMAL;
    mastery_level TEXT;
BEGIN
    SELECT COUNT(*), AVG(effectiveness_rating)
    INTO session_count, avg_effectiveness
    FROM skill_sessions
    WHERE user_id = user_uuid 
    AND skill_category = skill_category_param
    AND effectiveness_rating IS NOT NULL;
    
    IF session_count = 0 THEN
        mastery_level := 'Beginner';
    ELSIF session_count < 5 OR avg_effectiveness < 6 THEN
        mastery_level := 'Developing';
    ELSIF session_count < 15 OR avg_effectiveness < 8 THEN
        mastery_level := 'Proficient';
    ELSE
        mastery_level := 'Advanced';
    END IF;
    
    RETURN mastery_level;
END;
$$;

-- Update check_badge_eligibility function
CREATE OR REPLACE FUNCTION public.check_badge_eligibility(user_uuid uuid, badge_name_param text)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    eligible BOOLEAN := false;
    count_result INTEGER;
BEGIN
    CASE badge_name_param
        WHEN 'CBT Explorer' THEN
            SELECT COUNT(*) INTO count_result
            FROM thought_records
            WHERE user_id = user_uuid;
            eligible := count_result >= 1;
            
        WHEN 'Mindfulness Master' THEN
            SELECT COUNT(*) INTO count_result
            FROM skill_sessions
            WHERE user_id = user_uuid 
            AND skill_category = 'mindfulness'
            AND DATE(completed_at) >= CURRENT_DATE - INTERVAL '30 days';
            eligible := count_result >= 30;
            
        WHEN 'Skills Integrator' THEN
            SELECT COUNT(DISTINCT skill_category) INTO count_result
            FROM skill_sessions
            WHERE user_id = user_uuid;
            eligible := count_result >= 5;
            
        ELSE
            eligible := false;
    END CASE;
    
    RETURN eligible;
END;
$$;