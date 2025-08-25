# Fastlane Configuration for Serenity Sober Pathways iOS

This directory contains the complete Fastlane automation setup for the Serenity Sober Pathways iOS app, a HIPAA-compliant healthcare application for mental health and substance abuse recovery.

## 🏥 Healthcare App Configuration

This setup is specifically designed for healthcare applications with:
- HIPAA compliance requirements
- Medical app store category
- Enhanced security configurations
- Crisis support features
- Provider dashboard capabilities

## 📁 Directory Structure

```
ios/fastlane/
├── Fastfile              # Main automation lanes
├── Appfile               # App configuration
├── Deliverfile           # App Store submission config
├── Matchfile             # Certificate management
├── Snapfile              # Screenshot generation
├── README.md             # This documentation
├── metadata/
│   └── en-US/
│       ├── name.txt      # App name
│       ├── description.txt # App Store description
│       ├── keywords.txt   # Search keywords
│       ├── privacy_url.txt # Privacy policy URL
│       ├── support_url.txt # Support URL
│       └── ...           # Other metadata files
└── screenshots/
    └── en-US/            # Screenshots directory
```

## 🚀 Available Lanes

### Setup and Configuration

```bash
# Initial setup - creates app on App Store Connect and syncs certificates
fastlane setup
```

### Certificate Management

```bash
# Sync development certificates
fastlane certificates

# Development certificates only
bundle exec fastlane match development

# App Store certificates only
bundle exec fastlane match appstore
```

### Building

```bash
# Build for development
fastlane build_debug

# Build for App Store release
fastlane build_release
```

### Testing and Screenshots

```bash
# Run unit tests
fastlane test

# Generate screenshots for all devices
fastlane screenshots

# HIPAA compliance check
fastlane hipaa_check
```

### Deployment

```bash
# Deploy to TestFlight
fastlane beta

# Upload metadata only (no binary)
fastlane metadata

# Complete deployment pipeline
fastlane deploy

# Submit to App Store for review
fastlane release
```

### Maintenance

```bash
# Clean build artifacts
fastlane clean
```

## 🔧 Prerequisites

### 1. Install Dependencies

```bash
# Install Fastlane
gem install fastlane

# Or using Bundler (recommended)
bundle install
```

### 2. Environment Variables

Create a `.env` file in the fastlane directory:

```bash
# Apple ID and Team Configuration
APPLE_ID="your-apple-id@example.com"
TEAM_ID="XDY458RQ59"
ITC_TEAM_ID="XDY458RQ59"

# Match (Certificate Management)
MATCH_PASSWORD="your-secure-match-password"
MATCH_KEYCHAIN_PASSWORD="your-keychain-password"
MATCH_GIT_BASIC_AUTHORIZATION="base64-encoded-git-credentials"

# App Store Connect API (Optional but recommended)
APP_STORE_CONNECT_API_KEY_ID="your-api-key-id"
APP_STORE_CONNECT_ISSUER_ID="your-issuer-id"
APP_STORE_CONNECT_API_KEY_CONTENT="your-private-key-content"

# Slack Notifications (Optional)
SLACK_URL="your-slack-webhook-url"

# CI/CD Configuration
CI="true"  # Set in CI environments
```

### 3. Certificate Repository Setup

```bash
# Create a private repository for storing certificates
# For example: https://github.com/serenity-recovery/ios-certificates

# Initialize match
bundle exec fastlane match init
```

### 4. App Store Connect Setup

Ensure your app is configured in App Store Connect with:
- Bundle ID: `com.serenity.recovery`
- Team ID: `XDY458RQ59`
- Medical category selection
- Age rating appropriate for healthcare content

## 📱 Healthcare-Specific Configurations

### App Rating Configuration

The app is configured with appropriate content ratings for healthcare applications:

```json
{
  "MEDICAL_TREATMENT_INFO": 2,
  "ALCOHOL_TOBACCO_DRUGS": 2,
  "CARTOON_FANTASY_VIOLENCE": 0,
  "REALISTIC_VIOLENCE": 0,
  // ... other ratings set to 0
}
```

### Privacy and Compliance

- **Primary Category**: Medical
- **Secondary Category**: Health & Fitness
- **Privacy Policy**: Required and configured
- **Data Usage**: Properly declared for HIPAA compliance
- **Export Compliance**: Configured for healthcare apps

