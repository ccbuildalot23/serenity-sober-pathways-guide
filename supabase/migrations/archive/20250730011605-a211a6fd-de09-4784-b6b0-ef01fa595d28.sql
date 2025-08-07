-- SECURITY FIX: Prevent role escalation vulnerability (Part 2)
-- This migration addresses the critical security issue where users could potentially
-- gain elevated privileges during signup

-- 1. Update handle_new_user function to enforce server-side role validation
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
    -- Get the user type from metadata (but don't trust it for role assignment)
    requested_user_type := COALESCE(NEW.raw_user_meta_data ->> 'userType', 'patient');
    
    -- SECURITY: Always assign 'patient' role by default
    -- Provider roles must be assigned through secure administrative process
    assigned_role := 'patient';
    
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
    
    -- Always assign patient role (secure default)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, assigned_role);
    
    -- Log the role assignment with security details
    INSERT INTO public.audit_logs (
        user_id,
        action,
        details_encrypted,
        timestamp
    ) VALUES (
        NEW.id,
        'USER_ROLE_ASSIGNED_SECURE',
        jsonb_build_object(
            'assigned_role', assigned_role,
            'requested_user_type', requested_user_type,
            'security_note', 'Role assignment enforced server-side for security',
            'timestamp', now()
        )::text,
        now()
    );
    
    RETURN NEW;
END;
$function$;

-- 2. Create provider registration requests table for secure provider onboarding
CREATE TABLE public.provider_registration_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    license_number TEXT,
    license_state TEXT,
    practice_name TEXT,
    practice_address TEXT,
    phone_number TEXT,
    license_verification_status TEXT NOT NULL DEFAULT 'pending',
    admin_approval_status TEXT NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    approval_notes TEXT,
    verification_documents JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on provider registration requests
ALTER TABLE public.provider_registration_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own registration requests
CREATE POLICY "Users can create provider registration requests"
ON public.provider_registration_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own registration requests
CREATE POLICY "Users can view their own registration requests"
ON public.provider_registration_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Only existing providers can review registration requests
CREATE POLICY "Providers can review registration requests"
ON public.provider_registration_requests
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'provider'::app_role
    )
);

-- 3. Update existing user_roles RLS policies for enhanced security
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;

-- SECURITY: Only allow role assignment during user creation (system level)
-- or by existing providers for specific cases
CREATE POLICY "Secure role assignment"
ON public.user_roles
FOR INSERT
WITH CHECK (
    -- Allow system-level assignment (like during signup)
    auth.uid() = user_id 
    AND role = 'patient'::app_role
    OR
    -- Allow existing providers to assign roles (for approved provider requests)
    EXISTS (
        SELECT 1 FROM public.user_roles existing_roles
        WHERE existing_roles.user_id = auth.uid() 
        AND existing_roles.role = 'provider'::app_role
    )
);

-- SECURITY: Prevent role updates - roles should only be set once securely
CREATE POLICY "Prevent role updates"
ON public.user_roles
FOR UPDATE
USING (false);

-- SECURITY: Only providers can delete roles (for administrative purposes)
CREATE POLICY "Only providers can delete roles"
ON public.user_roles
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles existing_roles
        WHERE existing_roles.user_id = auth.uid() 
        AND existing_roles.role = 'provider'::app_role
    )
);

