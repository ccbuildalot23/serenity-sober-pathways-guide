-- FINAL FIX FOR RLS RECURSION ON USER_ROLES TABLE
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/tqyiqstpvwztvofrxpuf/sql/new

-- Step 1: Drop ALL existing policies on user_roles to start fresh
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Providers can view patient roles" ON public.user_roles;
DROP POLICY IF EXISTS "Providers can view patient associations" ON public.user_roles;
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Secure role insertion" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Restricted role updates" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_roles;

-- Step 2: Drop any function that might cause recursion
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role);

-- Step 3: Create SIMPLE, NON-RECURSIVE policies

-- Allow users to view their own role (no function calls, direct comparison only)
CREATE POLICY "simple_view_own_role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

-- Allow authenticated users to insert their initial role (patient only)
CREATE POLICY "simple_insert_initial_role"
ON public.user_roles
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'patient'
);

-- Prevent role updates (roles should be managed by admins only)
CREATE POLICY "no_role_updates"
ON public.user_roles
FOR UPDATE
USING (false);

-- Allow deletion only by service role (for cleanup)
CREATE POLICY "service_role_delete_only"
ON public.user_roles
FOR DELETE
USING (false);

-- Step 4: Verify the fix
SELECT 
    polname as policy_name,
    polcmd as operation,
    pg_get_expr(polqual, polrelid) as using_clause,
    pg_get_expr(polwithcheck, polrelid) as with_check_clause
FROM pg_policy 
WHERE polrelid = 'user_roles'::regclass
ORDER BY polname;

-- Step 5: Test that recursion is fixed
-- This should return an error or empty result, NOT "infinite recursion"
SELECT * FROM public.user_roles LIMIT 1;