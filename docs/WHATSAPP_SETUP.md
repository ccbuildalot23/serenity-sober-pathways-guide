# WhatsApp Business API Setup Guide

## Prerequisites Completed ✅
- [x] Webhook verified and saved in Meta Business Platform
- [x] Webhook endpoint deployed to Supabase

## Step 1: Get Your WhatsApp API Credentials from Meta

1. Go to [Meta for Developers](https://developers.facebook.com)
2. Navigate to your app → WhatsApp → API Setup
3. Note down these values:
   - **Phone Number ID**: Found in the "From" section
   - **WhatsApp Business Account ID**: Found in the account info
   - **Permanent Access Token**: Generate from "Permanent tokens" section

## Step 2: Configure Supabase Edge Function Secrets

Run these commands in your terminal to set the secrets:

```bash
# Set the WhatsApp webhook verification token
npx supabase secrets set WHATSAPP_WEBHOOK_VERIFY_TOKEN=serenity_webhook_2025

# Set your WhatsApp Phone Number ID (from Meta Business Platform)
npx supabase secrets set WHATSAPP_PHONE_NUMBER_ID=YOUR_PHONE_NUMBER_ID

# Set your WhatsApp Access Token (permanent token from Meta)
npx supabase secrets set WHATSAPP_ACCESS_TOKEN=YOUR_ACCESS_TOKEN

# Set your WhatsApp Business Account ID
npx supabase secrets set WHATSAPP_BUSINESS_ID=YOUR_BUSINESS_ID

# Optional: Set your public URL for verification links
npx supabase secrets set PUBLIC_URL=https://your-app-url.vercel.app
```

## Step 3: Create Message Templates in Meta Business Manager

1. Go to [Meta Business Suite](https://business.facebook.com)
2. Navigate to **WhatsApp Manager** → **Message Templates**
3. Click **Create Template**

### Required Templates:

#### 1. Crisis Alert Template (Name: `crisis_alert`)
```
Header: 🚨 Crisis Support Alert
Body: Hi {{1}}, a crisis support alert has been triggered for {{2}}. They may need immediate assistance. Please check on them or contact emergency services if necessary.
Footer: Reply ACK to acknowledge
```

#### 2. Opt-In Verification Template (Name: `opt_in_verification`)
```
Header: Verify Your WhatsApp Notifications
Body: Your verification code is {{1}}. Enter this code in the Serenity app to enable WhatsApp notifications for crisis support.
Footer: This code expires in 10 minutes
```

#### 3. Daily Check-In Reminder (Name: `daily_checkin_reminder`)
```
Header: Daily Wellness Check-In
Body: Hi {{1}}, it's time for your daily wellness check-in. How are you feeling today?
Footer: Open the app to log your mood
```

## Step 4: Test the Webhook

1. Send a test message from Meta Business Platform:
   - Go to WhatsApp → API Setup → Webhooks
   - Click "Test" next to your webhook
   - Select "messages" and send test

2. Check Supabase logs:
```bash
npx supabase functions logs whatsapp-webhook
```

## Step 5: Configure Webhook Subscriptions

In Meta Business Platform, ensure these webhook fields are subscribed:
- [x] messages (for incoming messages)
- [x] message_status (for delivery status)
- [x] message_template_status_update (for template updates)

## Step 6: Test End-to-End Flow

### Test Opt-In Flow:
```javascript
// In your app, call the opt-in function
const response = await supabase.functions.invoke('whatsapp-opt-in', {
  body: {
    phoneNumber: '+1234567890',
    consentMethod: 'in_app',
    consentMessage: 'User opted in via app settings'
  }
})
```

### Test Sending a Message:
```javascript
// Send a crisis alert
const response = await supabase.functions.invoke('send-whatsapp', {
  body: {
    to: '+1234567890',
    template: 'crisis_alert',
    parameters: ['John', 'Jane Doe']
  }
})
```

## Step 7: Monitor and Debug

### Check webhook logs:
```bash
npx supabase functions logs whatsapp-webhook --tail
```

### Common Issues and Solutions:

1. **Webhook verification failing**
   - Ensure `WHATSAPP_WEBHOOK_VERIFY_TOKEN` matches exactly
   - Check that webhook returns plain text challenge, not JSON

2. **Messages not sending**
   - Verify phone number format includes country code
   - Check that message templates are approved
   - Ensure access token has proper permissions

3. **Not receiving webhook events**
   - Verify webhook subscriptions are active
   - Check that your phone number is registered
   - Ensure webhook URL is publicly accessible

## Step 8: Production Checklist

- [ ] All environment variables set in Supabase
- [ ] Message templates created and approved
- [ ] Webhook verified and subscribed to events
- [ ] Test messages sent successfully
- [ ] Error handling implemented
- [ ] Rate limiting configured
- [ ] Opt-out mechanism tested
- [ ] Audit logging enabled

## Security Considerations

1. **Never expose tokens in client code**
2. **Use Supabase Edge Functions for all WhatsApp API calls**
3. **Implement rate limiting to prevent abuse**
4. **Log all message events for compliance**
5. **Respect user opt-out preferences**
6. **Encrypt sensitive message content**

## API Rate Limits

- **Business Initiated**: 250K messages per day
- **User Initiated**: Unlimited (within 24-hour window)
- **Template Messages**: Must be pre-approved
- **Media Messages**: 100MB max file size

## Support Resources

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Meta Business Support](https://business.facebook.com/business/help)