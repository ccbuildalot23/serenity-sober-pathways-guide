#!/bin/bash

# AWS EC2 Deployment Script for Serenity Sober Pathways
# HIPAA-Compliant Deployment with Security Best Practices
# Generated: August 23, 2025

set -e  # Exit on error
set -u  # Exit on undefined variables

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="serenity-sober-pathways"
AWS_REGION="${AWS_REGION:-us-east-1}"
INSTANCE_TYPE="${INSTANCE_TYPE:-t3.medium}"
KEY_NAME="${KEY_NAME:-serenity-deploy-key}"
SECURITY_GROUP="${SECURITY_GROUP:-sg-serenity-hipaa}"
SUBNET_ID="${SUBNET_ID:-}"
VPC_ID="${VPC_ID:-}"
AMI_ID="${AMI_ID:-ami-0c02fb55731490381}"  # Amazon Linux 2023
DOMAIN="${DOMAIN:-serenity.health}"
SSL_EMAIL="${SSL_EMAIL:-admin@serenity.health}"

# Function to print colored messages
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Check AWS CLI installation
check_aws_cli() {
    log_info "Checking AWS CLI installation..."
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
    fi
    log_success "AWS CLI found: $(aws --version)"
}

# Verify AWS credentials
verify_credentials() {
    log_info "Verifying AWS credentials..."
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run 'aws configure' first."
    fi
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    log_success "Authenticated with AWS Account: $account_id"
}

# Create HIPAA-compliant security group
create_security_group() {
    log_info "Creating HIPAA-compliant security group..."
    
    # Check if security group exists
    if aws ec2 describe-security-groups --group-names "$SECURITY_GROUP" &> /dev/null; then
        log_warning "Security group $SECURITY_GROUP already exists"
        return
    fi
    
    # Create security group
    aws ec2 create-security-group \
        --group-name "$SECURITY_GROUP" \
        --description "HIPAA-compliant security group for Serenity" \
        ${VPC_ID:+--vpc-id "$VPC_ID"}
    
    # Add security rules
    aws ec2 authorize-security-group-ingress \
        --group-name "$SECURITY_GROUP" \
        --protocol tcp \
        --port 443 \
        --cidr 0.0.0.0/0 \
        --group-rule-description "HTTPS access"
    
    aws ec2 authorize-security-group-ingress \
        --group-name "$SECURITY_GROUP" \
        --protocol tcp \
        --port 80 \
        --cidr 0.0.0.0/0 \
        --group-rule-description "HTTP redirect to HTTPS"
    
    aws ec2 authorize-security-group-ingress \
        --group-name "$SECURITY_GROUP" \
        --protocol tcp \
        --port 22 \
        --cidr "$(curl -s https://checkip.amazonaws.com)/32" \
        --group-rule-description "SSH from deployment IP only"
    
    log_success "Security group created with HIPAA-compliant rules"
}

# Create or verify key pair
create_key_pair() {
    log_info "Setting up SSH key pair..."
    
    if aws ec2 describe-key-pairs --key-names "$KEY_NAME" &> /dev/null; then
        log_warning "Key pair $KEY_NAME already exists"
    else
        aws ec2 create-key-pair \
            --key-name "$KEY_NAME" \
            --query 'KeyMaterial' \
            --output text > "${KEY_NAME}.pem"
        
        chmod 600 "${KEY_NAME}.pem"
        log_success "Key pair created and saved to ${KEY_NAME}.pem"
    fi
}

