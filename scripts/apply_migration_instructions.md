# Apply Check-in Events Trigger Migration

## Overview
The migration `20250112_fix_checkin_events_trigger.sql` fixes the check-in events trigger system with the following improvements:

### Key Fixes
1. **SECURITY DEFINER**: Function now uses `SECURITY DEFINER` to bypass RLS during trigger execution
2. **Comprehensive RLS Policies**: Five distinct policies for different access patterns
3. **Error Handling**: Robust exception handling prevents transaction failures
4. **Counter Functionality**: Added `get_user_checkin_count()` function for progress tracking
5. **Data Validation**: Check constraints ensure data integrity
6. **Performance Optimization**: Added indexes and optimized queries

## How to Apply

### Option 1: Remote Supabase (Recommended)
```bash
# Login to Supabase CLI
npx supabase login

# Push migration to remote database
npx supabase db push
```

### Option 2: Local Development
```bash
# Start local Supabase (requires Docker Desktop)
npx supabase start

# Apply migrations
npx supabase db reset
```

### Option 3: Direct SQL Application
If CLI is not available, apply the SQL directly in Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/migrations/20250112_fix_checkin_events_trigger.sql`
4. Execute the SQL

## Validation

After applying the migration, run the validation queries in `scripts/validate_migration.sql` to ensure:

1. ✅ Function `log_daily_checkin_event()` exists with `SECURITY DEFINER`
2. ✅ Trigger `trg_log_daily_checkin_event` is active on `daily_checkins` table
3. ✅ Five RLS policies are properly configured on `checkin_events` table
4. ✅ Helper function `get_user_checkin_count()` is available
5. ✅ Proper indexes and constraints are in place

## Expected Behavior

### Before Migration
- Trigger might fail due to RLS restrictions
- Inconsistent event logging
- Missing error handling

### After Migration
- Every insert/update to `daily_checkins` creates an event in `checkin_events`
- RLS policies allow proper access control
- Errors are logged but don't break the main transaction
- Counter function provides accurate checkin counts
- System maintains data integrity with constraints

## Troubleshooting

### Common Issues

1. **Permission Errors**
   - Ensure `SECURITY DEFINER` is set on the function
   - Check that proper GRANT statements are executed

2. **RLS Policy Conflicts**  
   - The migration drops old policies before creating new ones
   - Five distinct policies handle different access patterns

3. **Missing Dependencies**
   - Ensure `daily_checkins` and `checkin_events` tables exist
   - Verify `auth.users` table has proper structure

### Verification Test
The migration includes a self-test that:
- Finds a test user
- Inserts a test daily_checkin
- Verifies the event is created
- Cleans up test data
- Reports success/failure

Look for these messages in the migration output:
- ✅ `SUCCESS: Enhanced checkin events trigger working correctly`
- ❌ `TRIGGER TEST FAILED: Events count unchanged`

## Database Schema Impact

### New/Modified Objects
- `public.log_daily_checkin_event()` - Enhanced trigger function
- `public.get_user_checkin_count(uuid)` - New counter function  
- `trg_log_daily_checkin_event` - Trigger on daily_checkins
- 5 RLS policies on `checkin_events` table
- 2 performance indexes
- 2 check constraints for data validation

### No Breaking Changes
- Existing data is preserved
- API compatibility maintained
- Application code requires no changes