# 🚀 Serenity App Store Deployment Checklist

## Current Status: Awaiting Certificate Files

### ✅ Completed Tasks
- [x] Fixed corrupted ExportOptions.plist file
- [x] Created certificate generation scripts
- [x] Verified OpenSSL installation
- [x] Created ios-certificates directory

### 🔄 In Progress: Certificate Setup
**YOU NEED TO DO THESE STEPS NOW:**

#### Option A: If you have existing certificates
1. [ ] Find your existing Apple Distribution certificate (.cer or .p12)
2. [ ] Find your provisioning profile (.mobileprovision)
3. [ ] Find or create App Store Connect API credentials

#### Option B: Generate new certificates
1. [ ] Run: `.\generate-ios-certificate.ps1`
2. [ ] Upload CSR to https://developer.apple.com/account/resources/certificates/add
3. [ ] Download the .cer file
4. [ ] Run: `.\convert-certificate.ps1`
5. [ ] Download provisioning profile from Apple Developer Portal
6. [ ] Create App Store Connect API Key

### 📋 Required Files Checklist
Place these files in the `ios-certificates` folder:

- [ ] `ios_distribution.p12` - Apple Distribution Certificate with private key
- [ ] `SerenityAppStore.mobileprovision` - Provisioning Profile
- [ ] `AuthKey_[KEYID].p8` - App Store Connect API Key

### 🔑 Required Information
- [ ] P12 Certificate Password: _________________
- [ ] App Store Connect Key ID: _________________
- [ ] App Store Connect Issuer ID: _________________

### 📝 GitHub Secrets to Configure
Once you have the files, we'll set up these secrets:
- [ ] IOS_CERTIFICATE (base64 encoded .p12)
- [ ] IOS_CERTIFICATE_PASSWORD
- [ ] IOS_PROVISION_PROFILE (base64 encoded)
- [ ] APP_STORE_CONNECT_KEY_ID
- [ ] APP_STORE_CONNECT_ISSUER_ID
- [ ] APP_STORE_CONNECT_API_KEY (contents of .p8 file)
- [ ] APPLE_TEAM_ID (already set: XDY458RQ59)
- [ ] PROVISIONING_PROFILE_NAME (already set: Serenity App Store Profile)

### 🚀 Deployment Steps (After Certificates)
1. [ ] Encode certificates using certificate-encoder.ps1
2. [ ] Configure GitHub Secrets
3. [ ] Verify Supabase backend health
4. [ ] Run security compliance scan
5. [ ] Trigger GitHub Actions workflow
6. [ ] Monitor TestFlight upload
7. [ ] Submit for App Store review

## Quick Commands

```powershell
# Step 1: Generate certificate request
.\generate-ios-certificate.ps1

# Step 2: After downloading .cer from Apple
.\convert-certificate.ps1

# Step 3: Encode for GitHub (after getting all files)
.\certificate-encoder.ps1 -Interactive

# Step 4: Trigger deployment (after GitHub secrets configured)
git push origin notification-microservice
```

## Support Links
- [Apple Developer Portal](https://developer.apple.com/account)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Certificates Page](https://developer.apple.com/account/resources/certificates/list)
- [Profiles Page](https://developer.apple.com/account/resources/profiles/list)
- [API Keys](https://appstoreconnect.apple.com/access/integrations/api)

## Time Estimate
- Certificate generation: 15 minutes
- File preparation: 10 minutes  
- GitHub configuration: 10 minutes
- Deployment: 30 minutes
**Total: ~1 hour**

---
**NEXT ACTION:** Please run `.\generate-ios-certificate.ps1` or provide existing certificate files