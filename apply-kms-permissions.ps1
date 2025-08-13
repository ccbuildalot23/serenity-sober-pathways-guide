# Apply KMS permissions to CloudTrail admin user
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Applying KMS Permissions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$AWS = "C:\Program Files\Amazon\AWSCLIV2\aws.exe"
$USER_NAME = "cloudtrail-admin"
$POLICY_NAME = "CloudTrailKMSPolicy"
$POLICY_FILE = "infrastructure\aws\iam-kms-cloudtrail-policy.json"

Write-Host "`nApplying KMS policy to user: $USER_NAME" -ForegroundColor Yellow

# Apply the policy
& "$AWS" iam put-user-policy `
    --user-name $USER_NAME `
    --policy-name $POLICY_NAME `
    --policy-document file://$POLICY_FILE 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ KMS policy applied successfully!" -ForegroundColor Green
    Write-Host "`nYou can now run the KMS encryption script:" -ForegroundColor Yellow
    Write-Host "  powershell.exe -ExecutionPolicy Bypass -File apply-kms-encryption.ps1" -ForegroundColor Cyan
} else {
    Write-Host "❌ Failed to apply policy" -ForegroundColor Red
    Write-Host "You may need admin/root account access to grant these permissions" -ForegroundColor Yellow
}