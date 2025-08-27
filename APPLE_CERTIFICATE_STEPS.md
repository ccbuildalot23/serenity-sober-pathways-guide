# Apple Certificate Setup Guide for Serenity App Store Deployment

## IMMEDIATE ACTION REQUIRED: Certificate Generation

### Step 1: Generate Apple Distribution Certificate

1. **Open your browser and go to:** https://developer.apple.com/account
2. **Sign in with your Apple ID** (the one associated with Team ID: XDY458RQ59)
3. **Navigate to:** Certificates, Identifiers & Profiles → Certificates
4. **Check if you have an existing "Apple Distribution" certificate:**
   - If YES: Click on it and download the .cer file
   - If NO: Continue to create one:

#### Creating a New Distribution Certificate:
1. Click the **"+" button** to create a new certificate
2. Select **"Apple Distribution"** (for App Store and Ad Hoc)
3. Click **Continue**

#### Generate Certificate Signing Request (CSR) on Windows:
Since you're on Windows, we'll use OpenSSL:

```powershell
# Run these commands in PowerShell:
# First, check if OpenSSL is installed
where.exe openssl

# If not installed, download from: https://slproweb.com/products/Win32OpenSSL.html
# Or use chocolatey: choco install openssl

# Generate private key and CSR
openssl genrsa -out ios_distribution.key 2048
openssl req -new -key ios_distribution.key -out CertificateSigningRequest.certSigningRequest -subj "/emailAddress=your-email@example.com/CN=Serenity Distribution/C=US"
```

5. **Upload the CSR file** to Apple Developer Portal
6. **Download the certificate** (.cer file)

### Step 2: Create .p12 File on Windows

```powershell
# Convert .cer to .pem
openssl x509 -in ios_distribution.cer -inform DER -out ios_distribution.pem -outform PEM

# Create .p12 file (you'll be prompted for a password - REMEMBER IT!)
openssl pkcs12 -export -out ios_distribution.p12 -inkey ios_distribution.key -in ios_distribution.pem
```

### Step 3: Download Provisioning Profile

1. **In Apple Developer Portal,** go to: Profiles
2. **Find or create** "Serenity App Store Profile"
   - App ID: com.serenity.recovery
   - Type: App Store
   - Certificate: Select your Apple Distribution certificate
3. **Download** the .mobileprovision file
4. **Save as:** SerenityAppStore.mobileprovision

### Step 4: Create App Store Connect API Key

1. **Go to:** https://appstoreconnect.apple.com
2. **Navigate to:** Users and Access → Integrations → App Store Connect API
3. **Click "Generate API Key"**
4. **Name:** "Serenity Deployment Key"
5. **Access:** Admin
6. **Click Generate**
7. **IMMEDIATELY DOWNLOAD the .p8 file** (only available once!)
8. **Note down:**
   - Key ID: (10 characters, e.g., A1B2C3D4E5)
   - Issuer ID: (UUID format, e.g., 12345678-1234-1234-1234-123456789012)

### Step 5: Save Your Files

Place all files in this folder:
```
C:\Users\cmcal\OneDrive\Documents\serenity-sober-pathways-guide\ios-certificates\
├── ios_distribution.p12
├── SerenityAppStore.mobileprovision
└── AuthKey_[KEYID].p8
```

## IMPORTANT INFORMATION NEEDED:

Please provide:
1. ✅ Your .p12 certificate password
2. ✅ App Store Connect Key ID
3. ✅ App Store Connect Issuer ID
4. ✅ Location of downloaded files

Once you have these files, I'll:
1. Encode them properly for GitHub Secrets
2. Configure the deployment pipeline
3. Run the deployment to TestFlight

**Time Estimate:** 
- Certificate generation: 15-20 minutes
- File encoding & setup: 10 minutes
- Deployment: 20-30 minutes

**Total: ~1 hour to TestFlight**