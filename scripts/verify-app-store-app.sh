#!/bin/bash

# Enhanced App Store Connect Verification Script
# Specifically designed to check for "No suitable application records were found" issue
# For Serenity Sober Pathways HIPAA-compliant healthcare app

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# App configuration
BUNDLE_ID="com.serenity.recovery"
TEAM_ID="XDY458RQ59"
APP_NAME="Serenity Sober Pathways"

echo -e "${BLUE}🔍 Enhanced App Store Connect Setup Verification${NC}"
echo "============================================================="
echo -e "${BLUE}App Configuration:${NC}"
echo "   📱 App Name: $APP_NAME"
echo "   📦 Bundle ID: $BUNDLE_ID"
echo "   👥 Team ID: $TEAM_ID"
echo ""

# Check if required environment variables are set
echo -e "${BLUE}🔐 Checking Environment Variables...${NC}"

MISSING_VARS=0

if [ -z "$APP_STORE_CONNECT_API_KEY" ]; then
    echo -e "${RED}❌ APP_STORE_CONNECT_API_KEY is not set${NC}"
    MISSING_VARS=1
else
    echo -e "${GREEN}✅ APP_STORE_CONNECT_API_KEY is set${NC}"
    if [[ "$APP_STORE_CONNECT_API_KEY" == *"BEGIN PRIVATE KEY"* ]] && [[ "$APP_STORE_CONNECT_API_KEY" == *"END PRIVATE KEY"* ]]; then
        echo -e "${GREEN}   ✓ API Key appears to be in correct PEM format${NC}"
    else
        echo -e "${YELLOW}   ⚠️ API Key may not be in correct PEM format${NC}"
    fi
fi

if [ -z "$APP_STORE_CONNECT_KEY_ID" ]; then
    echo -e "${RED}❌ APP_STORE_CONNECT_KEY_ID is not set${NC}"
    MISSING_VARS=1
