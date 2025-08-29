#!/bin/bash

# Serenity Healthcare Platform - AWS Infrastructure Deployment Script
# HIPAA-compliant infrastructure deployment with comprehensive monitoring

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="serenity"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
LOG_FILE="deployment-${TIMESTAMP}.log"

# Default values
ENVIRONMENT="production"
AWS_REGION="us-east-1"
TERRAFORM_ACTION="plan"
AUTO_APPROVE=false
DESTROY=false
VALIDATE_ONLY=false

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Deploy Serenity Healthcare Platform AWS Infrastructure

OPTIONS:
    -e, --environment ENVIRONMENT    Environment name (development|staging|production) [default: production]
    -r, --region REGION             AWS region [default: us-east-1]
    -a, --action ACTION             Terraform action (plan|apply|destroy) [default: plan]
    -y, --auto-approve              Auto-approve Terraform changes
    -d, --destroy                   Destroy infrastructure
    -v, --validate-only             Only validate Terraform configuration
    -h, --help                      Show this help message

EXAMPLES:
    $0 -e production -a plan                    # Plan production deployment
    $0 -e production -a apply -y                # Deploy production with auto-approve
    $0 -e staging -a apply                      # Deploy staging environment
    $0 -e production -d -y                      # Destroy production (with confirmation)
    $0 -v                                       # Validate configuration only

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -r|--region)
            AWS_REGION="$2"
            shift 2
            ;;
        -a|--action)
            TERRAFORM_ACTION="$2"
            shift 2
            ;;
        -y|--auto-approve)
            AUTO_APPROVE=true
            shift
            ;;
        -d|--destroy)
            DESTROY=true
            TERRAFORM_ACTION="destroy"
            shift
            ;;
        -v|--validate-only)
            VALIDATE_ONLY=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            error "Unknown option $1"
            ;;
    esac
done

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(development|staging|production)$ ]]; then
    error "Invalid environment: $ENVIRONMENT. Must be one of: development, staging, production"
fi

# Validate Terraform action
if [[ ! "$TERRAFORM_ACTION" =~ ^(plan|apply|destroy)$ ]]; then
    error "Invalid Terraform action: $TERRAFORM_ACTION. Must be one of: plan, apply, destroy"
fi

log "Starting Serenity Healthcare Platform deployment"
log "Environment: $ENVIRONMENT"
log "AWS Region: $AWS_REGION"
log "Terraform Action: $TERRAFORM_ACTION"
log "Auto-approve: $AUTO_APPROVE"
log "Log file: $LOG_FILE"

# Check prerequisites
check_prerequisites() {
    info "Checking prerequisites..."
    
    # Check if running on Windows (Git Bash/WSL)
    if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        info "Running on Windows environment (Git Bash/Cygwin)"
    fi
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed or not in PATH"
    fi
    
    # Check Terraform
    if ! command -v terraform &> /dev/null; then
        error "Terraform is not installed or not in PATH"
    fi
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        warn "jq is not installed. Some features may not work properly"
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials are not configured or invalid"
    fi
    
    # Get AWS account information
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    AWS_USER=$(aws sts get-caller-identity --query Arn --output text)
    info "AWS Account ID: $AWS_ACCOUNT_ID"
    info "AWS User: $AWS_USER"
    
    log "Prerequisites check completed successfully"
}

# Setup Terraform backend
setup_terraform_backend() {
    info "Setting up Terraform backend..."
    
    local bucket_name="${PROJECT_NAME}-terraform-state-${AWS_ACCOUNT_ID}-${AWS_REGION}"
    local dynamodb_table="${PROJECT_NAME}-terraform-locks"
    
    # Create S3 bucket for state if it doesn't exist
    if ! aws s3api head-bucket --bucket "$bucket_name" 2>/dev/null; then
        info "Creating S3 bucket for Terraform state: $bucket_name"
        
        if [ "$AWS_REGION" = "us-east-1" ]; then
            aws s3api create-bucket --bucket "$bucket_name" --region "$AWS_REGION"
        else
            aws s3api create-bucket --bucket "$bucket_name" --region "$AWS_REGION" \
                --create-bucket-configuration LocationConstraint="$AWS_REGION"
        fi
        
        # Enable versioning
        aws s3api put-bucket-versioning --bucket "$bucket_name" \
            --versioning-configuration Status=Enabled
        
        # Enable encryption
        aws s3api put-bucket-encryption --bucket "$bucket_name" \
            --server-side-encryption-configuration '{
                "Rules": [{
                    "ApplyServerSideEncryptionByDefault": {
                        "SSEAlgorithm": "AES256"
                    }
                }]
            }'
        
        # Block public access
        aws s3api put-public-access-block --bucket "$bucket_name" \
            --public-access-block-configuration \
            BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
    else
        info "S3 bucket already exists: $bucket_name"
    fi
    
    # Create DynamoDB table for locking if it doesn't exist
    if ! aws dynamodb describe-table --table-name "$dynamodb_table" &>/dev/null; then
        info "Creating DynamoDB table for Terraform locking: $dynamodb_table"
        aws dynamodb create-table \
            --table-name "$dynamodb_table" \
            --attribute-definitions AttributeName=LockID,AttributeType=S \
            --key-schema AttributeName=LockID,KeyType=HASH \
            --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
            --server-side-encryption Enabled=true
        
        # Wait for table to be active
        info "Waiting for DynamoDB table to be active..."
        aws dynamodb wait table-exists --table-name "$dynamodb_table"
    else
        info "DynamoDB table already exists: $dynamodb_table"
    fi
    
    log "Terraform backend setup completed"
}

