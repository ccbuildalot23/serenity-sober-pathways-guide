# iOS Certificate Encoding Script for GitHub Secrets
# This script helps properly encode iOS certificates and provisioning profiles for GitHub Actions

param(
    [Parameter(Mandatory = $false)]
    [string]$CertificatePath,
    
    [Parameter(Mandatory = $false)]
    [string]$ProvisioningProfilePath,
    
    [Parameter(Mandatory = $false)]
    [switch]$Interactive,
    
    [Parameter(Mandatory = $false)]
    [switch]$Validate
)

Write-Host "=================================================================================" -ForegroundColor Cyan
Write-Host "  Serenity iOS Certificate Encoder for GitHub Secrets" -ForegroundColor Cyan
Write-Host "  HIPAA-Compliant Healthcare App Deployment Tool" -ForegroundColor Cyan
Write-Host "=================================================================================" -ForegroundColor Cyan
Write-Host ""

function Test-FileExists {
    param([string]$Path, [string]$Description)
    
    if (-not (Test-Path $Path)) {
        Write-Host "❌ ERROR: $Description not found at: $Path" -ForegroundColor Red
        return $false
    }
    
    Write-Host "✅ Found $Description at: $Path" -ForegroundColor Green
    return $true
}

function Encode-ToBase64 {
    param([string]$FilePath, [string]$Description)
    
    Write-Host "🔧 Encoding $Description..." -ForegroundColor Yellow
    
    try {
        $bytes = [System.IO.File]::ReadAllBytes($FilePath)
        $base64 = [System.Convert]::ToBase64String($bytes)
        
        Write-Host "✅ Successfully encoded $Description" -ForegroundColor Green
        Write-Host "📏 Length: $($base64.Length) characters" -ForegroundColor Cyan
        
        return $base64
    }
    catch {
        Write-Host "❌ ERROR encoding $Description`: $_" -ForegroundColor Red
        return $null
    }
}

function Show-SecretConfiguration {
    param([hashtable]$Secrets)
    
    Write-Host ""
    Write-Host "=================================================================================" -ForegroundColor Cyan
    Write-Host "  GitHub Secrets Configuration" -ForegroundColor Cyan
    Write-Host "=================================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Configure these secrets in your GitHub repository:" -ForegroundColor Yellow
    Write-Host "Settings > Secrets and variables > Actions > New repository secret" -ForegroundColor Gray
    Write-Host ""
    
    foreach ($secret in $Secrets.GetEnumerator()) {
        Write-Host "Secret Name: " -NoNewline -ForegroundColor White
        Write-Host "$($secret.Key)" -ForegroundColor Cyan
        Write-Host "Secret Value: " -NoNewline -ForegroundColor White
        
        if ($secret.Value.Length -gt 50) {
            Write-Host "$($secret.Value.Substring(0, 50))..." -ForegroundColor Green
        } else {
            Write-Host "$($secret.Value)" -ForegroundColor Green
        }
        Write-Host ""
    }
}

function Validate-Certificate {
    param([string]$Base64Content)
    
    Write-Host "🔍 Validating certificate format..." -ForegroundColor Yellow
    
    try {
        $bytes = [System.Convert]::FromBase64String($Base64Content)
        
        # Check if it looks like a PKCS#12 file (starts with specific bytes)
        if ($bytes.Length -lt 4) {
            Write-Host "❌ Certificate file too small" -ForegroundColor Red
            return $false
        }
        
        # Basic validation - PKCS#12 files typically start with specific byte patterns
        if ($bytes[0] -eq 0x30) {
            Write-Host "✅ Certificate format appears valid (PKCS#12)" -ForegroundColor Green
            return $true
        } else {
            Write-Host "⚠️  Warning: Certificate format may be incorrect" -ForegroundColor Yellow
            return $true # Still return true as some valid certs may have different headers
        }
    }
    catch {
        Write-Host "❌ ERROR: Invalid base64 encoding" -ForegroundColor Red
        return $false
    }
}

function Show-NextSteps {
    Write-Host ""
    Write-Host "=================================================================================" -ForegroundColor Cyan
    Write-Host "  Next Steps" -ForegroundColor Cyan
    Write-Host "=================================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. 🔐 Configure GitHub Secrets:" -ForegroundColor Yellow
    Write-Host "   - Go to your repository on GitHub" -ForegroundColor White
    Write-Host "   - Navigate: Settings > Secrets and variables > Actions" -ForegroundColor White
    Write-Host "   - Add each secret shown above" -ForegroundColor White
    Write-Host ""
    Write-Host "2. 🍎 Verify Apple Developer Configuration:" -ForegroundColor Yellow
    Write-Host "   - Team ID: XDY458RQ59" -ForegroundColor White
    Write-Host "   - Bundle ID: com.serenity.recovery" -ForegroundColor White
    Write-Host "   - Profile Name: Serenity App Store Profile" -ForegroundColor White
    Write-Host ""
    Write-Host "3. 🚀 Test Deployment:" -ForegroundColor Yellow
    Write-Host "   - Run the iOS deployment workflow" -ForegroundColor White
    Write-Host "   - Monitor build logs for certificate import success" -ForegroundColor White
    Write-Host ""
    Write-Host "4. 📱 Verify App Store Connect:" -ForegroundColor Yellow
    Write-Host "   - Check TestFlight for uploaded build" -ForegroundColor White
    Write-Host "   - Submit for App Store review" -ForegroundColor White
    Write-Host ""
}

