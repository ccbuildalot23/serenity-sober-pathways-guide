# Certificate Conversion and Validation Script for iOS Deployment
Write-Host "iOS Certificate Conversion and Validation Tool" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Check if OpenSSL is available
$opensslPath = Get-Command openssl -ErrorAction SilentlyContinue
if (-Not $opensslPath) {
    Write-Host "[ERROR] OpenSSL not found. Please install OpenSSL first." -ForegroundColor Red
    Write-Host "You can install it via:" -ForegroundColor Yellow
    Write-Host "  choco install openssl" -ForegroundColor Gray
    Write-Host "  OR download from: https://slproweb.com/products/Win32OpenSSL.html" -ForegroundColor Gray
    exit 1
}

# Certificate path
$certPath = "C:\ios-certs"

if (-Not (Test-Path $certPath)) {
    Write-Host "[ERROR] Certificate directory not found: $certPath" -ForegroundColor Red
    exit 1
}

Write-Host "Certificate directory: $certPath" -ForegroundColor Green
Write-Host ""

# Function to convert PFX to P12
function Convert-PfxToP12 {
    param(
        [string]$PfxFile,
        [string]$P12File,
        [string]$Password = ""
    )
    
    Write-Host "Converting $PfxFile to $P12File..." -ForegroundColor Yellow
    
    # PFX and P12 are the same format, just different extensions
    # But we'll re-export to ensure compatibility
    
    if ($Password) {
        $cmd = "openssl pkcs12 -in `"$PfxFile`" -out `"$P12File`" -passin pass:`"$Password`" -passout pass:`"$Password`" -legacy"
    } else {
        $cmd = "openssl pkcs12 -in `"$PfxFile`" -out `"$P12File`" -passin pass: -passout pass: -legacy"
    }
    
    $result = Invoke-Expression $cmd 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Conversion successful" -ForegroundColor Green
        return $true
    } else {
        Write-Host "[ERROR] Conversion failed: $result" -ForegroundColor Red
        return $false
    }
}

# Function to extract provisioning profile UUID
function Get-ProvisioningProfileUUID {
    param([string]$ProfileFile)
    
    Write-Host "Extracting UUID from provisioning profile..." -ForegroundColor Yellow
    
    # Decode the provisioning profile
    $tempFile = [System.IO.Path]::GetTempFileName()
    openssl smime -inform der -verify -noverify -in "$ProfileFile" -out $tempFile 2>$null
    
    if (Test-Path $tempFile) {
        # Extract UUID using regex
        $content = Get-Content $tempFile -Raw
        if ($content -match '<key>UUID</key>\s*<string>([A-F0-9\-]+)</string>') {
            $uuid = $matches[1]
            Write-Host "[OK] Profile UUID: $uuid" -ForegroundColor Green
            Remove-Item $tempFile
            return $uuid
        }
    }
    
    Write-Host "[ERROR] Could not extract UUID" -ForegroundColor Red
    Remove-Item $tempFile -ErrorAction SilentlyContinue
    return $null
}

# Function to validate certificate
function Test-Certificate {
    param(
        [string]$CertFile,
        [string]$Password = ""
    )
    
    Write-Host "Validating certificate: $CertFile" -ForegroundColor Yellow
    
    if ($Password) {
        $cmd = "openssl pkcs12 -info -in `"$CertFile`" -passin pass:`"$Password`" -noout"
    } else {
        $cmd = "openssl pkcs12 -info -in `"$CertFile`" -passin pass: -noout"
    }
    
    $result = Invoke-Expression $cmd 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Certificate is valid" -ForegroundColor Green
        
        # Extract certificate details
        if ($Password) {
            $details = openssl pkcs12 -in "$CertFile" -passin pass:"$Password" -nokeys -clcerts 2>$null | openssl x509 -noout -subject -dates
        } else {
            $details = openssl pkcs12 -in "$CertFile" -passin pass: -nokeys -clcerts 2>$null | openssl x509 -noout -subject -dates
        }
        
        Write-Host $details -ForegroundColor Gray
        return $true
    } else {
        Write-Host "[ERROR] Certificate validation failed" -ForegroundColor Red
        return $false
    }
}

Write-Host "=== Step 1: Check existing certificates ===" -ForegroundColor Cyan

# Check for PFX file
$pfxFile = "$certPath\ios_distribution.pfx"
$p12File = "$certPath\ios_distribution.p12"

if (Test-Path $pfxFile) {
    Write-Host "[OK] Found PFX certificate: $pfxFile" -ForegroundColor Green
    
    # Ask for password
    Write-Host "Enter certificate password (press Enter if none):" -ForegroundColor Yellow
    $securePassword = Read-Host -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $password = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    
    # Validate certificate
    if (Test-Certificate -CertFile $pfxFile -Password $password) {
        # Convert to P12
        if (-Not (Test-Path $p12File)) {
            Write-Host ""
            Write-Host "=== Step 2: Convert PFX to P12 ===" -ForegroundColor Cyan
            Convert-PfxToP12 -PfxFile $pfxFile -P12File $p12File -Password $password
        } else {
            Write-Host "[OK] P12 file already exists" -ForegroundColor Green
        }
    }
} elseif (Test-Path $p12File) {
    Write-Host "[OK] Found P12 certificate: $p12File" -ForegroundColor Green
} else {
    Write-Host "[ERROR] No certificate found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Step 3: Check provisioning profile ===" -ForegroundColor Cyan

$profileFile = "$certPath\Serenity_App_Store_Profile.mobileprovision"
if (Test-Path $profileFile) {
    Write-Host "[OK] Found provisioning profile" -ForegroundColor Green
    $uuid = Get-ProvisioningProfileUUID -ProfileFile $profileFile
} else {
    Write-Host "[ERROR] Provisioning profile not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Step 4: Check API key ===" -ForegroundColor Cyan

$apiKeyFile = "$certPath\AuthKey_4YBU7UC32Y.p8"
if (Test-Path $apiKeyFile) {
    Write-Host "[OK] Found API key" -ForegroundColor Green
    $keyContent = Get-Content $apiKeyFile -Raw
    if ($keyContent -match "-----BEGIN PRIVATE KEY-----") {
        Write-Host "[OK] API key format is valid" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] API key format may be incorrect" -ForegroundColor Yellow
    }
} else {
    Write-Host "[ERROR] API key not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host ""

# Create summary
$summary = @{
    "Certificate (.p12)" = if (Test-Path $p12File) { "Ready" } else { "Missing" }
    "Provisioning Profile" = if (Test-Path $profileFile) { "Ready" } else { "Missing" }
    "Profile UUID" = if ($uuid) { $uuid } else { "Unknown" }
    "API Key" = if (Test-Path $apiKeyFile) { "Ready" } else { "Missing" }
}

foreach ($key in $summary.Keys) {
    $value = $summary[$key]
    $color = if ($value -eq "Ready" -or $value -match "^[A-F0-9\-]+$") { "Green" } else { "Red" }
    Write-Host "$key : $value" -ForegroundColor $color
}

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
if ($summary.Values -contains "Missing") {
    Write-Host "1. Fix missing items above" -ForegroundColor Yellow
} else {
    Write-Host "1. All certificates are ready!" -ForegroundColor Green
}
Write-Host "2. Update GitHub Secrets with base64 encoded files" -ForegroundColor White
Write-Host "3. Run the deployment workflow" -ForegroundColor White