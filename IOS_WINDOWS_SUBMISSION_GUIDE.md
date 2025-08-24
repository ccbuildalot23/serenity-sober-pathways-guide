# 📱 iOS App Store Submission from Windows - Complete Guide
## Serenity Sober Pathways - Zero to App Store in 45 Minutes

### 🎯 WHAT YOU'LL ACHIEVE
- ✅ Submit iOS app to App Store WITHOUT a Mac
- ✅ Automated builds via GitHub Actions
- ✅ TestFlight deployment
- ✅ Ready for App Store review
- 💰 Total cost: ~$5-10 (GitHub Actions compute time)

---

## 📋 PREREQUISITES CHECKLIST

Before starting, ensure you have:

- [ ] **Apple Developer Account** ($99/year)
  - Sign up: https://developer.apple.com/programs/
- [ ] **GitHub Account** (free)
  - Your repo must be on GitHub
- [ ] **App Store Connect Access**
  - https://appstoreconnect.apple.com
- [ ] **Windows PowerShell** (already installed)
- [ ] **Git installed** (to push changes)

---

## 🚀 STEP-BY-STEP GUIDE

### PART 1: Apple Developer Setup (15 minutes)

#### Step 1: Create App ID
1. Go to: https://developer.apple.com/account/resources/identifiers/list
2. Click **"+"** button
3. Select **"App IDs"** → Continue
4. Select **"App"** → Continue
5. Fill in:
   - Description: `Serenity Sober Recovery`
   - Bundle ID: `com.serenity.recovery`
   - Capabilities: Check these:
     - ✅ Push Notifications
     - ✅ HealthKit (if using)
6. Click **Register**

#### Step 2: Create Distribution Certificate
1. Go to: https://developer.apple.com/account/resources/certificates/list
2. Click **"+"** button
3. Select **"iOS Distribution (App Store and Ad Hoc)"** → Continue
4. **IMPORTANT for Windows Users:**
   - You need to create a CSR (Certificate Signing Request)
   - Use this online tool: https://www.developernext.com/getcsr/
   - Or use OpenSSL:
     ```powershell
     # If you have OpenSSL installed:
     openssl req -new -newkey rsa:2048 -nodes -keyout serenity.key -out serenity.csr
     ```
5. Upload the CSR file
6. Download the certificate (.cer file)
7. **Convert to .p12 (IMPORTANT):**
   - Use online converter: https://www.sslshopper.com/ssl-converter.html
   - Or if you have OpenSSL:
     ```powershell
     openssl x509 -in ios_distribution.cer -inform DER -out ios_distribution.pem -outform PEM
     openssl pkcs12 -export -out ios_distribution.p12 -inkey serenity.key -in ios_distribution.pem
     ```
   - Set a password when prompted (remember it!)

#### Step 3: Create Provisioning Profile
1. Go to: https://developer.apple.com/account/resources/profiles/list
2. Click **"+"** button
3. Select **"App Store"** → Continue
4. Select your App ID: `com.serenity.recovery` → Continue
5. Select your Distribution Certificate → Continue
6. Name it: `Serenity App Store Profile`
7. Download the `.mobileprovision` file

