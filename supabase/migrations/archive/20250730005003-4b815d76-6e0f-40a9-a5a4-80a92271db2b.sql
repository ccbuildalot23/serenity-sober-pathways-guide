-- Update the user role assignment trigger to handle different user types
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create an enhanced function to handle user creation with role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = 'public'
AS $$
DECLARE
    user_type text;
    assigned_role app_role;
BEGIN
    -- Get the user type from metadata (default to 'patient')
    user_type := COALESCE(NEW.raw_user_meta_data ->> 'userType', 'patient');
    
    -- Map user type to role
    CASE user_type
        WHEN 'provider' THEN assigned_role := 'provider';
        WHEN 'support_member' THEN assigned_role := 'support_member';
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
            'assigned_role', assigned_role,
            'user_type_requested', user_type,
            'timestamp', now()
        )::text,
        now()
    );
    
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();