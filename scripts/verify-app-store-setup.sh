#!/bin/bash

# App Store Connect Setup Verification Script
# This script helps verify your App Store Connect configuration for iOS app uploads

set -e

echo "🔍 App Store Connect Setup Verification"
echo "======================================="

# Configuration
BUNDLE_ID="com.serenity.recovery"
TEAM_ID="XDY458RQ59"
API_KEY_ID="4YBU7UC32Y"

echo "📱 App Configuration:"
echo "   Bundle ID: $BUNDLE_ID"
echo "   Team ID: $TEAM_ID"
echo "   API Key ID: $API_KEY_ID"
echo ""

# Check if required environment variables are set
echo "🔐 Checking Environment Variables..."
if [ -z "$APP_STORE_CONNECT_API_KEY" ]; then
    echo "❌ APP_STORE_CONNECT_API_KEY is not set"
    exit 1
else
    echo "✅ APP_STORE_CONNECT_API_KEY is set"
fi

if [ -z "$APP_STORE_CONNECT_KEY_ID" ]; then
    echo "❌ APP_STORE_CONNECT_KEY_ID is not set"
    exit 1
else
    echo "✅ APP_STORE_CONNECT_KEY_ID is set"
fi

if [ -z "$APP_STORE_CONNECT_ISSUER_ID" ]; then
    echo "❌ APP_STORE_CONNECT_ISSUER_ID is not set"
    exit 1
else
    echo "✅ APP_STORE_CONNECT_ISSUER_ID is set"
fi

echo ""

# Create API key file
echo "🔑 Creating API Key File..."
mkdir -p ~/.appstoreconnect/private_keys
echo "$APP_STORE_CONNECT_API_KEY" > ~/.appstoreconnect/private_keys/AuthKey_$APP_STORE_CONNECT_KEY_ID.p8

# Validate API key format
if [[ "$APP_STORE_CONNECT_API_KEY" == *"BEGIN PRIVATE KEY"* ]]; then
    echo "✅ API Key appears to be in correct PEM format"
else
    echo "⚠️  API Key may not be in correct PEM format"
fi

echo ""

# Check Xcode and command-line tools
echo "🛠️  Checking Development Tools..."
if command -v xcodebuild &> /dev/null; then
    XCODE_VERSION=$(xcodebuild -version | head -1)
    echo "✅ Xcode found: $XCODE_VERSION"
else
    echo "❌ Xcode not found"
    exit 1
fi

if command -v xcrun &> /dev/null; then
    echo "✅ xcrun command-line tools found"
else
    echo "❌ xcrun command-line tools not found"
    exit 1
fi

echo ""

# Check for altool
echo "📤 Checking Upload Tools..."
if xcrun altool --help &> /dev/null; then
    echo "✅ altool is available"
else
    echo "❌ altool is not available"
fi

# Check for iTMSTransporter
if command -v iTMSTransporter &> /dev/null; then
    echo "✅ iTMSTransporter command is available"
elif [ -f "/Applications/Transporter.app/Contents/itms/bin/iTMSTransporter" ]; then
    echo "✅ iTMSTransporter found in Transporter.app"
else
    echo "⚠️  iTMSTransporter not found - will install via Homebrew"
fi

echo ""

# Test API key authentication
echo "🔓 Testing API Key Authentication..."
echo "Creating test command to verify API key works..."

# Create a simple test to validate the API key
TEST_OUTPUT=$(xcrun altool --list-apps \
    --apiKey "$APP_STORE_CONNECT_KEY_ID" \
    --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID" \
    2>&1) || true

if echo "$TEST_OUTPUT" | grep -q "error"; then
    echo "❌ API Key authentication failed:"
    echo "$TEST_OUTPUT"
    echo ""
    echo "🔧 Common fixes:"
    echo "   1. Verify API Key ID matches the key in App Store Connect"
    echo "   2. Verify Issuer ID (Team ID) is correct"
    echo "   3. Ensure API Key has 'App Manager' or 'Developer' role"
    echo "   4. Check that the API Key is not expired"
else
    echo "✅ API Key authentication successful"
fi

echo ""

# Check App Store Connect app registration
echo "🏪 Checking App Store Connect Registration..."
echo "Verifying app exists in App Store Connect..."

APP_INFO=$(xcrun altool --list-apps \
    --apiKey "$APP_STORE_CONNECT_KEY_ID" \
    --apiIssuer "$APP_STORE_CONNECT_ISSUER_ID" \
    2>/dev/null | grep "$BUNDLE_ID" || echo "Not found")

if [ "$APP_INFO" != "Not found" ]; then
    echo "✅ App found in App Store Connect:"
    echo "   $APP_INFO"
else
    echo "❌ App with Bundle ID '$BUNDLE_ID' not found in App Store Connect"
    echo ""
    echo "🔧 Required steps:"
    echo "   1. Go to https://appstoreconnect.apple.com"
    echo "   2. Click '+' to create a new app"
    echo "   3. Use Bundle ID: $BUNDLE_ID"
    echo "   4. Ensure the app is in 'Prepare for Submission' or later state"
fi

echo ""

# Summary
echo "📋 Verification Summary"
echo "======================"
echo ""

if [ "$APP_INFO" != "Not found" ] && ! echo "$TEST_OUTPUT" | grep -q "error"; then
    echo "✅ Your setup appears to be ready for iOS app uploads!"
    echo ""
    echo "🚀 Next steps:"
    echo "   1. Build your IPA file"
    echo "   2. Run the upload command from your workflow"
    echo "   3. Check TestFlight in App Store Connect"
else
    echo "❌ Issues found that need to be resolved before uploading"
    echo ""
    echo "🔧 Please address the errors above and run this script again"
fi

echo ""
echo "📚 Useful links:"
echo "   • App Store Connect: https://appstoreconnect.apple.com"
echo "   • Developer Portal: https://developer.apple.com/account"
echo "   • API Keys: https://appstoreconnect.apple.com/access/api"

# Cleanup
rm -f ~/.appstoreconnect/private_keys/AuthKey_$APP_STORE_CONNECT_KEY_ID.p8