# AWS Production Deployment Report
Generated: 2025-08-23

## Current Infrastructure Status

### EC2 Instance
- **Instance ID**: i-04dc0393416b1e1da
- **Name**: serenity-prod
- **Public IP**: 13.221.140.170
- **Private IP**: 172.31.33.4
- **State**: Running
- **Key Pair**: serenity-keypair
- **Security Group**: SGEC2
- **SSM Status**: NOT CONNECTED (SSM agent needs to be installed/configured)

### Application Load Balancer (ALB)
- **Name**: SerenityALB
- **DNS Name**: SerenityALB-1709119748.us-east-1.elb.amazonaws.com
- **Scheme**: Internet-facing
- **State**: Active

### Target Group
- **Name**: SerenityTG
- **Port**: 8080
- **Protocol**: HTTP
- **Health Status**: UNHEALTHY (Health checks failed)
- **Target**: i-04dc0393416b1e1da:8080

## Issue Summary

1. **SSM Not Connected**: The EC2 instance doesn't have SSM agent installed or configured
2. **Target Group Unhealthy**: No application is responding on port 8080
3. **Application Not Deployed**: The Serenity application needs to be deployed to the EC2 instance

## Manual Deployment Instructions

Since SSM is not available, you'll need to connect via SSH using the `serenity-keypair.pem` file.

### Step 1: Connect to EC2 Instance

```bash
# Connect via SSH (you need the serenity-keypair.pem file)
ssh -i serenity-keypair.pem ec2-user@13.221.140.170
```

### Step 2: Install Required Software

```bash
# Update system
sudo yum update -y

# Install Node.js 22.x
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install nodejs -y

# Install PM2 globally
sudo npm install -g pm2

# Install git
sudo yum install git -y

# Install SSM Agent (for future connections)
sudo yum install -y amazon-ssm-agent
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent
```

### Step 3: Deploy Application

```bash
# Create app directory
sudo mkdir -p /var/app
sudo chown ec2-user:ec2-user /var/app
cd /var/app

# Clone repository
git clone https://github.com/ccbuildalot23/serenity-sober-pathways-guide.git
cd serenity-sober-pathways-guide

# Install dependencies
npm ci --legacy-peer-deps --no-audit --no-fund

# Build the application
npm run build

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'serenity-app',
    script: 'npx',
    args: 'serve -s dist -l 8080',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    }
  }]
};
EOF

# Install serve package
npm install -g serve

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user
```

### Step 4: Configure Security Group

Ensure the SGEC2 security group allows:
- Inbound port 8080 from the ALB security group
- Inbound port 22 from your IP (for SSH)
- Outbound HTTPS (443) for external API calls

### Step 5: Verify Health Check

```bash
# Test locally on EC2
curl http://localhost:8080

# Check PM2 status
pm2 status
pm2 logs
```

## ALB HTTPS Configuration

### Configure HTTP to HTTPS Redirect

The ALB needs a listener rule to redirect HTTP (port 80) to HTTPS (port 443):

```bash
# Get ALB ARN
aws elbv2 describe-load-balancers --region us-east-1 \
  --query "LoadBalancers[?LoadBalancerName=='SerenityALB'].LoadBalancerArn" \
  --output text

# Create HTTP listener with redirect (requires SSL certificate ARN)
aws elbv2 create-listener --region us-east-1 \
  --load-balancer-arn <ALB_ARN> \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'
```

**Note**: You need an SSL certificate in AWS Certificate Manager (ACM) for the domain before configuring HTTPS.

## DNS Configuration Instructions

### For app.serenityandrecovery.com

1. **In your DNS provider (e.g., Route 53, Cloudflare, GoDaddy)**:
   - Create a CNAME record
   - Name: `app`
   - Value: `SerenityALB-1709119748.us-east-1.elb.amazonaws.com`
   - TTL: 300 seconds

2. **If using Route 53**:
   ```bash
   aws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> \
     --change-batch '{
       "Changes": [{
         "Action": "CREATE",
         "ResourceRecordSet": {
           "Name": "app.serenityandrecovery.com",
           "Type": "CNAME",
           "TTL": 300,
           "ResourceRecords": [{"Value": "SerenityALB-1709119748.us-east-1.elb.amazonaws.com"}]
         }
       }]
     }'
   ```

## Post-Deployment Checklist

- [ ] Application deployed and running on port 8080
- [ ] PM2 configured with auto-restart
- [ ] Target Group health checks passing
- [ ] SSL certificate obtained for domain
- [ ] HTTPS listener configured on ALB
- [ ] HTTP to HTTPS redirect configured
- [ ] DNS CNAME record created
- [ ] Security groups properly configured
- [ ] CloudWatch alarms set up for monitoring
- [ ] Backup and recovery procedures documented

## Monitoring Commands

```bash
# Check application status
pm2 status
pm2 logs serenity-app

# Check system resources
top
df -h
free -m

# Check network connectivity
netstat -tlpn | grep 8080
curl -I http://localhost:8080

# Check SSM agent status
sudo systemctl status amazon-ssm-agent
```

## Troubleshooting

### If Target Group remains unhealthy:
1. Check PM2 logs: `pm2 logs`
2. Verify port 8080 is listening: `netstat -tlpn | grep 8080`
3. Check security group rules
4. Verify health check path returns 200 OK

### If SSM still doesn't work:
1. Check IAM instance profile has SSM permissions
2. Verify SSM agent is running: `sudo systemctl status amazon-ssm-agent`
3. Check outbound internet connectivity
4. Ensure instance can reach SSM endpoints

## Next Steps

1. **Immediate Actions**:
   - Connect to EC2 via SSH and deploy application
   - Configure PM2 to serve on port 8080
   - Verify Target Group health

2. **SSL/HTTPS Setup**:
   - Request SSL certificate in ACM for app.serenityandrecovery.com
   - Configure HTTPS listener on ALB
   - Set up HTTP to HTTPS redirect

3. **DNS Configuration**:
   - Add CNAME record pointing to ALB DNS name
   - Verify DNS propagation

4. **Production Readiness**:
   - Set up CloudWatch monitoring
   - Configure auto-scaling (if needed)
   - Implement backup strategy
   - Document runbooks for common issues

## Contact Information

- **EC2 Instance**: i-04dc0393416b1e1da (13.221.140.170)
- **ALB DNS**: SerenityALB-1709119748.us-east-1.elb.amazonaws.com
- **Target Domain**: app.serenityandrecovery.com
- **AWS Region**: us-east-1