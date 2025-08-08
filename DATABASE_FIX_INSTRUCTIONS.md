# Database Authentication Fix Instructions

## Current Issue

The authentication system is experiencing a database configuration issue with infinite recursion in the `user_roles` table policies. This prevents users from signing in or creating new accounts.

## Temporary Workarounds

### For Development

1. **Use Development Mode Bypass**: When running locally in development mode (`npm run dev`), you can:
   - Click "Skip to Home" or "Skip to Check-in" buttons on the auth page
   - Use the "Bypass Auth (Dev)" option on protected pages
   - Access pages directly without authentication

2. **Clear Browser Storage**: If you're stuck in a redirect loop:
   ```bash
   # In browser console:
   localStorage.clear()
   sessionStorage.clear()
   location.reload()
   ```

## Permanent Fix

### Apply the Migration

The fix requires applying the migration located at `/workspace/supabase/migrations/20250104_fix_auth_issues.sql` to your Supabase database.

### Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the entire contents of `/workspace/supabase/migrations/20250104_fix_auth_issues.sql`
4. Paste and run the SQL in the editor

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Apply the migration
supabase db push
```

## What the Fix Does

1. **Removes Recursive Policies**: Drops all policies that cause infinite recursion when checking user roles
2. **Creates Simple Policies**: Implements non-recursive policies that allow users to read their own roles
3. **Fixes User Creation**: Updates the `handle_new_user` function to properly handle role assignment
4. **Adds Error Handling**: Ensures signup doesn't fail even if there are minor issues

## Testing After Fix

Run the test script to verify the fix:

```bash
npx tsx scripts/check-auth.ts
```

You should see:
- ✅ Database connection successful
- ✅ Sign in successful (for existing users)
- ✅ Test user created successfully (for new users)

## Creating Test Users

After applying the fix, you can create test users with these credentials:

- **Recovery User**: 
  - Email: test-recovery@example.com
  - Password: TestSecure#2024!Recovery
  
- **Provider User**: 
  - Email: test-provider@example.com
  - Password: TestSecure#2024!Provider
  
- **Supporter User**: 
  - Email: test-supporter@example.com
  - Password: TestSecure#2024!Supporter

## Need Help?

If you continue to experience issues:
1. Check the browser console for specific error messages
2. Use the Auth Debug Panel in development mode to diagnose issues
3. Contact support with the error details