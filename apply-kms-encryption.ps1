# AWS CloudTrail KMS Encryption Update Script
# This script updates the existing CloudTrail to use KMS encryption

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "CloudTrail KMS Encryption Update" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$AWS = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
$TRAIL_NAME = "serenity-hipaa-trail"
$KEY_ID = "d010b548-3af1-466c-9210-021e8e76af22"
$REGION = "us-east-1"
$ACCOUNT_ID = "662658456049"

# Step 1: Check current trail configuration
Write-Host "`nStep 1: Checking current CloudTrail configuration..." -ForegroundColor Yellow
$trailInfo = & "$AWS" cloudtrail describe-trails --trail-name-list $TRAIL_NAME --region $REGION 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Could not describe trail" -ForegroundColor Red
    Write-Host $trailInfo
    exit 1
}

$trailObj = $trailInfo | ConvertFrom-Json
$currentKms = $trailObj.trailList[0].KmsKeyId

if ($currentKms) {
    Write-Host "Trail already has KMS encryption with key: $currentKms" -ForegroundColor Yellow
} else {
    Write-Host "Trail currently has no KMS encryption" -ForegroundColor Green
}

# Step 2: Update KMS key policy
Write-Host "`nStep 2: Updating KMS key policy..." -ForegroundColor Yellow
$policyFile = Join-Path $PSScriptRoot "infrastructure\aws\kms-policy.json"

if (Test-Path $policyFile) {
    # First, get the full key ARN
    $keyInfo = & "$AWS" kms describe-key --key-id $KEY_ID --region $REGION 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $keyObj = $keyInfo | ConvertFrom-Json
        $fullKeyArn = $keyObj.KeyMetadata.Arn
        Write-Host "Full KMS Key ARN: $fullKeyArn" -ForegroundColor Green
        
        # Update key policy
        & "$AWS" kms put-key-policy --key-id $KEY_ID --policy-name default --policy file://$policyFile --region $REGION 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "KMS key policy updated successfully" -ForegroundColor Green
        } else {
            Write-Host "WARNING: Could not update key policy (may already be correct)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "ERROR: Could not describe KMS key" -ForegroundColor Red
        Write-Host $keyInfo
        exit 1
    }
} else {
    Write-Host "ERROR: KMS policy file not found at $policyFile" -ForegroundColor Red
    exit 1
}

# Step 3: Enable key rotation
Write-Host "`nStep 3: Enabling KMS key rotation..." -ForegroundColor Yellow
& "$AWS" kms enable-key-rotation --key-id $KEY_ID --region $REGION 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Key rotation enabled" -ForegroundColor Green
} else {
    Write-Host "WARNING: Could not enable key rotation (may already be enabled)" -ForegroundColor Yellow
}

# Step 4: Update CloudTrail with KMS encryption
Write-Host "`nStep 4: Applying KMS encryption to CloudTrail..." -ForegroundColor Yellow
$updateResult = & "$AWS" cloudtrail update-trail --name $TRAIL_NAME --kms-key-id arn:aws:kms:${REGION}:${ACCOUNT_ID}:key/${KEY_ID} --region $REGION 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "CloudTrail updated with KMS encryption!" -ForegroundColor Green
    $updateObj = $updateResult | ConvertFrom-Json
    Write-Host "KMS Key ID: $($updateObj.KmsKeyId)" -ForegroundColor Cyan
} else {
    Write-Host "ERROR: Failed to update CloudTrail with KMS" -ForegroundColor Red
    Write-Host $updateResult
    exit 1
}

# Step 5: Verify the update
Write-Host "`nStep 5: Verifying KMS encryption..." -ForegroundColor Yellow
$verifyResult = & "$AWS" cloudtrail describe-trails --trail-name-list $TRAIL_NAME --region $REGION 2>&1

if ($LASTEXITCODE -eq 0) {
    $verifyObj = $verifyResult | ConvertFrom-Json
    $kmsKey = $verifyObj.trailList[0].KmsKeyId
    
    if ($kmsKey) {
        Write-Host "✅ SUCCESS: CloudTrail is now encrypted with KMS key:" -ForegroundColor Green
        Write-Host "   $kmsKey" -ForegroundColor Cyan
    } else {
        Write-Host "❌ ERROR: KMS encryption not showing in trail configuration" -ForegroundColor Red
    }
} else {
    Write-Host "ERROR: Could not verify trail configuration" -ForegroundColor Red
}

# Step 6: Check trail status
Write-Host "`nStep 6: Checking trail logging status..." -ForegroundColor Yellow
$statusResult = & "$AWS" cloudtrail get-trail-status --name $TRAIL_NAME --region $REGION 2>&1

if ($LASTEXITCODE -eq 0) {
    $statusObj = $statusResult | ConvertFrom-Json
    if ($statusObj.IsLogging) {
        Write-Host "✅ Trail is actively logging" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Trail is not logging. Starting..." -ForegroundColor Yellow
        & "$AWS" cloudtrail start-logging --name $TRAIL_NAME --region $REGION
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "KMS Encryption Update Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Wait 5-15 minutes for new encrypted logs" -ForegroundColor White
Write-Host "2. Check S3 bucket for encrypted log files" -ForegroundColor White
Write-Host "3. Verify in AWS Console: https://console.aws.amazon.com/cloudtrail" -ForegroundColor White