-- 4. Create secure function for provider role assignment
CREATE OR REPLACE FUNCTION public.approve_provider_registration(
    request_id UUID,
    approval_notes TEXT DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    request_record RECORD;
    approver_role app_role;
BEGIN
    -- Verify the approver is a provider
    SELECT role INTO approver_role
    FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'provider'::app_role
    LIMIT 1;
    
    IF approver_role IS NULL THEN
        RAISE EXCEPTION 'Access denied: Only providers can approve registrations';
    END IF;
    
    -- Get the registration request
    SELECT * INTO request_record
    FROM public.provider_registration_requests
    WHERE id = request_id
    AND admin_approval_status = 'pending';
    
    IF request_record IS NULL THEN
        RAISE EXCEPTION 'Registration request not found or already processed';
    END IF;
    
    -- Update the registration request
    UPDATE public.provider_registration_requests
    SET 
        admin_approval_status = 'approved',
        reviewed_at = now(),
        reviewed_by = auth.uid(),
        approval_notes = approve_provider_registration.approval_notes,
        updated_at = now()
    WHERE id = request_id;
    
    -- Assign provider role securely
    INSERT INTO public.user_roles (user_id, role)
    VALUES (request_record.user_id, 'provider'::app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Log the provider role assignment
    INSERT INTO public.audit_logs (
        user_id,
        action,
        details_encrypted,
        timestamp
    ) VALUES (
        request_record.user_id,
        'PROVIDER_ROLE_ASSIGNED',
        jsonb_build_object(
            'approved_by', auth.uid(),
            'request_id', request_id,
            'approval_notes', approval_notes,
            'security_level', 'administrative_approval',
            'timestamp', now()
        )::text,
        now()
    );
END;
$function$;

-- 5. Add trigger for updating provider registration requests
CREATE OR REPLACE FUNCTION public.update_provider_request_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE TRIGGER update_provider_registration_requests_updated_at
    BEFORE UPDATE ON public.provider_registration_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_provider_request_updated_at();

-- 6. Enhanced audit logging for role changes
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Log role assignments/changes with enhanced security context
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.audit_logs (
            user_id,
            action,
            details_encrypted,
            timestamp
        ) VALUES (
            auth.uid(),
            'ROLE_ASSIGNED_SECURE',
            jsonb_build_object(
                'target_user_id', NEW.user_id,
                'role_assigned', NEW.role,
                'assigned_by', auth.uid(),
                'security_context', 'enhanced_validation',
                'timestamp', now()
            )::text,
            now()
        );
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO public.audit_logs (
            user_id,
            action,
            details_encrypted,
            timestamp
        ) VALUES (
            auth.uid(),
            'ROLE_MODIFIED_SECURE',
            jsonb_build_object(
                'target_user_id', NEW.user_id,
                'old_role', OLD.role,
                'new_role', NEW.role,
                'modified_by', auth.uid(),
                'security_context', 'administrative_action',
                'timestamp', now()
            )::text,
            now()
        );
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO public.audit_logs (
            user_id,
            action,
            details_encrypted,
            timestamp
        ) VALUES (
            auth.uid(),
            'ROLE_REMOVED_SECURE',
            jsonb_build_object(
                'target_user_id', OLD.user_id,
                'role_removed', OLD.role,
                'removed_by', auth.uid(),
                'security_context', 'administrative_action',
                'timestamp', now()
            )::text,
            now()
        );
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$;

-- Update the trigger to use enhanced logging
DROP TRIGGER IF EXISTS log_role_changes ON public.user_roles;
CREATE TRIGGER log_role_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.log_role_change();

-- 7. Create security validation function
CREATE OR REPLACE FUNCTION public.validate_user_permissions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    result jsonb;
    user_role app_role;
    suspicious_accounts integer;
BEGIN
    -- Get current user role
    SELECT role INTO user_role
    FROM public.user_roles
    WHERE user_id = auth.uid()
    LIMIT 1;
    
    -- Count potentially suspicious accounts (users with provider role assigned at signup)
    SELECT COUNT(*) INTO suspicious_accounts
    FROM public.audit_logs
    WHERE action = 'USER_ROLE_ASSIGNED'
    AND details_encrypted::jsonb ->> 'assigned_role' = 'provider'
    AND timestamp >= now() - interval '30 days';
    
    -- Build security status
    SELECT jsonb_build_object(
        'user_role', COALESCE(user_role::text, 'none'),
        'account_secure', CASE WHEN user_role IS NOT NULL THEN true ELSE false END,
        'provider_requests_pending', (
            SELECT COUNT(*) FROM public.provider_registration_requests
            WHERE admin_approval_status = 'pending'
        ),
        'security_alerts', suspicious_accounts,
        'last_audit_check', now()
    ) INTO result;
    
    RETURN result;
END;
$function$;