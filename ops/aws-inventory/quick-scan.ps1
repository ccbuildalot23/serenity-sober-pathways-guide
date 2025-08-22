$timestamp = Get-Date -Format "yyyyMMddTHHmmss"
$outFile = "ops/aws-inventory/$timestamp-scan.txt"

Write-Output "=== AWS Quick Inventory Scan ===" | Out-File -FilePath $outFile
Write-Output "Timestamp: $timestamp" | Out-File -FilePath $outFile -Append
Write-Output "" | Out-File -FilePath $outFile -Append

# Account Info
Write-Output "=== ACCOUNT INFO ===" | Out-File -FilePath $outFile -Append
aws sts get-caller-identity | Out-File -FilePath $outFile -Append

# S3 Buckets (Global)
Write-Output "" | Out-File -FilePath $outFile -Append
Write-Output "=== S3 BUCKETS ===" | Out-File -FilePath $outFile -Append
aws s3 ls | Out-File -FilePath $outFile -Append

# Check common regions for resources
$regions = @("us-east-1", "us-west-2", "eu-west-1")

foreach ($region in $regions) {
    Write-Output "" | Out-File -FilePath $outFile -Append
    Write-Output "=== REGION: $region ===" | Out-File -FilePath $outFile -Append
    
    # CloudTrail
    Write-Output "-- CloudTrail --" | Out-File -FilePath $outFile -Append
    aws cloudtrail describe-trails --region $region 2>>$null | Out-File -FilePath $outFile -Append
    
    # KMS Keys
    Write-Output "-- KMS Keys --" | Out-File -FilePath $outFile -Append
    aws kms list-keys --region $region 2>>$null | Out-File -FilePath $outFile -Append
    
    # CloudWatch Logs
    Write-Output "-- CloudWatch Log Groups --" | Out-File -FilePath $outFile -Append
    aws logs describe-log-groups --region $region --max-items 10 2>>$null | Out-File -FilePath $outFile -Append
}

Write-Output "Scan complete. Results saved to: $outFile"
Get-Content $outFile