#### Step 4: Create App Store Connect API Key
1. Go to: https://appstoreconnect.apple.com/access/api
2. Click **"+"** to create new key
3. Name: `GitHub Actions Deploy`
4. Access: **App Manager**
5. Click **Generate**
6. **SAVE THESE (you'll need them):**
   - Issuer ID: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
   - Key ID: `XXXXXXXXXX`
7. Download the `.p8` file (you can only download once!)

---

### PART 2: Prepare Certificates on Windows (10 minutes)

#### Step 1: Organize Your Files
Create a folder `C:\ios-certs` and put these files there:
- `ios_distribution.p12` (your certificate)
- `Serenity_App_Store_Profile.mobileprovision` (provisioning profile)
- `AuthKey_XXXXXXXXXX.p8` (API key)

#### Step 2: Run PowerShell Script
1. Open PowerShell as Administrator
2. Navigate to your project:
   ```powershell
   cd C:\Users\cmcal\OneDrive\Documents\serenity-sober-pathways-guide
   ```
3. Run the preparation script:
   ```powershell
   .\scripts\prepare-ios-certificates.ps1
   ```
4. Follow the prompts:
   - Drag and drop your certificate file
   - Enter certificate password
   - Drag and drop provisioning profile
   - Enter API credentials
   - Enter Team ID

The script will create text files with base64-encoded certificates.

---

### PART 3: Configure GitHub Secrets (10 minutes)

#### Step 1: Go to GitHub Settings
1. Open: https://github.com/YOUR_USERNAME/serenity-sober-pathways-guide
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions**

#### Step 2: Add Each Secret
Click **"New repository secret"** for each:

| Secret Name | Value |
|------------|-------|
| `IOS_CERTIFICATE` | Contents of `ios_certificate_base64.txt` |
| `IOS_CERTIFICATE_PASSWORD` | Your certificate password |
| `IOS_PROVISION_PROFILE` | Contents of `ios_provisioning_profile_base64.txt` |
| `KEYCHAIN_PASSWORD` | Any random password (e.g., `TempKeychain123!`) |
| `APP_STORE_CONNECT_API_KEY` | Contents of your `.p8` file |
| `APP_STORE_CONNECT_ISSUER_ID` | Your Issuer ID |
| `APP_STORE_CONNECT_KEY_ID` | Your Key ID |
| `APPLE_TEAM_ID` | Your 10-character Team ID |
| `PROVISIONING_PROFILE_NAME` | `Serenity App Store Profile` |
| `VITE_SUPABASE_URL` | Your Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon key |

---

### PART 4: Deploy Your App (10 minutes)

#### Step 1: Test Locally First
```powershell
# Make sure build works
npm run build

# Sync iOS platform
npx cap sync ios
```

#### Step 2: Commit and Push
```powershell
# Add all changes
git add .

# Commit with deployment message
git commit -m "Deploy iOS app to App Store via GitHub Actions"

# Push to trigger build
git push origin notification-microservice
```

#### Step 3: Monitor Build
1. Go to: https://github.com/YOUR_USERNAME/serenity-sober-pathways-guide/actions
2. Click on the running workflow
3. Watch the build progress (~10 minutes)
4. ✅ Green checkmark = Success!

---

### PART 5: Submit to App Store (5 minutes)

#### Step 1: Check TestFlight
1. Go to: https://appstoreconnect.apple.com
2. Click **My Apps**
3. Click **Serenity**
4. Click **TestFlight** tab
5. Your build should appear! (may take 5-10 minutes to process)

#### Step 2: Prepare for Submission
1. Click **App Store** tab
2. Click **"+"** next to iOS App
3. Fill in version information:
   - Version: `1.0.0`
   - What's New: `Initial release - Your private path to recovery`

#### Step 3: Add Build
1. In the **Build** section, click **"Select a build before you submit your app"**
2. Choose your build from TestFlight
3. Export Compliance: **No** (standard encryption only)

#### Step 4: Submit for Review
1. Review all information
2. Click **"Submit for Review"**
3. 🎉 **DONE!**

---

## 🔧 TROUBLESHOOTING

### Common Issues and Fixes

#### "Certificate not found"
- Make sure certificate is in .p12 format
- Check password is correct
- Verify Team ID matches certificate

#### "Provisioning profile error"
- Ensure profile includes your certificate
- Check Bundle ID matches exactly: `com.serenity.recovery`
- Profile must be "App Store" type

#### "Build fails in GitHub Actions"
- Check all secrets are set correctly
- Verify no spaces in base64 content
- Ensure .p8 file content includes headers

#### "Upload to TestFlight fails"
- API key must have "App Manager" role
- Check Issuer ID and Key ID are correct
- App must exist in App Store Connect first

---

## 💡 PRO TIPS

### Speed Up Future Builds
- Cache node_modules in GitHub Actions
- Use incremental builds
- Skip tests for hotfix deployments

### Multiple Environments
```yaml
# Add to workflow for staging/production
env:
  ENVIRONMENT: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
```

### Automatic Version Bumping
```yaml
# Auto-increment build number
- name: Update build number
  run: |
    BUILD_NUMBER=${{ github.run_number }}
    /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $BUILD_NUMBER" ios/App/App/Info.plist
```

---

## 📊 COST BREAKDOWN

| Service | Cost | Duration | Total |
|---------|------|----------|-------|
| GitHub Actions | $0.008/min | 10 min | $0.08 |
| Apple Developer | $99/year | - | Required |
| **Total per deployment** | | | **~$0.08** |

First 2000 minutes/month are FREE on GitHub!

---

## 🎯 QUICK COMMAND REFERENCE

```powershell
# Prepare for deployment
npm run build
npx cap sync ios

# Run certificate script
.\scripts\prepare-ios-certificates.ps1

# Deploy
git add .
git commit -m "Deploy to App Store"
git push

# Check status
# Go to: github.com/YOUR_REPO/actions
```

---

## ✅ FINAL CHECKLIST

Before submitting:
- [ ] All GitHub secrets added
- [ ] Build succeeds in GitHub Actions
- [ ] IPA uploaded to TestFlight
- [ ] App information complete in App Store Connect
- [ ] Screenshots uploaded
- [ ] Description and keywords added
- [ ] Privacy policy URL working
- [ ] Support URL working
- [ ] Demo account ready for reviewers

---

## 🆘 NEED HELP?

### Resources
- **GitHub Actions Status**: https://github.com/YOUR_REPO/actions
- **TestFlight**: https://appstoreconnect.apple.com → TestFlight
- **Apple Developer Forums**: https://developer.apple.com/forums/
- **Stack Overflow**: Tag with `ios`, `github-actions`, `capacitor`

### Alternative Options
If GitHub Actions doesn't work:
1. **MacInCloud**: $1/hour - https://www.macincloud.com
2. **AWS Mac EC2**: $0.65/hour - https://aws.amazon.com/ec2/instance-types/mac/
3. **Codemagic**: Free tier available - https://codemagic.io

---

## 🎉 SUCCESS!

Once submitted, Apple typically reviews within 24-72 hours.

**You've successfully submitted an iOS app from Windows!** 🚀

---

*Last updated: [Current Date]*
*For Serenity Sober Pathways v1.0.0*