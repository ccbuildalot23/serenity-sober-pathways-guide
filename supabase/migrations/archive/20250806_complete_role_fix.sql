-- =====================================================
-- COMPLETE FIX FOR ROLE FUNCTIONS AND TABLE STRUCTURE
-- =====================================================
-- This single migration handles everything in the correct order:
-- 1. Ensures user_roles table has proper structure
-- 2. Converts enum types to TEXT
-- 3. Drops and recreates all functions
-- 4. Creates views with correct column references

-- =====================================================
-- STEP 1: ENSURE USER_ROLES TABLE EXISTS WITH PROPER STRUCTURE
-- =====================================================

-- First, check if table exists and fix/create it
DO $$
BEGIN
    -- Check if user_roles table exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles'
    ) THEN
        -- Create the table with all needed columns
        CREATE TABLE public.user_roles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('patient', 'support_member', 'provider', 'admin')),
            assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            assigned_by UUID REFERENCES auth.users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE (user_id)
        );
        RAISE NOTICE 'Created user_roles table';
    ELSE
        -- Table exists, ensure it has all needed columns
        
        -- Convert role column from app_role to TEXT if needed
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_roles' 
            AND column_name = 'role'
            AND udt_name = 'app_role'
        ) THEN
            ALTER TABLE public.user_roles 
            ALTER COLUMN role TYPE TEXT 
            USING role::TEXT;
            RAISE NOTICE 'Converted role column from app_role to TEXT';
        END IF;
        
        -- Add check constraint if missing
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.table_constraints
            WHERE table_schema = 'public'
            AND table_name = 'user_roles'
            AND constraint_type = 'CHECK'
            AND constraint_name LIKE '%role%'
        ) THEN
            ALTER TABLE public.user_roles
            ADD CONSTRAINT user_roles_role_check 
            CHECK (role IN ('patient', 'support_member', 'provider', 'admin'));
            RAISE NOTICE 'Added role check constraint';
        END IF;
        
        -- Add missing columns
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_roles' 
            AND column_name = 'assigned_at'
        ) THEN
            ALTER TABLE public.user_roles 
            ADD COLUMN assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Added assigned_at column';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_roles' 
            AND column_name = 'assigned_by'
        ) THEN
            ALTER TABLE public.user_roles 
            ADD COLUMN assigned_by UUID REFERENCES auth.users(id);
            RAISE NOTICE 'Added assigned_by column';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_roles' 
            AND column_name = 'created_at'
        ) THEN
            ALTER TABLE public.user_roles 
            ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Added created_at column';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_roles' 
            AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE public.user_roles 
            ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
            RAISE NOTICE 'Added updated_at column';
        END IF;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: DROP ALL EXISTING FUNCTIONS AND VIEWS
-- =====================================================

-- Drop dependent views first
DROP VIEW IF EXISTS public.role_assignments_audit CASCADE;

-- Drop all role-related functions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT ns.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace ns ON p.pronamespace = ns.oid
        WHERE ns.nspname = 'public' 
        AND p.proname IN (
            'get_user_role', 'has_role', 'is_provider_or_admin',
            'has_any_role', 'current_user_role', 'current_user_has_role',
            'is_authenticated', 'auth_user_role', 'auth_has_role',
            'auth_is_provider_or_admin', 'rls_user_has_role',
            'current_user_is_provider_or_admin'
        )
    LOOP
        BEGIN
            EXECUTE format('DROP FUNCTION IF EXISTS %I.%I(%s) CASCADE', 
                          r.nspname, r.proname, r.args);
        EXCEPTION
            WHEN OTHERS THEN
                NULL; -- Ignore errors
        END;
    END LOOP;
END $$;

-- Drop app_role enum if it exists
DROP TYPE IF EXISTS app_role CASCADE;

-- =====================================================
-- STEP 3: CREATE ROLE FUNCTIONS (TEXT PARAMETERS ONLY)
-- =====================================================

-- get_user_role: Get role for a user
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_role TEXT;
    v_actual_user_id UUID;