### Review Information

The configuration includes specific notes for App Store reviewers about:
- Crisis support features
- HIPAA compliance measures
- Security implementations
- Medical disclaimers
- Demo account access

## 🔐 Security Features

### Certificate Management

- Automated certificate provisioning with `match`
- Secure storage in private Git repository
- Encrypted certificate storage
- Team-wide certificate sharing

### App Store Submission Security

- Export compliance declarations
- Privacy impact assessments
- Data usage declarations
- Security feature documentation

## 🚨 Crisis Support Features

This app includes critical crisis support features:

- **One-tap emergency alerts**
- **24/7 crisis intervention resources**  
- **Multi-tier supporter notifications**
- **Voice-activated crisis assistance**
- **Offline crisis support tools**

Special considerations for App Store review:
- Crisis features are clearly documented
- Medical disclaimers are prominent
- Professional medical care recommendations included

## 📊 Analytics and Monitoring

### Performance Tracking

```bash
# Check deployment status
fastlane deployment:check

# Validate production deployment
fastlane verify-production

# Run Lighthouse performance checks
fastlane lighthouse:validate
```

### Compliance Monitoring

```bash
# Run HIPAA compliance checks
fastlane hipaa_check

# Security audit
fastlane security_audit
```

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
name: iOS Deployment

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: macos-latest
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Ruby
      uses: ruby/setup-ruby@v1
      with:
        ruby-version: 3.1
        bundler-cache: true
    
    - name: Setup Fastlane
      run: bundle install
    
    - name: Deploy to TestFlight
      run: bundle exec fastlane beta
      env:
        APPLE_ID: ${{ secrets.APPLE_ID }}
        MATCH_PASSWORD: ${{ secrets.MATCH_PASSWORD }}
        APP_STORE_CONNECT_API_KEY_ID: ${{ secrets.APP_STORE_CONNECT_API_KEY_ID }}
        APP_STORE_CONNECT_ISSUER_ID: ${{ secrets.APP_STORE_CONNECT_ISSUER_ID }}
        APP_STORE_CONNECT_API_KEY_CONTENT: ${{ secrets.APP_STORE_CONNECT_API_KEY_CONTENT }}
```

### Required GitHub Secrets

- `APPLE_ID`: Apple Developer account email
- `MATCH_PASSWORD`: Password for match certificate encryption
- `APP_STORE_CONNECT_API_KEY_ID`: App Store Connect API Key ID
- `APP_STORE_CONNECT_ISSUER_ID`: App Store Connect Issuer ID
- `APP_STORE_CONNECT_API_KEY_CONTENT`: Private key content

## 🩺 Healthcare Compliance Checklist

- [ ] HIPAA compliance documentation complete
- [ ] Privacy policy updated and accessible
- [ ] Medical disclaimers prominently displayed
- [ ] Crisis support features clearly documented
- [ ] Age rating appropriate for healthcare content
- [ ] Export compliance configured
- [ ] Security features documented
- [ ] Professional medical care recommendations included

## 🛠️ Troubleshooting

### Common Issues

1. **Certificate Issues**
   ```bash
   # Reset certificates
   bundle exec fastlane match nuke development
   bundle exec fastlane match nuke distribution
   bundle exec fastlane certificates
   ```

2. **Build Failures**
   ```bash
   # Clean and rebuild
   fastlane clean
   fastlane build_release
   ```

3. **App Store Connect Issues**
   ```bash
   # Verify app configuration
   fastlane produce_app
   ```

4. **Screenshot Generation Issues**
   ```bash
   # Reset simulators
   xcrun simctl erase all
   fastlane screenshots
   ```

### Debug Mode

```bash
# Run with verbose logging
bundle exec fastlane beta --verbose

# Debug specific lane
bundle exec fastlane beta --env debug
```

## 📞 Support

For issues with this Fastlane configuration:

1. Check the [Fastlane documentation](https://docs.fastlane.tools/)
2. Review GitHub issues in the project repository
3. Contact the development team at: dev@serenity-recovery.app

## 📜 License

This configuration is part of the Serenity Sober Pathways project and is subject to the project's license terms.

---

**⚕️ Medical Disclaimer**: This app and its deployment tools are designed to supplement, not replace, professional medical care. Always consult with qualified healthcare providers for medical advice and treatment decisions.