# CloudTrail HIPAA Deployment - Step by Step

## Prerequisites Checklist
- [x] AWS CLI installed (AWSCLIV2.msi)
- [ ] AWS credentials configured
- [ ] Terraform installed (optional, for automated deployment)

## Step 1: Open Windows Terminal
Open **Command Prompt** or **PowerShell** as Administrator

## Step 2: Configure AWS Credentials
```cmd
aws configure
```
Enter:
- **AWS Access Key ID**: [Your access key]
- **AWS Secret Access Key**: [Your secret key]
- **Default region name**: us-east-1
- **Default output format**: json

## Step 3: Verify AWS Connection
```cmd
aws sts get-caller-identity
```
You should see your account details.

## Step 4: Apply IAM Policy
Run this command from the project root directory:

```cmd
aws iam put-user-policy --user-name serenity-deployment --policy-name CloudTrailDeploymentPolicy --policy-document file://infrastructure/aws/iam-cloudtrail-policy.json --region us-east-1
```

If the user doesn't exist, create it first:
```cmd
aws iam create-user --user-name serenity-deployment
```

## Step 5: Create CloudTrail Manually (Quick Option)

### 5a. Create KMS Key for Encryption
```cmd
aws kms create-key --description "HIPAA CloudTrail encryption key" --region us-east-1
```
Save the KeyId from the response.

### 5b. Create Key Alias
```cmd
aws kms create-alias --alias-name alias/serenity-cloudtrail --target-key-id [KeyId from above] --region us-east-1
```

### 5c. Enable Key Rotation
```cmd
aws kms enable-key-rotation --key-id [KeyId] --region us-east-1
```

### 5d. Create CloudTrail
```cmd
aws cloudtrail create-trail --name serenity-hipaa-trail --s3-bucket-name serenity-logs-662658456049-1755106249 --is-multi-region-trail --enable-log-file-validation --kms-key-id [KeyId] --region us-east-1
```

### 5e. Configure Data Events for PHI Bucket
```cmd
aws cloudtrail put-event-selectors --trail-name serenity-hipaa-trail --event-selectors ReadWriteType=All,IncludeManagementEvents=true,DataResources=[{Type=AWS::S3::Object,Values=[arn:aws:s3:::serenity-phi-data/*]}] --region us-east-1
```

### 5f. Start Logging
```cmd
aws cloudtrail start-logging --name serenity-hipaa-trail --region us-east-1
```

## Step 6: Verify CloudTrail is Working

### Check Trail Status
```cmd
aws cloudtrail get-trail-status --name serenity-hipaa-trail --region us-east-1
```

Look for: `"IsLogging": true`

### Check for Log Files in S3 (after 5-15 minutes)
```cmd
aws s3 ls s3://serenity-logs-662658456049-1755106249/hipaa-logs/ --recursive --region us-east-1
```

## Step 7: Validation Script
Run the TypeScript validation script:
```cmd
npm run validate:cloudtrail
```

Or manually check all components:
```cmd
aws cloudtrail describe-trails --trail-name-list serenity-hipaa-trail --region us-east-1
```

## Expected Results
✅ CloudTrail trail created and logging
✅ KMS encryption enabled with rotation
✅ Multi-region trail active
✅ Log file validation enabled
✅ Data events configured for PHI bucket
✅ S3 bucket receiving encrypted logs

## Troubleshooting

### If S3 Bucket Doesn't Exist:
```cmd
aws s3 mb s3://serenity-logs-662658456049-1755106249 --region us-east-1
```

### If Bucket Policy Needs Update:
```cmd
aws s3api put-bucket-policy --bucket serenity-logs-662658456049-1755106249 --policy file://infrastructure/aws/s3-bucket-policy.json
```

### If Trail Won't Start:
1. Check IAM permissions
2. Verify S3 bucket exists
3. Ensure KMS key is active
4. Check bucket policy allows CloudTrail

## Console Access
Monitor your CloudTrail in the AWS Console:
https://console.aws.amazon.com/cloudtrail/home?region=us-east-1

## Success Indicators
1. Trail status shows "IsLogging": true
2. S3 bucket starts receiving log files (5-15 min delay)
3. No errors in CloudWatch Logs
4. Validation script passes all checks

## Documentation for HIPAA Audit
Record the following for compliance:
- Trail ARN: [Get from describe-trails command]
- KMS Key ID: [From create-key command]
- S3 Bucket: serenity-logs-662658456049-1755106249
- Log retention: 2555 days (7 years)
- Encryption: AES-256 with KMS
- Log validation: Enabled
- Multi-region: Yes
- Data events: Configured for PHI bucket