# Initialize Terraform
init_terraform() {
    info "Initializing Terraform..."
    
    cd "$SCRIPT_DIR"
    
    # Create terraform.tfvars if it doesn't exist
    if [[ ! -f "terraform.tfvars" ]]; then
        warn "terraform.tfvars not found. Creating from template..."
        if [[ -f "terraform.tfvars.example" ]]; then
            cp terraform.tfvars.example terraform.tfvars
            warn "Please review and update terraform.tfvars with your specific values"
        else
            error "terraform.tfvars.example not found"
        fi
    fi
    
    # Initialize Terraform
    terraform init -upgrade
    
    # Create workspace if it doesn't exist
    if ! terraform workspace select "$ENVIRONMENT" 2>/dev/null; then
        info "Creating Terraform workspace: $ENVIRONMENT"
        terraform workspace new "$ENVIRONMENT"
    else
        info "Using existing Terraform workspace: $ENVIRONMENT"
    fi
    
    log "Terraform initialization completed"
}

# Validate Terraform configuration
validate_terraform() {
    info "Validating Terraform configuration..."
    
    terraform validate
    
    # Check formatting
    if ! terraform fmt -check; then
        warn "Terraform files are not properly formatted. Running terraform fmt..."
        terraform fmt
    fi
    
    log "Terraform validation completed"
}

# Plan Terraform deployment
plan_terraform() {
    info "Planning Terraform deployment..."
    
    local plan_file="tfplan-${ENVIRONMENT}-${TIMESTAMP}"
    
    terraform plan \
        -var="environment=$ENVIRONMENT" \
        -var="aws_region=$AWS_REGION" \
        -out="$plan_file"
    
    info "Terraform plan saved to: $plan_file"
    
    if [[ "$TERRAFORM_ACTION" == "plan" ]]; then
        log "Terraform planning completed. Review the plan above."
        exit 0
    fi
    
    # Store plan file for apply
    echo "$plan_file" > .current_plan
}

# Apply Terraform deployment
apply_terraform() {
    info "Applying Terraform deployment..."
    
    local plan_file
    if [[ -f .current_plan ]]; then
        plan_file=$(cat .current_plan)
        if [[ -f "$plan_file" ]]; then
            if [[ "$AUTO_APPROVE" == "true" ]]; then
                terraform apply "$plan_file"
            else
                terraform apply "$plan_file"
            fi
        else
            error "Plan file not found: $plan_file"
        fi
    else
        # Apply without plan file
        if [[ "$AUTO_APPROVE" == "true" ]]; then
            terraform apply -auto-approve \
                -var="environment=$ENVIRONMENT" \
                -var="aws_region=$AWS_REGION"
        else
            terraform apply \
                -var="environment=$ENVIRONMENT" \
                -var="aws_region=$AWS_REGION"
        fi
    fi
    
    log "Terraform apply completed successfully"
}

# Destroy Terraform deployment
destroy_terraform() {
    warn "This will destroy ALL infrastructure for environment: $ENVIRONMENT"
    warn "This action cannot be undone!"
    
    if [[ "$AUTO_APPROVE" != "true" ]]; then
        read -p "Are you sure you want to destroy the infrastructure? Type 'yes' to confirm: " confirmation
        if [[ "$confirmation" != "yes" ]]; then
            info "Deployment destruction cancelled"
            exit 0
        fi
    fi
    
    info "Destroying Terraform deployment..."
    
    if [[ "$AUTO_APPROVE" == "true" ]]; then
        terraform destroy -auto-approve \
            -var="environment=$ENVIRONMENT" \
            -var="aws_region=$AWS_REGION"
    else
        terraform destroy \
            -var="environment=$ENVIRONMENT" \
            -var="aws_region=$AWS_REGION"
    fi
    
    log "Terraform destroy completed"
}

