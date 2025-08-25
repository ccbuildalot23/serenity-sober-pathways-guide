# PowerShell script to set up GitHub Secrets for iOS deployment
Write-Host "🔐 Setting up GitHub Secrets for iOS Deployment" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is installed
if (-Not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ GitHub CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   winget install GitHub.cli" -ForegroundColor Yellow
    exit 1
}

# Check if we're in the right repository
$repoInfo = gh repo view --json nameWithOwner 2>$null
if (-Not $repoInfo) {
    Write-Host "❌ Not in a GitHub repository directory" -ForegroundColor Red
    exit 1
}

Write-Host "📱 Setting up secrets for iOS deployment..." -ForegroundColor Yellow
Write-Host ""

# Path to certificates
$certPath = "C:\ios-certs"

# Function to encode file and set secret
function Set-GitHubSecret {
    param(
        [string]$FilePath,
        [string]$SecretName,
        [string]$Description
    )
    
    if (Test-Path $FilePath) {
        Write-Host "✓ Found: $Description" -ForegroundColor Green
        $bytes = [System.IO.File]::ReadAllBytes($FilePath)
        $base64 = [Convert]::ToBase64String($bytes)
        $tempFile = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($tempFile, $base64, [System.Text.Encoding]::ASCII)
        
        Write-Host "  Setting secret: $SecretName..." -ForegroundColor Gray
        gh secret set $SecretName --body-file $tempFile
        Remove-Item $tempFile
        Write-Host "  ✅ Secret set successfully" -ForegroundColor Green
        return $true
    } else {
        Write-Host "⚠️ Not found: $FilePath" -ForegroundColor Yellow
        return $false
    }
}

# 1. Set App Store Connect API Key
Write-Host "`n1️⃣ App Store Connect API Key" -ForegroundColor Cyan
$apiKeyPath = "$certPath\AuthKey_4YBU7UC32Y.p8"
if (Set-GitHubSecret -FilePath $apiKeyPath -SecretName "APP_STORE_CONNECT_API_KEY" -Description "API Key") {
    # Also set the key content directly (not base64 for .p8 files)
    if (Test-Path $apiKeyPath) {
        $keyContent = Get-Content $apiKeyPath -Raw
        $keyContent | gh secret set APP_STORE_CONNECT_API_KEY
    }
}

# 2. Set Key ID and Issuer ID
Write-Host "`n2️⃣ App Store Connect Credentials" -ForegroundColor Cyan
Write-Host "  Setting KEY_ID: 4YBU7UC32Y" -ForegroundColor Gray
"4YBU7UC32Y" | gh secret set APP_STORE_CONNECT_KEY_ID

Write-Host "  Enter your Issuer ID (from App Store Connect):" -ForegroundColor Yellow
$issuerId = Read-Host "  Issuer ID"
if ($issuerId) {
    $issuerId | gh secret set APP_STORE_CONNECT_ISSUER_ID
    Write-Host "  ✅ Issuer ID set" -ForegroundColor Green
}

# 3. Set Distribution Certificate (optional)
Write-Host "`n3️⃣ Distribution Certificate (Optional)" -ForegroundColor Cyan
$certFile = "$certPath\ios_distribution.p12"
if (Test-Path $certFile) {
    Set-GitHubSecret -FilePath $certFile -SecretName "IOS_DISTRIBUTION_CERTIFICATE_BASE64" -Description "Distribution Certificate"
    
    Write-Host "  Enter certificate password (or press Enter to skip):" -ForegroundColor Yellow
    $certPassword = Read-Host -AsSecureString "  Password"
    if ($certPassword.Length -gt 0) {
        $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($certPassword)
        $plainPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
        $plainPassword | gh secret set IOS_DISTRIBUTION_CERTIFICATE_PASSWORD
        Write-Host "  ✅ Certificate password set" -ForegroundColor Green
    }
}

# 4. Set Provisioning Profile (optional)
Write-Host "`n4️⃣ Provisioning Profile (Optional)" -ForegroundColor Cyan
$profileFile = "$certPath\Serenity_App_Store_Profile.mobileprovision"
Set-GitHubSecret -FilePath $profileFile -SecretName "IOS_PROVISION_PROFILE_BASE64" -Description "Provisioning Profile"

# 5. Set Supabase credentials
Write-Host "`n5️⃣ Supabase Credentials" -ForegroundColor Cyan
Write-Host "  These are required for building the web assets" -ForegroundColor Gray

# Check if .env.local exists
$envFile = ".env.local"
if (Test-Path $envFile) {
    Write-Host "  Found .env.local file" -ForegroundColor Green
    $envContent = Get-Content $envFile
    
    foreach ($line in $envContent) {
        if ($line -match "^VITE_SUPABASE_URL=(.+)") {
            $matches[1] | gh secret set VITE_SUPABASE_URL
            Write-Host "  ✅ VITE_SUPABASE_URL set" -ForegroundColor Green
        }
        if ($line -match "^VITE_SUPABASE_ANON_KEY=(.+)") {
            $matches[1] | gh secret set VITE_SUPABASE_ANON_KEY
            Write-Host "  ✅ VITE_SUPABASE_ANON_KEY set" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  ⚠️ .env.local not found - you'll need to set these manually" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ GitHub Secrets setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary of configured secrets:" -ForegroundColor Cyan
gh secret list | Select-String "APP_STORE_CONNECT|IOS_|VITE_"

Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Verify all secrets are set correctly" -ForegroundColor White
Write-Host "2. Re-run the GitHub Actions workflow" -ForegroundColor White
Write-Host "3. Monitor the deployment at:" -ForegroundColor White
Write-Host "   https://github.com/ccbuildalot23/serenity-sober-pathways-guide/actions" -ForegroundColor Gray