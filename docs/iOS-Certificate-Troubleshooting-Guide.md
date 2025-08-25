# iOS Certificate Troubleshooting Guide

## Step-by-Step Certificate Fix Process

This guide provides detailed instructions for resolving the iOS certificate import error: `SecKeychainItemImport: Unable to decode the provided data`.

## Phase 1: Certificate Validation and Re-creation

### Step 1: Verify Current Certificate Status

**In Apple Developer Portal:**
1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/certificates/list)
2. Sign in with your Apple Developer account
3. Navigate to "Certificates, Identifiers & Profiles"
4. Click "Certificates" in the left sidebar
5. Look for your iOS Distribution certificate

**Check Certificate Details:**
- Type should be "Apple Distribution"
- Status should be "Active" (not expired)
- Team should show "XDY458RQ59"

**If Certificate is Missing or Expired:**
- Create a new iOS Distribution certificate
- Download the certificate (.cer file)
- Install it in Keychain Access

### Step 2: Verify Provisioning Profile

**In Apple Developer Portal:**
1. Navigate to "Profiles" in the left sidebar
2. Look for "Serenity App Store Profile" (or create new one)
3. Verify profile details:
   - Type: "App Store"
   - App ID: "com.serenity.recovery"
   - Certificates: Contains your distribution certificate
   - Status: "Active"

**If Profile is Missing or Invalid:**
1. Click "+" to create new profile
2. Select "App Store" distribution type
3. Choose "com.serenity.recovery" App ID
4. Select your distribution certificate
5. Name it "Serenity App Store Profile"
6. Download the .mobileprovision file

### Step 3: Export Certificate Correctly

**Using Keychain Access (macOS):**
1. Open Keychain Access application
2. In the "login" keychain, find your distribution certificate
3. Expand the certificate to see the private key
4. Select BOTH the certificate and private key
5. Right-click and choose "Export 2 items..."
6. Choose format: "Personal Information Exchange (.p12)"
7. Save as "ios_distribution.p12"
8. Set a secure password (remember this for GitHub secrets)

**Using Xcode (Alternative):**
1. Open Xcode > Preferences > Accounts
2. Select your Apple ID and team
3. Click "Download Manual Profiles"
4. Go to "Manage Certificates"
5. Right-click your distribution certificate
6. Export as .p12 with password

## Phase 2: Fix ExportOptions.plist

### Step 4: Recreate ExportOptions.plist

The current file appears corrupted. Create a new one:

**File: ios/App/ExportOptions.plist**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>XDY458RQ59</string>
    <key>uploadBitcode</key>
    <false/>
    <key>compileBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>signingStyle</key>
    <string>manual</string>
    <key>signingCertificate</key>
    <string>Apple Distribution</string>
    <key>provisioningProfiles</key>
    <dict>
        <key>com.serenity.recovery</key>
        <string>Serenity App Store Profile</string>
    </dict>
    <key>destination</key>
    <string>upload</string>
</dict>
</plist>
```

## Phase 3: Encode Certificates for GitHub Secrets

### Step 5: Properly Encode Certificate Files

**For iOS Certificate (.p12 file):**
```bash
# On macOS/Linux
base64 -i ios_distribution.p12 -o certificate_base64.txt

# On Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("ios_distribution.p12")) | Out-File -FilePath certificate_base64.txt -Encoding ASCII
```

**For Provisioning Profile (.mobileprovision file):**
```bash
# On macOS/Linux
base64 -i SerenityAppStoreProfile.mobileprovision -o profile_base64.txt

