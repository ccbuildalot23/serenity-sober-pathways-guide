# GitHub Secrets Configuration for iOS Deployment

## 🔐 Required GitHub Secrets

Please add these secrets to your GitHub repository:
**Settings → Secrets and variables → Actions → New repository secret**

### Certificate Secrets

#### 1. IOS_CERTIFICATE
- **Description:** Base64 encoded distribution certificate
- **File:** ios-certificates\cert_base64.txt
- **Action:** Copy entire contents of this file

#### 2. IOS_CERTIFICATE_PASSWORD
- **Description:** Password for your .p12/pfx certificate
- **Action:** Enter the password you used when exporting the certificate
- **Value:** [YOU NEED TO PROVIDE THIS]

#### 3. IOS_PROVISION_PROFILE
- **Description:** Base64 encoded provisioning profile
- **File:** ios-certificates\profile_base64.txt
- **Action:** Copy entire contents of this file

### App Store Connect API Secrets

#### 4. APP_STORE_CONNECT_KEY_ID
- **Description:** Your API Key ID
- **Value:** `4YBU7UC32Y`

#### 5. APP_STORE_CONNECT_ISSUER_ID
- **Description:** Your organization's Issuer ID
- **Action:** Get from https://appstoreconnect.apple.com/access/integrations/api
- **Format:** UUID (e.g., 12345678-1234-1234-1234-123456789012)
- **Value:** [YOU NEED TO PROVIDE THIS]

#### 6. APP_STORE_CONNECT_API_KEY
- **Description:** Contents of your .p8 private key file
- **Value:** 
```
-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgf1wCVC6FF2MZTlGD
UXzFZx8XbpjRPMlX4MN9OSUlnHmgCgYIKoZIzj0DAQehRANCAASlrZ2enujSr9vN
qRsL5OMMXUIJBTdDWh5I2Ph1WmPmL5WTJmq7nfwqWrRxis0JhuZizhjbAaBR3R0y
qLBSDQKc
-----END PRIVATE KEY-----
```

### Build Configuration Secrets

#### 7. APPLE_TEAM_ID
- **Description:** Your Apple Developer Team ID
- **Value:** `XDY458RQ59`

#### 8. PROVISIONING_PROFILE_NAME
- **Description:** Name of your provisioning profile
- **Value:** `Serenity App Store Profile`

#### 9. KEYCHAIN_PASSWORD
- **Description:** Temporary keychain password for CI/CD
- **Value:** `SerenityDeploy2025!` (or generate your own)

### Supabase Environment Variables

#### 10. VITE_SUPABASE_URL
- **Description:** Your Supabase project URL
- **Action:** Get from Supabase dashboard
- **Format:** https://[project-ref].supabase.co
- **Value:** [YOU NEED TO PROVIDE THIS]

#### 11. VITE_SUPABASE_ANON_KEY
- **Description:** Your Supabase anonymous key
- **Action:** Get from Supabase dashboard → Settings → API
- **Value:** [YOU NEED TO PROVIDE THIS]

## ⚠️ Information Still Needed From You:

1. **IOS_CERTIFICATE_PASSWORD** - The password for your .pfx certificate
2. **APP_STORE_CONNECT_ISSUER_ID** - From App Store Connect API page
3. **VITE_SUPABASE_URL** - Your Supabase project URL
4. **VITE_SUPABASE_ANON_KEY** - Your Supabase anonymous key

## 📋 Quick Copy Commands

After you provide the missing values, use these PowerShell commands to get the base64 values:

```powershell
# Get certificate base64
Get-Content ios-certificates\cert_base64.txt

# Get provisioning profile base64
Get-Content ios-certificates\profile_base64.txt

# Verify API key
Get-Content ios-certificates\AuthKey_4YBU7UC32Y.p8
```

## 🚀 Next Steps

1. Add all secrets to GitHub
2. Verify all values are correct
3. Run deployment workflow:
   ```bash
   git add .
   git commit -m "feat: iOS deployment with certificates configured"
   git push origin notification-microservice
   ```

## 📊 Verification Checklist

- [ ] All 11 secrets added to GitHub
- [ ] Certificate password is correct
- [ ] Issuer ID matches your App Store Connect account
- [ ] Supabase URLs are production values
- [ ] No trailing spaces in secret values
- [ ] API key includes BEGIN/END markers