# Post-deployment tasks
post_deployment() {
    info "Running post-deployment tasks..."
    
    # Output important information
    info "Retrieving deployment outputs..."
    terraform output -json > "outputs-${ENVIRONMENT}-${TIMESTAMP}.json"
    
    # Display key outputs
    echo
    log "=== Deployment Summary ==="
    echo
    info "Environment: $ENVIRONMENT"
    info "AWS Region: $AWS_REGION"
    info "Timestamp: $TIMESTAMP"
    echo
    
    # Extract key outputs if jq is available
    if command -v jq &> /dev/null; then
        local outputs_file="outputs-${ENVIRONMENT}-${TIMESTAMP}.json"
        
        info "Key Infrastructure Components:"
        echo
        
        # VPC Information
        if vpc_id=$(jq -r '.vpc_id.value' "$outputs_file" 2>/dev/null) && [[ "$vpc_id" != "null" ]]; then
            info "VPC ID: $vpc_id"
        fi
        
        # EKS Information
        if cluster_name=$(jq -r '.eks_cluster_name.value' "$outputs_file" 2>/dev/null) && [[ "$cluster_name" != "null" ]]; then
            info "EKS Cluster: $cluster_name"
        fi
        
        if cluster_endpoint=$(jq -r '.eks_cluster_endpoint.value' "$outputs_file" 2>/dev/null) && [[ "$cluster_endpoint" != "null" ]]; then
            info "EKS Endpoint: $cluster_endpoint"
        fi
        
        # RDS Information
        if rds_endpoint=$(jq -r '.rds_endpoint.value' "$outputs_file" 2>/dev/null) && [[ "$rds_endpoint" != "null" ]]; then
            info "RDS Endpoint: $rds_endpoint"
        fi
        
        # Load Balancer Information
        if alb_dns=$(jq -r '.alb_dns_name.value' "$outputs_file" 2>/dev/null) && [[ "$alb_dns" != "null" ]]; then
            info "Load Balancer DNS: $alb_dns"
        fi
        
        # CloudFront Information
        if cf_domain=$(jq -r '.cloudfront_domain_name.value' "$outputs_file" 2>/dev/null) && [[ "$cf_domain" != "null" ]]; then
            info "CloudFront Domain: $cf_domain"
        fi
        
        echo
        info "Full outputs saved to: $outputs_file"
    fi
    
    # kubectl configuration if EKS was deployed
    if terraform output eks_cluster_name &>/dev/null; then
        cluster_name=$(terraform output -raw eks_cluster_name 2>/dev/null || echo "")
        if [[ -n "$cluster_name" ]]; then
            info "Updating kubectl configuration for EKS cluster: $cluster_name"
            aws eks update-kubeconfig --region "$AWS_REGION" --name "$cluster_name"
            info "kubectl configured. Test with: kubectl get nodes"
        fi
    fi
    
    log "Post-deployment tasks completed"
}

# Cleanup function
cleanup() {
    info "Cleaning up temporary files..."
    
    # Remove plan files older than 7 days
    find . -name "tfplan-*" -type f -mtime +7 -delete 2>/dev/null || true
    
    # Remove current plan reference
    rm -f .current_plan 2>/dev/null || true
    
    log "Cleanup completed"
}

# Main execution
main() {
    # Set up signal handlers
    trap cleanup EXIT
    trap 'error "Script interrupted"' INT TERM
    
    # Check if validation only
    if [[ "$VALIDATE_ONLY" == "true" ]]; then
        info "Validation-only mode"
        check_prerequisites
        init_terraform
        validate_terraform
        log "Validation completed successfully"
        exit 0
    fi
    
    # Run deployment steps
    check_prerequisites
    setup_terraform_backend
    init_terraform
    validate_terraform
    
    case "$TERRAFORM_ACTION" in
        plan)
            plan_terraform
            ;;
        apply)
            plan_terraform
            apply_terraform
            post_deployment
            ;;
        destroy)
            destroy_terraform
            ;;
    esac
    
    log "Deployment script completed successfully"
}

# Run main function
main "$@"