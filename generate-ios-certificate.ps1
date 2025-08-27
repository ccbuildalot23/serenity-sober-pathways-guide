# iOS Certificate Generation Helper for Serenity App
# This script helps generate the necessary files for Apple Distribution Certificate

Write-Host "=================================================================================" -ForegroundColor Cyan
Write-Host "  Serenity iOS Certificate Generation Helper" -ForegroundColor Cyan
Write-Host "  For Team ID: XDY458RQ59" -ForegroundColor Cyan
Write-Host "=================================================================================" -ForegroundColor Cyan
Write-Host ""

# Set paths
$certDir = "ios-certificates"
$opensslPath = "C:\Program Files\Git\mingw64\bin\openssl.exe"

# Create directory if it doesn't exist
if (-not (Test-Path $certDir)) {
    New-Item -ItemType Directory -Path $certDir | Out-Null
    Write-Host "✅ Created directory: $certDir" -ForegroundColor Green
}

Set-Location $certDir

Write-Host "📋 Step 1: Generating Private Key and CSR" -ForegroundColor Yellow
Write-Host ""

# Prompt for email
$email = Read-Host "Enter your Apple Developer email address"
$name = "Serenity Distribution"

# Generate private key
Write-Host "🔐 Generating private key..." -ForegroundColor Yellow
& "$opensslPath" genrsa -out ios_distribution.key 2048

if (Test-Path "ios_distribution.key") {
    Write-Host "✅ Private key generated: ios_distribution.key" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to generate private key" -ForegroundColor Red
    exit 1
}

# Generate CSR
Write-Host "📝 Generating Certificate Signing Request..." -ForegroundColor Yellow
$subject = "/emailAddress=$email/CN=$name/C=US"
& "$opensslPath" req -new -key ios_distribution.key -out CertificateSigningRequest.certSigningRequest -subj $subject

if (Test-Path "CertificateSigningRequest.certSigningRequest") {
    Write-Host "✅ CSR generated: CertificateSigningRequest.certSigningRequest" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to generate CSR" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=================================================================================" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "=================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 🌐 Go to: https://developer.apple.com/account/resources/certificates/add" -ForegroundColor Yellow
Write-Host "2. 📱 Select 'Apple Distribution' and click Continue" -ForegroundColor White
Write-Host "3. 📤 Upload this file: $pwd\CertificateSigningRequest.certSigningRequest" -ForegroundColor White
Write-Host "4. 💾 Download the certificate (.cer file) and save it in this folder" -ForegroundColor White
Write-Host "5. ▶️  Run: .\convert-certificate.ps1 to create the .p12 file" -ForegroundColor White
Write-Host ""
Write-Host "📁 Current directory: $pwd" -ForegroundColor Cyan
Write-Host ""

# Open the folder in Explorer
Write-Host "Opening certificate folder..." -ForegroundColor Gray
Start-Process explorer.exe $pwd

Set-Location ..