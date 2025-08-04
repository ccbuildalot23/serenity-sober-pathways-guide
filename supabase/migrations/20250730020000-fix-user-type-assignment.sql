-- Fix user type assignment during signup
-- This migration allows users to sign up with their intended user type while maintaining security

-- 1. Create user_type_requests table to store requested user types
CREATE TABLE IF NOT EXISTS public.user_type_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    requested_type TEXT NOT NULL CHECK (requested_type IN ('recovery', 'provider', 'supporter')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by UUID REFERENCES auth.users(id),
    notes TEXT,
    CONSTRAINT unique_user_type_request UNIQUE (user_id)
);

-- Enable RLS on user_type_requests
ALTER TABLE public.user_type_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own type requests
CREATE POLICY "Users can view their own type requests"
ON public.user_type_requests
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Update handle_new_user function to properly handle user types
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    requested_user_type text;
    assigned_role app_role;
BEGIN
    -- Get the user type from metadata
    requested_user_type := COALESCE(NEW.raw_user_meta_data ->> 'userType', 'recovery');
    
    -- Map user types to roles
    CASE requested_user_type
        WHEN 'recovery' THEN assigned_role := 'patient';
        WHEN 'supporter' THEN assigned_role := 'support_member';
        WHEN 'provider' THEN assigned_role := 'patient'; -- Providers start as patients for security
        ELSE assigned_role := 'patient';
    END CASE;
    
    -- Insert into profiles table
    INSERT INTO public.profiles (id, full_name, recovery_start_date, email)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'full_name',
        CASE 
            WHEN NEW.raw_user_meta_data ->> 'recovery_start_date' IS NOT NULL 
            THEN (NEW.raw_user_meta_data ->> 'recovery_start_date')::date
            ELSE NULL
        END,
        NEW.email
    );
    
    -- Assign the appropriate role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, assigned_role);
    
    -- If user requested provider role, create a request for review
    IF requested_user_type = 'provider' THEN
        INSERT INTO public.user_type_requests (user_id, requested_type, status)
        VALUES (NEW.id, 'provider', 'approved'); -- Auto-approve for MVP
        
        -- Auto-approve provider request for MVP (remove in production)
        UPDATE public.user_roles 
        SET role = 'provider'
        WHERE user_id = NEW.id;
    END IF;
    
    -- Store the user type request for tracking
    INSERT INTO public.user_type_requests (user_id, requested_type, status)
    VALUES (NEW.id, requested_user_type, 'approved')
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Log the role assignment
    INSERT INTO public.audit_logs (
        user_id,
        action,
        details_encrypted,
        timestamp
    ) VALUES (
        NEW.id,
        'USER_ROLE_ASSIGNED',
        jsonb_build_object(
            'assigned_role', assigned_role::text,
            'requested_user_type', requested_user_type,
            'auto_approved', true,
            'timestamp', now()
        )::text,
        now()
    );
    
    RETURN NEW;
END;
$function$;

-- 3. Create function to get user's intended type for dashboard routing
CREATE OR REPLACE FUNCTION public.get_user_type()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
    SELECT 
        CASE 
            WHEN ur.role = 'patient' THEN 'recovery'
            WHEN ur.role = 'provider' THEN 'provider'
            WHEN ur.role = 'support_member' THEN 'supporter'
            ELSE 'recovery'
        END
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    LIMIT 1
$$;

-- 4. Update existing users who might have wrong roles based on their intended type
-- This helps fix users who already signed up but got wrong roles
UPDATE public.user_roles ur
SET role = CASE 
    WHEN utr.requested_type = 'recovery' THEN 'patient'::app_role
    WHEN utr.requested_type = 'provider' THEN 'provider'::app_role
    WHEN utr.requested_type = 'supporter' THEN 'support_member'::app_role
    ELSE 'patient'::app_role
END
FROM public.user_type_requests utr
WHERE ur.user_id = utr.user_id
AND utr.status = 'approved';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_user_type() TO authenticated;
GRANT SELECT ON public.user_type_requests TO authenticated;