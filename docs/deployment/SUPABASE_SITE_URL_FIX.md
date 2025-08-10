# 🚨 CRITICAL: Supabase Site URL Configuration Fix

## Problem Identified

The password reset emails are being sent successfully (SendGrid is working), but the reset links are failing with `error_code=otp_expired`. This indicates a **Site URL configuration mismatch** in Supabase.

## Root Cause Analysis

When you click the reset link in your email, Supabase is rejecting the token because:

1. **Site URL Mismatch**: The Site URL in Supabase Dashboard doesn't match your production domain
2. **Redirect URL Validation**: Supabase validates that the redirect URL matches the configured Site URL
3. **Token Expiration**: Tokens expire quickly if the Site URL is incorrect

## IMMEDIATE FIX REQUIRED

### 1. Update Supabase Site URL Configuration

**Go to Supabase Dashboard:**
1. Navigate to [Supabase Dashboard](https://app.supabase.com)
2. Select your project: `tqyiqstpvwztvofrxpuf`
3. Go to **Authentication > URL Configuration**

**Update these settings:**

```
Site URL: https://serenity-sober-pathways-guide.vercel.app
Redirect URLs: 
- https://serenity-sober-pathways-guide.vercel.app
- https://serenity-sober-pathways-guide.vercel.app/*
- https://serenity-sober-pathways-guide.vercel.app/auth
- https://serenity-sober-pathways-guide.vercel.app/reset-password
- http://localhost:5173 (for development)
```

### 2. Verify Email Template Configuration

**In Authentication > Email Templates:**

1. **Password Reset Template** should use:
   ```
   {{ .ConfirmationURL }}
   ```

2. **Subject Line** should be:
   ```
   Reset Your Password
   ```

### 3. Check Rate Limiting Settings

**In Authentication > Rate Limits:**

```
Password Reset Requests: 10 per hour per email
Email Confirmations: 20 per hour per email
OTP Requests: 20 per hour per email
```

## Testing the Fix

### Step 1: Update Site URL
1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Set Site URL to: `https://serenity-sober-pathways-guide.vercel.app`
3. Add all redirect URLs listed above
4. Save changes

### Step 2: Test Password Reset
1. Go to: `https://serenity-sober-pathways-guide.vercel.app/forgot-password`
2. Enter your email: `cmcald1018@gmail.com`
3. Click "Send Reset Link"
4. Check your email for the new reset link
5. Click the reset link in the email

### Step 3: Verify Token Validation
1. Open browser developer tools (F12)
2. Go to Console tab
3. Click the reset link from your email
4. Look for debug messages showing token validation

## Expected Debug Output

**If working correctly, you should see:**
```
ResetPassword URL: https://serenity-sober-pathways-guide.vercel.app/reset-password#access_token=...
Hash: #access_token=...&type=recovery
Search: 
Debug - accessToken: [token value]
Debug - type: recovery
Debug - error: null
Debug - errorCode: null
Attempting to verify token with Supabase...
Token verified successfully: [data]
```

**If still failing, you'll see:**
```
Debug - error: access_denied
Debug - errorCode: otp_expired
Debug - errorDescription: Email link is invalid or has expired
```

## Common Issues and Solutions

### Issue 1: Site URL Mismatch
**Symptom**: `error_code=otp_expired`
**Solution**: Update Site URL in Supabase Dashboard

### Issue 2: Missing Redirect URLs
**Symptom**: Token validation fails
**Solution**: Add all required redirect URLs

### Issue 3: Email Template Issues
**Symptom**: Links don't work
**Solution**: Verify email template uses `{{ .ConfirmationURL }}`

### Issue 4: Rate Limiting
**Symptom**: "Too many requests" errors
**Solution**: Increase rate limits or wait for cooldown

## Verification Checklist

- [ ] Site URL set to: `https://serenity-sober-pathways-guide.vercel.app`
- [ ] All redirect URLs added
- [ ] Email template uses `{{ .ConfirmationURL }}`
- [ ] Rate limits configured properly
- [ ] SendGrid SMTP configured
- [ ] Test password reset flow
- [ ] Check browser console for debug messages
- [ ] Verify token validation succeeds

## Emergency Contact

If the issue persists after updating Site URL:

1. **Check Supabase Status**: https://status.supabase.com
2. **Contact Supabase Support**: support@supabase.com
3. **Check SendGrid Logs**: Verify email delivery
4. **Review Browser Console**: Look for specific error messages

## Timeline

**IMMEDIATE (5 minutes)**:
- Update Site URL in Supabase Dashboard
- Add redirect URLs
- Test password reset

**WITHIN 15 MINUTES**:
- Verify token validation works
- Check debug output
- Confirm password reset flow

---

**Status**: 🚨 CRITICAL - SITE URL MISCONFIGURATION
**Priority**: HIGHEST
**Impact**: BLOCKING PASSWORD RESET FUNCTIONALITY
**Solution**: Update Supabase Site URL Configuration