# Launch EC2 instance with HIPAA configurations
launch_instance() {
    log_info "Launching HIPAA-compliant EC2 instance..."
    
    # User data script for initial setup
    cat > user_data.sh << 'EOF'
#!/bin/bash
# Update system
yum update -y

# Install required packages
yum install -y docker git nginx certbot python3-certbot-nginx

# Configure Docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Node.js 22.x
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
yum install -y nodejs

# Configure system for HIPAA compliance
# Enable audit logging
systemctl enable auditd
systemctl start auditd

# Configure fail2ban for intrusion prevention
yum install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Set up automatic security updates
yum install -y yum-cron
sed -i 's/apply_updates = no/apply_updates = yes/' /etc/yum/yum-cron.conf
systemctl enable yum-cron
systemctl start yum-cron

# Configure firewall
yum install -y firewalld
systemctl start firewalld
systemctl enable firewalld
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=http
firewall-cmd --reload

# Create deployment directory
mkdir -p /opt/serenity
chown ec2-user:ec2-user /opt/serenity

# Set up log rotation
cat > /etc/logrotate.d/serenity << 'LOGROTATE'
/opt/serenity/logs/*.log {
    daily
    rotate 90
    compress
    delaycompress
    notifempty
    create 640 ec2-user ec2-user
    sharedscripts
    postrotate
        systemctl reload nginx
    endscript
}
LOGROTATE

echo "Initial setup complete"
EOF
    
    # Launch instance
    local instance_id=$(aws ec2 run-instances \
        --image-id "$AMI_ID" \
        --instance-type "$INSTANCE_TYPE" \
        --key-name "$KEY_NAME" \
        --security-groups "$SECURITY_GROUP" \
        ${SUBNET_ID:+--subnet-id "$SUBNET_ID"} \
        --user-data file://user_data.sh \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$PROJECT_NAME},{Key=Environment,Value=production},{Key=HIPAA,Value=true}]" \
        --block-device-mappings "DeviceName=/dev/xvda,Ebs={VolumeSize=100,VolumeType=gp3,Encrypted=true,DeleteOnTermination=false}" \
        --metadata-options "HttpTokens=required,HttpPutResponseHopLimit=1,HttpEndpoint=enabled" \
        --monitoring Enabled=true \
        --query 'Instances[0].InstanceId' \
        --output text)
    
    log_info "Instance launched: $instance_id"
    log_info "Waiting for instance to be running..."
    
    aws ec2 wait instance-running --instance-ids "$instance_id"
    
    # Get instance details
    local public_ip=$(aws ec2 describe-instances \
        --instance-ids "$instance_id" \
        --query 'Reservations[0].Instances[0].PublicIpAddress' \
        --output text)
    
    log_success "Instance is running at IP: $public_ip"
    echo "$instance_id" > instance_id.txt
    echo "$public_ip" > instance_ip.txt
    
    # Clean up user data file
    rm -f user_data.sh
}

# Deploy application
deploy_application() {
    log_info "Deploying Serenity application..."
    
    local public_ip=$(cat instance_ip.txt)
    
    # Wait for instance to be ready for SSH
    log_info "Waiting for SSH to be available..."
    while ! ssh -o StrictHostKeyChecking=no -i "${KEY_NAME}.pem" ec2-user@"$public_ip" "echo 'SSH ready'" &> /dev/null; do
        sleep 10
    done
    
    # Copy application files
    log_info "Copying application files..."
    ssh -i "${KEY_NAME}.pem" ec2-user@"$public_ip" << 'ENDSSH'
cd /opt/serenity
git clone https://github.com/serenity-health/serenity-sober-pathways.git .
npm ci --legacy-peer-deps
npm run build

# Create production environment file
cat > .env.production << 'ENV'
NODE_ENV=production
VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
ENV

# Set up PM2 for process management
npm install -g pm2
pm2 start npm --name serenity -- run preview
pm2 startup systemd -u ec2-user --hp /home/ec2-user
pm2 save
ENDSSH
    
    log_success "Application deployed successfully"
}

# Configure Nginx with SSL
configure_nginx() {
    log_info "Configuring Nginx with SSL..."
    
    local public_ip=$(cat instance_ip.txt)
    
    ssh -i "${KEY_NAME}.pem" ec2-user@"$public_ip" << ENDSSH
# Create Nginx configuration
sudo tee /etc/nginx/conf.d/serenity.conf > /dev/null << 'NGINX'
server {
    listen 80;
    server_name ${DOMAIN} www.${DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN} www.${DOMAIN};
    
    # SSL configuration (will be updated by certbot)
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    
    # Security headers for HIPAA compliance
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Access logging for audit
    access_log /opt/serenity/logs/access.log combined;
    error_log /opt/serenity/logs/error.log warn;
    
    # Rate limiting
    limit_req_zone \$binary_remote_addr zone=serenity:10m rate=10r/s;
    limit_req zone=serenity burst=20 nodelay;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Security
        proxy_hide_header X-Powered-By;
        proxy_cookie_flags ~ secure httponly samesite=strict;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
NGINX

# Obtain SSL certificate
sudo certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email ${SSL_EMAIL}

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
ENDSSH
    
    log_success "Nginx configured with SSL"
}

# Set up CloudWatch monitoring
setup_monitoring() {
    log_info "Setting up CloudWatch monitoring..."
    
    local instance_id=$(cat instance_id.txt)
    
    # Create CloudWatch alarms
    aws cloudwatch put-metric-alarm \
        --alarm-name "${PROJECT_NAME}-cpu-high" \
        --alarm-description "Alarm when CPU exceeds 80%" \
        --metric-name CPUUtilization \
        --namespace AWS/EC2 \
        --statistic Average \
        --period 300 \
        --threshold 80 \
        --comparison-operator GreaterThanThreshold \
        --dimensions Name=InstanceId,Value="$instance_id" \
        --evaluation-periods 2
    
    aws cloudwatch put-metric-alarm \
        --alarm-name "${PROJECT_NAME}-disk-space-low" \
        --alarm-description "Alarm when disk space is low" \
        --metric-name DiskSpaceUtilization \
        --namespace System/Linux \
        --statistic Average \
        --period 300 \
        --threshold 90 \
        --comparison-operator GreaterThanThreshold \
        --dimensions Name=InstanceId,Value="$instance_id" Name=Filesystem,Value=/dev/xvda1 Name=MountPath,Value=/ \
        --evaluation-periods 1
    
    log_success "CloudWatch monitoring configured"
}

# Create backup configuration
setup_backups() {
    log_info "Setting up automated backups..."
    
    local instance_id=$(cat instance_id.txt)
    
    # Create backup plan
    aws backup create-backup-plan \
        --backup-plan "{
            \"BackupPlanName\": \"${PROJECT_NAME}-backup-plan\",
            \"Rules\": [{
                \"RuleName\": \"DailyBackups\",
                \"TargetBackupVaultName\": \"Default\",
                \"ScheduleExpression\": \"cron(0 5 ? * * *)\",
                \"StartWindowMinutes\": 60,
                \"CompletionWindowMinutes\": 120,
                \"Lifecycle\": {
                    \"DeleteAfterDays\": 90
                }
            }]
        }"
    
    log_success "Automated backups configured"
}

# Main deployment function
main() {
    log_info "Starting HIPAA-compliant AWS deployment for Serenity Sober Pathways"
    
    # Pre-flight checks
    check_aws_cli
    verify_credentials
    
    # Infrastructure setup
    create_security_group
    create_key_pair
    launch_instance
    
    # Application deployment
    deploy_application
    configure_nginx
    
    # Monitoring and backups
    setup_monitoring
    setup_backups
    
    log_success "Deployment complete!"
    log_info "Instance IP: $(cat instance_ip.txt)"
    log_info "Access your application at: https://${DOMAIN}"
    log_warning "Remember to:"
    log_warning "  1. Update DNS records to point to the instance IP"
    log_warning "  2. Configure environment variables in .env.production"
    log_warning "  3. Sign a Business Associate Agreement (BAA) with AWS"
    log_warning "  4. Enable AWS CloudTrail for audit logging"
    log_warning "  5. Configure AWS WAF for additional security"
}

# Run main function
main "$@"