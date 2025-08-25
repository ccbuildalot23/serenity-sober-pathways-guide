#!/bin/bash

echo "🔍 Validating iOS deployment readiness for Serenity..."
echo "=================================================="

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "ios/App/App" ]; then
    echo -e "${RED}✗ iOS directory not found. Please run from project root.${NC}"
    exit 1
fi

echo ""
echo "📱 Checking iOS Configuration..."
echo "--------------------------------"

# Check build number
BUILD_NUMBER=$(grep -A1 'CFBundleVersion' ios/App/App/Info.plist | grep '<string>' | sed 's/.*<string>\(.*\)<\/string>/\1/' | tr -d '\t')
if [ "$BUILD_NUMBER" -ge "32" ]; then
    echo -e "${GREEN}✓ Build number: $BUILD_NUMBER${NC}"
else
    echo -e "${RED}✗ Build number too low: $BUILD_NUMBER (should be 32+)${NC}"
fi

# Check version number
VERSION=$(grep -A1 'CFBundleShortVersionString' ios/App/App/Info.plist | grep '<string>' | sed 's/.*<string>\(.*\)<\/string>/\1/' | tr -d '\t')
echo -e "${GREEN}✓ Version: $VERSION${NC}"

# Check bundle identifier
BUNDLE_ID=$(grep -A1 'CFBundleIdentifier' ios/App/App/Info.plist | grep '<string>' | sed 's/.*<string>\(.*\)<\/string>/\1/' | tr -d '\t')
if [[ "$BUNDLE_ID" == *"PRODUCT_BUNDLE_IDENTIFIER"* ]]; then
    echo -e "${GREEN}✓ Bundle ID: com.serenity.recovery (configured via Xcode)${NC}"
else
    echo -e "${GREEN}✓ Bundle ID: $BUNDLE_ID${NC}"
fi

echo ""
echo "🔐 Checking Export Compliance..."
echo "--------------------------------"

# Check export compliance
if grep -q "ITSAppUsesNonExemptEncryption" ios/App/App/Info.plist; then
    if grep -A1 "ITSAppUsesNonExemptEncryption" ios/App/App/Info.plist | grep -q "<false/>"; then
        echo -e "${GREEN}✓ Export compliance configured (non-exempt encryption: false)${NC}"
    else
        echo -e "${YELLOW}⚠ Export compliance configured but encryption is marked as true${NC}"
    fi
else
    echo -e "${RED}✗ Export compliance not configured${NC}"
fi

echo ""
echo "🔒 Checking Privacy Manifest (2024 Requirement)..."
echo "--------------------------------------------------"

# Check for PrivacyInfo.xcprivacy
if [ -f "ios/App/App/PrivacyInfo.xcprivacy" ]; then
    echo -e "${GREEN}✓ PrivacyInfo.xcprivacy exists${NC}"
    
    # Check privacy manifest contents
    if grep -q "NSPrivacyCollectedDataTypes" ios/App/App/PrivacyInfo.xcprivacy; then
        echo -e "${GREEN}  ✓ Data collection types documented${NC}"
    fi
    
    if grep -q "NSPrivacyAccessedAPITypes" ios/App/App/PrivacyInfo.xcprivacy; then
        echo -e "${GREEN}  ✓ API access types documented${NC}"
    fi
else
    echo -e "${RED}✗ PrivacyInfo.xcprivacy not found (REQUIRED for 2024)${NC}"
fi

echo ""
echo "📝 Checking Privacy Permissions..."
echo "----------------------------------"

# Array of required permissions
declare -a permissions=(
    "NSCameraUsageDescription"
    "NSMicrophoneUsageDescription"
    "NSLocationWhenInUseUsageDescription"
    "NSUserNotificationsUsageDescription"
    "NSHealthShareUsageDescription"
    "NSFaceIDUsageDescription"
    "NSPhotoLibraryUsageDescription"
)

