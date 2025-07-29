-- Create emergency contacts table
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  relationship TEXT,
  is_active BOOLEAN DEFAULT true,
  priority_order INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create crisis alerts log table
CREATE TABLE IF NOT EXISTS public.crisis_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  contacts_notified INTEGER DEFAULT 0,
  location_shared BOOLEAN DEFAULT false,
  message_sent TEXT,
  status TEXT DEFAULT 'sent'
);

-- Enable RLS on emergency contacts
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for emergency contacts
CREATE POLICY "Users can manage their own emergency contacts"
ON public.emergency_contacts
FOR ALL
USING (auth.uid() = user_id);

-- Enable RLS on crisis alerts
ALTER TABLE public.crisis_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for crisis alerts
CREATE POLICY "Users can view their own crisis alerts"
ON public.crisis_alerts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own crisis alerts"
ON public.crisis_alerts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_emergency_contacts_user_id ON public.emergency_contacts(user_id);
CREATE INDEX idx_emergency_contacts_active ON public.emergency_contacts(user_id, is_active);
CREATE INDEX idx_crisis_alerts_user_id ON public.crisis_alerts(user_id);

-- Create function to update updated_at timestamp
CREATE TRIGGER update_emergency_contacts_updated_at
BEFORE UPDATE ON public.emergency_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();