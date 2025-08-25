#!/bin/bash

echo "🚀 FASTLANE EMERGENCY DEPLOYMENT FOR iOS"
echo "========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check if we're on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${YELLOW}⚠️ WARNING: This script requires macOS with Xcode installed${NC}"
    echo ""
    echo "To deploy from Windows, use one of these options:"
    echo ""
    echo -e "${BLUE}Option 1: GitHub Actions (Recommended)${NC}"
    echo "  gh workflow run ios-emergency-deploy.yml -f deploy_type=emergency"
    echo ""
    echo -e "${BLUE}Option 2: Manual Xcode on Mac${NC}"
    echo "  1. Transfer the project to a Mac"
    echo "  2. Open ios/App/App.xcworkspace in Xcode"
    echo "  3. Product → Archive → Distribute"
    echo ""
    echo -e "${BLUE}Option 3: Cloud Build Service${NC}"
    echo "  Use services like Codemagic, Bitrise, or App Center"
    echo ""
    exit 1
fi

cd ios

# Check if Fastlane is installed
if ! command -v fastlane &> /dev/null; then
    echo -e "${YELLOW}Installing Fastlane...${NC}"
    gem install fastlane
fi

# Install dependencies
echo -e "${BLUE}Installing dependencies...${NC}"
bundle install

# Set environment variables
export SUBMIT_FOR_REVIEW=true
export EMERGENCY_MODE=true
export FASTLANE_SKIP_WAITING_FOR_BUILD_PROCESSING=true

echo ""
echo -e "${GREEN}✓ Environment configured for emergency deployment${NC}"
echo ""

# Run emergency deployment
echo -e "${BLUE}🚨 Executing emergency deployment...${NC}"
bundle exec fastlane emergency_deploy

# Check status
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ DEPLOYMENT SUCCESSFUL!${NC}"
    echo "========================================="
    echo "• TestFlight: Processing (5-15 minutes)"
    echo "• External Testing: Will be available immediately"
    echo "• App Store Review: Submitted with expedited request"
    echo ""
    echo "Monitor status at: https://appstoreconnect.apple.com"
else
    echo ""
    echo -e "${RED}❌ Deployment failed${NC}"
    echo "Check the error messages above for details"
    exit 1
fi