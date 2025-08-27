# AWS EC2 Deployment Guide for Serenity Sober Pathways

## Prerequisites

### 1. Sign AWS Business Associate Agreement (BAA)
1. Log in to AWS Management Console with root account
2. Navigate to AWS Artifact
3. Select "Agreements" → "HIPAA Eligible Services"
4. Review and accept the Business Associate Addendum (BAA)
5. Download a copy for your records

### 2. Required AWS Services Setup
- EC2 (Elastic Compute Cloud)
- VPC with Security Groups
- CloudTrail for audit logging
- S3 for static assets and backups
- Certificate Manager or Let's Encrypt for SSL

## Step 1: Launch EC2 Instance

### Instance Configuration
```bash
# Recommended specifications
- Instance Type: t3.medium (2 vCPU, 4GB RAM)
- OS: Ubuntu 22.04 LTS or Amazon Linux 2023
- Storage: 30GB EBS (gp3) encrypted
- Region: us-east-1 (or your preferred HIPAA-eligible region)
```

### Security Group Rules
```bash
# Inbound Rules
- HTTP (80): 0.0.0.0/0
- HTTPS (443): 0.0.0.0/0
- SSH (22): Your IP only

# Outbound Rules
- All traffic: 0.0.0.0/0
```

## Step 2: Connect and Configure Server

### SSH into Instance
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 22.x
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install build tools
sudo apt install -y build-essential git nginx certbot python3-certbot-nginx

# Install PM2 for process management
sudo npm install -g pm2
```

## Step 3: Deploy Application

### Clone Repository
```bash
cd /opt
sudo git clone https://github.com/ccbuildalot23/serenity-sober-pathways-guide.git
cd serenity-sober-pathways-guide

# Set permissions
sudo chown -R ubuntu:ubuntu /opt/serenity-sober-pathways-guide
```

### Configure Environment
```bash
# Copy production environment file
cp .env.production .env

# Edit with your actual values
nano .env
# Add your Supabase URL and keys
# VITE_SUPABASE_URL=https://your-project.supabase.co
# VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Build and Start Application
```bash
# Install dependencies
npm ci --legacy-peer-deps

# Build for production
npm run build

# For Vite apps (static hosting)
pm2 serve dist 8080 --spa --name serenity

# For Next.js or server apps
# pm2 start npm --name serenity -- start

# Save PM2 configuration
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

## Step 4: Configure Nginx Reverse Proxy

### Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/serenity
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Security headers for HIPAA compliance
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:;" always;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Increase timeouts for PHI operations
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

### Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/serenity /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Step 5: Setup SSL Certificate

### Using Let's Encrypt
```bash
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### Using AWS Certificate Manager
1. Request certificate in ACM
2. Use with Application Load Balancer (ALB)
3. Configure ALB to forward to EC2 instance

## Step 6: HIPAA Compliance Configuration

### Enable CloudTrail
```bash
# Already configured in infrastructure/terraform/cloudtrail-hipaa
cd infrastructure/terraform/cloudtrail-hipaa
terraform init
terraform apply -var="region=us-east-1"
```

### Configure Automated Backups
```bash
# Create backup script
sudo nano /opt/backup.sh
```

Add:
```bash
#!/bin/bash
# Backup database and encrypt
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"
S3_BUCKET="serenity-backups-$(aws sts get-caller-identity --query Account --output text)"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application data (if using local SQLite)
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /opt/serenity-sober-pathways-guide/data

# Encrypt backup
openssl enc -aes-256-cbc -salt -in $BACKUP_DIR/app_backup_$DATE.tar.gz \
  -out $BACKUP_DIR/app_backup_$DATE.tar.gz.enc -k $BACKUP_ENCRYPTION_KEY

# Upload to S3
aws s3 cp $BACKUP_DIR/app_backup_$DATE.tar.gz.enc \
  s3://$S3_BUCKET/backups/ --server-side-encryption AES256

# Clean up old local backups (keep 7 days)
find $BACKUP_DIR -name "*.tar.gz*" -mtime +7 -delete
```

