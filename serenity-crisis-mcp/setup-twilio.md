# Twilio Configuration Guide

## Quick Setup (2 minutes)

### 1. Get Twilio Credentials
1. Go to https://console.twilio.com
2. Sign up for free trial ($15 credit included)
3. Get your credentials from Dashboard:
   - Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   - Auth Token: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   - Phone Number: +1xxxxxxxxxx (get one free)

### 2. Update .env File
Edit `serenity-crisis-mcp/.env`:
```env
# Replace these with your actual credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
TEST_PHONE_NUMBER=+1xxxxxxxxxx  # Your personal phone for testing

# Supabase (already configured)
SUPABASE_URL=https://osfgyoupkmjbxwodsoqh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zZmd5b3Vwa21qYnh3b2Rzb3FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NzU0ODIsImV4cCI6MjA3MDA1MTQ4Mn0.VppoX3FM-8g1-XcbzUFretE78xGjpLd7VFZANFF85Tw
```

### 3. Test SMS Delivery
```bash
cd serenity-crisis-mcp
node test-sms-direct.mjs
```

You should receive a real SMS within 5 seconds!

### 4. Test Full Crisis Flow
```bash
node test-sms.js
```

This will:
- Send crisis alert SMS
- Track supporter response
- Show cascade timing

## Free Trial Limits
- 1 phone number included
- $15 credit (approx 1000 SMS)
- Verified phone numbers only (during trial)

## Production Setup
For production, upgrade to:
- Toll-free number for better delivery
- Short code for highest delivery rates
- WhatsApp Business API integration

## Troubleshooting

### "Invalid credentials"
- Double-check Account SID starts with "AC"
- Ensure Auth Token is complete (32 chars)

### "Phone number not verified"
- During trial, verify recipient phones in Console
- Or upgrade to full account

### "From phone number not found"
- Buy a phone number in Twilio Console
- Use format: +1234567890 (with country code)

## Next Steps
1. Configure Twilio
2. Test SMS delivery
3. Move to clinical MCP server
4. Schedule provider demos

Time to first SMS: <5 minutes!