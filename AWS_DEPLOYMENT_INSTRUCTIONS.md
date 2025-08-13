# AWS CloudTrail Deployment Instructions

## Prerequisites
1. **Install AWS CLI v2** (Windows):
   - Run the `AWSCLIV2.msi` installer in the project root
   - Or download from: https://aws.amazon.com/cli/
   - Restart your terminal after installation

2. **Configure AWS Credentials**:
   ```bash
   aws configure
   # Enter:
   # AWS Access Key ID: [Your key]
   # AWS Secret Access Key: [Your secret]
   # Default region: us-east-1
   # Default output format: json
   ```

## Deployment Steps

### Step 1: Apply IAM Policy
```bash
aws iam put-user-policy \
  --user-name serenity-deployment \
  --policy-name CloudTrailDeploymentPolicy \
  --policy-document file://infrastructure/aws/iam-cloudtrail-policy.json \
  --region us-east-1
```

### Step 2: Deploy CloudTrail with Terraform
```bash
cd infrastructure/terraform/cloudtrail-hipaa

# Initialize Terraform
terraform init

# Review the plan
terraform plan \
  -var="logs_bucket_name=serenity-logs-662658456049-1755106249" \
  -var="region=us-east-1" \
  -var="trail_name=serenity-hipaa-trail"

# Apply the configuration
terraform apply \
  -var="logs_bucket_name=serenity-logs-662658456049-1755106249" \
  -var="region=us-east-1" \
  -var="trail_name=serenity-hipaa-trail" \
  -auto-approve
```

### Step 3: Validate Deployment
```bash
# Return to project root
cd ../../..

# Run validation script
npm run validate:cloudtrail

# Or manually check:
aws cloudtrail get-trail-status --name serenity-hipaa-trail --region us-east-1
```

## Troubleshooting

### If IAM Policy Fails:
1. Check user exists:
   ```bash
   aws iam get-user --user-name serenity-deployment
   ```

2. If user doesn't exist, create it:
   ```bash
   aws iam create-user --user-name serenity-deployment
   ```

### If Terraform Fails:
1. Check S3 bucket exists:
   ```bash
   aws s3 ls | grep serenity-logs
   ```

2. If bucket doesn't exist, set `create_bucket = true` in terraform.tfvars

### If Validation Fails:
1. Check CloudTrail status:
   ```bash
   aws cloudtrail describe-trails --trail-name-list serenity-hipaa-trail
   ```

2. Start logging if stopped:
   ```bash
   aws cloudtrail start-logging --name serenity-hipaa-trail --region us-east-1
   ```

## Environment Variables Required
Set these in your terminal or add to `.env`:
```bash
export AWS_REGION=us-east-1
export CLOUDTRAIL_TRAIL=serenity-hipaa-trail
export CLOUDTRAIL_LOGS_BUCKET=serenity-logs-662658456049-1755106249
export PHI_BUCKET=serenity-phi-data
```

## Success Indicators
✅ CloudTrail status shows `IsLogging: true`
✅ S3 bucket receiving log files
✅ KMS key rotation enabled
✅ CloudWatch log group created
✅ Data events configured for PHI bucket

## Next Steps
1. Configure CloudWatch alarms for critical events
2. Set up log analysis with Athena
3. Create dashboard for audit monitoring
4. Document compliance controls for HIPAA audit