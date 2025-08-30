#!/bin/bash

# Deploy to TestFlight Script
# This script prepares and deploys the iOS app to TestFlight

echo "🚀 Preparing Serenity for TestFlight deployment..."

# Step 1: Build the web app
echo "📦 Building web assets..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

# Step 2: Sync with Capacitor
echo "🔄 Syncing with Capacitor..."
npx cap sync ios
if [ $? -ne 0 ]; then
    echo "❌ Capacitor sync failed"
    exit 1
fi

# Step 3: Open Xcode for final build and upload
echo "📱 Opening Xcode..."
echo ""
echo "⚠️  Manual steps required in Xcode:"
echo "1. Select 'Serenity' target"
echo "2. Select 'Any iOS Device' as destination"
echo "3. Update version and build number if needed"
echo "4. Product → Archive"
echo "5. Once archived, click 'Distribute App'"
echo "6. Select 'App Store Connect' → 'Upload'"
echo "7. Follow the prompts to upload to TestFlight"
echo ""
echo "📝 TestFlight Configuration:"
echo "- Bundle ID: com.serenity.recovery"
echo "- Version: 1.0.0"
echo "- Build: 33"
echo ""

# Open Xcode
if [[ "$OSTYPE" == "darwin"* ]]; then
    open ios/App/App.xcworkspace
else
    echo "⚠️  Please open ios/App/App.xcworkspace in Xcode manually"
fi

echo "✅ Ready for TestFlight deployment!"