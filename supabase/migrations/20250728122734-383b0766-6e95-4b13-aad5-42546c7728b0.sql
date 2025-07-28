-- Create providers table with comprehensive information
CREATE TABLE public.providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  specialties JSONB NOT NULL DEFAULT '[]'::jsonb,
  credentials JSONB NOT NULL DEFAULT '[]'::jsonb,
  bio TEXT,
  photo_url TEXT,
  years_experience INTEGER,
  languages JSONB NOT NULL DEFAULT '["English"]'::jsonb,
  
  -- Location information
  location_state TEXT NOT NULL,
  location_city TEXT,
  location_address TEXT,
  is_remote BOOLEAN DEFAULT true,
  
  -- Contact information
  website_url TEXT,
  phone_number TEXT,
  email TEXT,
  booking_url TEXT,
  
  -- Professional information
  license_number TEXT,
  license_state TEXT,
  npi_number TEXT,
  
  -- Practice details
  practice_name TEXT,
  insurance_accepted JSONB DEFAULT '[]'::jsonb,
  accepted_payment_methods JSONB DEFAULT '["insurance", "self-pay"]'::jsonb,
  sliding_scale_available BOOLEAN DEFAULT false,
  
  -- Availability and preferences
  availability_schedule JSONB DEFAULT '{}'::jsonb,
  max_patients INTEGER DEFAULT 50,
  current_patient_count INTEGER DEFAULT 0,
  accepting_new_patients BOOLEAN DEFAULT true,
  
  -- Features and tags
  tags JSONB DEFAULT '[]'::jsonb,
  
  -- Verification and status
  is_verified BOOLEAN DEFAULT false,
  verification_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'suspended')),
  
  -- Ratings and reviews
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create provider reviews table
CREATE TABLE public.provider_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  is_verified_patient BOOLEAN DEFAULT false,
  
  -- Moderation
  is_approved BOOLEAN DEFAULT false,
  moderation_notes TEXT,
  flagged_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one review per patient per provider
  UNIQUE(provider_id, reviewer_id)
);

-- Create provider availability table for detailed scheduling
CREATE TABLE public.provider_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  appointment_duration_minutes INTEGER DEFAULT 60,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(provider_id, day_of_week, start_time)
);

-- Create connection requests table (extends existing patient_provider_relationships)
CREATE TABLE public.provider_connection_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  
  request_message TEXT,
  provider_response TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'cancelled')),
  
  -- Data sharing preferences
  share_daily_checkins BOOLEAN DEFAULT false,
  share_mood_data BOOLEAN DEFAULT false,
  share_goal_progress BOOLEAN DEFAULT false,
  share_crisis_events BOOLEAN DEFAULT false,
  
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  
  -- Ensure one active request per patient-provider pair
  UNIQUE(patient_id, provider_id)
);

-- Create saved providers table (favorites)
CREATE TABLE public.saved_providers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, provider_id)
);

-- Create provider invitations table
CREATE TABLE public.provider_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  patient_email TEXT NOT NULL,
  patient_name TEXT,
  invitation_message TEXT,
  
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'accepted', 'declined', 'expired')),
  
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for providers table
CREATE POLICY "Anyone can view active verified providers" 
ON public.providers 
FOR SELECT 
USING (status = 'active' AND is_verified = true);

CREATE POLICY "Providers can manage their own profile" 
ON public.providers 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS Policies for provider_reviews
CREATE POLICY "Anyone can view approved reviews" 
ON public.provider_reviews 
FOR SELECT 
USING (is_approved = true);

CREATE POLICY "Users can create reviews" 
ON public.provider_reviews 
FOR INSERT 
WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Users can update their own reviews" 
ON public.provider_reviews 
FOR UPDATE 
USING (auth.uid() = reviewer_id);

-- RLS Policies for provider_availability
CREATE POLICY "Anyone can view provider availability" 
ON public.provider_availability 
FOR SELECT 
USING (true);

CREATE POLICY "Providers can manage their availability" 
ON public.provider_availability 
FOR ALL 
USING (auth.uid() IN (SELECT user_id FROM public.providers WHERE id = provider_id));

-- RLS Policies for provider_connection_requests
CREATE POLICY "Users can view their own connection requests" 
ON public.provider_connection_requests 
FOR SELECT 
USING (auth.uid() = patient_id OR auth.uid() IN (SELECT user_id FROM public.providers WHERE id = provider_id));

CREATE POLICY "Patients can create connection requests" 
ON public.provider_connection_requests 
FOR INSERT 
WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Patients and providers can update requests" 
ON public.provider_connection_requests 
FOR UPDATE 
USING (auth.uid() = patient_id OR auth.uid() IN (SELECT user_id FROM public.providers WHERE id = provider_id));

-- RLS Policies for saved_providers
CREATE POLICY "Users can manage their saved providers" 
ON public.saved_providers 
FOR ALL 
USING (auth.uid() = user_id);

-- RLS Policies for provider_invitations
CREATE POLICY "Providers can view their invitations" 
ON public.provider_invitations 
FOR SELECT 
USING (auth.uid() IN (SELECT user_id FROM public.providers WHERE id = provider_id));

CREATE POLICY "Providers can create invitations" 
ON public.provider_invitations 
FOR INSERT 
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.providers WHERE id = provider_id));

-- Triggers for updated_at columns
CREATE TRIGGER update_providers_updated_at
  BEFORE UPDATE ON public.providers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_provider_reviews_updated_at
  BEFORE UPDATE ON public.provider_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update provider rating when reviews change
CREATE OR REPLACE FUNCTION public.update_provider_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.providers 
    SET 
      average_rating = (
        SELECT AVG(rating) 
        FROM public.provider_reviews 
        WHERE provider_id = NEW.provider_id AND is_approved = true
      ),
      total_reviews = (
        SELECT COUNT(*) 
        FROM public.provider_reviews 
        WHERE provider_id = NEW.provider_id AND is_approved = true
      )
    WHERE id = NEW.provider_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.providers 
    SET 
      average_rating = (
        SELECT COALESCE(AVG(rating), 0) 
        FROM public.provider_reviews 
        WHERE provider_id = OLD.provider_id AND is_approved = true
      ),
      total_reviews = (
        SELECT COUNT(*) 
        FROM public.provider_reviews 
        WHERE provider_id = OLD.provider_id AND is_approved = true
      )
    WHERE id = OLD.provider_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Trigger for provider rating updates
CREATE TRIGGER update_provider_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.provider_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_provider_rating();