#!/bin/bash
set -e

# AWS CloudTrail HIPAA Deployment Script
# Account: 662658456049
# Region: us-east-1

echo "🚀 Deploying HIPAA-compliant CloudTrail infrastructure..."

# Variables
REGION="us-east-1"
TRAIL_NAME="serenity-hipaa-trail"
BUCKET_NAME="serenity-logs-662658456049-1755106249"
KMS_ALIAS="alias/serenity-cloudtrail"

# Step 1: Apply IAM policy to deployment user
echo "📝 Applying IAM policy to deployment user..."
aws iam put-user-policy \
  --user-name serenity-deployment \
  --policy-name CloudTrailDeploymentPolicy \
  --policy-document file://iam-cloudtrail-policy.json \
  --region $REGION || echo "Policy may already exist, continuing..."

# Step 2: Deploy with Terraform
echo "🏗️ Deploying CloudTrail with Terraform..."
cd ../terraform/cloudtrail-hipaa

# Initialize Terraform
terraform init

# Create terraform.tfvars
cat > terraform.tfvars <<EOF
region              = "$REGION"
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
EOF

# Plan deployment
terraform plan -out=cloudtrail.tfplan

# Apply deployment
terraform apply cloudtrail.tfplan

# Step 3: Validate deployment
echo "✅ Validating CloudTrail HIPAA compliance..."
cd ../../..
npm run validate:cloudtrail

echo "🎉 CloudTrail HIPAA deployment complete!"
echo ""
echo "Next steps:"
echo "1. Verify CloudTrail is logging in AWS Console"
echo "2. Test log delivery to S3 bucket"
echo "3. Configure CloudWatch alarms for critical events"
echo "4. Document trail configuration for audit"