@echo off
echo ========================================
echo AWS CloudTrail HIPAA Deployment
echo Account: 662658456049
echo Region: us-east-1
echo ========================================

REM Variables
set AWS_REGION=us-east-1
set TRAIL_NAME=serenity-hipaa-trail
set BUCKET_NAME=serenity-logs-662658456049-1755106249
set KMS_ALIAS=alias/serenity-cloudtrail

echo.
echo Step 1: Checking AWS CLI...
aws --version
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: AWS CLI not found. Please install from AWSCLIV2.msi
    pause
    exit /b 1
)

echo.
echo Step 2: Configuring AWS credentials...
echo Please ensure you have run: aws configure
echo Required: Access Key, Secret Key, Region: us-east-1
pause

echo.
echo Step 3: Applying IAM policy to deployment user...
aws iam put-user-policy ^
  --user-name serenity-deployment ^
  --policy-name CloudTrailDeploymentPolicy ^
  --policy-document file://infrastructure/aws/iam-cloudtrail-policy.json ^
  --region %AWS_REGION%

if %ERRORLEVEL% NEQ 0 (
    echo WARNING: Policy might already exist or user needs to be created
    echo Continuing...
)

echo.
echo Step 4: Initializing Terraform...
cd infrastructure\terraform\cloudtrail-hipaa

REM Check if Terraform is installed
terraform version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Terraform not installed. Please install from https://www.terraform.io/downloads
    pause
    exit /b 1
)

REM Initialize Terraform
terraform init

echo.
echo Step 5: Creating terraform.tfvars...
(
echo region              = "%AWS_REGION%"
echo trail_name          = "%TRAIL_NAME%"
echo logs_bucket_name    = "%BUCKET_NAME%"
echo kms_key_alias       = "%KMS_ALIAS%"
echo phi_bucket_name     = "serenity-phi-data"
echo create_bucket       = false
echo s3_retention_days   = 2555
echo cloudwatch_retention_days = 90
echo tags = {
echo   Environment = "production"
echo   Compliance  = "HIPAA"
echo   Service     = "CloudTrail"
echo   ManagedBy   = "Terraform"
echo }
) > terraform.tfvars

echo.
echo Step 6: Planning Terraform deployment...
terraform plan -out=cloudtrail.tfplan

echo.
echo Step 7: Ready to apply Terraform configuration
echo This will create CloudTrail resources in your AWS account
pause

terraform apply cloudtrail.tfplan

echo.
echo Step 8: Returning to project root...
cd ..\..\..

echo.
echo Step 9: Validating CloudTrail deployment...
aws cloudtrail get-trail-status --name %TRAIL_NAME% --region %AWS_REGION%

echo.
echo ========================================
echo CloudTrail HIPAA Deployment Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Verify CloudTrail is logging in AWS Console
echo 2. Check S3 bucket for log files
echo 3. Configure CloudWatch alarms
echo 4. Document for audit compliance
echo.
pause