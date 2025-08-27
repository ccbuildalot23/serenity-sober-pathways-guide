#!/bin/bash

# Serenity Sober Pathways iOS Fastlane Setup Script
# This script sets up the Fastlane environment for healthcare app deployment

set -e

echo "🏥 Setting up Fastlane for Serenity Sober Pathways iOS..."

# Check if we're in the right directory
if [ ! -f "Fastfile" ]; then
    echo "❌ Error: Please run this script from the ios/fastlane directory"
    exit 1
fi

# Install Ruby dependencies
echo "💎 Installing Ruby gems..."
if command -v bundle &> /dev/null; then
    bundle install
else
    gem install fastlane
    gem install cocoapods
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual values before proceeding!"
fi

# Install Fastlane plugins
echo "🔌 Installing Fastlane plugins..."
bundle exec fastlane add_plugin versioning
bundle exec fastlane add_plugin badge
bundle exec fastlane add_plugin changelog

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p screenshots/en-US
mkdir -p certificates
mkdir -p build
mkdir -p build_logs
mkdir -p derived_data

# Verify Xcode installation
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Error: Xcode command line tools not found"
    echo "Please install Xcode and run: xcode-select --install"
    exit 1
fi

# Check CocoaPods
if ! command -v pod &> /dev/null; then
    echo "📦 Installing CocoaPods..."
    gem install cocoapods
fi

# Verify project structure
if [ ! -f "../App/App.xcodeproj/project.pbxproj" ]; then
    echo "❌ Error: Xcode project not found at ../App/App.xcodeproj/"
    echo "Please ensure your project structure is correct"
    exit 1
fi

echo "✅ Fastlane setup complete!"
echo ""
echo "🚀 Next steps:"
echo "1. Edit .env file with your Apple ID and certificates repository"
echo "2. Run: bundle exec fastlane setup"
echo "3. Configure your certificates: bundle exec fastlane certificates" 
echo "4. Test with: bundle exec fastlane build_debug"
echo ""
echo "🏥 Healthcare App Notes:"
echo "- This setup includes HIPAA compliance configurations"
echo "- Medical app category is pre-configured"
echo "- Crisis support features are documented for App Store review"
echo "- Age rating is set appropriately for healthcare content"
echo ""
echo "📚 Documentation: See README.md for detailed usage instructions"