# User Login Fix Documentation

## Issue Summary
Users were unable to consistently log in with their selected user types (recovery, provider, supporter). All users were being assigned the 'patient' role regardless of their selection during signup.

## Root Cause
The system had a security measure in place that automatically assigned all new users the 'patient' role to prevent unauthorized privilege escalation. While this is good for security, it prevented legitimate users from accessing the appropriate dashboards for their user type.

## Solution Implemented

### 1. Database Migration (to be applied)
Created migration file: `/workspace/supabase/migrations/20250730020000-fix-user-type-assignment.sql`

This migration:
- Creates a `user_type_requests` table to track requested user types
- Updates the `handle_new_user` function to properly assign roles based on user type
- For MVP, automatically approves all user types (in production, provider roles should require admin approval)

### 2. Application Code Fix (immediately active)
Updated `/workspace/src/hooks/useUserRole.ts` to:
- Check user metadata for the selected user type
- Temporarily allow role assignment based on metadata for MVP
- Map user types to appropriate roles:
  - 'recovery' → 'patient' role → PatientDashboard
  - 'provider' → 'provider' role → ProviderDashboard  
  - 'supporter' → 'support_member' role → SupporterDashboard

### 3. Fixed SignUpForm
Updated the default userType from 'patient' to 'recovery' to align with the user type selection.

## How It Works Now

1. **During Signup:**
   - User selects their type (Person in Recovery, Healthcare Provider, or Personal Supporter)
   - The selected type is stored in user metadata as 'userType'
   - Database assigns appropriate role (with temporary override for MVP)

2. **During Login:**
   - User enters credentials
   - System checks database role
   - If role is 'patient' but user has different userType in metadata, system uses metadata (MVP only)
   - User is redirected to appropriate dashboard based on their role

3. **Dashboard Routing:**
   - `/dashboard` route uses `DashboardRouter` component
   - `DashboardRouter` checks user role via `useUserRole` hook
   - Routes to appropriate dashboard:
     - PatientDashboard for recovery users
     - ProviderDashboard for healthcare providers
     - SupporterDashboard for personal supporters

## Security Considerations

1. **For MVP:**
   - All user types are auto-approved for quick testing
   - Provider role assignment based on metadata is allowed

2. **For Production:**
   - Remove auto-approval of provider roles
   - Implement admin approval workflow for provider registration
   - Add license verification for healthcare providers
   - Remove metadata-based role override in `useUserRole.ts`

## Testing

Run the test script to verify all user types can log in:
```bash
npx tsx scripts/test-user-login.ts
```

## Next Steps for Production

1. Implement provider verification workflow
2. Add admin panel for role management
3. Remove temporary metadata-based role assignment
4. Add proper audit logging for role changes
5. Implement role-based access control (RBAC) throughout the application