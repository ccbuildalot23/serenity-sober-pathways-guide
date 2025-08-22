# AWS Inventory Scanner for Windows
$timestamp = Get-Date -Format "yyyyMMddTHHmmss"
$outFile = "ops/aws-inventory/$timestamp-full.txt"

Write-Output "=== AWS ACCOUNT & USER CONTEXT ===" | Out-File -FilePath $outFile
aws sts get-caller-identity | Out-File -FilePath $outFile -Append
Write-Output "" | Out-File -FilePath $outFile -Append

# Get all regions
$regions = aws ec2 describe-regions --query 'Regions[].RegionName' --output text
$regionArray = $regions -split '\s+'

Write-Output "=== CHECKING KEY SERVICES ACROSS ALL REGIONS ===" | Out-File -FilePath $outFile -Append

foreach ($region in $regionArray) {
    Write-Output "" | Out-File -FilePath $outFile -Append
    Write-Output "######## REGION: $region ########" | Out-File -FilePath $outFile -Append
    
    # EC2 Instances
    Write-Output "-- EC2 Instances --" | Out-File -FilePath $outFile -Append
    aws ec2 describe-instances --region $region --query 'Reservations[].Instances[].{Id:InstanceId,State:State.Name,Type:InstanceType}' --output table 2>>$null | Out-File -FilePath $outFile -Append
    
    # Lambda Functions
    Write-Output "-- Lambda Functions --" | Out-File -FilePath $outFile -Append
    aws lambda list-functions --region $region --query 'Functions[].FunctionName' --output text 2>>$null | Out-File -FilePath $outFile -Append
    
    # RDS Databases
    Write-Output "-- RDS Databases --" | Out-File -FilePath $outFile -Append
    aws rds describe-db-instances --region $region --query 'DBInstances[].DBInstanceIdentifier' --output text 2>>$null | Out-File -FilePath $outFile -Append
    
    # DynamoDB Tables
    Write-Output "-- DynamoDB Tables --" | Out-File -FilePath $outFile -Append
    aws dynamodb list-tables --region $region --query 'TableNames' --output text 2>>$null | Out-File -FilePath $outFile -Append
    
    # ECS Clusters
    Write-Output "-- ECS Clusters --" | Out-File -FilePath $outFile -Append
    aws ecs list-clusters --region $region --query 'clusterArns' --output text 2>>$null | Out-File -FilePath $outFile -Append
}

# Global Services (check once)
Write-Output "" | Out-File -FilePath $outFile -Append
Write-Output "######## GLOBAL SERVICES ########" | Out-File -FilePath $outFile -Append

# S3 Buckets
Write-Output "-- S3 Buckets --" | Out-File -FilePath $outFile -Append
aws s3api list-buckets --query 'Buckets[].Name' --output text | Out-File -FilePath $outFile -Append

# CloudFront Distributions
Write-Output "-- CloudFront Distributions --" | Out-File -FilePath $outFile -Append
aws cloudfront list-distributions --query 'DistributionList.Items[].Id' --output text 2>>$null | Out-File -FilePath $outFile -Append

# Route53 Hosted Zones
Write-Output "-- Route53 Hosted Zones --" | Out-File -FilePath $outFile -Append
aws route53 list-hosted-zones --query 'HostedZones[].Name' --output text 2>>$null | Out-File -FilePath $outFile -Append

Write-Output "Inventory saved to: $outFile"