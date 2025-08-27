# 🚀 VERCEL ENVIRONMENT VARIABLES SETUP

## **STEP 1: Open Vercel Dashboard**

1. Open browser: **https://vercel.com/dashboard**
2. Sign in with your account
3. Select your project: **serenity-sober-pathways-guide**
4. Click: **Settings** tab
5. Click: **Environment Variables** in left sidebar

---

## **STEP 2: Add Core Variables (COPY EXACTLY)**

Click "Add New" for each variable and paste:

### 🔹 Variable 1: VITE_SUPABASE_URL
- **Key**: `VITE_SUPABASE_URL`
- **Value**: `https://tqyiqstpvwztvofrxpuf.supabase.co`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development

### 🔹 Variable 2: VITE_SUPABASE_ANON_KEY
- **Key**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWlxc3Rwdnd6dHZvZnJ4cHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyODIxNzksImV4cCI6MjA2NDg1ODE3OX0.EJPmyjD9cpZDa_PjxKkUiVpKfVmFAFofNSk58Ssqp_8`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development

### 🔹 Variable 3: SUPABASE_URL
- **Key**: `SUPABASE_URL`
- **Value**: `https://tqyiqstpvwztvofrxpuf.supabase.co`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development

### 🔹 Variable 4: SUPABASE_ANON_KEY
- **Key**: `SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWlxc3Rwdnd6dHZvZnJ4cHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyODIxNzksImV4cCI6MjA2NDg1ODE3OX0.EJPmyjD9cpZDa_PjxKkUiVpKfVmFAFofNSk58Ssqp_8`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development

---

## **STEP 3: Add Security Variables**

### 🔐 Variable 5: VITE_ENCRYPTION_MASTER_KEY (NEW KEY!)
- **Key**: `VITE_ENCRYPTION_MASTER_KEY`
- **Value**: `f2a2206bcb1e697ff5c267fc9d8efccf32459a9894f1c2cca3a9ca26170c3092`
- **Environment**: ✅ Production, ✅ Preview, ✅ Development
- **⚠️ IMPORTANT**: This is a NEW key for security. Do NOT use old key!

---

## **STEP 4: Add Apple Configuration**

### 🍎 Variable 6: APP_STORE_CONNECT_API_KEY_ID
- **Key**: `APP_STORE_CONNECT_API_KEY_ID`
- **Value**: `4YBU7UC32Y`
- **Environment**: ✅ Production, ✅ Preview

### 🍎 Variable 7: APP_STORE_CONNECT_ISSUER_ID
- **Key**: `APP_STORE_CONNECT_ISSUER_ID`
- **Value**: `acb9e47c-6935-4933-ae2c-6170b5d90234`
- **Environment**: ✅ Production, ✅ Preview

### 🍎 Variable 8: APPLE_ID
- **Key**: `APPLE_ID`
- **Value**: `cmcald1018@gmail.com`
- **Environment**: ✅ Production, ✅ Preview

### 🍎 Variable 9: APPLE_TEAM_ID
- **Key**: `APPLE_TEAM_ID`
- **Value**: `XDY458RQ59`
- **Environment**: ✅ Production, ✅ Preview

---

## **STEP 5: Add Production Settings**

### ⚙️ Variable 10: NODE_ENV
- **Key**: `NODE_ENV`
- **Value**: `production`
- **Environment**: ✅ Production ONLY

### ⚙️ Variable 11: VITE_APP_ENV
- **Key**: `VITE_APP_ENV`
- **Value**: `production`
- **Environment**: ✅ Production ONLY

---

## **STEP 6: Verify Configuration**

After adding all variables:

1. **Count**: You should have **11 environment variables** total
2. **Click**: "Save All" if available
3. **Run verification** in terminal:
```bash
cd C:/dev/serenity
vercel env pull .env.production.local --environment=production
node scripts/validate-vercel-env.js
```

You should see:
```
✅ All required environment variables are configured!
🎉 Your Vercel environment is ready for production!
```

---

## **⚠️ CRITICAL SECURITY NOTES**

1. **DO NOT** add the old `P12_PASSWORD` - generate a new one later
2. **DO NOT** add the `APP_STORE_CONNECT_KEY` (private key) yet
3. **ROTATE** Apple credentials after deployment
4. **DELETE** the `vercel-env-values.txt` file after setup

---

## **Quick Checklist**

- [ ] Logged into Vercel Dashboard
- [ ] Selected correct project
- [ ] Added VITE_SUPABASE_URL
- [ ] Added VITE_SUPABASE_ANON_KEY
- [ ] Added SUPABASE_URL
- [ ] Added SUPABASE_ANON_KEY
- [ ] Added VITE_ENCRYPTION_MASTER_KEY (new key)
- [ ] Added APP_STORE_CONNECT_API_KEY_ID
- [ ] Added APP_STORE_CONNECT_ISSUER_ID
- [ ] Added APPLE_ID
- [ ] Added APPLE_TEAM_ID
- [ ] Added NODE_ENV
- [ ] Added VITE_APP_ENV
- [ ] Ran validation script
- [ ] Deleted vercel-env-values.txt

---

## **Next Steps**

Once all variables are added:
1. We'll set up Sentry for error monitoring
2. Enable Supabase daily backups
3. Deploy to staging
4. Test everything
5. Deploy to production

**Reply "DONE" when you've added all 11 variables to Vercel!**