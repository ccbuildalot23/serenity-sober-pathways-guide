-- Create support_contacts and align daily_checkins schema used by the app

-- Support contacts table used across the app (hooks/useSupportContacts.ts, dashboard, etc.)
CREATE TABLE IF NOT EXISTS public.support_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  contact_method TEXT DEFAULT 'both' CHECK (contact_method IN ('sms','push','both')),
  share_location BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own support contacts" ON public.support_contacts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_support_contacts_user_id ON public.support_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_support_contacts_created_at ON public.support_contacts(created_at);

-- Ensure daily_checkins has columns used by app services and tests
ALTER TABLE public.daily_checkins 
  ADD COLUMN IF NOT EXISTS checkin_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS mood_rating INTEGER,
  ADD COLUMN IF NOT EXISTS energy_rating INTEGER,
  ADD COLUMN IF NOT EXISTS hope_rating INTEGER,
  ADD COLUMN IF NOT EXISTS sobriety_confidence INTEGER,
  ADD COLUMN IF NOT EXISTS recovery_importance INTEGER,
  ADD COLUMN IF NOT EXISTS recovery_strength INTEGER,
  ADD COLUMN IF NOT EXISTS support_needed TEXT,
  ADD COLUMN IF NOT EXISTS activities TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS completed_sections JSONB,
  ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT TRUE;

-- Optional audit_logs table for fallback audit logging used by services
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  _action TEXT NOT NULL,
  _details_encrypted TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role can write audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can read own audit logs" ON public.audit_logs
  FOR SELECT USING (auth.uid() = user_id);

-- For upsert patterns used by the app
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_checkins_user_date_unique 
  ON public.daily_checkins(user_id, checkin_date);


