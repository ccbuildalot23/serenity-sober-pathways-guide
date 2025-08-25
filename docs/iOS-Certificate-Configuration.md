# iOS Certificate Configuration Requirements

## Overview
This document outlines the certificate configuration requirements for deploying the Serenity Sober Pathways HIPAA-compliant healthcare app to TestFlight and the App Store.

## Required Certificates and Profiles

### 1. Apple Developer Account Setup
- **Team ID**: XDY458RQ59
- **Bundle ID**: com.serenity.recovery
- **Provisioning Profile Name**: Serenity App Store Profile

### 2. Required Certificates
1. **iOS Distribution Certificate**
   - Type: Apple Distribution
   - Used for App Store deployment
   - Must be valid and not expired
   - Must match the Team ID (XDY458RQ59)

2. **Provisioning Profile**
   - Type: App Store Distribution
   - Bundle ID: com.serenity.recovery
   - Team: XDY458RQ59
   - Name: Serenity App Store Profile

### 3. App Store Connect API Key
- **Key ID**: Required for automated uploads
- **Issuer ID**: App Store Connect organization identifier
- **Private Key**: .p8 file for API authentication

## GitHub Secrets Configuration

The following secrets must be configured in the GitHub repository:

### Certificate Secrets
- `IOS_CERTIFICATE`: Base64 encoded .p12 distribution certificate
- `IOS_CERTIFICATE_PASSWORD`: Password for the .p12 certificate
- `IOS_PROVISION_PROFILE`: Base64 encoded .mobileprovision file
- `KEYCHAIN_PASSWORD`: Temporary keychain password for CI/CD

### App Store Connect Secrets
- `APP_STORE_CONNECT_KEY_ID`: API Key ID from App Store Connect
- `APP_STORE_CONNECT_ISSUER_ID`: Issuer ID from App Store Connect
- `APP_STORE_CONNECT_API_KEY`: Private key content (.p8 file content)

### Build Configuration Secrets
- `APPLE_TEAM_ID`: XDY458RQ59
- `PROVISIONING_PROFILE_NAME`: Serenity App Store Profile

## Current Issues Identified

### 1. Certificate Decoding Error
**Error**: `SecKeychainItemImport: Unable to decode the provided data`

**Possible Causes**:
- Certificate is not properly base64 encoded
- Certificate file is corrupted or empty
- Wrong certificate type (development instead of distribution)
- Certificate has expired

### 2. ExportOptions.plist Corruption
**Issue**: The ExportOptions.plist file appears to have encoding issues with unusual spacing.

### 3. Certificate Format Issues
**Common Problems**:
- Certificate not exported as .p12 format
- Missing intermediate certificates in the bundle
- Incorrect password for certificate
- Certificate created for wrong bundle ID or team

## Certificate Validation Checklist

Before configuring GitHub secrets, verify:

### Distribution Certificate
- [ ] Certificate is type "Apple Distribution"
- [ ] Certificate is associated with Team ID: XDY458RQ59
- [ ] Certificate has not expired
- [ ] Certificate is exported as .p12 with password
- [ ] .p12 file opens successfully in Keychain Access

### Provisioning Profile
- [ ] Profile type is "App Store"
- [ ] Bundle ID matches: com.serenity.recovery
- [ ] Team ID matches: XDY458RQ59
- [ ] Profile name is: "Serenity App Store Profile"
- [ ] Profile contains the distribution certificate
- [ ] Profile has not expired

### App Store Connect API Key
- [ ] API Key has App Manager or Admin role
- [ ] Key ID is correct format (10 characters)
- [ ] Issuer ID is correct UUID format
- [ ] .p8 file is valid and readable

## Security Considerations for HIPAA Compliance

### Certificate Management
- Store certificates securely in Apple Developer Portal
- Use GitHub Secrets for secure storage in CI/CD
- Rotate certificates before expiration
- Maintain audit trail of certificate changes

### Access Control
- Limit access to certificates to authorized personnel only
- Use service accounts for automated deployments
- Monitor certificate usage and access logs
- Implement change approval process for certificate updates

### Data Protection
- Ensure certificates are never committed to version control
- Use encrypted storage for local certificate files
- Implement secure certificate distribution process
- Regular security audits of certificate management

## Troubleshooting Common Issues

### "Unable to decode the provided data"
1. Verify certificate is exported as .p12 format
2. Check base64 encoding is correct (no line breaks or spaces)
3. Ensure certificate password is correct
4. Re-export certificate from Keychain Access

### "No matching provisioning profiles found"
1. Verify bundle ID matches exactly: com.serenity.recovery
2. Check Team ID is correct: XDY458RQ59
3. Ensure profile contains the distribution certificate
4. Re-download profile from Apple Developer Portal

### "Code signing identity not found"
1. Import certificate to build keychain
2. Verify certificate trust settings
3. Check certificate has private key
4. Ensure certificate is not expired

## Next Steps for Resolution

See the accompanying troubleshooting guide and certificate encoding script for step-by-step resolution instructions.