# Serenity Healthcare Platform - Infrastructure Initialization Script
# Complete setup and deployment of HIPAA-compliant AWS infrastructure

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet('development', 'staging', 'production')]
    [string]$Environment = 'production',
    
    [Parameter(Mandatory=$false)]
    [string]$Region = 'us-east-1',
    
    [Parameter(Mandatory=$false)]
    [string]$ProjectName = 'serenity',
    
    [Parameter(Mandatory=$false)]
    [string]$NotificationEmail = 'alerts@serenity-platform.com',
    
    [Parameter(Mandatory=$false)]
    [string]$DomainName = 'serenity-platform.com',
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipPrerequisites,
    
    [Parameter(Mandatory=$false)]
    [switch]$PlanOnly,
    
    [Parameter(Mandatory=$false)]
    [switch]$AutoApprove,
    
    [Parameter(Mandatory=$false)]
    [switch]$Help
)

# Configuration
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogFile = "infrastructure-init-$(Get-Date -Format 'yyyyMMdd-HHmmss').log"
$TerraformDir = $ScriptPath

# Colors for output
$Colors = @{
    Success = 'Green'
    Warning = 'Yellow'
    Error = 'Red'
    Info = 'Cyan'
    Debug = 'Blue'
}

function Write-LogMessage {
    param(
        [string]$Message,
        [ValidateSet('Success', 'Warning', 'Error', 'Info', 'Debug')]
        [string]$Level = 'Info'
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    Write-Host $logEntry -ForegroundColor $Colors[$Level]
    Add-Content -Path $LogFile -Value $logEntry
}

function Write-Success { param([string]$Message) Write-LogMessage $Message 'Success' }
function Write-Warning { param([string]$Message) Write-LogMessage $Message 'Warning' }
function Write-Error { param([string]$Message) Write-LogMessage $Message 'Error' }
function Write-Info { param([string]$Message) Write-LogMessage $Message 'Info' }
function Write-Debug { param([string]$Message) Write-LogMessage $Message 'Debug' }

function Show-Usage {
    Write-Host @"
Serenity Healthcare Platform - Infrastructure Initialization

DESCRIPTION:
    Complete setup and deployment of HIPAA-compliant AWS infrastructure
    including VPC, EKS, RDS, ElastiCache, DocumentDB, monitoring, and compliance.

PARAMETERS:
    -Environment        Target environment (development|staging|production) [default: production]
    -Region            AWS region [default: us-east-1]
    -ProjectName       Project name [default: serenity]
    -NotificationEmail Email for alerts and notifications
    -DomainName        Domain name for the application
    -SkipPrerequisites Skip prerequisite checks
    -PlanOnly          Only run terraform plan, don't apply
    -AutoApprove       Auto-approve terraform changes
    -Help              Show this help message

EXAMPLES:
    # Plan production deployment
    .\init-infrastructure.ps1 -Environment production -PlanOnly
    
    # Deploy staging environment
    .\init-infrastructure.ps1 -Environment staging -NotificationEmail "staging@company.com"
    
    # Deploy production with auto-approval
    .\init-infrastructure.ps1 -Environment production -AutoApprove
    
    # Development environment setup
    .\init-infrastructure.ps1 -Environment development -DomainName "dev.serenity.local"

PREREQUISITES:
    - AWS CLI v2 with configured credentials
    - Terraform >= 1.0
    - PowerShell 5.1 or PowerShell Core 7+
    - Appropriate AWS permissions for infrastructure deployment

INFRASTRUCTURE COMPONENTS:
    ✓ VPC with public/private subnets across multiple AZs
    ✓ EKS cluster with auto-scaling node groups
    ✓ RDS Aurora PostgreSQL with encryption and HA
    ✓ ElastiCache Redis cluster with auto-discovery
    ✓ DocumentDB for MongoDB compatibility
    ✓ Application Load Balancer with WAF protection
    ✓ CloudFront CDN with security headers
    ✓ S3 buckets with lifecycle policies and encryption
    ✓ HIPAA compliance (CloudTrail, Config, GuardDuty, Macie)
    ✓ Comprehensive monitoring with CloudWatch and X-Ray
    ✓ CI/CD pipeline with CodePipeline and ECR
    ✓ Disaster recovery with multi-region backup

"@
}

function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    $errors = @()
    
    # Check PowerShell version
    if ($PSVersionTable.PSVersion.Major -lt 5) {
        $errors += "PowerShell 5.1 or higher is required"
    }
    
    # Check AWS CLI
    try {
        $awsVersion = aws --version 2>$null
        if (-not $awsVersion) {
            throw "AWS CLI not found"
        }
        Write-Debug "AWS CLI version: $($awsVersion.Split()[0])"
    }
    catch {
        $errors += "AWS CLI is not installed or not in PATH"
    }
    
    # Check Terraform
    try {
        $tfVersion = terraform version -json | ConvertFrom-Json
        if ($tfVersion.terraform_version -lt "1.0.0") {
            $errors += "Terraform version 1.0.0 or higher is required"
        }
        Write-Debug "Terraform version: $($tfVersion.terraform_version)"
    }
    catch {
        $errors += "Terraform is not installed or not in PATH"
    }
    
    # Check AWS credentials
    try {
        $identity = aws sts get-caller-identity 2>$null | ConvertFrom-Json
        if (-not $identity) {
            throw "Unable to get AWS identity"
        }
        Write-Debug "AWS Account: $($identity.Account)"
        Write-Debug "AWS User: $($identity.Arn)"
        $script:AWSAccountId = $identity.Account
        $script:AWSUserArn = $identity.Arn
    }
    catch {
        $errors += "AWS credentials are not configured or invalid"
    }
    
    # Check required permissions (basic test)
    try {
        $regions = aws ec2 describe-regions --region $Region 2>$null
        if (-not $regions) {
            throw "Cannot access EC2 API"
        }
    }
    catch {
        $errors += "Insufficient AWS permissions. Administrator access recommended for initial setup."
    }
    
    if ($errors.Count -gt 0) {
        Write-Error "Prerequisites check failed:"
        $errors | ForEach-Object { Write-Error "  - $_" }
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

function Initialize-Configuration {
    Write-Info "Initializing configuration..."
    
    Set-Location $TerraformDir
    
    # Create terraform.tfvars from template if it doesn't exist
    $tfvarsPath = "terraform.tfvars"
    $tfvarsTemplatePath = "terraform.tfvars.example"
    
    if (-not (Test-Path $tfvarsPath)) {
        if (Test-Path $tfvarsTemplatePath) {
            Write-Info "Creating terraform.tfvars from template..."
            Copy-Item $tfvarsTemplatePath $tfvarsPath
            
            # Update key values in tfvars
            $content = Get-Content $tfvarsPath -Raw
            $content = $content -replace 'project_name = "serenity"', "project_name = `"$ProjectName`""
            $content = $content -replace 'environment  = "production"', "environment  = `"$Environment`""
            $content = $content -replace 'aws_region   = "us-east-1"', "aws_region   = `"$Region`""
            $content = $content -replace 'notification_email         = "alerts@serenity-platform.com"', "notification_email         = `"$NotificationEmail`""
            $content = $content -replace 'domain_name              = "serenity-platform.com"', "domain_name              = `"$DomainName`""
            $content = $content -replace 'ACCOUNT-ID', $script:AWSAccountId
            
            Set-Content -Path $tfvarsPath -Value $content
            
            Write-Warning "terraform.tfvars has been created with default values."
            Write-Warning "Please review and update the following before proceeding:"
            Write-Warning "  - SSL certificate ARNs (ssl_certificate_arn, cloudfront_certificate_arn)"
            Write-Warning "  - ECR repository URLs (ecr_repository_urls)"
            Write-Warning "  - GitHub token secret ARN (github_token_secret_arn)"
            Write-Warning "  - Domain name and other environment-specific settings"
            
            # Pause for user to review
            if (-not $AutoApprove) {
                Write-Host ""
                $continue = Read-Host "Have you reviewed and updated terraform.tfvars? (y/N)"
                if ($continue -ne 'y' -and $continue -ne 'Y') {
                    Write-Info "Please update terraform.tfvars and run the script again."
                    exit 0
                }
            }
        }
        else {
            Write-Error "terraform.tfvars.example not found. Cannot create configuration."
            exit 1
        }
    }
    else {
        Write-Info "Using existing terraform.tfvars"
    }
    
    Write-Success "Configuration initialized"
}

function Initialize-TerraformBackend {
    Write-Info "Setting up Terraform backend..."
    
    $bucketName = "$ProjectName-terraform-state-$($script:AWSAccountId)-$Region"
    $dynamoTable = "$ProjectName-terraform-locks"
    
    # Create S3 bucket for Terraform state
    Write-Info "Checking/creating S3 bucket: $bucketName"
    try {
        aws s3api head-bucket --bucket $bucketName --region $Region 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Info "Creating S3 bucket for Terraform state..."
            
            if ($Region -eq "us-east-1") {
                aws s3api create-bucket --bucket $bucketName --region $Region
            }
            else {
                aws s3api create-bucket --bucket $bucketName --region $Region --create-bucket-configuration LocationConstraint=$Region
            }
            
            # Enable versioning
            aws s3api put-bucket-versioning --bucket $bucketName --versioning-configuration Status=Enabled
            
            # Enable encryption
            $encryptionConfig = @{
                Rules = @(@{
                    ApplyServerSideEncryptionByDefault = @{
                        SSEAlgorithm = "AES256"
                    }
                    BucketKeyEnabled = $true
                })
            } | ConvertTo-Json -Depth 10
            
            aws s3api put-bucket-encryption --bucket $bucketName --server-side-encryption-configuration $encryptionConfig
            
            # Block public access
            aws s3api put-public-access-block --bucket $bucketName --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
            
            Write-Success "S3 bucket created and configured"
        }
        else {
            Write-Debug "S3 bucket already exists"
        }
    }
    catch {
        Write-Error "Failed to create S3 bucket: $_"
        exit 1
    }
    
    # Create DynamoDB table for state locking
    Write-Info "Checking/creating DynamoDB table: $dynamoTable"
    try {
        aws dynamodb describe-table --table-name $dynamoTable --region $Region 2>$null
        if ($LASTEXITCODE -ne 0) {
            Write-Info "Creating DynamoDB table for Terraform locking..."
            
            aws dynamodb create-table `
                --table-name $dynamoTable `
                --attribute-definitions AttributeName=LockID,AttributeType=S `
                --key-schema AttributeName=LockID,KeyType=HASH `
                --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
                --server-side-encryption Enabled=true `
                --region $Region
            
            # Wait for table to be active
            Write-Info "Waiting for DynamoDB table to be active..."
            aws dynamodb wait table-exists --table-name $dynamoTable --region $Region
            
            Write-Success "DynamoDB table created"
        }
        else {
            Write-Debug "DynamoDB table already exists"
        }
    }
    catch {
        Write-Error "Failed to create DynamoDB table: $_"
        exit 1
    }
    
    # Update backend configuration in main.tf
    $mainTfPath = "main.tf"
    if (Test-Path $mainTfPath) {
        $content = Get-Content $mainTfPath -Raw
        if ($content -match 'bucket\s*=\s*"serenity-terraform-state"') {
            $content = $content -replace 'bucket\s*=\s*"serenity-terraform-state"', "bucket         = `"$bucketName`""
            $content = $content -replace 'dynamodb_table\s*=\s*"serenity-terraform-locks"', "dynamodb_table = `"$dynamoTable`""
            $content = $content -replace 'region\s*=\s*"us-east-1"', "region         = `"$Region`""
            Set-Content -Path $mainTfPath -Value $content
            Write-Debug "Updated backend configuration in main.tf"
        }
    }
    
    Write-Success "Terraform backend configured"
}

function Initialize-Terraform {
    Write-Info "Initializing Terraform..."
    
    # Initialize Terraform
    Write-Info "Running terraform init..."
    terraform init -upgrade
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Terraform initialization failed"
        exit 1
    }
    
    # Select or create workspace
    Write-Info "Setting up Terraform workspace: $Environment"
    terraform workspace select $Environment 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Info "Creating new workspace: $Environment"
        terraform workspace new $Environment
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Failed to create Terraform workspace"
            exit 1
        }
    }
    
    # Validate configuration
    Write-Info "Validating Terraform configuration..."
    terraform validate
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Terraform validation failed"
        exit 1
    }
    
    # Format check
    $formatCheck = terraform fmt -check -diff
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Terraform files need formatting. Running terraform fmt..."
        terraform fmt
    }
    
    Write-Success "Terraform initialized and validated"
}

function Invoke-TerraformPlan {
    Write-Info "Creating Terraform execution plan..."
    
    $planFile = "tfplan-$Environment-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    
    # Run terraform plan
    terraform plan `
        -var-file="terraform.tfvars" `
        -var="environment=$Environment" `
        -var="aws_region=$Region" `
        -var="project_name=$ProjectName" `
        -out="$planFile"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Terraform plan failed"
        exit 1
    }
    
    Write-Success "Terraform plan created: $planFile"
    
    # Store plan file reference
    Set-Content -Path ".current_plan" -Value $planFile
    
    if ($PlanOnly) {
        Write-Success "Plan-only mode completed. Review the plan above."
        Write-Info "To apply this plan, run: terraform apply $planFile"
        return $false
    }
    
    return $true
}

function Invoke-TerraformApply {
    param([string]$PlanFile)
    
    Write-Info "Applying Terraform configuration..."
    
    if (-not $AutoApprove) {
        Write-Host ""
        Write-Warning "This will create/modify AWS infrastructure which may incur costs."
        Write-Warning "The following resources will be created:"
        Write-Info "  ✓ VPC with subnets and networking components"
        Write-Info "  ✓ EKS cluster with worker nodes"
        Write-Info "  ✓ RDS Aurora PostgreSQL cluster"
        Write-Info "  ✓ ElastiCache Redis cluster"
        Write-Info "  ✓ DocumentDB cluster"
        Write-Info "  ✓ Application Load Balancer and CloudFront"
        Write-Info "  ✓ S3 buckets with lifecycle policies"
        Write-Info "  ✓ Monitoring, logging, and compliance resources"
        Write-Info "  ✓ CI/CD pipeline components"
        Write-Host ""
        $confirm = Read-Host "Do you want to proceed with the deployment? (yes/no)"
        if ($confirm -ne 'yes') {
            Write-Info "Deployment cancelled by user"
            return
        }
    }
    
    # Apply the plan
    if ($PlanFile -and (Test-Path $PlanFile)) {
        terraform apply $PlanFile
    }
    else {
        if ($AutoApprove) {
            terraform apply -auto-approve -var-file="terraform.tfvars"
        }
        else {
            terraform apply -var-file="terraform.tfvars"
        }
    }
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Terraform apply failed"
        exit 1
    }
    
    Write-Success "Infrastructure deployment completed successfully!"
}

function Show-DeploymentSummary {
    Write-Info "Retrieving deployment information..."
    
    # Get Terraform outputs
    $outputFile = "outputs-$Environment-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
    terraform output -json | Out-File -FilePath $outputFile -Encoding UTF8
    
    Write-Host ""
    Write-Success "=== DEPLOYMENT SUMMARY ==="
    Write-Host ""
    
    Write-Info "Environment: $Environment"
    Write-Info "Region: $Region"
    Write-Info "Project: $ProjectName"
    Write-Info "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Host ""
    
    # Parse and display key outputs
    if (Test-Path $outputFile) {
        try {
            $outputs = Get-Content $outputFile | ConvertFrom-Json
            
            Write-Success "Key Infrastructure Components:"
            Write-Host ""
            
            if ($outputs.vpc_id.value) {
                Write-Info "VPC ID: $($outputs.vpc_id.value)"
            }
            
            if ($outputs.eks_cluster_name.value) {
                Write-Info "EKS Cluster: $($outputs.eks_cluster_name.value)"
                Write-Info "EKS Endpoint: $($outputs.eks_cluster_endpoint.value)"
            }
            
            if ($outputs.rds_endpoint.value) {
                Write-Info "RDS Endpoint: $($outputs.rds_endpoint.value)"
            }
            
            if ($outputs.alb_dns_name.value) {
                Write-Info "Load Balancer: $($outputs.alb_dns_name.value)"
            }
            
            if ($outputs.cloudfront_domain_name.value) {
                Write-Info "CloudFront Distribution: $($outputs.cloudfront_domain_name.value)"
            }
            
            Write-Host ""
            Write-Info "Full deployment details saved to: $outputFile"
        }
        catch {
            Write-Warning "Could not parse Terraform outputs: $_"
        }
    }
    
    # Configure kubectl for EKS
    try {
        $clusterName = terraform output -raw eks_cluster_name 2>$null
        if ($clusterName -and $LASTEXITCODE -eq 0) {
            Write-Info "Configuring kubectl for EKS cluster..."
            aws eks update-kubeconfig --region $Region --name $clusterName
            Write-Success "kubectl configured for cluster: $clusterName"
            Write-Info "Test with: kubectl get nodes"
        }
    }
    catch {
        Write-Warning "Could not configure kubectl: $_"
    }
    
    Write-Host ""
    Write-Success "=== NEXT STEPS ==="
    Write-Host ""
    Write-Info "1. Verify EKS cluster access:"
    Write-Info "   kubectl get nodes"
    Write-Info "   kubectl get pods --all-namespaces"
    Write-Host ""
    Write-Info "2. Deploy applications to the cluster:"
    Write-Info "   Use the CI/CD pipeline or kubectl apply"
    Write-Host ""
    Write-Info "3. Configure DNS records:"
    Write-Info "   Point your domain to the Load Balancer or CloudFront"
    Write-Host ""
    Write-Info "4. Set up monitoring dashboards:"
    Write-Info "   Access CloudWatch dashboards in AWS Console"
    Write-Host ""
    Write-Info "5. Review security and compliance:"
    Write-Info "   Check GuardDuty, Security Hub, and Config compliance"
    Write-Host ""
    
    Write-Success "Infrastructure deployment completed successfully!"
    Write-Info "Log file: $LogFile"
    Write-Info "Outputs file: $outputFile"
}

function Remove-TempFiles {
    Write-Debug "Cleaning up temporary files..."
    
    # Remove old plan files
    Get-ChildItem -Path "." -Name "tfplan-*" | 
        Where-Object { (Get-Item $_).LastWriteTime -lt (Get-Date).AddDays(-7) } | 
        Remove-Item -Force -ErrorAction SilentlyContinue
    
    # Remove current plan reference
    if (Test-Path ".current_plan") {
        Remove-Item ".current_plan" -Force -ErrorAction SilentlyContinue
    }
}

# Main execution
function Main {
    try {
        $startTime = Get-Date
        
        if ($Help) {
            Show-Usage
            return
        }
        
        Write-Success "Starting Serenity Healthcare Platform Infrastructure Deployment"
        Write-Info "Environment: $Environment | Region: $Region | Project: $ProjectName"
        Write-Host ""
        
        # Step 1: Prerequisites
        if (-not $SkipPrerequisites) {
            Test-Prerequisites
        }
        else {
            Write-Warning "Skipping prerequisites check"
        }
        
        # Step 2: Configuration
        Initialize-Configuration
        
        # Step 3: Backend setup
        Initialize-TerraformBackend
        
        # Step 4: Terraform initialization
        Initialize-Terraform
        
        # Step 5: Plan
        $shouldApply = Invoke-TerraformPlan
        
        # Step 6: Apply (if not plan-only)
        if ($shouldApply) {
            $planFile = if (Test-Path ".current_plan") { Get-Content ".current_plan" } else { $null }
            Invoke-TerraformApply -PlanFile $planFile
            
            # Step 7: Summary
            Show-DeploymentSummary
        }
        
        $endTime = Get-Date
        $duration = $endTime - $startTime
        Write-Success "Total execution time: $($duration.ToString('hh\:mm\:ss'))"
        
    }
    catch {
        Write-Error "Deployment failed: $_"
        Write-Error "Check the log file for details: $LogFile"
        exit 1
    }
    finally {
        Remove-TempFiles
    }
}

# Execute main function
Main