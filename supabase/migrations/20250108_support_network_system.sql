-- Support Network System Database Schema
-- This migration creates the tables needed for the support network functionality

-- Support Requests Table
CREATE TABLE IF NOT EXISTS public.support_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    person_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    supporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    person_name TEXT NOT NULL,
    message TEXT NOT NULL,
    urgency TEXT CHECK (urgency IN ('low', 'medium', 'high', 'crisis')) DEFAULT 'medium',
    status TEXT CHECK (status IN ('pending', 'acknowledged', 'responded', 'resolved')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Responses Table
CREATE TABLE IF NOT EXISTS public.support_responses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    support_request_id UUID REFERENCES public.support_requests(id) ON DELETE CASCADE,
    supporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status TEXT CHECK (status IN ('sent', 'delivered', 'read')) DEFAULT 'sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supported Persons Table (for supporters to see who they're supporting)
CREATE TABLE IF NOT EXISTS public.supported_persons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    supporter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    person_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    relationship TEXT,
    status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    last_contact TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supporter_id, person_id)
);

-- Support Network Members Table (existing, but adding some fields)
ALTER TABLE IF EXISTS public.support_network_members 
ADD COLUMN IF NOT EXISTS is_emergency_contact BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS priority_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_contact TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_support_requests_supporter_id ON public.support_requests(supporter_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_person_id ON public.support_requests(person_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_status ON public.support_requests(status);
CREATE INDEX IF NOT EXISTS idx_support_responses_request_id ON public.support_responses(support_request_id);
CREATE INDEX IF NOT EXISTS idx_supported_persons_supporter_id ON public.supported_persons(supporter_id);

-- Enable Row Level Security
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supported_persons ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_requests
CREATE POLICY "Users can view their own support requests" ON public.support_requests
    FOR SELECT USING (auth.uid() = person_id);

CREATE POLICY "Supporters can view requests sent to them" ON public.support_requests
    FOR SELECT USING (auth.uid() = supporter_id);

CREATE POLICY "Users can create support requests" ON public.support_requests
    FOR INSERT WITH CHECK (auth.uid() = person_id);

CREATE POLICY "Supporters can update requests sent to them" ON public.support_requests
    FOR UPDATE USING (auth.uid() = supporter_id);

-- RLS Policies for support_responses
CREATE POLICY "Users can view responses to their requests" ON public.support_responses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.support_requests 
            WHERE id = support_request_id AND person_id = auth.uid()
        )
    );

CREATE POLICY "Supporters can view their own responses" ON public.support_responses
    FOR SELECT USING (auth.uid() = supporter_id);

CREATE POLICY "Supporters can create responses" ON public.support_responses
    FOR INSERT WITH CHECK (auth.uid() = supporter_id);

-- RLS Policies for supported_persons
CREATE POLICY "Supporters can view their supported persons" ON public.supported_persons
    FOR SELECT USING (auth.uid() = supporter_id);

CREATE POLICY "Supporters can update their supported persons" ON public.supported_persons
    FOR UPDATE USING (auth.uid() = supporter_id);

-- Function to automatically create supported_persons record when support_requests is created
CREATE OR REPLACE FUNCTION public.handle_new_support_request()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update supported_persons record
    INSERT INTO public.supported_persons (supporter_id, person_id, name, last_contact)
    VALUES (NEW.supporter_id, NEW.person_id, NEW.person_name, NOW())
    ON CONFLICT (supporter_id, person_id) 
    DO UPDATE SET 
        name = EXCLUDED.name,
        last_contact = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create supported_persons record
CREATE TRIGGER trigger_handle_new_support_request
    AFTER INSERT ON public.support_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_support_request();

-- Function to update last_contact when responses are created
CREATE OR REPLACE FUNCTION public.handle_new_support_response()
RETURNS TRIGGER AS $$
BEGIN
    -- Update last_contact in supported_persons
    UPDATE public.supported_persons 
    SET last_contact = NOW()
    WHERE supporter_id = NEW.supporter_id 
    AND person_id = (
        SELECT person_id FROM public.support_requests 
        WHERE id = NEW.support_request_id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update last_contact when responses are created
CREATE TRIGGER trigger_handle_new_support_response
    AFTER INSERT ON public.support_responses
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_support_response();
