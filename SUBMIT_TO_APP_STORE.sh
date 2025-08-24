#!/bin/bash

# Serenity iOS App Store Submission Script
# This script prepares and opens your iOS app for App Store submission

echo "🚀 Serenity iOS App Store Submission Helper"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Check environment
echo "📋 Checking environment..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed. Please install Node.js first.${NC}"
    exit 1
fi

# Check if Capacitor CLI is installed
if ! command -v cap &> /dev/null; then
    echo -e "${YELLOW}⚠️  Capacitor CLI not found globally. Using npx...${NC}"
    CAP_CMD="npx cap"
else
    CAP_CMD="cap"
fi

echo -e "${GREEN}✅ Environment check passed${NC}"
echo ""

# Step 2: Build the project
echo "🔨 Building production bundle..."
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed. Please fix build errors and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build completed successfully${NC}"
echo ""

# Step 3: Sync with iOS
echo "📱 Syncing with iOS platform..."
$CAP_CMD sync ios

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ iOS sync failed. Please check Capacitor configuration.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ iOS sync completed${NC}"
echo ""

# Step 4: Display checklist
echo "📝 Pre-submission Checklist:"
echo "----------------------------"
echo "[ ] Apple Developer Account active ($99/year)"
echo "[ ] Xcode installed (version 14.0+)"
echo "[ ] CocoaPods installed (for dependencies)"
echo "[ ] Test device or simulator ready"
echo "[ ] App Store Connect account access"
echo "[ ] Screenshots prepared (in app-store-screenshots/)"
echo "[ ] Privacy policy live at: https://serenity-sober-pathways-guide.vercel.app/privacy"
echo "[ ] Support page live at: https://serenity-sober-pathways-guide.vercel.app/support"
echo ""

# Step 5: Important reminders
echo "⚠️  Important Reminders:"
echo "------------------------"
echo "1. Bundle ID: com.serenity.recovery"
echo "2. Version: 1.0.0"
echo "3. Build: 1"
echo "4. Category: Health & Fitness"
echo "5. Age Rating: 17+"
echo "6. Demo Account: demo-patient@serenity.app / TestPass123!"
echo ""

# Step 6: Quick fixes applied
echo "🔧 Quick Fixes Applied:"
echo "-----------------------"
echo "✅ Vite build configuration fixed"
echo "✅ iOS icons generated"
echo "✅ Privacy descriptions added"
echo "✅ Export compliance configured"
echo "✅ Background modes enabled"
echo "✅ URL schemes configured"
echo ""

# Step 7: Known issues to address later
echo "📋 MVP Limitations (Address Post-Launch):"
echo "------------------------------------------"
echo "• Mock SMS service (crisis alerts work via UI)"
echo "• Mock push notifications (in-app only)"
echo "• Limited offline functionality"
echo "• Basic provider dashboard"
echo ""

# Step 8: Open Xcode
echo "🎯 Ready to open Xcode!"
echo ""
read -p "Press Enter to open Xcode, or Ctrl+C to cancel..."

echo "Opening Xcode..."
$CAP_CMD open ios

echo ""
echo -e "${GREEN}✅ Xcode opened!${NC}"
echo ""
echo "📱 Next Steps in Xcode:"
echo "----------------------"
echo "1. Select 'Any iOS Device (arm64)' as target"
echo "2. Update Bundle ID to: com.serenity.recovery"
echo "3. Set Version: 1.0.0, Build: 1"
echo "4. Configure automatic signing with your team"
echo "5. Product → Archive"
echo "6. Distribute App → App Store Connect"
echo ""
echo "📖 Full guide: IOS_SUBMISSION_GUIDE.md"
echo ""
echo -e "${GREEN}Good luck with your submission! 🚀${NC}"