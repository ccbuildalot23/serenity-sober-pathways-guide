# Schema Application Guide

## Quick Fix for "Policy Already Exists" Error

You have two options to fix the database schema issues:

### Option 1: Clean Slate (Recommended if no production data)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/osfgyoupkmjbxwodsoqh/sql
   - Click "New query"

2. **Run Cleanup Script**
   - Copy entire contents of `supabase/cleanup-schema.sql`
   - Paste into SQL editor
   - Click "Run"
   - This will remove all existing tables and policies

3. **Apply Fresh Schema**
   - Click "New query" again
   - Copy entire contents of `supabase/migrations/MVP_COMPLETE_SCHEMA.sql`
   - Paste into SQL editor
   - Click "Run"

### Option 2: Safe Incremental Update (If you have data to preserve)

1. **Open Supabase SQL Editor**
   - Go to: https://supabase.com/dashboard/project/osfgyoupkmjbxwodsoqh/sql
   - Click "New query"

2. **Run Safe Schema**
   - Copy entire contents of `supabase/apply-schema-safe.sql`
   - Paste into SQL editor
   - Click "Run"
   - This version checks for existing objects before creating

## Verification Steps

After applying the schema, verify everything works:

1. **Check Tables**
   - Go to Table Editor in Supabase
   - You should see 18 tables including:
     - profiles
     - user_roles
     - daily_checkins
     - emergency_contacts
     - crisis_plans
     - And more...

2. **Check RLS**
   - Each table should show "RLS enabled" 
   - Click on a table → Authentication → Should show policies

3. **Test Signup**
   - Go to your app: http://localhost:8082
   - Try creating a new account
   - Should work without errors

## Troubleshooting Common Issues

### "Policy already exists" error
- Use Option 1 (cleanup first) or Option 2 (safe schema)

### "Table already exists" error
- Run the cleanup script first, then apply schema

### "Permission denied" errors
- Make sure RLS policies were created
- Check that grants were applied (last section of schema)

### Network/fetch errors during signup
- Verify .env has correct Supabase URL and anon key
- Check browser console for specific error messages
- Ensure Supabase project is active and not paused

## Files Reference

- **cleanup-schema.sql** - Removes all existing database objects
- **apply-schema-safe.sql** - Idempotent schema that can be run multiple times
- **MVP_COMPLETE_SCHEMA.sql** - Original complete schema (use after cleanup)

## Project Details

- **Project URL**: https://osfgyoupkmjbxwodsoqh.supabase.co
- **Dashboard**: https://supabase.com/dashboard/project/osfgyoupkmjbxwodsoqh
- **Project ID**: osfgyoupkmjbxwodsoqh

## Next Steps

After successful schema application:
1. Test user signup flow
2. Verify all features work
3. Deploy to Vercel with updated environment variables