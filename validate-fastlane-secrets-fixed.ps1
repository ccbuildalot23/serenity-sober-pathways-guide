# Validate Fastlane Match Secrets Configuration
Write-Host "Validating Fastlane Match Secrets Configuration" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Required secrets for Fastlane Match
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

# Get current secrets
Write-Host "Checking current repository secrets..." -ForegroundColor Yellow

try {
    $secretsList = gh secret list --json name | ConvertFrom-Json
    $existingSecrets = $secretsList | ForEach-Object { $_.name }
    
    $foundSecrets = @()
    $missingSecrets = @()
    
    foreach ($secret in $requiredSecrets) {
        if ($secret -in $existingSecrets) {
            $foundSecrets += $secret
            Write-Host "  Found: $secret" -ForegroundColor Green
        } else {
            $missingSecrets += $secret
            Write-Host "  Missing: $secret" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Summary:" -ForegroundColor Cyan
    Write-Host "  Found: $($foundSecrets.Count)/$($requiredSecrets.Count) required secrets" -ForegroundColor White
    
    if ($missingSecrets.Count -eq 0) {
        Write-Host "  All required Fastlane Match secrets are configured!" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Next Steps:" -ForegroundColor Cyan
        Write-Host "1. Ensure certificates repository exists" -ForegroundColor White
        Write-Host "2. Test Fastlane Match workflow" -ForegroundColor White
        
    } else {
        Write-Host "  Missing secrets need to be configured:" -ForegroundColor Red
        foreach ($secret in $missingSecrets) {
            Write-Host "    - $secret" -ForegroundColor Yellow
        }
        
        Write-Host ""
        Write-Host "Missing Secret Details:" -ForegroundColor Cyan
        
        foreach ($secret in $missingSecrets) {
            if ($secret -eq "APPLE_ID") {
                Write-Host "  APPLE_ID:" -ForegroundColor Yellow
                Write-Host "    Your Apple Developer account email" -ForegroundColor Gray
            }
            if ($secret -eq "APPLE_APP_SPECIFIC_PASSWORD") {
                Write-Host "  APPLE_APP_SPECIFIC_PASSWORD:" -ForegroundColor Yellow
                Write-Host "    App-specific password for 2FA Apple accounts" -ForegroundColor Gray
                Write-Host "    Create at: https://appleid.apple.com/account/manage" -ForegroundColor Gray
            }
        }
    }
    
    Write-Host ""
    Write-Host "Configuration Status:" -ForegroundColor Cyan

    if ($missingSecrets.Count -eq 0) {
        Write-Host "  READY: Fastlane Match is properly configured" -ForegroundColor Green
    } else {
        Write-Host "  NOT READY: $($missingSecrets.Count) secrets missing" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Error retrieving secrets: $($_.Exception.Message)" -ForegroundColor Red
}