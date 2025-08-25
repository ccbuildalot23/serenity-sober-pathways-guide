# iOS TestFlight Upload Troubleshooting Guide

## OSStatus Error -10814 Solution

### Problem Description
TestFlight upload fails with:
```
An error (-10814) occurred. The operation couldn't be completed. (OSStatus error -10814.)
```

This error means the system cannot find the iTMSTransporter application binary.

## Root Cause
OSStatus -10814 corresponds to `kLSApplicationNotFoundErr` - the Launch Services framework cannot locate the requested application. In GitHub Actions workflows, this happens because:

1. iTMSTransporter is not installed on GitHub-hosted macOS runners
2. The binary path is incorrect or not configured
3. Missing environment variables for Transporter paths

## Solution Implementation

### 1. Updated Workflow (Recommended)
The updated workflow in `.github/workflows/ios-deploy.yml` implements a multi-tier approach:

1. **Primary Method**: Uses `xcrun altool` (Apple's recommended tool)
2. **Fallback Method**: Installs Transporter via Homebrew and uses iTMSTransporter
3. **Final Fallback**: Retries with altool with enhanced error handling

### 2. Key Changes Made

#### A. Multiple Upload Methods
```yaml
# Method 1: Try altool first (most reliable)
xcrun altool --upload-app \
  -f "ios/App/build/App.ipa" \
  --apiKey "$APP_STORE_CONNECT_API_KEY_ID" \
  --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID" \
  --verbose

# Method 2: Install Transporter and use iTMSTransporter
brew install --cask transporter
export FASTLANE_ITUNES_TRANSPORTER_PATH="/Applications/Transporter.app/Contents/itms/bin"
"$FASTLANE_ITUNES_TRANSPORTER_PATH/iTMSTransporter" -m upload ...
```

#### B. IPA Validation Step
Added pre-upload validation to catch issues early:
```yaml
xcrun altool --validate-app \
  -f "build/App.ipa" \
  --apiKey "$APP_STORE_CONNECT_KEY_ID" \
  --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID" \
  --verbose
```

#### C. Enhanced Error Handling
- File existence checks
- Verbose logging for debugging
- Graceful fallbacks between methods
- Clear error messages

### 3. App Store Connect Requirements Verification

#### Bundle ID Registration
Ensure `com.serenity.recovery` is registered in:
- Apple Developer Portal → Certificates, IDs & Profiles → Identifiers
- App Store Connect → Apps (with matching Bundle ID)

#### API Key Setup
1. Go to App Store Connect → Users and Access → Keys
2. Create API Key with "App Manager" or "Developer" role
3. Download the `.p8` file
4. Note the Key ID and Issuer ID (Team ID)

#### Required GitHub Secrets
```
APP_STORE_CONNECT_API_KEY    # Contents of the .p8 file
APP_STORE_CONNECT_KEY_ID     # Key ID (e.g., 4YBU7UC32Y)
APP_STORE_CONNECT_ISSUER_ID  # Issuer ID / Team ID (e.g., XDY458RQ59)
```

## Verification Steps

### 1. Use the Verification Script
Run the provided verification script locally:
```bash
export APP_STORE_CONNECT_API_KEY="-----BEGIN PRIVATE KEY-----..."
export APP_STORE_CONNECT_KEY_ID="4YBU7UC32Y"
export APP_STORE_CONNECT_ISSUER_ID="XDY458RQ59"

./scripts/verify-app-store-setup.sh
```

### 2. Manual Verification Commands
```bash
# Test API key authentication
xcrun altool --list-apps \
  --apiKey "4YBU7UC32Y" \
  --apiIssuer "XDY458RQ59"

# Validate IPA locally
xcrun altool --validate-app \
  -f "path/to/App.ipa" \
  --apiKey "4YBU7UC32Y" \
  --apiIssuer "XDY458RQ59"

# Test upload locally
xcrun altool --upload-app \
  -f "path/to/App.ipa" \
  --apiKey "4YBU7UC32Y" \
  --apiIssuer "XDY458RQ59"
```

## Alternative Solutions

### Option 1: Use Fastlane
Create a `Fastfile`:
```ruby
platform :ios do
  desc "Upload to TestFlight"
  lane :deploy do
    api_key = app_store_connect_api_key(
      key_id: ENV["APP_STORE_CONNECT_KEY_ID"],
      issuer_id: ENV["APP_STORE_CONNECT_ISSUER_ID"],
      key_content: ENV["APP_STORE_CONNECT_API_KEY"]
    )
    
    upload_to_testflight(
      api_key: api_key,
      ipa: "ios/App/build/App.ipa",
      skip_waiting_for_build_processing: true
    )
  end
end
```

### Option 2: Direct Transporter Installation
Add to workflow before upload:
```yaml
- name: Install Transporter
  run: |
    brew install --cask transporter
    export FASTLANE_ITUNES_TRANSPORTER_PATH="/Applications/Transporter.app/Contents/itms/bin"
```

## Common Issues and Fixes

### Issue: "Could not find API key"
**Solution**: Ensure the API key file is in the correct location:
```bash
mkdir -p ~/.appstoreconnect/private_keys
echo "$APP_STORE_CONNECT_API_KEY" > ~/.appstoreconnect/private_keys/AuthKey_$APP_STORE_CONNECT_KEY_ID.p8
```

### Issue: "Invalid JWT"
**Solutions**:
1. Verify API Key ID matches App Store Connect
2. Check Issuer ID is correct (should be Team ID)
3. Ensure API key has proper permissions (App Manager/Developer)
4. Check if API key is expired

### Issue: "App record not found"
**Solutions**:
1. Create app record in App Store Connect
2. Ensure Bundle ID matches exactly
3. Verify app is in "Prepare for Submission" state or later

### Issue: "Invalid binary"
**Solutions**:
1. Ensure proper code signing with Apple Distribution certificate
2. Verify provisioning profile matches Bundle ID
3. Check `ExportOptions.plist` configuration:
   ```xml
   <key>method</key>
   <string>app-store</string>
   <key>signingCertificate</key>
   <string>Apple Distribution</string>
   ```

## Success Indicators

✅ Validation passes without errors  
✅ Upload completes successfully  
✅ Build appears in TestFlight within 5-10 minutes  
✅ No email notifications about processing issues  

## Next Steps After Upload

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to your app → TestFlight
3. Wait for processing to complete (5-30 minutes)
4. Add test notes and submit for review if needed
5. Invite internal/external testers

## Support Resources

- [Apple Developer Documentation](https://developer.apple.com/documentation/xcode/validating_and_uploading_your_app_to_app_store_connect)
- [App Store Connect API](https://developer.apple.com/documentation/appstoreconnectapi)
- [Xcode Command Line Tools](https://developer.apple.com/xcode/resources/)

## File References

- Workflow: `.github/workflows/ios-deploy.yml`
- Verification Script: `scripts/verify-app-store-setup.sh`
- Capacitor Config: `capacitor.config.ts`
- Bundle ID: `com.serenity.recovery`
- Team ID: `XDY458RQ59`
- API Key ID: `4YBU7UC32Y`