### Schedule Daily Backups
```bash
sudo chmod +x /opt/backup.sh
sudo crontab -e
# Add: 0 2 * * * /opt/backup.sh >> /var/log/backup.log 2>&1
```

## Step 7: Monitoring and Logging

### Setup CloudWatch Agent
```bash
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configure agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard
```

### Application Monitoring
```bash
# View PM2 logs
pm2 logs serenity

# Monitor application
pm2 monit

# Setup PM2 web dashboard (optional)
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 30
```

## Step 8: Security Hardening

### System Security
```bash
# Enable firewall
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Fail2ban for SSH protection
sudo apt install fail2ban -y
sudo systemctl enable fail2ban

# Automatic security updates
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

### Application Security
```bash
# Set secure file permissions
sudo chmod 600 /opt/serenity-sober-pathways-guide/.env
sudo chown ubuntu:ubuntu /opt/serenity-sober-pathways-guide/.env

# Disable directory listing
echo "Options -Indexes" | sudo tee /opt/serenity-sober-pathways-guide/.htaccess
```

## Step 9: Load Balancing and High Availability (Optional)

### Using Application Load Balancer
1. Create Target Group with health checks
2. Register EC2 instances
3. Configure ALB with SSL termination
4. Update DNS to point to ALB

### Auto Scaling
```bash
# Create AMI from configured instance
# Setup Auto Scaling Group with min 2, max 5 instances
# Configure scaling policies based on CPU/memory
```

## Step 10: Verification

### Health Checks
```bash
# Check application status
curl -I https://your-domain.com

# Verify SSL certificate
echo | openssl s_client -connect your-domain.com:443 2>/dev/null | openssl x509 -noout -dates

# Test HIPAA compliance headers
curl -I https://your-domain.com | grep -E "X-Frame-Options|Strict-Transport"

# Check CloudTrail logging
aws cloudtrail get-trail-status --name serenity-hipaa-trail
```

### Performance Testing
```bash
# Install Apache Bench
sudo apt install apache2-utils -y

# Basic load test
ab -n 1000 -c 10 https://your-domain.com/
```

## Maintenance

### Regular Updates
```bash
# Weekly security updates
sudo apt update && sudo apt upgrade -y

# Monthly dependency updates
cd /opt/serenity-sober-pathways-guide
npm audit fix
npm update

# Rebuild and restart
npm run build
pm2 restart serenity
```

### Monitoring Checklist
- [ ] CloudWatch metrics (CPU, Memory, Disk)
- [ ] Application logs in PM2
- [ ] CloudTrail audit logs
- [ ] SSL certificate expiration
- [ ] Backup verification
- [ ] Security group rules
- [ ] User access reviews

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   ```bash
   pm2 status
   pm2 restart serenity
   sudo systemctl restart nginx
   ```

2. **Memory Issues**
   ```bash
   pm2 restart serenity --max-memory-restart 1G
   free -h
   sudo swapoff -a && sudo swapon -a
   ```

3. **Database Connection**
   ```bash
   # Check Supabase connectivity
   curl https://your-project.supabase.co/rest/v1/
   # Verify environment variables
   pm2 env 0
   ```

## Support

For deployment issues:
- Check logs: `pm2 logs serenity --lines 100`
- Review nginx logs: `sudo tail -f /var/log/nginx/error.log`
- CloudWatch logs for system metrics
- GitHub Issues: https://github.com/ccbuildalot23/serenity-sober-pathways-guide/issues

## Compliance Notes

This deployment follows HIPAA requirements:
- ✅ Encrypted data at rest (EBS encryption)
- ✅ Encrypted data in transit (SSL/TLS)
- ✅ Audit logging (CloudTrail)
- ✅ Access controls (Security Groups, IAM)
- ✅ Automated backups
- ✅ Session timeout (15 minutes for PHI)
- ✅ Security headers configured

Remember to sign BAAs with all third-party services handling PHI.