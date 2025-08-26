# Setup Fastlane Match for iOS Deployment
Write-Host "Setting up Fastlane Match for iOS Deployment" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check if GitHub CLI is installed
if (-Not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "GitHub CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "   winget install GitHub.cli" -ForegroundColor Yellow
    exit 1
}

# Check if we're in a git repository
$repoInfo = gh repo view --json nameWithOwner 2>$null
if (-Not $repoInfo) {
    Write-Host "Not in a GitHub repository directory" -ForegroundColor Red
    exit 1
}

Write-Host "Prerequisites met" -ForegroundColor Green
Write-Host ""

# Function to generate secure password
function New-SecurePassword {
    param([int]$Length = 32)
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    $password = ""
    for ($i = 0; $i -lt $Length; $i++) {
        $password += $chars[(Get-Random -Maximum $chars.Length)]
    }
    return $password
}

# Function to set GitHub secret
function Set-GitHubSecretInteractive {
    param(
        [string]$SecretName,
        [string]$Prompt,
        [bool]$IsPassword = $false,
        [string]$DefaultValue = "",
        [bool]$GeneratePassword = $false
    )
    
    Write-Host "$Prompt" -ForegroundColor Yellow
    if ($DefaultValue) {
        Write-Host "  (Default: $DefaultValue)" -ForegroundColor Gray
    }
    
    if ($GeneratePassword) {
        $generate = Read-Host "  Generate secure password automatically? (y/n)"
        if ($generate -eq "y" -or $generate -eq "Y") {
            $generatedPassword = New-SecurePassword
            Write-Host "  Generated password: $generatedPassword" -ForegroundColor Green
            Write-Host "  SAVE THIS PASSWORD SECURELY!" -ForegroundColor Red
            $generatedPassword | gh secret set $SecretName
            Write-Host "  $SecretName set" -ForegroundColor Green
            return
        }
    }
    
    if ($IsPassword) {
        $value = Read-Host -AsSecureString "  Enter value"
        if ($value.Length -gt 0) {
            $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($value)
            $plainValue = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
            $plainValue | gh secret set $SecretName
        }
    } else {
        $value = Read-Host "  Enter value"
        if ($value) {
            $value | gh secret set $SecretName
        } elseif ($DefaultValue) {
            $DefaultValue | gh secret set $SecretName
        }
    }
    
    Write-Host "  $SecretName set" -ForegroundColor Green
}

Write-Host "Setting up Fastlane Match Secrets" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "We'll need to set up several secrets for Fastlane Match to work properly." -ForegroundColor White
Write-Host ""

# Step 1: Match Password
Write-Host "1. Match Password" -ForegroundColor Cyan
Write-Host "  This password encrypts your certificates in the git repository." -ForegroundColor Gray
Write-Host "  Choose a strong password and save it securely." -ForegroundColor Gray
Set-GitHubSecretInteractive -SecretName "MATCH_PASSWORD" -Prompt "Enter Match encryption password:" -IsPassword $true -GeneratePassword $true

# Step 2: GitHub Personal Access Token for Match
Write-Host ""
Write-Host "2. GitHub Personal Access Token" -ForegroundColor Cyan
Write-Host "  Match needs a GitHub token to access the certificates repository." -ForegroundColor Gray
Write-Host "  Create a token at: https://github.com/settings/tokens" -ForegroundColor Gray
Write-Host "  Required scopes: repo (full control)" -ForegroundColor Gray

$githubUsername = Read-Host "  Enter your GitHub username"
$githubToken = Read-Host -AsSecureString "  Enter your GitHub personal access token"
if ($githubToken.Length -gt 0) {
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($githubToken)
    $plainToken = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    
    # Create basic auth token (base64 encoded username:token)
    $authString = "${githubUsername}:${plainToken}"
    $authBytes = [System.Text.Encoding]::UTF8.GetBytes($authString)
    $authBase64 = [Convert]::ToBase64String($authBytes)
    
    $authBase64 | gh secret set MATCH_GIT_BASIC_AUTHORIZATION
    Write-Host "  MATCH_GIT_BASIC_AUTHORIZATION set" -ForegroundColor Green
}