else
    echo -e "${GREEN}✅ APP_STORE_CONNECT_KEY_ID is set: $APP_STORE_CONNECT_KEY_ID${NC}"
    if [[ ${#APP_STORE_CONNECT_KEY_ID} -eq 10 ]]; then
        echo -e "${GREEN}   ✓ Key ID format looks correct (10 characters)${NC}"
    else
        echo -e "${YELLOW}   ⚠️ Key ID should be 10 characters long${NC}"
    fi
fi

if [ -z "$APP_STORE_CONNECT_ISSUER_ID" ]; then
    echo -e "${RED}❌ APP_STORE_CONNECT_ISSUER_ID is not set${NC}"
    MISSING_VARS=1
else
    echo -e "${GREEN}✅ APP_STORE_CONNECT_ISSUER_ID is set: $APP_STORE_CONNECT_ISSUER_ID${NC}"
    if [[ $APP_STORE_CONNECT_ISSUER_ID =~ ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$ ]]; then
        echo -e "${GREEN}   ✓ Issuer ID format looks correct (UUID)${NC}"
    else
        echo -e "${YELLOW}   ⚠️ Issuer ID should be in UUID format${NC}"
    fi
fi

if [ $MISSING_VARS -eq 1 ]; then
    echo ""
    echo -e "${RED}❌ Missing required environment variables. Please set them before continuing.${NC}"
    echo ""
    echo -e "${BLUE}📝 To set environment variables:${NC}"
    echo "   export APP_STORE_CONNECT_API_KEY='-----BEGIN PRIVATE KEY-----\n...your key...\n-----END PRIVATE KEY-----'"
    echo "   export APP_STORE_CONNECT_KEY_ID='your_key_id'"
    echo "   export APP_STORE_CONNECT_ISSUER_ID='your_issuer_id'"
    exit 1
fi

echo ""

# Create API key file for testing
echo -e "${BLUE}🔑 Creating Temporary API Key File...${NC}"
mkdir -p ~/.appstoreconnect/private_keys
echo "$APP_STORE_CONNECT_API_KEY" > ~/.appstoreconnect/private_keys/AuthKey_$APP_STORE_CONNECT_KEY_ID.p8

# Check development tools
echo -e "${BLUE}🛠️ Checking Development Tools...${NC}"
if command -v xcodebuild &> /dev/null; then
    XCODE_VERSION=$(xcodebuild -version | head -1)
    echo -e "${GREEN}✅ Xcode found: $XCODE_VERSION${NC}"
else
    echo -e "${RED}❌ Xcode not found - required for iOS development${NC}"
fi

if command -v xcrun &> /dev/null; then
    echo -e "${GREEN}✅ xcrun command-line tools found${NC}"
else
    echo -e "${RED}❌ xcrun command-line tools not found${NC}"
fi

# Check upload tools
echo ""
echo -e "${BLUE}📤 Checking Upload Tools...${NC}"
if xcrun altool --help &> /dev/null; then
    echo -e "${GREEN}✅ altool is available${NC}"
else
    echo -e "${RED}❌ altool is not available${NC}"
fi

if [ -f "/Applications/Transporter.app/Contents/itms/bin/iTMSTransporter" ]; then
    echo -e "${GREEN}✅ iTMSTransporter found in Transporter.app${NC}"
elif command -v iTMSTransporter &> /dev/null; then
    echo -e "${GREEN}✅ iTMSTransporter command is available${NC}"
else
    echo -e "${YELLOW}⚠️ iTMSTransporter not found - may need to install Transporter app${NC}"
fi

echo ""

# Test API key authentication
echo -e "${BLUE}🔓 Testing API Key Authentication...${NC}"
echo "Attempting to authenticate with App Store Connect..."

# Test authentication by listing apps
TEST_OUTPUT=$(xcrun altool --list-apps \
    --apiKey "$APP_STORE_CONNECT_KEY_ID" \
    --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID" \
    2>&1) || true

AUTH_SUCCESS=false
if echo "$TEST_OUTPUT" | grep -q -i "error\|failed\|invalid"; then
    echo -e "${RED}❌ API Key authentication failed:${NC}"
    echo "$TEST_OUTPUT" | head -5
    echo ""
    echo -e "${BLUE}🔧 Common API Key Issues:${NC}"
    echo "   1. Verify Key ID matches exactly: $APP_STORE_CONNECT_KEY_ID"
    echo "   2. Verify Issuer ID is correct: $APP_STORE_CONNECT_ISSUER_ID"
    echo "   3. Ensure API Key has 'App Manager' or 'Admin' role"
    echo "   4. Check that the API Key is not expired or revoked"
    echo "   5. Verify the private key file (.p8) content is complete"
else
    echo -e "${GREEN}✅ API Key authentication successful${NC}"
    AUTH_SUCCESS=true
fi

echo ""

# Check specific app registration - THE MAIN ISSUE
echo -e "${BLUE}🏪 Checking App Store Connect App Registration...${NC}"
echo "Searching for app with Bundle ID: $BUNDLE_ID..."

APP_FOUND=false
if [ "$AUTH_SUCCESS" = true ]; then
    # Look for our specific app
    APP_INFO=$(xcrun altool --list-apps \
        --apiKey "$APP_STORE_CONNECT_KEY_ID" \
        --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID" \
        2>/dev/null | grep "$BUNDLE_ID" || echo "")

    if [ -n "$APP_INFO" ]; then
        echo -e "${GREEN}✅ App found in App Store Connect:${NC}"
        echo "   $APP_INFO"
        APP_FOUND=true
    else
        echo -e "${RED}❌ App with Bundle ID '$BUNDLE_ID' NOT FOUND in App Store Connect${NC}"
        echo ""
        echo -e "${BLUE}🎯 THIS IS THE MAIN ISSUE CAUSING THE DEPLOYMENT FAILURE${NC}"
        echo ""
        echo -e "${YELLOW}The error 'No suitable application records were found' occurs because:${NC}"
        echo "   • The app record doesn't exist in App Store Connect"
        echo "   • Bundle ID mismatch between local config and App Store Connect"
        echo "   • Team ID mismatch preventing access to the app record"
        echo ""
        
        # Show all apps to help debug
        echo -e "${BLUE}📋 All apps found in your App Store Connect account:${NC}"
        ALL_APPS=$(xcrun altool --list-apps \
            --apiKey "$APP_STORE_CONNECT_KEY_ID" \
            --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID" \
            2>/dev/null || echo "Unable to retrieve app list")
        
        if [ "$ALL_APPS" = "Unable to retrieve app list" ]; then
            echo "   Unable to retrieve app list - check API key permissions"
        else
            echo "$ALL_APPS" | head -10
            if [ $(echo "$ALL_APPS" | wc -l) -eq 0 ]; then
                echo -e "${YELLOW}   No apps found - this may be a new Apple Developer account${NC}"
            fi
        fi
    fi
else
    echo -e "${YELLOW}⚠️ Cannot check app registration due to authentication failure${NC}"
fi

echo ""

# Bundle ID verification
echo -e "${BLUE}🔍 Bundle ID Configuration Verification...${NC}"

# Check if Bundle ID exists in Developer Portal
echo "Checking Bundle ID registration in Apple Developer Portal..."
BUNDLE_CHECK_OUTPUT=$(xcrun altool --list-providers \
    --apiKey "$APP_STORE_CONNECT_KEY_ID" \
    --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID" \
    2>&1) || true

if echo "$BUNDLE_CHECK_OUTPUT" | grep -q "$TEAM_ID"; then
    echo -e "${GREEN}✅ Team ID $TEAM_ID is accessible${NC}"
else
    echo -e "${YELLOW}⚠️ Cannot verify Team ID access${NC}"
fi

echo ""

# Provide specific setup instructions
echo -e "${BLUE}🔧 Required Setup Steps${NC}"
echo "======================"

if [ "$APP_FOUND" = false ]; then
    echo -e "${RED}❌ CRITICAL: App record missing in App Store Connect${NC}"
    echo ""
    echo -e "${BLUE}📝 IMMEDIATE ACTION REQUIRED:${NC}"
    echo ""
    echo "1. 🌐 Go to App Store Connect: https://appstoreconnect.apple.com"
    echo "2. ➕ Click the '+' button or 'New App'"
    echo "3. 📱 Select 'iOS' as platform"
    echo "4. 📝 Fill in app information:"
    echo "   • App Name: $APP_NAME"
    echo "   • Primary Language: English (U.S.)"
    echo "   • Bundle ID: $BUNDLE_ID"
    echo "   • SKU: SERENITY-RECOVERY-001 (or similar unique identifier)"
    echo "5. ⚙️ Configure app as described in the setup guide"
    echo "6. 💾 Save the app record"
    echo ""
    echo -e "${YELLOW}📋 If Bundle ID is not available in dropdown:${NC}"
    echo "   • Go to Apple Developer Portal: https://developer.apple.com/account/"
    echo "   • Navigate to Certificates, Identifiers & Profiles"
    echo "   • Create new App ID with Bundle ID: $BUNDLE_ID"
    echo "   • Enable required capabilities (Push Notifications, etc.)"
    echo ""
    echo -e "${BLUE}📖 For detailed instructions, see:${NC}"
    echo "   docs/App-Store-Connect-Setup-Guide.md"
fi

echo ""

# Summary
echo -e "${BLUE}📋 Verification Summary${NC}"
echo "======================"
echo ""

READY_FOR_UPLOAD=true

# Check all requirements
if [ "$AUTH_SUCCESS" = true ]; then
    echo -e "${GREEN}✅ API Key Authentication: Working${NC}"
else
    echo -e "${RED}❌ API Key Authentication: Failed${NC}"
    READY_FOR_UPLOAD=false
fi

if [ "$APP_FOUND" = true ]; then
    echo -e "${GREEN}✅ App Store Connect App Record: Found${NC}"
else
    echo -e "${RED}❌ App Store Connect App Record: Missing${NC}"
    READY_FOR_UPLOAD=false
fi

if command -v xcodebuild &> /dev/null; then
    echo -e "${GREEN}✅ Xcode Development Tools: Available${NC}"
else
    echo -e "${RED}❌ Xcode Development Tools: Missing${NC}"
    READY_FOR_UPLOAD=false
fi

echo ""

if [ "$READY_FOR_UPLOAD" = true ]; then
    echo -e "${GREEN}🎉 SETUP VERIFICATION: PASSED${NC}"
    echo ""
    echo -e "${GREEN}✅ Your App Store Connect setup is ready for iOS app uploads!${NC}"
    echo ""
    echo -e "${BLUE}🚀 Next steps:${NC}"
    echo "   1. Ensure iOS certificates and provisioning profiles are configured"
    echo "   2. Trigger your GitHub Actions workflow or manual upload"
    echo "   3. Monitor the upload process in App Store Connect"
    echo "   4. Complete TestFlight setup after first successful upload"
    echo ""
    echo -e "${BLUE}📊 Monitor upload progress:${NC}"
    echo "   • GitHub Actions: Check workflow logs"
    echo "   • App Store Connect: https://appstoreconnect.apple.com"
    echo "   • TestFlight: Available after first upload completes"
else
    echo -e "${RED}🚨 SETUP VERIFICATION: FAILED${NC}"
    echo ""
    echo -e "${RED}❌ Critical issues found that must be resolved before uploading:${NC}"
    echo ""
    if [ "$APP_FOUND" = false ]; then
        echo -e "${RED}   • App record missing in App Store Connect (MAIN ISSUE)${NC}"
    fi
    if [ "$AUTH_SUCCESS" = false ]; then
        echo -e "${RED}   • API Key authentication failure${NC}"
    fi
    if ! command -v xcodebuild &> /dev/null; then
        echo -e "${RED}   • Xcode development tools not available${NC}"
    fi
    echo ""
    echo -e "${BLUE}🔧 Resolution steps:${NC}"
    echo "   1. Address the specific issues listed above"
    echo "   2. Follow the setup guide: docs/App-Store-Connect-Setup-Guide.md"
    echo "   3. Run this verification script again: ./scripts/verify-app-store-app.sh"
    echo ""
fi

echo ""
echo -e "${BLUE}📚 Useful Resources:${NC}"
echo "   • App Store Connect: https://appstoreconnect.apple.com"
echo "   • Apple Developer Portal: https://developer.apple.com/account"
echo "   • Setup Guide: docs/App-Store-Connect-Setup-Guide.md"
echo "   • Certificate Guide: docs/iOS-Certificate-Configuration.md"
echo ""
echo -e "${BLUE}📞 Support Contact:${NC}"
echo "   • Technical Issues: dev-team@serenity-recovery.com"
echo "   • App Store Issues: ios-deployment@serenity-recovery.com"

# Cleanup
echo ""
echo -e "${BLUE}🧹 Cleaning up temporary files...${NC}"
rm -f ~/.appstoreconnect/private_keys/AuthKey_$APP_STORE_CONNECT_KEY_ID.p8

# Exit with appropriate code
if [ "$READY_FOR_UPLOAD" = true ]; then
    exit 0
else
    exit 1
fi