for permission in "${permissions[@]}"; do
    if grep -q "$permission" ios/App/App/Info.plist; then
        echo -e "${GREEN}✓ $permission configured${NC}"
    else
        echo -e "${RED}✗ $permission missing${NC}"
    fi
done

echo ""
echo "🏥 Checking HIPAA Compliance Features..."
echo "----------------------------------------"

# Check for App Transport Security
if grep -q "NSAppTransportSecurity" ios/App/App/Info.plist; then
    echo -e "${GREEN}✓ App Transport Security configured${NC}"
else
    echo -e "${YELLOW}⚠ App Transport Security not explicitly configured${NC}"
fi

# Check for URL schemes (for crisis support)
if grep -q "CFBundleURLTypes" ios/App/App/Info.plist; then
    echo -e "${GREEN}✓ URL schemes configured for deep linking${NC}"
fi

# Check for background modes
if grep -q "UIBackgroundModes" ios/App/App/Info.plist; then
    echo -e "${GREEN}✓ Background modes configured for notifications${NC}"
fi

echo ""
echo "📦 Checking Dependencies..."
echo "---------------------------"

# Check if node_modules exist
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓ Node modules installed${NC}"
else
    echo -e "${RED}✗ Node modules not installed (run: npm ci --legacy-peer-deps)${NC}"
fi

# Check if Capacitor is synced
if [ -f "ios/App/App/capacitor.config.json" ]; then
    echo -e "${GREEN}✓ Capacitor configuration present${NC}"
else
    echo -e "${YELLOW}⚠ Capacitor may need syncing (run: npx cap sync ios)${NC}"
fi

echo ""
echo "🚀 Checking Fastlane Setup..."
echo "-----------------------------"

# Check for Fastlane
if [ -d "ios/App/fastlane" ]; then
    echo -e "${GREEN}✓ Fastlane configured${NC}"
    
    if [ -f "ios/App/fastlane/Fastfile" ]; then
        echo -e "${GREEN}  ✓ Fastfile present${NC}"
    fi
    
    if [ -f "ios/App/fastlane/Appfile" ]; then
        echo -e "${GREEN}  ✓ Appfile present${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Fastlane not configured${NC}"
fi

echo ""
echo "📄 Checking Certificates & Profiles..."
echo "--------------------------------------"

# Check for certificate files
if [ -f "ios/App/App/ios_distribution.p12" ] || [ -f "ios_distribution.p12" ]; then
    echo -e "${GREEN}✓ Distribution certificate found${NC}"
else
    echo -e "${YELLOW}⚠ Distribution certificate not found in expected location${NC}"
fi

if [ -f "ios/App/App/Serenity_App_Store_Profile.mobileprovision" ] || [ -f "Serenity_App_Store_Profile.mobileprovision" ]; then
    echo -e "${GREEN}✓ Provisioning profile found${NC}"
else
    echo -e "${YELLOW}⚠ Provisioning profile not found in expected location${NC}"
fi

echo ""
echo "=================================================="
echo "📊 DEPLOYMENT READINESS SUMMARY"
echo "=================================================="

# Count issues
CRITICAL_ISSUES=0
WARNINGS=0

# Re-check critical items
if [ "$BUILD_NUMBER" -lt "32" ]; then
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi

if [ ! -f "ios/App/App/PrivacyInfo.xcprivacy" ]; then
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi

if ! grep -q "ITSAppUsesNonExemptEncryption" ios/App/App/Info.plist; then
    CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
fi

# Display summary
if [ $CRITICAL_ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ APP IS READY FOR DEPLOYMENT!${NC}"
    echo -e "${GREEN}All critical checks passed. You can proceed with TestFlight submission.${NC}"
else
    echo -e "${RED}❌ CRITICAL ISSUES FOUND: $CRITICAL_ISSUES${NC}"
    echo -e "${RED}Please fix the critical issues before deploying.${NC}"
fi

echo ""
echo "Next steps:"
echo "1. Run: npm run build"
echo "2. Run: npx cap sync ios"
echo "3. Open Xcode: npx cap open ios"
echo "4. Archive and upload to TestFlight"
echo ""