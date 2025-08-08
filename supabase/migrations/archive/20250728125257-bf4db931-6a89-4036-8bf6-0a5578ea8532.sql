-- Fix security issues by setting search_path on functions
CREATE OR REPLACE FUNCTION public.update_appointment_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_appointment_conflicts(
  p_provider_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.appointments
    WHERE provider_id = p_provider_id
    AND status IN ('scheduled', 'confirmed')
    AND (p_exclude_appointment_id IS NULL OR id != p_exclude_appointment_id)
    AND (
      (start_time <= p_start_time AND end_time > p_start_time) OR
      (start_time < p_end_time AND end_time >= p_end_time) OR
      (start_time >= p_start_time AND end_time <= p_end_time)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_provider_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER DEFAULT 60
)
RETURNS TABLE(
  slot_start TIMESTAMP WITH TIME ZONE,
  slot_end TIMESTAMP WITH TIME ZONE,
  is_available BOOLEAN
) 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  availability_record RECORD;
  current_slot TIMESTAMP WITH TIME ZONE;
  slot_end_time TIMESTAMP WITH TIME ZONE;
  day_of_week INTEGER;
BEGIN
  day_of_week := EXTRACT(dow FROM p_date);
  
  FOR availability_record IN 
    SELECT start_time, end_time, buffer_time_minutes
    FROM public.provider_availability
    WHERE provider_id = p_provider_id
    AND day_of_week = EXTRACT(dow FROM p_date)
    AND is_available = true
    AND (effective_date IS NULL OR effective_date <= p_date)
    AND (expiry_date IS NULL OR expiry_date >= p_date)
  LOOP
    current_slot := p_date + availability_record.start_time;
    
    WHILE current_slot + (p_duration_minutes || ' minutes')::INTERVAL <= p_date + availability_record.end_time LOOP
      slot_end_time := current_slot + (p_duration_minutes || ' minutes')::INTERVAL;
      
      slot_start := current_slot;
      slot_end := slot_end_time;
      is_available := NOT public.check_appointment_conflicts(p_provider_id, current_slot, slot_end_time);
      
      RETURN NEXT;
      
      current_slot := current_slot + (p_duration_minutes + COALESCE(availability_record.buffer_time_minutes, 15) || ' minutes')::INTERVAL;
    END LOOP;
  END LOOP;
END;
$$;