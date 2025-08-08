-- Create support messages table for supporter-patient communication
CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  location_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT support_messages_message_type_check CHECK (message_type IN ('text', 'location', 'alert'))
);

-- Create location shares table for patient location sharing
CREATE TABLE public.location_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL,
  shared_with_supporter_id UUID NOT NULL,
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  address TEXT,
  shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_emergency BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on both tables
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_shares ENABLE ROW LEVEL SECURITY;

-- RLS policies for support_messages
CREATE POLICY "Users can view their own messages" 
ON public.support_messages 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages" 
ON public.support_messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their received messages" 
ON public.support_messages 
FOR UPDATE 
USING (auth.uid() = recipient_id);

-- RLS policies for location_shares
CREATE POLICY "Supporters can view locations shared with them" 
ON public.location_shares 
FOR SELECT 
USING (auth.uid() = shared_with_supporter_id OR auth.uid() = patient_id);

CREATE POLICY "Patients can share their location" 
ON public.location_shares 
FOR INSERT 
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients can manage their location shares" 
ON public.location_shares 
FOR UPDATE 
USING (auth.uid() = patient_id);

CREATE POLICY "Patients can delete their location shares" 
ON public.location_shares 
FOR DELETE 
USING (auth.uid() = patient_id);

-- Add indexes for better performance
CREATE INDEX idx_support_messages_participants ON public.support_messages(sender_id, recipient_id);
CREATE INDEX idx_support_messages_created_at ON public.support_messages(created_at DESC);
CREATE INDEX idx_location_shares_supporter ON public.location_shares(shared_with_supporter_id);
CREATE INDEX idx_location_shares_patient ON public.location_shares(patient_id);
CREATE INDEX idx_location_shares_shared_at ON public.location_shares(shared_at DESC);

-- Enable realtime for both tables
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;
ALTER TABLE public.location_shares REPLICA IDENTITY FULL;

-- Add tables to realtime publication
SELECT pg_catalog.pg_get_publication_tables('supabase_realtime');
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.location_shares;