-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  appointment_type TEXT NOT NULL DEFAULT 'consultation',
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show', 'rescheduled')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  title TEXT,
  description TEXT,
  location_type TEXT NOT NULL DEFAULT 'in_person' CHECK (location_type IN ('in_person', 'telehealth', 'phone')),
  location_details JSONB DEFAULT '{}',
  
  -- Telehealth specific fields
  video_link TEXT,
  waiting_room_enabled BOOLEAN DEFAULT true,
  pre_appointment_forms JSONB DEFAULT '[]',
  
  -- Booking details
  booking_notes TEXT,
  provider_notes TEXT,
  session_notes TEXT,
  
  -- Fees and policies
  base_fee DECIMAL(10,2),
  late_cancellation_fee DECIMAL(10,2),
  no_show_fee DECIMAL(10,2),
  
  -- Recurring appointment settings
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern JSONB,
  parent_appointment_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT valid_duration CHECK (duration_minutes > 0)
);

-- Create provider availability table
CREATE TABLE public.provider_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  appointment_duration_minutes INTEGER NOT NULL DEFAULT 60,
  buffer_time_minutes INTEGER DEFAULT 15,
  max_appointments_per_slot INTEGER DEFAULT 1,
  appointment_types JSONB DEFAULT '["consultation"]',
  is_available BOOLEAN DEFAULT true,
  effective_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_availability_time CHECK (end_time > start_time)
);

-- Create appointment reminders table
CREATE TABLE public.appointment_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL,
  reminder_type TEXT NOT NULL CHECK (reminder_type IN ('24hr', '2hr', '30min', 'custom')),
  reminder_method TEXT NOT NULL CHECK (reminder_method IN ('email', 'sms', 'push')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  message_content TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointment waitlist table
CREATE TABLE public.appointment_waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL,
  patient_id UUID NOT NULL,
  preferred_date DATE,
  preferred_time_start TIME,
  preferred_time_end TIME,
  appointment_type TEXT NOT NULL DEFAULT 'consultation',
  priority_level INTEGER DEFAULT 1,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'notified', 'booked', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  notified_at TIMESTAMP WITH TIME ZONE
);

-- Create calendar integration settings table
CREATE TABLE public.calendar_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  integration_type TEXT NOT NULL CHECK (integration_type IN ('google', 'outlook', 'apple')),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  calendar_id TEXT,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create appointment change requests table
CREATE TABLE public.appointment_change_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('reschedule', 'cancel')),
  new_start_time TIMESTAMP WITH TIME ZONE,
  new_end_time TIMESTAMP WITH TIME ZONE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'auto_approved')),
  provider_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_change_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for appointments
CREATE POLICY "Users can view their own appointments" 
ON public.appointments FOR SELECT 
USING (auth.uid() = patient_id OR auth.uid() = provider_id);

CREATE POLICY "Patients can create appointments" 
ON public.appointments FOR INSERT 
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Participants can update appointments" 
ON public.appointments FOR UPDATE 
USING (auth.uid() = patient_id OR auth.uid() = provider_id);

-- RLS Policies for provider availability
CREATE POLICY "Anyone can view provider availability" 
ON public.provider_availability FOR SELECT 
USING (true);

CREATE POLICY "Providers can manage their availability" 
ON public.provider_availability FOR ALL 
USING (auth.uid() = provider_id);

-- RLS Policies for appointment reminders
CREATE POLICY "Users can view reminders for their appointments" 
ON public.appointment_reminders FOR SELECT 
USING (appointment_id IN (
  SELECT id FROM public.appointments 
  WHERE patient_id = auth.uid() OR provider_id = auth.uid()
));

-- RLS Policies for waitlist
CREATE POLICY "Users can view their own waitlist entries" 
ON public.appointment_waitlist FOR SELECT 
USING (auth.uid() = patient_id OR auth.uid() = provider_id);

CREATE POLICY "Patients can create waitlist entries" 
ON public.appointment_waitlist FOR INSERT 
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Users can update their waitlist entries" 
ON public.appointment_waitlist FOR UPDATE 
USING (auth.uid() = patient_id OR auth.uid() = provider_id);

-- RLS Policies for calendar integrations
CREATE POLICY "Users can manage their own calendar integrations" 
ON public.calendar_integrations FOR ALL 
USING (auth.uid() = user_id);

-- RLS Policies for change requests
CREATE POLICY "Users can view change requests for their appointments" 
ON public.appointment_change_requests FOR SELECT 
USING (appointment_id IN (
  SELECT id FROM public.appointments 
  WHERE patient_id = auth.uid() OR provider_id = auth.uid()
));

CREATE POLICY "Users can create change requests for their appointments" 
ON public.appointment_change_requests FOR INSERT 
WITH CHECK (appointment_id IN (
  SELECT id FROM public.appointments 
  WHERE patient_id = auth.uid() OR provider_id = auth.uid()
) AND auth.uid() = requested_by);

-- Create indexes for performance
CREATE INDEX idx_appointments_provider_time ON public.appointments(provider_id, start_time);
CREATE INDEX idx_appointments_patient_time ON public.appointments(patient_id, start_time);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_provider_availability_provider_day ON public.provider_availability(provider_id, day_of_week);
CREATE INDEX idx_appointment_reminders_scheduled ON public.appointment_reminders(scheduled_for, status);
CREATE INDEX idx_waitlist_provider_priority ON public.appointment_waitlist(provider_id, priority_level, created_at);

-- Create function to automatically update timestamps
CREATE OR REPLACE FUNCTION public.update_appointment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_appointment_updated_at();

CREATE TRIGGER update_calendar_integrations_updated_at
  BEFORE UPDATE ON public.calendar_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_appointment_updated_at();

-- Create function to check appointment conflicts
CREATE OR REPLACE FUNCTION public.check_appointment_conflicts(
  p_provider_id UUID,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_exclude_appointment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to generate available time slots
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_provider_id UUID,
  p_date DATE,
  p_duration_minutes INTEGER DEFAULT 60
)
RETURNS TABLE(
  slot_start TIMESTAMP WITH TIME ZONE,
  slot_end TIMESTAMP WITH TIME ZONE,
  is_available BOOLEAN
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;