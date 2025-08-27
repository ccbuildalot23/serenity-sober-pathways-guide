# iOS Environment Setup for Windows
# This script sets up all required environment variables for iOS deployment

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   iOS Deployment Environment Setup    " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Setting up environment variables..." -ForegroundColor Yellow

# App Store Connect Configuration
$env:APP_STORE_CONNECT_API_KEY_ID = "4YBU7UC32Y"
$env:APP_STORE_CONNECT_ISSUER_ID = "acb9e47c-6935-4933-ae2c-6170b5d90234"
$env:APPLE_ID = "cmcald1018@gmail.com"
$env:P12_PASSWORD = "Jimbo045291$"
$env:KEYCHAIN_PASSWORD = "TempKeychain2024"

# Supabase Configuration
$env:VITE_SUPABASE_URL = "https://tqyiqstpvwztvofrxpuf.supabase.co"
$env:VITE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWlxc3Rwdnd6dHZvZnJ4cHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyODIxNzksImV4cCI6MjA2NDg1ODE3OX0.EJPmyjD9cpZDa_PjxKkUiVpKfVmFAFofNSk58Ssqp_8"
$env:SUPABASE_URL = "https://tqyiqstpvwztvofrxpuf.supabase.co"
$env:SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWlxc3Rwdnd6dHZvZnJ4cHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkyODIxNzksImV4cCI6MjA2NDg1ODE3OX0.EJPmyjD9cpZDa_PjxKkUiVpKfVmFAFofNSk58Ssqp_8"

# Apple Developer Configuration
$env:APPLE_TEAM_ID = "XDY458RQ59"
$env:BUNDLE_ID = "com.serenity.recovery"

# Load App Store Connect API Key from file
$apiKeyPath = Join-Path $PSScriptRoot "..\ios-certificates\AuthKey_4YBU7UC32Y.p8"
if (Test-Path $apiKeyPath) {
    $env:APP_STORE_CONNECT_KEY = Get-Content $apiKeyPath -Raw
    Write-Host "✅ API Key loaded from: $apiKeyPath" -ForegroundColor Green
} else {
    Write-Host "⚠️ API Key file not found at: $apiKeyPath" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Environment variables set:" -ForegroundColor Green
Write-Host "  ✅ APP_STORE_CONNECT_API_KEY_ID" -ForegroundColor Green
Write-Host "  ✅ APP_STORE_CONNECT_ISSUER_ID" -ForegroundColor Green
Write-Host "  ✅ APPLE_ID" -ForegroundColor Green
Write-Host "  ✅ P12_PASSWORD" -ForegroundColor Green
Write-Host "  ✅ KEYCHAIN_PASSWORD" -ForegroundColor Green
Write-Host "  ✅ VITE_SUPABASE_URL" -ForegroundColor Green
Write-Host "  ✅ VITE_SUPABASE_ANON_KEY" -ForegroundColor Green
Write-Host "  ✅ APPLE_TEAM_ID" -ForegroundColor Green
Write-Host "  ✅ BUNDLE_ID" -ForegroundColor Green

Write-Host ""
Write-Host "Running validation..." -ForegroundColor Yellow
Write-Host ""

# Change to project root directory
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location $projectRoot

# Run the validation script
node scripts\ios-deployment-validator.js

# Return to original directory
Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup complete! Next steps:" -ForegroundColor Green
Write-Host "1. Create app in App Store Connect" -ForegroundColor White
Write-Host "2. Run: gh workflow run ios-deploy-fastlane.yml" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan