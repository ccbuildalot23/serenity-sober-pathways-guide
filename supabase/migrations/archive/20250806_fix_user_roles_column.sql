-- =====================================================
-- FIX USER_ROLES TABLE COLUMN TYPE
-- =====================================================
-- This migration must be run BEFORE the definitive_role_functions_fix
-- It converts the role column from app_role enum to TEXT

-- First, check if the role column exists and what type it is
DO $$
BEGIN
    -- Check if user_roles table exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles'
    ) THEN
        -- Check the current data type of the role column
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'user_roles' 
            AND column_name = 'role'
            AND udt_name = 'app_role'
        ) THEN
            -- Convert app_role enum to TEXT
            ALTER TABLE public.user_roles 
            ALTER COLUMN role TYPE TEXT 
            USING role::TEXT;
            
            RAISE NOTICE 'Converted user_roles.role from app_role to TEXT';
        ELSE
            RAISE NOTICE 'user_roles.role is already TEXT or column does not exist';
        END IF;
    ELSE
        -- Create the table if it doesn't exist
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
        
        -- Enable RLS
        ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Created user_roles table with TEXT role column';
    END IF;
END $$;

-- Add check constraint to ensure valid role values
DO $$
BEGIN
    -- Add constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.constraint_column_usage
        WHERE table_schema = 'public'
        AND table_name = 'user_roles'
        AND constraint_name = 'user_roles_role_check'
    ) THEN
        ALTER TABLE public.user_roles
        ADD CONSTRAINT user_roles_role_check 
        CHECK (role IN ('patient', 'support_member', 'provider', 'admin'));
        
        RAISE NOTICE 'Added role check constraint';
    END IF;
END $$;

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add created_at if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE public.user_roles 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- Add updated_at if missing
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.user_roles 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create or replace trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON public.user_roles;
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_user_roles_updated_at();

-- Ensure RLS is enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Verify the table structure
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_roles';
    
    RAISE NOTICE 'user_roles table has % columns', col_count;
    
    -- List all columns
    FOR col_count IN 
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_roles'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE 'Column: %', col_count;
    END LOOP;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- This migration ensures the user_roles table:
-- 1. Has a role column of type TEXT (not app_role enum)
-- 2. Has all required columns (created_at, updated_at)
-- 3. Has proper constraints and triggers
-- 4. Has RLS enabled
--
-- Run this BEFORE the definitive_role_functions_fix.sql migration