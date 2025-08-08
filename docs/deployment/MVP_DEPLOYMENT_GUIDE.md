# 🚀 MVP DEPLOYMENT GUIDE - FRESH START

## Step 1: Create New Supabase Project (10 minutes)

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Name it: `serenity-mvp` (or similar)
4. Choose region closest to you
5. Generate a strong database password (save it!)
6. Click "Create Project" and wait for setup

## Step 2: Deploy the Schema (5 minutes)

1. Once project is ready, go to **SQL Editor** in Supabase
2. Click "New Query"
3. Copy the ENTIRE contents of `MVP_COMPLETE_SCHEMA.sql`
4. Paste and click "Run"
5. You should see: "MVP Schema deployed successfully!"

## Step 3: Get Your Credentials (2 minutes)

1. In Supabase Dashboard, go to **Settings → API**
2. Copy these values:
   - **Project URL**: `https://[your-project-id].supabase.co`
   - **Anon Key**: `eyJ...` (long string)

## Step 4: Update Local Environment (3 minutes)

1. Create/update `.env.local` file:
```env
VITE_SUPABASE_URL=https://[your-project-id].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...[your-anon-key]
```

2. Update `.env` file with same values

## Step 5: Update Vercel Environment (5 minutes)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings → Environment Variables**
4. Update or add:
   - `VITE_SUPABASE_URL` = your new project URL
   - `VITE_SUPABASE_ANON_KEY` = your new anon key
5. Click "Save"

## Step 6: Generate TypeScript Types (3 minutes)

Run this command in your project root:
```bash
npx supabase gen types typescript --project-id [your-project-id] > src/integrations/supabase/types.ts
```

Or if you have Supabase CLI logged in:
```bash
npx supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

## Step 7: Test Locally (5 minutes)

```bash
# Install dependencies if needed
npm install

# Start development server
npm run dev
```

Visit http://localhost:8080 and test:
1. Sign up as a new user
2. Check that you can log in
3. Test basic features

## Step 8: Deploy to Vercel (5 minutes)

```bash
# Commit all changes
git add -A
git commit -m "feat: Fresh MVP deployment with simplified schema"
git push
```

Vercel will automatically deploy. Check the deployment at your Vercel URL.

## Step 9: Create Your First Provider Account (Optional)

If you need a provider account for testing:

1. Sign up normally through your app
2. Go to Supabase Dashboard → **Table Editor → user_roles**
3. Find your user's record
4. Change `role` from `patient` to `provider`
5. Save

## What You Now Have Working

✅ **Authentication**: Sign up, login, password reset
✅ **User Roles**: Patient, provider, support member
✅ **Daily Check-ins**: Mood and wellness tracking
✅ **Recovery Goals**: Personal goal setting
✅ **Crisis Support**: Emergency contacts and crisis plans
✅ **Peer Messaging**: Basic communication system
✅ **Security**: Audit logs, MFA ready, rate limiting ready
✅ **HIPAA Foundation**: RLS policies, audit trails

## Troubleshooting

### If Vercel deployment fails:
1. Check build logs for specific errors
2. Ensure environment variables are set correctly
3. Try clearing build cache: Vercel Dashboard → Settings → Clear Cache

### If Supabase connection fails:
1. Verify your URL and anon key are correct
2. Check that RLS policies aren't blocking access
3. Look at Supabase logs: Dashboard → Logs → Recent Logs

### If types are mismatched:
1. Regenerate types after schema changes
2. Restart your dev server
3. Clear TypeScript cache: `rm -rf node_modules/.cache`

## Next Steps After MVP is Live

Once your MVP is working, you can gradually add:
1. More detailed user profiles
2. Additional recovery tools
3. Advanced crisis features
4. Enhanced peer support
5. Provider dashboards
6. Analytics and reporting

## Support

If you encounter issues:
1. Check Supabase logs for database errors
2. Check Vercel logs for deployment errors
3. Check browser console for client-side errors
4. The simplified schema should eliminate most conflicts

---

**Your MVP should be live within 30 minutes of starting this guide!**