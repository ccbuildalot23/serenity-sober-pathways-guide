# AWS Deployment Notes - Serenity Sober Pathways

## Deployment Status
**Date**: August 23, 2025  
**Status**: Configuration Ready - Pending Deployment  
**AWS Account**: 662658456049  
**User**: cloudtrail-admin  

---

## Infrastructure Configuration

### AWS Resources (Planned)
- **Region**: us-east-1
- **Instance Type**: t3.medium (2 vCPU, 4GB RAM)
- **AMI**: Amazon Linux 2023
- **Security Group**: sg-serenity-hipaa (to be created)
- **Key Pair**: serenity-deploy-key (to be created)
- **VPC**: Default VPC (or custom HIPAA-compliant VPC)

### Security Configuration
- **Encryption**: EBS volumes encrypted with AWS KMS
- **SSL/TLS**: Let's Encrypt or AWS Certificate Manager
- **Security Headers**: HIPAA-compliant headers configured
- **Session Management**: 15-minute timeout implemented
- **Audit Logging**: CloudWatch logs enabled

### Performance Optimizations
- **Bundle Size**: 236KB main bundle (reduced from 2.16MB)
- **Code Splitting**: Crisis features prioritized (<500ms load)
- **Lazy Loading**: Non-critical routes deferred
- **CDN**: CloudFront distribution for static assets

---

## Deployment Methods

### Option 1: Terraform Deployment
```bash
cd infrastructure/terraform
terraform init
terraform plan -var="environment=production"
terraform apply -auto-approve
```

**Resources Created**:
- VPC with public/private subnets
- Application Load Balancer
- Auto Scaling Group (2-10 instances)
- RDS PostgreSQL (encrypted)
- S3 buckets for logs
- CloudWatch monitoring
- WAF rules

### Option 2: Bash Script Deployment
```bash
cd scripts
chmod +x deploy-aws.sh
./deploy-aws.sh
```

**Script Actions**:
1. Creates security groups
2. Launches EC2 instance
3. Installs dependencies
4. Deploys application
5. Configures SSL
6. Sets up monitoring

---

## Environment Variables Required

### Production Configuration (.env.production)
```env
NODE_ENV=production
VITE_SUPABASE_URL=https://ymgvakqyvqexhluhpypf.supabase.co
VITE_SUPABASE_ANON_KEY=[production_key]
VITE_PORT=8080
```

---

## Manual Deployment Steps (If Automated Fails)

### 1. Create EC2 Instance
```bash
# Create security group
aws ec2 create-security-group \
  --group-name sg-serenity-hipaa \
  --description "HIPAA-compliant security group for Serenity"

# Launch instance
aws ec2 run-instances \
  --image-id ami-0c02fb55731490381 \
  --instance-type t3.medium \
  --key-name serenity-deploy-key \
  --security-groups sg-serenity-hipaa \
  --block-device-mappings "DeviceName=/dev/xvda,Ebs={VolumeSize=100,Encrypted=true}"
```

### 2. Configure Instance
```bash
# SSH into instance
ssh -i serenity-deploy-key.pem ec2-user@[INSTANCE_IP]

# Install Node.js 22
curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash -
sudo yum install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
cd /opt
sudo git clone https://github.com/ccbuildalot23/serenity-sober-pathways-guide.git serenity
sudo chown -R ec2-user:ec2-user serenity

# Install dependencies and build
cd serenity
npm ci --legacy-peer-deps
npm run build

# Start application
pm2 start npm --name serenity -- run preview
pm2 startup systemd -u ec2-user --hp /home/ec2-user
pm2 save
```

### 3. Configure Nginx
```bash
# Install Nginx
sudo yum install -y nginx

# Configure reverse proxy
sudo nano /etc/nginx/conf.d/serenity.conf
# Add configuration...

# Install SSL certificate
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d serenity.health -d www.serenity.health

# Start Nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

---

## Post-Deployment Checklist

### Immediate Verification
- [ ] HTTPS access working
- [ ] Session timeout (15 minutes) functional
- [ ] Logging system operational
- [ ] Crisis features load <500ms
- [ ] All dashboards accessible

### Security Validation
- [ ] SSL certificate installed
- [ ] Security headers present
- [ ] PHI data encrypted
- [ ] Audit logs capturing events
- [ ] Firewall rules configured

### Performance Checks
- [ ] Bundle size under 1MB
- [ ] Page load time <3s
- [ ] Core Web Vitals passing
- [ ] CloudWatch metrics active

### Compliance Requirements
- [ ] HIPAA BAA with AWS (TODO: Requires account owner action)
- [ ] Backup strategy configured
- [ ] Disaster recovery plan documented
- [ ] Access controls implemented
- [ ] Encryption at rest verified

---

## Known Issues & TODOs

### High Priority
1. **AWS BAA**: Requires account owner to sign Business Associate Agreement
2. **Domain DNS**: Update DNS records to point to instance/ALB
3. **Production Supabase Key**: Replace with production-specific key

### Medium Priority
1. **Auto-scaling**: Configure based on load patterns
2. **Database Backups**: Set up automated RDS backups
3. **Monitoring Alerts**: Configure CloudWatch alarms

### Low Priority
1. **Cost Optimization**: Review instance sizing after load testing
2. **CDN Configuration**: Optimize CloudFront caching rules
3. **Log Retention**: Set appropriate retention policies

---

## Monitoring & Maintenance

### CloudWatch Dashboards
- CPU utilization
- Memory usage
- Network traffic
- Application logs
- Error rates

### Health Checks
- `/health` endpoint for ALB
- Database connectivity
- External service status
- SSL certificate expiration

### Backup Schedule
- Daily database backups
- Weekly full system snapshots
- 90-day retention policy

---

## Emergency Procedures

### Rollback Process
1. Stop current deployment
2. Restore from previous AMI
3. Revert database if needed
4. Update DNS if required

### Incident Response
1. Check CloudWatch logs
2. Review application logs
3. Verify database connectivity
4. Check external services
5. Engage support if needed

---

## Contact Information

### AWS Support
- Account ID: 662658456049
- Support Plan: [TODO: Verify support level]
- Emergency Contact: [TODO: Add contact]

### Application Team
- Technical Lead: [TODO: Add contact]
- Security Officer: [TODO: Add contact]
- On-call Schedule: [TODO: Add rotation]

---

## Deployment History

### August 23, 2025
- Initial deployment configuration created
- E2E test configuration fixed (port 8080)
- AWS credentials verified
- Infrastructure scripts prepared
- Documentation created

---

*This document will be updated with actual deployment details once execution is complete.*