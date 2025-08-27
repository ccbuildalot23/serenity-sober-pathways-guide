# Complete iOS App Store Deployment Guide

## 🚀 Quick Start Deployment

### Prerequisites Checklist
- [ ] Apple Developer Account ($99/year)
- [ ] App Store Connect access with App Manager role
- [ ] Team ID: `XDY458RQ59`
- [ ] Bundle ID: `com.serenity.recovery`
- [ ] Valid Apple Distribution Certificate
- [ ] App Store Provisioning Profile

### 🎯 One-Command Deployment

```bash
# Deploy to TestFlight
cd ios && fastlane beta

# Deploy to App Store
cd ios && fastlane release
```

## 📋 Complete Deployment Steps

### Step 1: Initial Setup (One-time)

```bash
# 1. Clone the repository
git clone https://github.com/ccbuildalot23/serenity-sober-pathways-guide.git
cd serenity-sober-pathways-guide

# 2. Install dependencies
npm ci --legacy-peer-deps

# 3. Setup iOS environment
cd ios
bundle install
fastlane setup
```

### Step 2: Create App in App Store Connect

#### Option A: Automated (Recommended)
```bash
# Run the automated setup script
node scripts/app-store-connect-api.js
```

#### Option B: Manual
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click **"+"** → **"New App"**
3. Enter:
   - Platform: **iOS**
   - Name: **Serenity Sober Pathways**
   - Primary Language: **English (U.S.)**
   - Bundle ID: **com.serenity.recovery**
   - SKU: **SERENITY-RECOVERY-001**

### Step 3: Configure Environment

Create `.env` file in `ios/` directory:

```env
# App Configuration
APP_IDENTIFIER=com.serenity.recovery
TEAM_ID=XDY458RQ59
ITC_TEAM_ID=XDY458RQ59

# Apple Credentials
APPLE_ID=your-apple-id@example.com
FASTLANE_PASSWORD=your-app-specific-password

# App Store Connect API
APP_STORE_CONNECT_API_KEY_ID=4YBU7UC32Y
APP_STORE_CONNECT_ISSUER_ID=your-issuer-id
APP_STORE_CONNECT_API_KEY=path/to/AuthKey_4YBU7UC32Y.p8

# Certificate Management
MATCH_PASSWORD=your-match-password
MATCH_GIT_URL=https://github.com/your-org/certificates
```

### Step 4: Build and Deploy

#### TestFlight Deployment
```bash
# Full deployment pipeline
./scripts/deploy-ios.sh beta

# Or use Fastlane directly
cd ios
fastlane beta
```

#### App Store Release
```bash
# Full release pipeline with screenshots
./scripts/deploy-ios.sh release

# Or use Fastlane directly
cd ios
fastlane release
```

## 🏥 Healthcare App Compliance

### Required Configurations

1. **Privacy Policy URL**
   - Must be accessible without app installation
   - Must detail HIPAA compliance measures
   - Must explain PHI data handling

2. **Age Rating (17+)**
   - Medical/Treatment Information: FREQUENT_OR_INTENSE
   - Alcohol, Tobacco, Drug References: FREQUENT_OR_INTENSE

3. **App Categories**
   - Primary: Medical
   - Secondary: Health & Fitness

4. **Required Metadata**
   ```
   - Crisis support information
   - Medical disclaimer
   - Professional use limitations
   - Data security measures
   ```

### HIPAA Compliance Checklist

- [ ] End-to-end encryption implemented
- [ ] Audit logging for all PHI access
- [ ] Business Associate Agreements (BAAs) with vendors
- [ ] Privacy policy includes HIPAA compliance
- [ ] Data breach notification procedures
- [ ] Regular security assessments scheduled

## 🔧 Fastlane Commands Reference

### Setup & Configuration
```bash
fastlane setup          # Initial setup
fastlane certificates   # Sync certificates
fastlane match_nuke     # Reset certificates (use carefully!)
```

### Building
```bash
fastlane build_debug    # Debug build
fastlane build_release  # Release build
fastlane gym           # Build IPA file
```

### Testing
```bash
fastlane scan          # Run tests
fastlane hipaa_check   # HIPAA compliance validation
```

