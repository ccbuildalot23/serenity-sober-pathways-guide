# 📊 SENTRY ERROR MONITORING SETUP GUIDE

## **PHASE 2: SENTRY CONFIGURATION (20 minutes)**

---

## Step 1: Create Sentry Account (5 min)

### 1.1 Sign Up
1. Go to: **https://sentry.io/signup/**
2. Sign up with:
   - Email: Use your work email
   - Organization name: `serenity-health`
   - Data region: United States (for HIPAA compliance)

### 1.2 Choose Plan
- Select: **Developer Plan** (Free for up to 5K errors/month)
- Or: **Team Plan** if you need HIPAA BAA

---

## Step 2: Create React Project (3 min)

### 2.1 New Project Setup
1. Click: **"Create Project"**
2. Select platform: **React**
3. Configure:
   - Project name: `serenity-frontend`
   - Team: `#serenity-dev`
4. Click: **"Create Project"**

### 2.2 Copy Your DSN
After creation, you'll see:
```
REACT_APP_SENTRY_DSN=https://[YOUR_KEY]@o[ORG_ID].ingest.sentry.io/[PROJECT_ID]
```

**SAVE THIS DSN!** Example:
```
https://abc123def456@o4507891234.ingest.sentry.io/4507891234567
```

---

## Step 3: Get Auth Token (2 min)

### 3.1 Create Auth Token
1. Go to: **Settings → Account → Auth Tokens**
2. Click: **"Create New Token"**
3. Configure:
   - Name: `serenity-deployment`
   - Scopes:
     - ✅ `project:releases`
     - ✅ `project:write`
     - ✅ `org:read`
4. Click: **"Create Token"**

### 3.2 Copy Token
**⚠️ IMPORTANT**: Copy the token immediately! It won't be shown again.
```
sntrys_eyJpYXQiOjE3MjQ4Njk3NDUuMTU2ODc1LC...
```

---

## Step 4: Configure Alerts (5 min)

### 4.1 Set Up Error Alerts
1. Go to: **Alerts → Create Alert Rule**
2. Choose: **"Issues"** alert type
3. Configure:
   - Name: `Production Errors`
   - Conditions: When error count > 10 in 5 minutes
   - Actions: Send email to team

### 4.2 Set Up Performance Alerts
1. Create another alert
2. Choose: **"Performance"** type
3. Configure:
   - Name: `Slow Transactions`
   - Conditions: When p95 > 3 seconds
   - Actions: Send to Slack (if configured)

---

## Step 5: Update Vercel Environment (5 min)

### 5.1 Add to Vercel Dashboard

Go back to **Vercel Dashboard** → **Environment Variables**

Add these:
```
VITE_SENTRY_DSN=https://[YOUR_KEY]@o[ORG_ID].ingest.sentry.io/[PROJECT_ID]
SENTRY_AUTH_TOKEN=sntrys_[YOUR_TOKEN]
SENTRY_ORG=serenity-health
SENTRY_PROJECT=serenity-frontend
```

### 5.2 Verify with CLI
```bash
vercel env pull .env.production.local --environment=production
# Check that VITE_SENTRY_DSN is present
cat .env.production.local | grep SENTRY
```

---

## Step 6: Test Integration (2 min)

### 6.1 Deploy to Staging
```bash
vercel --no-confirm
```

### 6.2 Trigger Test Error
Visit your staging URL and open browser console:
```javascript
// This will send a test error to Sentry
throw new Error("Sentry test error - can be ignored");
```

### 6.3 Verify in Sentry
1. Go back to Sentry dashboard
2. Check **Issues** tab
3. You should see the test error

---

## Configuration for HIPAA Compliance

### Enable These Settings:

1. **Data Scrubbing**
   - Settings → Security & Privacy → Data Scrubbing
   - Enable: ✅ "Scrub IP Addresses"
   - Enable: ✅ "Scrub Personally Identifiable Information"

2. **Session Replay** (Be Careful!)
   - Settings → Replays
   - Privacy: **Strict** mode
   - Mask all text content
   - Block all media

3. **Retention**
   - Settings → Data & Privacy
   - Error events: 30 days (minimum for HIPAA)
   - Replays: 7 days

4. **Access Controls**
   - Settings → Members
   - Enable 2FA for all team members
   - Limit access to production data

---

## Quick Setup Commands

```bash
# After creating Sentry account, run these:

# 1. Add Sentry DSN to Vercel
vercel env add VITE_SENTRY_DSN production
# Paste your DSN when prompted

# 2. Add Auth Token
vercel env add SENTRY_AUTH_TOKEN production
# Paste your token when prompted

# 3. Verify configuration
node scripts/validate-vercel-env.js

# 4. Test in staging
vercel --no-confirm

# 5. Check Sentry dashboard
# https://[YOUR-ORG].sentry.io/issues/
```

---

## Common Issues & Solutions

### Issue: "Sentry not capturing errors"
**Solution**: Check that `VITE_SENTRY_DSN` starts with `VITE_` for Vite projects

### Issue: "CORS errors from Sentry"
**Solution**: Add your domain to Sentry's allowed domains in project settings

### Issue: "Too many errors being sent"
**Solution**: Adjust `tracesSampleRate` in `sentryService.ts` (currently 0.1 for production)

### Issue: "PHI appearing in errors"
**Solution**: Our `sanitizePHI` function should catch most cases, but review regularly

---

## Verification Checklist

- [ ] Sentry account created
- [ ] DSN copied and saved
- [ ] Auth token generated
- [ ] Environment variables added to Vercel
- [ ] Test error captured in staging
- [ ] Alerts configured
- [ ] Data scrubbing enabled
- [ ] Team members have 2FA

---

## Support Links

- Sentry Docs: https://docs.sentry.io/platforms/javascript/guides/react/
- HIPAA Compliance: https://docs.sentry.io/product/security/hipaa/
- Vercel Integration: https://docs.sentry.io/product/integrations/deployment/vercel/

---

✅ **Once Sentry is configured, your error monitoring is ready for production!**