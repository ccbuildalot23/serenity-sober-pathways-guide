# Crisis SMS Database Migration Guide

## Quick Apply Instructions

Since we can't apply migrations directly via CLI, follow these steps:

1. **Open Supabase Dashboard**
   - Go to https://osfgyoupkmjbxwodsoqh.supabase.co
   - Navigate to SQL Editor

2. **Copy and Run Migration**
   - Copy the entire contents of: `supabase/migrations/20250822_crisis_sms.sql`
   - Paste into SQL Editor
   - Click "Run"

3. **Verify Tables Created**
   Run this query to verify:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('sms_logs', 'crisis_alerts', 'supporter_responses', 'provider_onboarding', 'support_network_members');
   ```

4. **Test Data**
   The migration includes test data for `support_network_members`

## Alternative: Direct SQL Execution

If you have database credentials, you can also use:
```bash
psql -h db.osfgyoupkmjbxwodsoqh.supabase.co -U postgres -d postgres -f supabase/migrations/20250822_crisis_sms.sql
```

## Verification
After applying, test with:
```bash
cd serenity-crisis-mcp
node test-sms-direct.mjs
```

The test should show "Database: CONNECTED" instead of errors.