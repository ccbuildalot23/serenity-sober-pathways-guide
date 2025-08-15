-- Tri-user permissions consent support

-- Supporter relationships table linking supporters to patients with consent flags
CREATE TABLE IF NOT EXISTS public.supporter_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  consent_granted BOOLEAN NOT NULL DEFAULT false,
  consent_revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(patient_id, supporter_id)
);

ALTER TABLE public.supporter_relationships ENABLE ROW LEVEL SECURITY;

-- RLS: patient and supporter can view the relationship; provider can view if has provider role
CREATE POLICY "patient_or_supporter_can_view" ON public.supporter_relationships
FOR SELECT USING (
  auth.uid() = patient_id OR auth.uid() = supporter_id
);

CREATE POLICY "patient_can_manage_supporters" ON public.supporter_relationships
FOR INSERT WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "patient_or_supporter_can_update" ON public.supporter_relationships
FOR UPDATE USING (auth.uid() = patient_id OR auth.uid() = supporter_id)
WITH CHECK (auth.uid() = patient_id OR auth.uid() = supporter_id);

-- Add parental consent to profiles
ALTER TABLE IF EXISTS public.profiles
ADD COLUMN IF NOT EXISTS parental_consent BOOLEAN NOT NULL DEFAULT false;



