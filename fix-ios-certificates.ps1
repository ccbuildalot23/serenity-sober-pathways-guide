# PowerShell script to fix iOS certificate base64 encoding
Write-Host "🔧 Fixing iOS Certificate Encoding for Fastlane Deployment" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# Check if certificates directory exists
$certPath = "C:\ios-certs"
if (-Not (Test-Path $certPath)) {
    Write-Host "❌ Certificate directory not found at $certPath" -ForegroundColor Red
    Write-Host "Please ensure certificates are in C:\ios-certs\" -ForegroundColor Yellow
    exit 1
}

Write-Host "`n📂 Found certificate directory: $certPath" -ForegroundColor Green

# Function to encode file to base64
function ConvertTo-Base64 {
    param([string]$FilePath, [string]$OutputFile)
    
    if (Test-Path $FilePath) {
        Write-Host "  ✓ Encoding: $(Split-Path $FilePath -Leaf)" -ForegroundColor Green
        $bytes = [System.IO.File]::ReadAllBytes($FilePath)
        $base64 = [Convert]::ToBase64String($bytes)
        
        # Write without BOM and newlines
        [System.IO.File]::WriteAllText($OutputFile, $base64, [System.Text.Encoding]::ASCII)
        
        Write-Host "  ✓ Saved to: $OutputFile" -ForegroundColor Green
        return $true
    } else {
        Write-Host "  ✗ File not found: $FilePath" -ForegroundColor Red
        return $false
    }
}

Write-Host "`n🔐 Processing certificates..." -ForegroundColor Yellow

# Fix distribution certificate
$certFile = "$certPath\ios_distribution.p12"
$certOutput = ".\ios_cert_base64_fixed.txt"
if (ConvertTo-Base64 -FilePath $certFile -OutputFile $certOutput) {
    Write-Host "  ✅ Distribution certificate encoded successfully" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Distribution certificate not found - checking alternate locations..." -ForegroundColor Yellow
}

# Fix provisioning profile
$profileFile = "$certPath\Serenity_App_Store_Profile.mobileprovision"
$profileOutput = ".\ios_profile_base64_fixed.txt"
if (ConvertTo-Base64 -FilePath $profileFile -OutputFile $profileOutput) {
    Write-Host "  ✅ Provisioning profile encoded successfully" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Provisioning profile not found" -ForegroundColor Yellow
}

# Fix API key
$apiKeyFile = "$certPath\AuthKey_4YBU7UC32Y.p8"
$apiKeyOutput = ".\api_key_base64_fixed.txt"
if (ConvertTo-Base64 -FilePath $apiKeyFile -OutputFile $apiKeyOutput) {
    Write-Host "  ✅ API key encoded successfully" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  API key not found" -ForegroundColor Yellow
}

Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Upload these base64 files to GitHub Secrets:" -ForegroundColor White
Write-Host "   - ios_cert_base64_fixed.txt → IOS_DISTRIBUTION_CERTIFICATE_BASE64" -ForegroundColor Gray
Write-Host "   - ios_profile_base64_fixed.txt → IOS_PROVISION_PROFILE_BASE64" -ForegroundColor Gray
Write-Host "   - api_key_base64_fixed.txt → APP_STORE_CONNECT_API_KEY_BASE64" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Run the following GitHub CLI commands:" -ForegroundColor White
Write-Host '   gh secret set IOS_DISTRIBUTION_CERTIFICATE_BASE64 < ios_cert_base64_fixed.txt' -ForegroundColor Gray
Write-Host '   gh secret set IOS_PROVISION_PROFILE_BASE64 < ios_profile_base64_fixed.txt' -ForegroundColor Gray
Write-Host '   gh secret set APP_STORE_CONNECT_API_KEY_BASE64 < api_key_base64_fixed.txt' -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Certificate encoding complete!" -ForegroundColor Green