### Deployment
```bash
fastlane beta          # Deploy to TestFlight
fastlane release       # Submit to App Store
fastlane metadata      # Upload metadata only
fastlane screenshots   # Generate screenshots
```

### Healthcare-Specific
```bash
fastlane hipaa_check   # Validate HIPAA compliance
fastlane crisis_docs   # Generate crisis support documentation
```

## 📱 GitHub Actions Deployment

### Automatic Deployment on Push
```yaml
# Triggers on push to main branch
git push origin main

# Manual trigger with workflow dispatch
gh workflow run ios-deploy-fastlane.yml --field deployment_type=beta
```

### Workflow Options
- `beta` - Deploy to TestFlight
- `release` - Submit to App Store
- `metadata_only` - Update metadata without new build

## 🚨 Troubleshooting

### Common Issues and Solutions

#### 1. "No suitable application records were found"
**Solution**: App doesn't exist in App Store Connect
```bash
node scripts/app-store-connect-api.js
```

#### 2. Certificate Issues
**Solution**: Reset and regenerate certificates
```bash
cd ios
fastlane match_nuke
fastlane certificates
```

#### 3. API Key Authentication Failed
**Solution**: Verify API key configuration
```bash
# Check key exists
ls -la C:\ios-certs\AuthKey_4YBU7UC32Y.p8

# Update GitHub secret
gh secret set APP_STORE_CONNECT_API_KEY < AuthKey_4YBU7UC32Y.p8
```

#### 4. Build Failures
**Solution**: Clean and rebuild
```bash
cd ios/App
rm -rf build/ DerivedData/
xcodebuild clean
cd ../..
npm run build
npx cap sync ios
```

## 📊 Monitoring & Analytics

### TestFlight Monitoring
```bash
# View TestFlight status
cd ios
fastlane pilot list

# Check build processing
fastlane pilot builds
```

### App Store Connect Analytics
- Crash Reports: App Analytics → Crashes
- User Metrics: App Analytics → Metrics
- Reviews: Activity → Ratings and Reviews

## 🎯 Deployment Checklist

### Pre-Deployment
- [ ] HIPAA compliance validated
- [ ] Crisis support features tested
- [ ] Provider dashboard functional
- [ ] PHI encryption verified
- [ ] Audit logging active
- [ ] Privacy policy updated
- [ ] Terms of service reviewed

### Deployment
- [ ] App created in App Store Connect
- [ ] Certificates and profiles configured
- [ ] Build number incremented
- [ ] Version number updated if needed
- [ ] Screenshots generated (6.7", 6.5", iPad)
- [ ] App description updated
- [ ] Keywords optimized

### Post-Deployment
- [ ] TestFlight build processing complete
- [ ] Internal testers added
- [ ] External beta review submitted
- [ ] Crash reporting monitored
- [ ] User feedback reviewed
- [ ] App Store review submitted

## 📞 Support & Resources

### Apple Resources
- [App Store Connect](https://appstoreconnect.apple.com)
- [Apple Developer Portal](https://developer.apple.com)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Healthcare App Guidelines](https://developer.apple.com/app-store/review/guidelines/#health-and-health-research)

### Project Resources
- GitHub Repository: [serenity-sober-pathways-guide](https://github.com/ccbuildalot23/serenity-sober-pathways-guide)
- Fastlane Documentation: `ios/fastlane/README.md`
- API Documentation: `scripts/app-store-connect-api.js`

### Healthcare Compliance
- HIPAA Compliance: `docs/HIPAA-Compliance.md`
- Privacy Policy: `docs/Privacy-Policy.md`
- Crisis Support: `docs/Crisis-Support-Protocol.md`

## 🎉 Success Indicators

When deployment is successful, you should see:

1. **TestFlight**:
   - Build appears in TestFlight within 10-30 minutes
   - Email notification sent to team
   - Build status: "Ready to Test"

2. **App Store**:
   - App status: "Waiting for Review" or "In Review"
   - Estimated review time: 24-48 hours
   - Email notifications for status changes

3. **Metrics**:
   - Crash-free rate > 99%
   - User engagement metrics visible
   - Download statistics available

---

**Last Updated**: November 2024
**Version**: 1.0.0
**Maintained by**: Serenity Development Team