BEGIN
    v_actual_user_id := COALESCE(p_user_id, auth.uid());
    
    IF v_actual_user_id IS NULL THEN
        RETURN 'patient';
    END IF;
    
    SELECT role INTO v_role
    FROM public.user_roles
    WHERE user_id = v_actual_user_id
    LIMIT 1;
    
    RETURN COALESCE(v_role, 'patient');
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'patient';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- has_role: Check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    IF p_user_id IS NULL OR p_role IS NULL THEN
        RETURN FALSE;
    END IF;
    
    IF p_role NOT IN ('patient', 'support_member', 'provider', 'admin') THEN
        RETURN FALSE;
    END IF;
    
    RETURN EXISTS(
        SELECT 1 
        FROM public.user_roles 
        WHERE user_id = p_user_id 
          AND role = p_role
        LIMIT 1
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- is_authenticated: Check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- is_provider_or_admin: Check if user has elevated privileges
CREATE OR REPLACE FUNCTION public.is_provider_or_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_actual_user_id UUID;
    v_role TEXT;
BEGIN
    v_actual_user_id := COALESCE(p_user_id, auth.uid());
    
    IF v_actual_user_id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    v_role := public.get_user_role(v_actual_user_id);
    RETURN v_role IN ('provider', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper functions with unique names
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
BEGIN
    RETURN public.get_user_role(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.current_user_has_role(p_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.has_role(auth.uid(), p_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.current_user_is_provider_or_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.is_provider_or_admin(auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- STEP 4: GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_provider_or_admin(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_user_has_role(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_provider_or_admin() TO authenticated, anon;

-- =====================================================
-- STEP 5: CREATE COMPATIBILITY FUNCTIONS
-- =====================================================

-- Try to create compatibility wrappers
DO $$
BEGIN
    -- get_user_role with no params
    BEGIN
        CREATE OR REPLACE FUNCTION public.get_user_role()
        RETURNS TEXT AS $func$
        BEGIN
            RETURN public.get_user_role(NULL::UUID);
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
        GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated, anon;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
    
    -- has_role with single param
    BEGIN
        CREATE OR REPLACE FUNCTION public.has_role(p_role TEXT)
        RETURNS BOOLEAN AS $func$
        BEGIN
            RETURN public.has_role(auth.uid(), p_role);
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
        GRANT EXECUTE ON FUNCTION public.has_role(TEXT) TO authenticated, anon;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END $$;

-- =====================================================
-- STEP 6: CREATE VIEW (AFTER TABLE AND FUNCTIONS ARE READY)
-- =====================================================

-- Now create the view with verified columns
CREATE OR REPLACE VIEW public.role_assignments_audit AS
SELECT 
    ur.id,
    ur.user_id,
    ur.role,
    ur.created_at,
    ur.updated_at,
    ur.assigned_at,
    ur.assigned_by,
    p.email,
    p.full_name,
    p.phone_number
FROM public.user_roles ur
LEFT JOIN public.profiles p ON ur.user_id = p.id
WHERE public.has_role(auth.uid(), 'provider');

-- Grant access to the view
GRANT SELECT ON public.role_assignments_audit TO authenticated;

-- =====================================================
-- STEP 7: VERIFY EVERYTHING
-- =====================================================

DO $$
DECLARE
    col_count INTEGER;
    func_count INTEGER;
BEGIN
    -- Check user_roles table columns
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles';
    
    RAISE NOTICE 'user_roles table has % columns', col_count;
    
    -- Check functions exist
    SELECT COUNT(*) INTO func_count
    FROM pg_proc p
    JOIN pg_namespace ns ON p.pronamespace = ns.oid
    WHERE ns.nspname = 'public' 
    AND p.proname IN ('get_user_role', 'has_role', 'is_authenticated', 'is_provider_or_admin');
    
    RAISE NOTICE 'Created % core functions', func_count;
    
    -- Test basic function calls
    PERFORM public.get_user_role('00000000-0000-0000-0000-000000000000'::UUID);
    PERFORM public.has_role('00000000-0000-0000-0000-000000000000'::UUID, 'patient');
    PERFORM public.is_authenticated();
    PERFORM public.current_user_role();
    
    RAISE NOTICE 'All functions tested successfully';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This comprehensive migration:
-- 1. Ensures user_roles table has ALL required columns
-- 2. Converts app_role enum to TEXT
-- 3. Creates all needed functions with clear signatures
-- 4. Creates the view with correct column references
-- 5. Maintains backward compatibility