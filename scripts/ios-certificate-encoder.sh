#!/bin/bash

# iOS Certificate and Profile Base64 Encoder
# This script properly encodes iOS certificates and provisioning profiles for GitHub Secrets
# Usage: ./ios-certificate-encoder.sh

# Default paths
CERT_PATH="${1:-ios-certificates/ios_distribution.p12}"
PROFILE_PATH="${2:-ios-certificates/Serenity_App_Store_Profile.mobileprovision}"
OUTPUT_DIR="${3:-ios-certificates}"

echo "🔐 iOS Certificate and Profile Encoder"
echo "======================================"

# Check if files exist
if [ ! -f "$CERT_PATH" ]; then
    echo "❌ Certificate not found at: $CERT_PATH"
    echo "Please ensure you have exported your iOS Distribution Certificate as a .p12 file"
    exit 1
fi

if [ ! -f "$PROFILE_PATH" ]; then
    echo "❌ Provisioning profile not found at: $PROFILE_PATH"
    echo "Please download your provisioning profile from Apple Developer Portal"
    exit 1
fi

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Encode certificate
echo ""
echo "📄 Encoding certificate..."
CERT_OUTPUT_PATH="$OUTPUT_DIR/BUILD_CERTIFICATE_BASE64.txt"
base64 -i "$CERT_PATH" -o "$CERT_OUTPUT_PATH" 2>/dev/null || base64 "$CERT_PATH" > "$CERT_OUTPUT_PATH"
echo "✅ Certificate encoded to: $CERT_OUTPUT_PATH"

# Encode provisioning profile
echo ""
echo "📱 Encoding provisioning profile..."
PROFILE_OUTPUT_PATH="$OUTPUT_DIR/BUILD_PROVISION_PROFILE_BASE64.txt"
base64 -i "$PROFILE_PATH" -o "$PROFILE_OUTPUT_PATH" 2>/dev/null || base64 "$PROFILE_PATH" > "$PROFILE_OUTPUT_PATH"
echo "✅ Profile encoded to: $PROFILE_OUTPUT_PATH"

# Generate GitHub Secrets commands
echo ""
echo "🔧 GitHub Secrets Setup Commands:"
echo "================================="
echo ""
echo "Run these commands to set up GitHub Secrets:"
echo ""
echo "# Set certificate:"
echo "gh secret set BUILD_CERTIFICATE_BASE64 --body \"\$(cat '$CERT_OUTPUT_PATH')\""
echo ""
echo "# Set provisioning profile:"
echo "gh secret set BUILD_PROVISION_PROFILE_BASE64 --body \"\$(cat '$PROFILE_OUTPUT_PATH')\""
echo ""
echo "# Set P12 password (replace with your actual password):"
echo "gh secret set P12_PASSWORD --body \"your-certificate-password\""
echo ""
echo "# Set keychain password (can be any secure password):"
echo "gh secret set KEYCHAIN_PASSWORD --body \"temporary-keychain-password\""

# Validate encoding
echo ""
echo "🔍 Validating encoding..."

# Check if files were created and have content
if [ -s "$CERT_OUTPUT_PATH" ]; then
    echo "✅ Certificate encoding validated successfully"
else
    echo "⚠️ Certificate encoding validation failed"
fi

if [ -s "$PROFILE_OUTPUT_PATH" ]; then
    echo "✅ Provisioning profile encoding validated successfully"
else
    echo "⚠️ Profile encoding validation failed"
fi

# Additional instructions
echo ""
echo "📋 Next Steps:"
echo "============="
echo "1. Run the GitHub Secrets commands above"
echo "2. Ensure you have App Store Connect API keys set:"
echo "   - APP_STORE_CONNECT_API_KEY_ID"
echo "   - APP_STORE_CONNECT_ISSUER_ID"
echo "   - APP_STORE_CONNECT_KEY (base64 encoded .p8 file)"
echo "3. Verify all secrets are set with: gh secret list"

echo ""
echo "✨ Done! Your certificates are ready for CI/CD deployment."