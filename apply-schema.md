# Apply Database Schema to New Supabase Project

## Steps to Apply the MVP Schema

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/osfgyoupkmjbxwodsoqh
   - Navigate to the SQL Editor (left sidebar)

2. **Apply the Schema**
   - Click "New query"
   - Copy the entire contents of `supabase/migrations/MVP_COMPLETE_SCHEMA.sql`
   - Paste into the SQL editor
   - Click "Run" to execute

3. **Verify the Schema**
   After running the schema, verify these tables exist:
   - profiles
   - user_roles
   - daily_checkins
   - emergency_contacts
   - crisis_plans
   - cbt_skills
   - journal_entries
   - assessments
   - mood_logs
   - medications
   - appointments
   - support_messages
   - coping_strategies

4. **Enable Row Level Security (RLS)**
   The schema includes RLS policies. Verify they're enabled by checking:
   - Table Editor → Select each table → RLS should show as "Enabled"

5. **Test Authentication**
   - The schema includes auth triggers for automatic profile creation
   - Test by signing up a new user through your app

## Important URLs
- Supabase Dashboard: https://supabase.com/dashboard/project/osfgyoupkmjbxwodsoqh
- Project URL: https://osfgyoupkmjbxwodsoqh.supabase.co
- Project ID: osfgyoupkmjbxwodsoqh

## Troubleshooting
If you encounter errors:
1. Check if tables already exist (drop them first if needed)
2. Ensure you're connected to the correct project
3. Run the schema in smaller chunks if needed