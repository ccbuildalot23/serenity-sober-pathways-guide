# iOS Deployment with Fastlane Match

## Overview

This document describes the improved iOS deployment system using Fastlane Match for centralized code signing management. This approach solves all the certificate and provisioning profile issues encountered with manual management.

## What is Fastlane Match?

Fastlane Match is a tool that:
- Creates and manages all your certificates and provisioning profiles
- Stores them encrypted in a private Git repository
- Synchronizes them across your team and CI/CD systems
- Automatically renews expired certificates
- Handles all the complexity of iOS code signing

## Architecture

```
┌─────────────────────┐
│  GitHub Actions CI  │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │   Fastlane   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐        ┌────────────────────────┐
    │    Match     │◄──────►│  Certificates Repo     │
    └──────┬───────┘        │  (serenity-ios-certs)  │
           │                 └────────────────────────┘
           ▼
    ┌──────────────┐
    │   Xcodebuild │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  TestFlight  │
    └──────────────┘
```

## Setup Instructions

### 1. Create Certificates Repository

```bash
# Create a private repository for certificates
gh repo create serenity-ios-certificates --private
```

### 2. Configure GitHub Secrets

Run the setup script:
```powershell
.\setup-fastlane-match.ps1
```

Required secrets:
- `MATCH_PASSWORD` - Encryption password for certificates
- `MATCH_GIT_BASIC_AUTHORIZATION` - GitHub token for accessing certificates repo
- `APPLE_ID` - Your Apple Developer account email
- `APPLE_APP_SPECIFIC_PASSWORD` - App-specific password for 2FA accounts

### 3. Initialize Match (One-time Setup)

```bash
cd ios

# Initialize Match configuration
bundle exec fastlane match init

# Generate/download certificates
bundle exec fastlane match appstore
```

This will:
1. Create all necessary certificates
2. Create provisioning profiles
3. Encrypt and store them in the Git repository
4. Install them on your local machine

### 4. Deploy to TestFlight

```bash
# Using GitHub Actions
gh workflow run "iOS Deploy with Fastlane Match"

# Or locally
cd ios
bundle exec fastlane beta
```

## Key Benefits

### 1. **Simplified Certificate Management**
- No manual certificate uploads to GitHub
- No complex keychain management
- Automatic certificate discovery

### 2. **Team Synchronization**
- All team members use the same certificates
- New developers just run `fastlane match`
- No "it works on my machine" issues

### 3. **Automatic Renewal**
- Certificates renewed automatically when expired
- Provisioning profiles updated when devices added
- No manual intervention required

### 4. **CI/CD Reliability**
- Consistent builds across all environments
- No provisioning profile conflicts
- Handles framework signing automatically

### 5. **Security**
- Certificates encrypted with strong password
- Stored in private repository
- Temporary keychains for CI builds

## Workflow Files

### New Simplified Workflow
- `.github/workflows/ios-deploy-fastlane-match.yml`
- Uses Fastlane for all build and deployment tasks
- Significantly simpler than manual certificate management

### Legacy Workflows (Deprecated)
- `ios-deploy-ultimate.yml` - Manual certificate management
- `ios-emergency-deploy.yml` - Emergency deployment
- `ios-deploy-fastlane.yml` - Partial Fastlane integration

## Fastlane Lanes

### Primary Lanes

```ruby
# Sync certificates from Match repository
fastlane certificates

# Build and upload to TestFlight
fastlane beta

# Submit to App Store
fastlane release

# Emergency deployment
fastlane emergency_deploy
```

### Support Lanes

```ruby
# Sync all certificate types
fastlane sync_all_certs

# Run tests
fastlane test

# Clean build artifacts
fastlane clean
```

## Troubleshooting

### Certificate Issues

```bash
# Revoke and regenerate all certificates (use carefully!)
fastlane match nuke appstore
fastlane match appstore
```

### Profile Issues

```bash
# Force refresh profiles
fastlane match appstore --force_for_new_devices
```

### CI Build Failures

Check these environment variables:
- `MATCH_PASSWORD` - Must match the original encryption password
- `MATCH_GIT_BASIC_AUTHORIZATION` - Must be valid GitHub token
- `CI` - Must be set to "true" for CI builds

### Local Setup

```bash
# Install dependencies
bundle install

# Sync certificates
fastlane match appstore --readonly

# Build locally
fastlane build_release
```

## Migration from Manual Signing

1. **Backup Current Certificates** (Optional)
   - Export from Keychain Access
   - Save provisioning profiles

2. **Initialize Match**
   ```bash
   fastlane match init
   ```

3. **Generate New Certificates**
   ```bash
   fastlane match appstore
   ```

4. **Update CI/CD**
   - Switch to new workflow file
   - Add Match secrets to GitHub
   - Remove old certificate secrets

5. **Test Deployment**
   ```bash
   gh workflow run "iOS Deploy with Fastlane Match"
   ```

## Security Considerations

### Certificate Storage
- Certificates stored in private Git repository
- Encrypted with OpenSSL before storage
- Password never stored in repository

### CI/CD Security
- Temporary keychain created for each build
- Keychain deleted after build completes
- Certificates never persist on CI machines

### Access Control
- Limit repository access to trusted developers
- Use strong Match password
- Rotate credentials periodically

## Best Practices

1. **Use Readonly Mode in CI**
   - Prevents accidental certificate regeneration
   - Ensures consistent builds

2. **Regular Certificate Sync**
   - Run `fastlane match` periodically
   - Keep local certificates up to date

3. **Monitor Expiration**
   - Check certificate expiration dates
   - Plan renewal before expiration

4. **Team Onboarding**
   - Document Match password securely
   - Provide setup instructions
   - Test access before development

## Comparison: Manual vs Match

| Aspect | Manual Management | Fastlane Match |
|--------|------------------|----------------|
| Setup Complexity | High - Multiple secrets, complex workflow | Low - Single command setup |
| Maintenance | High - Manual updates required | Low - Automatic updates |
| Team Sync | Difficult - Manual sharing | Easy - Git repository sync |
| CI/CD Reliability | Low - Frequent signing issues | High - Proven solution |
| Certificate Renewal | Manual process | Automatic |
| Framework Signing | Problematic | Handled automatically |
| Error Recovery | Complex debugging | Simple regeneration |

## Conclusion

Fastlane Match provides a robust, maintainable solution for iOS code signing that eliminates the complexity and fragility of manual certificate management. This approach is the industry standard for iOS CI/CD and is recommended for all production deployments.