-- Enable real-time functionality for dashboard tables
-- Add tables to the supabase_realtime publication to enable real-time subscriptions

-- Enable real-time for crisis events
ALTER TABLE public.crisis_events REPLICA IDENTITY FULL;

-- Enable real-time for daily check-ins  
ALTER TABLE public.daily_checkins REPLICA IDENTITY FULL;

-- Enable real-time for crisis contacts (support network changes)
ALTER TABLE public.crisis_contacts REPLICA IDENTITY FULL;

-- Enable real-time for emergency contacts
ALTER TABLE public.emergency_contacts REPLICA IDENTITY FULL;

-- Add tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.crisis_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_checkins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crisis_contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_contacts;