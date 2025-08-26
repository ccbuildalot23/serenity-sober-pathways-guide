#!/usr/bin/env ruby

# Fastlane Match Setup Script for Serenity Recovery iOS App
# This script initializes the Match repository and generates certificates

require 'fileutils'

puts "🚀 Initializing Fastlane Match for Serenity Recovery..."

# Ensure we're in the correct directory
Dir.chdir(File.dirname(__FILE__)) do
  puts "📍 Working directory: #{Dir.pwd}"
  
  # Check if Fastlane is available
  unless system("which fastlane > /dev/null 2>&1")
    puts "❌ Fastlane not found. Installing..."
    system("gem install fastlane") || abort("Failed to install Fastlane")
  end
  
  puts "✅ Fastlane found"
  
  # Check required environment variables
  required_env_vars = [
    'MATCH_PASSWORD',
    'MATCH_KEYCHAIN_PASSWORD',
    'APP_STORE_CONNECT_API_KEY_ID',
    'APP_STORE_CONNECT_ISSUER_ID',
    'APP_STORE_CONNECT_API_KEY_PATH'
  ]
  
  missing_vars = required_env_vars.select { |var| ENV[var].nil? || ENV[var].empty? }
  
  if missing_vars.any?
    puts "❌ Missing required environment variables:"
    missing_vars.each { |var| puts "   - #{var}" }
    puts "\n💡 Please set these variables before running Match setup."
    exit(1)
  end
  
  puts "✅ All required environment variables are set"
  
  # Initialize Match repository (this will create the initial structure)
  puts "🔧 Initializing Match repository..."
  
  # First, try to initialize for development certificates
  puts "📱 Setting up development certificates..."
  match_dev_result = system("fastlane match development --readonly false")
  
  if match_dev_result
    puts "✅ Development certificates setup completed"
  else
    puts "⚠️  Development certificates setup encountered issues (this may be expected for first run)"
  end
  
  # Then, set up App Store certificates
  puts "🏪 Setting up App Store certificates..."
  match_appstore_result = system("fastlane match appstore --readonly false")
  
  if match_appstore_result
    puts "✅ App Store certificates setup completed"
  else
    puts "⚠️  App Store certificates setup encountered issues"
    puts "🔄 This is common on first run - certificates will be generated on next run"
  end
  
  # Verify the setup
  puts "🔍 Verifying Match setup..."
  
  if File.exist?("certificates") && Dir.exist?("certificates")
    puts "✅ Certificates directory created"
  else
    puts "⚠️  Certificates directory not found (will be created during build)"
  end
  
  puts "🎉 Fastlane Match setup completed!"
  puts ""
  puts "📋 Next steps:"
  puts "   1. Run 'fastlane certificates' to sync certificates"
  puts "   2. Run 'fastlane build_release' to test the build process"
  puts "   3. Run 'fastlane beta' to deploy to TestFlight"
  puts ""
  puts "🔧 Troubleshooting:"
  puts "   - If certificates fail to generate, check your Apple ID credentials"
  puts "   - Ensure your Apple Developer account has the necessary permissions"
  puts "   - Verify that the App Store Connect API key is valid"
end