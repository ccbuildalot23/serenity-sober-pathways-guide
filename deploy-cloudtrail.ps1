# AWS CloudTrail HIPAA Deployment Script for Windows
# Account: 662658456049
# Region: us-east-1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "AWS CloudTrail HIPAA Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Variables
$AWS_REGION = "us-east-1"
$TRAIL_NAME = "serenity-hipaa-trail"
$BUCKET_NAME = "serenity-logs-662658456049-1755106249"
$KMS_ALIAS = "alias/serenity-cloudtrail"
$USER_NAME = "serenity-deployment"

# Step 1: Check AWS CLI
Write-Host "`nStep 1: Checking AWS CLI..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    Write-Host "AWS CLI found: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: AWS CLI not found. Please install from AWSCLIV2.msi" -ForegroundColor Red
    exit 1
}

# Step 2: Check credentials
Write-Host "`nStep 2: Checking AWS credentials..." -ForegroundColor Yellow
$identity = aws sts get-caller-identity --region $AWS_REGION 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: AWS credentials not configured" -ForegroundColor Red
    Write-Host "Please run: aws configure" -ForegroundColor Yellow
    Write-Host "Enter your Access Key ID, Secret Access Key, and set region to: us-east-1" -ForegroundColor Yellow
    exit 1
} else {
    $identityObj = $identity | ConvertFrom-Json
    Write-Host "Authenticated as: $($identityObj.Arn)" -ForegroundColor Green
}

# Step 3: Apply IAM policy
Write-Host "`nStep 3: Applying IAM policy to deployment user..." -ForegroundColor Yellow
$policyPath = Join-Path $PSScriptRoot "infrastructure\aws\iam-cloudtrail-policy.json"

if (Test-Path $policyPath) {
    aws iam put-user-policy `
        --user-name $USER_NAME `
        --policy-name CloudTrailDeploymentPolicy `
        --policy-document file://$policyPath `
        --region $AWS_REGION 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "IAM policy applied successfully" -ForegroundColor Green
    } else {
        Write-Host "WARNING: Could not apply policy (may already exist or user missing)" -ForegroundColor Yellow
        
        # Check if user exists
        $userExists = aws iam get-user --user-name $USER_NAME 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Creating user: $USER_NAME" -ForegroundColor Yellow
            aws iam create-user --user-name $USER_NAME --region $AWS_REGION
        }
    }
} else {
    Write-Host "ERROR: IAM policy file not found at $policyPath" -ForegroundColor Red
    exit 1
}

# Step 4: Deploy with Terraform
Write-Host "`nStep 4: Checking Terraform..." -ForegroundColor Yellow
$terraformPath = Join-Path $PSScriptRoot "infrastructure\terraform\cloudtrail-hipaa"

if (-not (Test-Path $terraformPath)) {
    Write-Host "ERROR: Terraform configuration not found at $terraformPath" -ForegroundColor Red
    exit 1
}

Set-Location $terraformPath

try {
    terraform version | Out-Null
    Write-Host "Terraform found" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Terraform not installed" -ForegroundColor Red
    Write-Host "Please install from: https://www.terraform.io/downloads" -ForegroundColor Yellow
    exit 1
}

# Step 5: Initialize Terraform
Write-Host "`nStep 5: Initializing Terraform..." -ForegroundColor Yellow
terraform init

# Step 6: Create terraform.tfvars
Write-Host "`nStep 6: Creating terraform.tfvars..." -ForegroundColor Yellow
@"
region              = "$AWS_REGION"
trail_name          = "$TRAIL_NAME"
logs_bucket_name    = "$BUCKET_NAME"
kms_key_alias       = "$KMS_ALIAS"
phi_bucket_name     = "serenity-phi-data"
create_bucket       = false
s3_retention_days   = 2555
cloudwatch_retention_days = 90
tags = {
  Environment = "production"
  Compliance  = "HIPAA"
  Service     = "CloudTrail"
  ManagedBy   = "Terraform"
}
"@ | Out-File -FilePath "terraform.tfvars" -Encoding ASCII

Write-Host "terraform.tfvars created" -ForegroundColor Green

# Step 7: Plan deployment
Write-Host "`nStep 7: Planning Terraform deployment..." -ForegroundColor Yellow
terraform plan -out=cloudtrail.tfplan

# Step 8: Apply configuration
Write-Host "`nStep 8: Ready to apply Terraform configuration" -ForegroundColor Yellow
Write-Host "This will create CloudTrail resources in your AWS account" -ForegroundColor Yellow
$confirm = Read-Host "Do you want to proceed? (yes/no)"

if ($confirm -eq "yes") {
    terraform apply cloudtrail.tfplan
} else {
    Write-Host "Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

# Step 9: Return to project root
Set-Location $PSScriptRoot

# Step 10: Validate deployment
Write-Host "`nStep 10: Validating CloudTrail deployment..." -ForegroundColor Yellow
$trailStatus = aws cloudtrail get-trail-status --name $TRAIL_NAME --region $AWS_REGION 2>&1

if ($LASTEXITCODE -eq 0) {
    $statusObj = $trailStatus | ConvertFrom-Json
    if ($statusObj.IsLogging) {
        Write-Host "CloudTrail is ACTIVE and logging!" -ForegroundColor Green
    } else {
        Write-Host "CloudTrail created but not logging. Starting logging..." -ForegroundColor Yellow
        aws cloudtrail start-logging --name $TRAIL_NAME --region $AWS_REGION
    }
} else {
    Write-Host "ERROR: Could not verify CloudTrail status" -ForegroundColor Red
}

# Step 11: Check S3 bucket
Write-Host "`nStep 11: Checking S3 bucket for logs..." -ForegroundColor Yellow
$s3Files = aws s3 ls s3://$BUCKET_NAME/hipaa-logs/ --recursive --region $AWS_REGION 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "S3 bucket accessible" -ForegroundColor Green
} else {
    Write-Host "WARNING: Cannot access S3 bucket (this may be normal if just created)" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "CloudTrail HIPAA Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Verify in AWS Console: https://console.aws.amazon.com/cloudtrail" -ForegroundColor White
Write-Host "2. Check S3 bucket for logs (may take 5-15 minutes)" -ForegroundColor White
Write-Host "3. Configure CloudWatch alarms for critical events" -ForegroundColor White
Write-Host "4. Document configuration for HIPAA audit" -ForegroundColor White