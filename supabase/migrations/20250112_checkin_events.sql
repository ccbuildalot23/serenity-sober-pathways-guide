-- Check-in events table to track each submission (allows multiple per day)
CREATE TABLE IF NOT EXISTS public.checkin_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  mood_rating INT,
  sleep_quality INT,
  activities TEXT,
  notes TEXT
);

ALTER TABLE public.checkin_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'checkin_events' AND policyname = 'Users manage own checkin events'
  ) THEN
    CREATE POLICY "Users manage own checkin events" ON public.checkin_events
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_checkin_events_user_created_at ON public.checkin_events(user_id, created_at DESC);

