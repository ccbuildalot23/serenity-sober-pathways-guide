-- Create patient-provider relationships table
CREATE TABLE public.patient_provider_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'primary' CHECK (relationship_type IN ('primary', 'secondary', 'consultant')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'terminated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE (patient_id, provider_id)
);

-- Add RLS policies for patient-provider relationships
ALTER TABLE public.patient_provider_relationships ENABLE ROW LEVEL SECURITY;

-- Providers can view their own patient relationships
CREATE POLICY "Providers can view their patient relationships"
ON public.patient_provider_relationships
FOR SELECT
USING (auth.uid() = provider_id);

-- Patients can view their provider relationships  
CREATE POLICY "Patients can view their provider relationships"
ON public.patient_provider_relationships
FOR SELECT
USING (auth.uid() = patient_id);

-- Only providers can create relationships
CREATE POLICY "Providers can create patient relationships"
ON public.patient_provider_relationships
FOR INSERT
WITH CHECK (auth.uid() = provider_id AND 
           EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'provider'));

-- Providers can update their own patient relationships
CREATE POLICY "Providers can update their patient relationships"
ON public.patient_provider_relationships
FOR UPDATE
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Add index for better performance
CREATE INDEX idx_patient_provider_relationships_provider ON public.patient_provider_relationships(provider_id);
CREATE INDEX idx_patient_provider_relationships_patient ON public.patient_provider_relationships(patient_id);

-- Add trigger for updated_at
CREATE TRIGGER update_patient_provider_relationships_updated_at
  BEFORE UPDATE ON public.patient_provider_relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();