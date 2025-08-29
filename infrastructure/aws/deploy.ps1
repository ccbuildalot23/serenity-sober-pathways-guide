# Serenity Healthcare Platform - AWS Infrastructure Deployment Script (PowerShell)
# HIPAA-compliant infrastructure deployment with comprehensive monitoring

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('development', 'staging', 'production')]
    [string]$Environment = 'production',
    
    [Parameter(Mandatory=$false)]
    [string]$Region = 'us-east-1',
    
    [Parameter(Mandatory=$false)]
    [ValidateSet('plan', 'apply', 'destroy')]
    [string]$Action = 'plan',
    
    [Parameter(Mandatory=$false)]
    [switch]$AutoApprove,
    
    [Parameter(Mandatory=$false)]
    [switch]$Destroy,
    
    [Parameter(Mandatory=$false)]
    [switch]$ValidateOnly,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help
)

# Script configuration
$ProjectName = "serenity"
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$LogFile = "deployment-$Timestamp.log"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Set Action to destroy if Destroy switch is used
if ($Destroy) {
    $Action = 'destroy'
}

# Functions
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Level`: $Message"
    
    switch ($Level) {
        "ERROR" { Write-Host $logMessage -ForegroundColor Red }
        "WARN"  { Write-Host $logMessage -ForegroundColor Yellow }
        "INFO"  { Write-Host $logMessage -ForegroundColor Green }
        "DEBUG" { Write-Host $logMessage -ForegroundColor Blue }
        default { Write-Host $logMessage }
    }
    
    Add-Content -Path $LogFile -Value $logMessage
}

function Write-Error-Log {
    param([string]$Message)
    Write-Log -Message $Message -Level "ERROR"
    exit 1
}

function Write-Warning-Log {
    param([string]$Message)
    Write-Log -Message $Message -Level "WARN"
}

function Write-Info-Log {
    param([string]$Message)
    Write-Log -Message $Message -Level "DEBUG"
}

function Show-Usage {
    Write-Host @"
Usage: .\deploy.ps1 [OPTIONS]

Deploy Serenity Healthcare Platform AWS Infrastructure

PARAMETERS:
    -Environment        Environment name (development|staging|production) [default: production]
    -Region            AWS region [default: us-east-1]
    -Action            Terraform action (plan|apply|destroy) [default: plan]
    -AutoApprove       Auto-approve Terraform changes
    -Destroy           Destroy infrastructure
    -ValidateOnly      Only validate Terraform configuration
    -Help              Show this help message

EXAMPLES:
    .\deploy.ps1 -Environment production -Action plan
    .\deploy.ps1 -Environment production -Action apply -AutoApprove
    .\deploy.ps1 -Environment staging -Action apply
    .\deploy.ps1 -Environment production -Destroy -AutoApprove
    .\deploy.ps1 -ValidateOnly

"@
}

function Test-Prerequisites {
    Write-Info-Log "Checking prerequisites..."
    
    # Check AWS CLI
    try {
        $null = Get-Command aws -ErrorAction Stop
    }
    catch {
        Write-Error-Log "AWS CLI is not installed or not in PATH"
    }
    
    # Check Terraform
    try {
        $null = Get-Command terraform -ErrorAction Stop
    }
    catch {
        Write-Error-Log "Terraform is not installed or not in PATH"
    }
    
    # Check AWS credentials
    try {
        $null = aws sts get-caller-identity 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "AWS credentials check failed"
        }
    }
    catch {
        Write-Error-Log "AWS credentials are not configured or invalid"
    }
    
    # Get AWS account information
    try {
        $awsAccountId = aws sts get-caller-identity --query Account --output text
        $awsUser = aws sts get-caller-identity --query Arn --output text
        Write-Info-Log "AWS Account ID: $awsAccountId"
        Write-Info-Log "AWS User: $awsUser"
        
        # Store for later use
        $script:AwsAccountId = $awsAccountId
    }
    catch {
        Write-Error-Log "Failed to get AWS account information"
    }
    
    Write-Log "Prerequisites check completed successfully"
}

function Initialize-TerraformBackend {
    Write-Info-Log "Setting up Terraform backend..."
    
    $bucketName = "$ProjectName-terraform-state-$($script:AwsAccountId)-$Region"
    $dynamodbTable = "$ProjectName-terraform-locks"
    
    # Create S3 bucket for state if it doesn't exist
    try {
        $null = aws s3api head-bucket --bucket $bucketName 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Info-Log "Creating S3 bucket for Terraform state: $bucketName"
            
            if ($Region -eq "us-east-1") {
                aws s3api create-bucket --bucket $bucketName --region $Region
            }
            else {
                aws s3api create-bucket --bucket $bucketName --region $Region --create-bucket-configuration LocationConstraint=$Region
            }
            
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to create S3 bucket"
            }
            
            # Enable versioning
            aws s3api put-bucket-versioning --bucket $bucketName --versioning-configuration Status=Enabled
            
            # Enable encryption
            $encryptionConfig = @{
                Rules = @(
                    @{
                        ApplyServerSideEncryptionByDefault = @{
                            SSEAlgorithm = "AES256"
                        }
                    }
                )
            } | ConvertTo-Json -Depth 10 -Compress
            
            aws s3api put-bucket-encryption --bucket $bucketName --server-side-encryption-configuration $encryptionConfig
            
            # Block public access
            aws s3api put-public-access-block --bucket $bucketName --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
        }
        else {
            Write-Info-Log "S3 bucket already exists: $bucketName"
        }
    }
    catch {
        Write-Error-Log "Failed to setup S3 bucket: $_"
    }
    
    # Create DynamoDB table for locking if it doesn't exist
    try {
        $null = aws dynamodb describe-table --table-name $dynamodbTable 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Info-Log "Creating DynamoDB table for Terraform locking: $dynamodbTable"
            
            aws dynamodb create-table --table-name $dynamodbTable --attribute-definitions AttributeName=LockID,AttributeType=S --key-schema AttributeName=LockID,KeyType=HASH --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 --server-side-encryption Enabled=true
            
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to create DynamoDB table"
            }
            
            # Wait for table to be active
            Write-Info-Log "Waiting for DynamoDB table to be active..."
            aws dynamodb wait table-exists --table-name $dynamodbTable
        }
        else {
            Write-Info-Log "DynamoDB table already exists: $dynamodbTable"
        }
    }
    catch {
        Write-Error-Log "Failed to setup DynamoDB table: $_"
    }
    
    Write-Log "Terraform backend setup completed"
}

function Initialize-Terraform {
    Write-Info-Log "Initializing Terraform..."
    
    Set-Location $ScriptDir
    
    # Create terraform.tfvars if it doesn't exist
    if (-not (Test-Path "terraform.tfvars")) {
        Write-Warning-Log "terraform.tfvars not found. Creating from template..."
        if (Test-Path "terraform.tfvars.example") {
            Copy-Item "terraform.tfvars.example" "terraform.tfvars"
            Write-Warning-Log "Please review and update terraform.tfvars with your specific values"
        }
        else {
            Write-Error-Log "terraform.tfvars.example not found"
        }
    }
    
    # Initialize Terraform
    terraform init -upgrade
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Log "Terraform initialization failed"
    }
    
    # Create workspace if it doesn't exist
    try {
        terraform workspace select $Environment 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Info-Log "Creating Terraform workspace: $Environment"
            terraform workspace new $Environment
            if ($LASTEXITCODE -ne 0) {
                throw "Failed to create workspace"
            }
        }
        else {
            Write-Info-Log "Using existing Terraform workspace: $Environment"
        }
    }
    catch {
        Write-Error-Log "Failed to setup Terraform workspace: $_"
    }
    
    Write-Log "Terraform initialization completed"
}

function Test-TerraformConfig {
    Write-Info-Log "Validating Terraform configuration..."
    
    terraform validate
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Log "Terraform validation failed"
    }
    
    # Check formatting
    $formatResult = terraform fmt -check
    if ($LASTEXITCODE -ne 0) {
        Write-Warning-Log "Terraform files are not properly formatted. Running terraform fmt..."
        terraform fmt
    }
    
    Write-Log "Terraform validation completed"
}

function Invoke-TerraformPlan {
    Write-Info-Log "Planning Terraform deployment..."
    
    $planFile = "tfplan-$Environment-$Timestamp"
    
    terraform plan -var="environment=$Environment" -var="aws_region=$Region" -out="$planFile"
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Log "Terraform plan failed"
    }
    
    Write-Info-Log "Terraform plan saved to: $planFile"
    
    if ($Action -eq "plan") {
        Write-Log "Terraform planning completed. Review the plan above."
        return
    }
    
    # Store plan file for apply
    Set-Content -Path ".current_plan" -Value $planFile
}

function Invoke-TerraformApply {
    Write-Info-Log "Applying Terraform deployment..."
    
    $planFile = $null
    if (Test-Path ".current_plan") {
        $planFile = Get-Content ".current_plan"
        if (-not (Test-Path $planFile)) {
            Write-Error-Log "Plan file not found: $planFile"
        }
    }
    
    try {
        if ($planFile) {
            if ($AutoApprove) {
                terraform apply $planFile
            }
            else {
                terraform apply $planFile
            }
        }
        else {
            # Apply without plan file
            if ($AutoApprove) {
                terraform apply -auto-approve -var="environment=$Environment" -var="aws_region=$Region"
            }
            else {
                terraform apply -var="environment=$Environment" -var="aws_region=$Region"
            }
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Terraform apply failed"
        }
    }
    catch {
        Write-Error-Log "Terraform apply failed: $_"
    }
    
    Write-Log "Terraform apply completed successfully"
}

function Invoke-TerraformDestroy {
    Write-Warning-Log "This will destroy ALL infrastructure for environment: $Environment"
    Write-Warning-Log "This action cannot be undone!"
    
    if (-not $AutoApprove) {
        $confirmation = Read-Host "Are you sure you want to destroy the infrastructure? Type 'yes' to confirm"
        if ($confirmation -ne "yes") {
            Write-Info-Log "Deployment destruction cancelled"
            return
        }
    }
    
    Write-Info-Log "Destroying Terraform deployment..."
    
    try {
        if ($AutoApprove) {
            terraform destroy -auto-approve -var="environment=$Environment" -var="aws_region=$Region"
        }
        else {
            terraform destroy -var="environment=$Environment" -var="aws_region=$Region"
        }
        
        if ($LASTEXITCODE -ne 0) {
            throw "Terraform destroy failed"
        }
    }
    catch {
        Write-Error-Log "Terraform destroy failed: $_"
    }
    
    Write-Log "Terraform destroy completed"
}

function Invoke-PostDeployment {
    Write-Info-Log "Running post-deployment tasks..."
    
    # Output important information
    Write-Info-Log "Retrieving deployment outputs..."
    terraform output -json | Out-File -FilePath "outputs-$Environment-$Timestamp.json" -Encoding UTF8
    
    # Display key outputs
    Write-Host ""
    Write-Log "=== Deployment Summary ==="
    Write-Host ""
    Write-Info-Log "Environment: $Environment"
    Write-Info-Log "AWS Region: $Region"
    Write-Info-Log "Timestamp: $Timestamp"
    Write-Host ""
    
    # Extract key outputs
    $outputsFile = "outputs-$Environment-$Timestamp.json"
    if (Test-Path $outputsFile) {
        try {
            $outputs = Get-Content $outputsFile | ConvertFrom-Json
            
            Write-Info-Log "Key Infrastructure Components:"
            Write-Host ""
            
            # VPC Information
            if ($outputs.vpc_id.value) {
                Write-Info-Log "VPC ID: $($outputs.vpc_id.value)"
            }
            
            # EKS Information
            if ($outputs.eks_cluster_name.value) {
                Write-Info-Log "EKS Cluster: $($outputs.eks_cluster_name.value)"
            }
            
            if ($outputs.eks_cluster_endpoint.value) {
                Write-Info-Log "EKS Endpoint: $($outputs.eks_cluster_endpoint.value)"
            }
            
            # RDS Information
            if ($outputs.rds_endpoint.value) {
                Write-Info-Log "RDS Endpoint: $($outputs.rds_endpoint.value)"
            }
            
            # Load Balancer Information
            if ($outputs.alb_dns_name.value) {
                Write-Info-Log "Load Balancer DNS: $($outputs.alb_dns_name.value)"
            }
            
            # CloudFront Information
            if ($outputs.cloudfront_domain_name.value) {
                Write-Info-Log "CloudFront Domain: $($outputs.cloudfront_domain_name.value)"
            }
            
            Write-Host ""
            Write-Info-Log "Full outputs saved to: $outputsFile"
        }
        catch {
            Write-Warning-Log "Failed to parse outputs: $_"
        }
    }
    
    # kubectl configuration if EKS was deployed
    try {
        $clusterName = terraform output -raw eks_cluster_name 2>$null
        if ($LASTEXITCODE -eq 0 -and $clusterName) {
            Write-Info-Log "Updating kubectl configuration for EKS cluster: $clusterName"
            aws eks update-kubeconfig --region $Region --name $clusterName
            Write-Info-Log "kubectl configured. Test with: kubectl get nodes"
        }
    }
    catch {
        Write-Warning-Log "Failed to configure kubectl: $_"
    }
    
    Write-Log "Post-deployment tasks completed"
}

function Remove-TempFiles {
    Write-Info-Log "Cleaning up temporary files..."
    
    # Remove plan files older than 7 days
    Get-ChildItem -Path "." -Name "tfplan-*" | Where-Object { (Get-Item $_).LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item -Force
    
    # Remove current plan reference
    if (Test-Path ".current_plan") {
        Remove-Item ".current_plan" -Force
    }
    
    Write-Log "Cleanup completed"
}

# Main execution
function Main {
    try {
        # Show usage if help requested
        if ($Help) {
            Show-Usage
            return
        }
        
        Write-Log "Starting Serenity Healthcare Platform deployment"
        Write-Log "Environment: $Environment"
        Write-Log "AWS Region: $Region"
        Write-Log "Terraform Action: $Action"
        Write-Log "Auto-approve: $AutoApprove"
        Write-Log "Log file: $LogFile"
        
        # Check if validation only
        if ($ValidateOnly) {
            Write-Info-Log "Validation-only mode"
            Test-Prerequisites
            Initialize-Terraform
            Test-TerraformConfig
            Write-Log "Validation completed successfully"
            return
        }
        
        # Run deployment steps
        Test-Prerequisites
        Initialize-TerraformBackend
        Initialize-Terraform
        Test-TerraformConfig
        
        switch ($Action) {
            'plan' {
                Invoke-TerraformPlan
            }
            'apply' {
                Invoke-TerraformPlan
                Invoke-TerraformApply
                Invoke-PostDeployment
            }
            'destroy' {
                Invoke-TerraformDestroy
            }
        }
        
        Write-Log "Deployment script completed successfully"
    }
    catch {
        Write-Error-Log "Deployment failed: $_"
    }
    finally {
        Remove-TempFiles
    }
}

# Run main function
Main