# On Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("SerenityAppStoreProfile.mobileprovision")) | Out-File -FilePath profile_base64.txt -Encoding ASCII
```

### Step 6: Update GitHub Secrets

**In GitHub Repository:**
1. Go to Settings > Secrets and variables > Actions
2. Update or create these secrets:

**Certificate Secrets:**
- `IOS_CERTIFICATE`: Paste content from certificate_base64.txt (single line, no spaces)
- `IOS_CERTIFICATE_PASSWORD`: The password you set when exporting .p12
- `IOS_PROVISION_PROFILE`: Paste content from profile_base64.txt (single line, no spaces)
- `KEYCHAIN_PASSWORD`: Create a secure random password for CI keychain

**Build Configuration:**
- `APPLE_TEAM_ID`: XDY458RQ59
- `PROVISIONING_PROFILE_NAME`: Serenity App Store Profile

## Phase 4: App Store Connect API Configuration

### Step 7: Create App Store Connect API Key

**In App Store Connect:**
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to "Users and Access" > "Keys"
3. Click "+" to generate new API key
4. Name: "Serenity iOS Deployment"
5. Access: "App Manager" or "Admin"
6. Download the .p8 file immediately (only available once)

**Configure GitHub Secrets:**
- `APP_STORE_CONNECT_KEY_ID`: The 10-character key ID
- `APP_STORE_CONNECT_ISSUER_ID`: Your issuer ID (UUID format)
- `APP_STORE_CONNECT_API_KEY`: Content of the .p8 file

## Phase 5: Test and Validate

### Step 8: Validate Setup Locally (if possible)

**Test Certificate Import:**
```bash
# Create test keychain
security create-keychain -p "test123" test.keychain-db

# Try importing certificate
security import ios_distribution.p12 -P "your_password" -A -t cert -f pkcs12 -k test.keychain-db

# Check if import succeeded
security find-identity -p codesigning test.keychain-db

# Clean up
security delete-keychain test.keychain-db
```

### Step 9: Run GitHub Action

**Manual Trigger:**
1. Go to GitHub Actions tab
2. Select "iOS App Store Deployment" workflow
3. Click "Run workflow"
4. Choose branch and set "Deploy to TestFlight" to true
5. Monitor the build logs

**Check for Success:**
- Certificate import step should complete without errors
- Build step should succeed
- Upload to TestFlight should complete

## Common Issues and Solutions

### Issue: "Certificate has expired"
**Solution:** Create new distribution certificate in Apple Developer Portal

### Issue: "No matching provisioning profile"
**Solution:** Recreate provisioning profile with correct bundle ID and certificate

### Issue: "Invalid API key"
**Solution:** Regenerate App Store Connect API key with proper permissions

### Issue: "Code signing failed"
**Solution:** Ensure certificate contains private key and matches team ID

### Issue: "Base64 decode error"
**Solution:** Re-encode certificate ensuring no line breaks or extra characters

## Emergency Workarounds

If certificate issues persist, consider these temporary solutions:

### Option 1: Local Build and Manual Upload
1. Build locally using Xcode
2. Archive and export IPA manually
3. Upload to TestFlight using Xcode or Application Loader

### Option 2: Alternative CI/CD Services
1. Use Xcode Cloud (Apple's native CI/CD)
2. Use Bitrise with iOS certificate management
3. Use Codemagic with automatic certificate handling

### Option 3: Fastlane Integration
1. Integrate Fastlane for certificate management
2. Use `match` for certificate synchronization
3. Automate certificate renewal process

## Next Steps After Resolution

1. **Test Deployment**: Verify successful TestFlight upload
2. **Monitor Expiration**: Set calendar reminders for certificate renewal
3. **Document Process**: Update team knowledge base
4. **Backup Certificates**: Store certificates in secure team vault
5. **Automate Renewal**: Consider automated certificate management tools

## HIPAA Compliance Notes

For healthcare applications like Serenity:
- All certificate operations must be logged and auditable
- Access to certificates should be restricted to authorized personnel
- Consider using dedicated Apple Developer account for healthcare apps
- Implement change management process for certificate updates
- Regular security reviews of certificate management processes

## Support Resources

- **Apple Developer Support**: https://developer.apple.com/support/
- **GitHub Actions Documentation**: https://docs.github.com/en/actions
- **Xcode Cloud**: https://developer.apple.com/xcode-cloud/
- **Fastlane iOS**: https://docs.fastlane.tools/getting-started/ios/