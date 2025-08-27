# Fastlane Match Certificate Setup Guide

## Overview

This guide helps you set up Fastlane Match for automated iOS certificate management. Match stores certificates and provisioning profiles in a private Git repository, encrypted and shared across your team.

## 🔐 Required GitHub Secrets

Add these secrets to your GitHub repository at:
**Settings → Secrets and variables → Actions → New repository secret**

### Match Authentication Secrets

#### 1. MATCH_PASSWORD
- **Description:** Password used to encrypt/decrypt certificates in the Match repository
- **Value:** Create a strong password (e.g., `SerenityMatch2025!SecureKey`)
- **Important:** This password encrypts all certificates. Store it securely!

#### 2. MATCH_GIT_BASIC_AUTHORIZATION  
- **Description:** Base64 encoded Git credentials for accessing the certificates repository
- **Format:** `base64(username:personal_access_token)`
- **Generation:**
  ```bash
  # Replace with your GitHub username and personal access token
  echo -n "ccbuildalot23:ghp_your_personal_access_token_here" | base64
  ```
- **Repository:** https://github.com/ccbuildalot23/serenity-ios-certificates

#### 3. MATCH_KEYCHAIN_PASSWORD (Optional)
- **Description:** Password for temporary keychain during CI/CD
- **Value:** `MatchKeychain2025!` (or generate your own)
- **Default:** Will use auto-generated password if not set

### Apple Developer Account Secrets

#### 4. APPLE_ID
- **Description:** Your Apple Developer account email
- **Value:** The email address associated with your Apple Developer account
- **Example:** `developer@yourcompany.com`

#### 5. APPLE_APP_SPECIFIC_PASSWORD
- **Description:** App-specific password for your Apple ID
- **Generation Steps:**
  1. Go to https://appleid.apple.com
  2. Sign in with your Apple ID
  3. Go to "Security" section
  4. Generate a new app-specific password
  5. Label it "Fastlane Match CI/CD"
- **Format:** `xxxx-xxxx-xxxx-xxxx` (16 characters with dashes)

#### 6. APPLE_TEAM_ID (Optional)
- **Description:** Your Apple Developer Team ID
- **Value:** `XDY458RQ59`
- **Location:** Apple Developer Console → Membership tab

### App Store Connect API Secrets (Optional but Recommended)

#### 7. APP_STORE_CONNECT_API_KEY
- **Description:** Contents of your .p8 private key file
- **Generation:**
  1. Go to https://appstoreconnect.apple.com/access/integrations/api
  2. Create new API key with Developer role
  3. Download the .p8 file
  4. Copy entire contents including BEGIN/END lines

#### 8. APP_STORE_CONNECT_KEY_ID
- **Description:** API Key ID from App Store Connect
- **Value:** `4YBU7UC32Y` (or your generated key ID)

#### 9. APP_STORE_CONNECT_ISSUER_ID
- **Description:** Your organization's Issuer ID
- **Location:** https://appstoreconnect.apple.com/access/integrations/api
- **Format:** UUID (e.g., `acb9e47c-6935-4933-ae2c-6170b5d90234`)

## 📋 Certificate Repository Setup

The Match certificates repository is already configured at:
https://github.com/ccbuildalot23/serenity-ios-certificates

### Repository Structure
```
serenity-ios-certificates/
├── README.md
├── certs/
│   ├── development/
│   ├── appstore/
│   └── adhoc/
└── profiles/
    ├── development/
    ├── appstore/
    └── adhoc/
```

## 🚀 How to Use the Certificate Generation Workflow

### Step 1: Trigger the Workflow
1. Go to your GitHub repository
2. Click "Actions" tab
3. Select "Generate Match Certificates" workflow
4. Click "Run workflow"
5. Choose options:
   - **Certificate Type:** `appstore` (for production) or `development` (for testing)
   - **Force Renewal:** `false` (unless certificates are expired/invalid)
   - **App Identifier:** `com.serenity.recovery` (default)

### Step 2: Monitor the Workflow
- Watch the workflow logs for progress
- Check for any authentication errors
- Verify certificates are stored in the Match repository

### Step 3: Verify Success
- Certificates will be encrypted and stored in the Git repository
- Future CI/CD workflows can automatically use these certificates
- No manual certificate management needed

## 🔍 Troubleshooting

### Common Issues

#### Authentication Errors
- **Issue:** `Invalid credentials for git repository`
- **Solution:** Verify `MATCH_GIT_BASIC_AUTHORIZATION` is correct base64 encoding
- **Test:** Decode your value and verify username:token format

#### Apple ID Issues
- **Issue:** `Two-factor authentication required`
- **Solution:** Use App-specific password instead of Apple ID password
- **Note:** Regular passwords don't work with Fastlane

#### Certificate Conflicts
- **Issue:** `Certificate already exists`
- **Solution:** Use `force_renewal: true` if certificates are corrupted
- **Warning:** Only force renewal if absolutely necessary

#### Missing Secrets
- **Issue:** `Environment variable not set`
- **Solution:** Ensure all required secrets are added to GitHub
- **Check:** Repository Settings → Secrets and variables → Actions

### Debug Commands

Test your secrets locally (if needed):
```bash
# Test git access
echo "your_base64_auth_string" | base64 -d

# Test Apple credentials (don't run in CI)
bundle exec fastlane match development --readonly

# Verify keychain
security list-keychains
```

## 📚 Additional Resources

- [Fastlane Match Documentation](https://docs.fastlane.tools/actions/match/)
- [Apple Developer Account Setup](https://developer.apple.com/account/)
- [App Store Connect API Keys](https://appstoreconnect.apple.com/access/integrations/api)
- [GitHub Secrets Documentation](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

## ✅ Pre-deployment Checklist

Before running the certificate generation workflow:

- [ ] All required GitHub secrets are configured
- [ ] Match repository is accessible (private repository exists)
- [ ] Apple Developer account is active and has appropriate permissions
- [ ] App Store Connect API key is generated (if using API authentication)
- [ ] Team has access to the MATCH_PASSWORD (store it securely!)

## 🔒 Security Best Practices

1. **Never commit certificates or private keys to your main repository**
2. **Use strong passwords for MATCH_PASSWORD**
3. **Rotate App-specific passwords regularly**
4. **Limit access to the certificates repository**
5. **Use API authentication when possible**
6. **Monitor certificate expiration dates**

## 🚨 Emergency Certificate Recovery

If you lose access to certificates:

1. **If you have MATCH_PASSWORD:** Certificates can be recovered from Git repository
2. **If you lose MATCH_PASSWORD:** You'll need to revoke and regenerate all certificates
3. **Backup strategy:** Consider exporting certificates manually as backup

---

Need help? Check the workflow logs or contact your development team!