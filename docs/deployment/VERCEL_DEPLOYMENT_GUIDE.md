# 🚀 Vercel Deployment Guide - Serenity Sober Pathways

## Prerequisites ✅
- [x] Node.js 18+ installed
- [x] Vercel CLI installed (`npm install -g vercel`)
- [x] Supabase project configured
- [x] Build successful (`npm run build`)

## Step-by-Step Deployment

### 1. Environment Variables Setup

**IMPORTANT**: You need to set these environment variables in Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (or create new)
3. Go to Settings → Environment Variables
4. Add these variables:

```
VITE_SUPABASE_URL=https://tqyiqstpvwztvofrxpuf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWlxc3Rwdnd6dHZvZnJ4cHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyODIxNzksImV4cCI6MjA2NDg1ODE3OX0.EJPmyjD9cpZDa_PjxKkUiVpKfVmFAFofNSk58Ssqp_8
```

### 2. Deploy to Vercel

Run this command in your project directory:

```bash
vercel --prod
```

**Follow the prompts:**
- Link to existing project or create new
- Set project name (e.g., `serenity-sober-pathways`)
- Confirm build settings (should auto-detect Vite)

### 3. Alternative: Deploy via Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your Git repository
4. Configure:
   - Framework Preset: `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install --legacy-peer-deps`

### 4. Post-Deployment Verification

After deployment, test these features:

- [ ] User registration
- [ ] User login
- [ ] Crisis support button
- [ ] Daily check-ins
- [ ] Mobile responsiveness
- [ ] Database connection

## Current Project Status

### ✅ What's Working
- Build process successful
- Vite configuration correct
- Supabase integration configured
- All dependencies installed
- Vercel configuration ready

### ⚠️ Known Issues
- Large bundle size (2.16 MB) - can be optimized later
- CSS import order warning - doesn't affect functionality
- Database recursion issue (needs Supabase fix)

### 🔧 Configuration Files

**vercel.json** (already configured):
```json
{
  "installCommand": "npm install --legacy-peer-deps",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "functions": {
    "api/**/*": {
      "runtime": "nodejs18.x"
    }
  }
}
```

## Deployment Commands

```bash
# 1. Build locally (test)
npm run build

# 2. Deploy to Vercel
vercel --prod

# 3. Check deployment status
vercel ls

# 4. View deployment logs
vercel logs
```

## Troubleshooting

### Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Environment Variables
- Ensure variables are set in Vercel dashboard
- Check for typos in variable names
- Verify Supabase URL and key are correct

### Database Issues
- Apply the database fix from `DATABASE_FIX_INSTRUCTIONS.md`
- Test with `npx tsx scripts/test-database-fix.ts`

## Next Steps After Deployment

1. **Apply Database Fix**: Follow `DATABASE_FIX_INSTRUCTIONS.md`
2. **Configure Custom Domain** (optional)
3. **Set up Monitoring**: Sentry, LogRocket, etc.
4. **Enable Analytics**: Vercel Analytics
5. **Configure SSL**: Automatic with Vercel

## Support

- Vercel Support: support@vercel.com
- Supabase Support: support@supabase.com
- Project Issues: Check GitHub repository

---

**Ready to deploy? Run: `vercel --prod`** 