# Step 3: Apple ID
Write-Host ""
Write-Host "3. Apple Developer Account" -ForegroundColor Cyan
Write-Host "  Your Apple ID email for the Developer account" -ForegroundColor Gray
Set-GitHubSecretInteractive -SecretName "APPLE_ID" -Prompt "Enter your Apple ID email:"

# Step 4: App-Specific Password
Write-Host ""
Write-Host "4. App-Specific Password" -ForegroundColor Cyan
Write-Host "  Required for 2FA-enabled Apple accounts" -ForegroundColor Gray
Write-Host "  Create one at: https://appleid.apple.com/account/manage" -ForegroundColor Gray
Write-Host "  Security > App-Specific Passwords > Generate Password" -ForegroundColor Gray
Set-GitHubSecretInteractive -SecretName "APPLE_APP_SPECIFIC_PASSWORD" -Prompt "Enter app-specific password:" -IsPassword $true

# Step 5: Optional - Match Keychain Password
Write-Host ""
Write-Host "5. Match Keychain Password (Optional)" -ForegroundColor Cyan
Write-Host "  Password for the temporary keychain in CI (can use default)" -ForegroundColor Gray
$useCustomKeychain = Read-Host "  Use custom keychain password? (y/n)"
if ($useCustomKeychain -eq "y") {
    Set-GitHubSecretInteractive -SecretName "MATCH_KEYCHAIN_PASSWORD" -Prompt "Enter keychain password:" -IsPassword $true -GeneratePassword $true
} else {
    # Set default keychain password
    $defaultKeychainPassword = New-SecurePassword -Length 16
    $defaultKeychainPassword | gh secret set MATCH_KEYCHAIN_PASSWORD
    Write-Host "  Default MATCH_KEYCHAIN_PASSWORD set" -ForegroundColor Green
}

# Use existing App Store Connect API credentials
Write-Host ""
Write-Host "6. Using Existing App Store Connect API Credentials" -ForegroundColor Cyan
Write-Host "  APP_STORE_CONNECT_API_KEY" -ForegroundColor Green
Write-Host "  APP_STORE_CONNECT_KEY_ID" -ForegroundColor Green  
Write-Host "  APP_STORE_CONNECT_ISSUER_ID" -ForegroundColor Green
Write-Host "  APPLE_TEAM_ID" -ForegroundColor Green

# Validate all secrets are set
Write-Host ""
Write-Host "Validating secrets..." -ForegroundColor Yellow

$requiredSecrets = @(
    "MATCH_PASSWORD",
    "MATCH_GIT_BASIC_AUTHORIZATION", 
    "APPLE_ID",
    "APPLE_APP_SPECIFIC_PASSWORD",
    "MATCH_KEYCHAIN_PASSWORD",
    "APP_STORE_CONNECT_API_KEY",
    "APP_STORE_CONNECT_KEY_ID",
    "APP_STORE_CONNECT_ISSUER_ID",
    "APPLE_TEAM_ID"
)

$secretsList = gh secret list --json name | ConvertFrom-Json
$existingSecrets = $secretsList | ForEach-Object { $_.name }

$missingSecrets = @()
foreach ($secret in $requiredSecrets) {
    if ($secret -notin $existingSecrets) {
        $missingSecrets += $secret
        Write-Host "  Missing: $secret" -ForegroundColor Red
    } else {
        Write-Host "  Found: $secret" -ForegroundColor Green
    }
}

if ($missingSecrets.Count -gt 0) {
    Write-Host ""
    Write-Host "Missing secrets detected. Please ensure all required secrets are configured." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Match Secrets Configuration Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Create the certificates repository:" -ForegroundColor White
Write-Host "   gh repo create serenity-ios-certificates --private" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Initialize Match locally (one-time setup):" -ForegroundColor White
Write-Host "   cd ios" -ForegroundColor Gray
Write-Host "   bundle exec fastlane match init" -ForegroundColor Gray
Write-Host "   bundle exec fastlane match appstore" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test the deployment:" -ForegroundColor White
Write-Host "   gh workflow run iOS-Deploy-with-Fastlane-Match" -ForegroundColor Gray
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Cyan
Write-Host "   https://docs.fastlane.tools/actions/match/" -ForegroundColor Gray