function Show-TroubleshootingTips {
    Write-Host ""
    Write-Host "=================================================================================" -ForegroundColor Cyan
    Write-Host "  Troubleshooting Tips" -ForegroundColor Cyan
    Write-Host "=================================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "If you encounter 'Unable to decode the provided data':" -ForegroundColor Yellow
    Write-Host "• Ensure the .p12 certificate includes the private key" -ForegroundColor White
    Write-Host "• Verify the certificate is exported from Keychain Access" -ForegroundColor White
    Write-Host "• Check that the certificate password is correct" -ForegroundColor White
    Write-Host "• Make sure the certificate is not expired" -ForegroundColor White
    Write-Host ""
    Write-Host "If you encounter provisioning profile issues:" -ForegroundColor Yellow
    Write-Host "• Verify the profile contains your distribution certificate" -ForegroundColor White
    Write-Host "• Check that the bundle ID matches exactly: com.serenity.recovery" -ForegroundColor White
    Write-Host "• Ensure the profile is for App Store distribution" -ForegroundColor White
    Write-Host ""
}

# Main script logic
if ($Interactive) {
    Write-Host "📝 Interactive Mode - Please provide file paths" -ForegroundColor Yellow
    Write-Host ""
    
    $CertificatePath = Read-Host "Enter path to iOS distribution certificate (.p12 file)"
    $ProvisioningProfilePath = Read-Host "Enter path to provisioning profile (.mobileprovision file)"
}

if (-not $CertificatePath -or -not $ProvisioningProfilePath) {
    Write-Host ""
    Write-Host "📋 Usage:" -ForegroundColor Yellow
    Write-Host "  .\certificate-encoder.ps1 -CertificatePath 'path\to\cert.p12' -ProvisioningProfilePath 'path\to\profile.mobileprovision'" -ForegroundColor White
    Write-Host "  .\certificate-encoder.ps1 -Interactive" -ForegroundColor White
    Write-Host ""
    Write-Host "📁 Expected file locations:" -ForegroundColor Yellow
    Write-Host "  Certificate: Usually named like 'ios_distribution.p12'" -ForegroundColor White
    Write-Host "  Profile: Usually named like 'Serenity_App_Store_Profile.mobileprovision'" -ForegroundColor White
    Write-Host ""
    
    Show-TroubleshootingTips
    exit 1
}

# Validate input files
if (-not (Test-FileExists $CertificatePath "iOS Certificate")) {
    exit 1
}

if (-not (Test-FileExists $ProvisioningProfilePath "Provisioning Profile")) {
    exit 1
}

# Encode files
Write-Host ""
Write-Host "🔄 Starting encoding process..." -ForegroundColor Yellow

$certBase64 = Encode-ToBase64 $CertificatePath "iOS Distribution Certificate"
if (-not $certBase64) {
    exit 1
}

$profileBase64 = Encode-ToBase64 $ProvisioningProfilePath "Provisioning Profile"
if (-not $profileBase64) {
    exit 1
}

# Validation
if ($Validate) {
    Write-Host ""
    if (-not (Validate-Certificate $certBase64)) {
        Write-Host "❌ Certificate validation failed" -ForegroundColor Red
        exit 1
    }
}

# Prompt for certificate password
Write-Host ""
$certPassword = Read-Host "Enter the password for the iOS certificate (.p12 file)" -AsSecureString
$certPasswordText = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($certPassword))

# Generate keychain password
$keychainPassword = -join ((1..16) | ForEach-Object { Get-Random -InputObject ([char[]](65..90 + 97..122 + 48..57)) })

# Prepare secrets
$secrets = @{
    "IOS_CERTIFICATE" = $certBase64
    "IOS_CERTIFICATE_PASSWORD" = $certPasswordText
    "IOS_PROVISION_PROFILE" = $profileBase64
    "KEYCHAIN_PASSWORD" = $keychainPassword
    "APPLE_TEAM_ID" = "XDY458RQ59"
    "PROVISIONING_PROFILE_NAME" = "Serenity App Store Profile"
}

# Display results
Show-SecretConfiguration $secrets
Show-NextSteps

# Save to file for reference (excluding sensitive data)
$outputPath = "certificate-config-reference.txt"
$configContent = @"
iOS Certificate Configuration Reference
Generated: $(Get-Date)

Required GitHub Secrets:
- IOS_CERTIFICATE: [Base64 encoded certificate - $(($certBase64).Length) chars]
- IOS_CERTIFICATE_PASSWORD: [Certificate password provided]
- IOS_PROVISION_PROFILE: [Base64 encoded profile - $(($profileBase64).Length) chars]
- KEYCHAIN_PASSWORD: [Generated secure password]
- APPLE_TEAM_ID: XDY458RQ59
- PROVISIONING_PROFILE_NAME: Serenity App Store Profile

Bundle Configuration:
- Bundle ID: com.serenity.recovery
- Team ID: XDY458RQ59
- Profile Name: Serenity App Store Profile

Files Processed:
- Certificate: $CertificatePath
- Profile: $ProvisioningProfilePath

Next Steps:
1. Add secrets to GitHub repository
2. Test iOS deployment workflow
3. Monitor TestFlight for uploaded build
"@

$configContent | Out-File -FilePath $outputPath -Encoding UTF8
Write-Host "📄 Configuration reference saved to: $outputPath" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Certificate encoding completed successfully!" -ForegroundColor Green
Write-Host "🔐 Ready for GitHub Actions deployment" -ForegroundColor Cyan