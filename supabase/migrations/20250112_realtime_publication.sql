-- Ensure relevant tables are part of the supabase_realtime publication
DO $$
BEGIN
  -- Add daily_checkins to publication
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_checkins';
  EXCEPTION WHEN duplicate_object THEN
    -- already added
    NULL;
  END;

  -- Add checkin_events to publication
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.checkin_events';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;


