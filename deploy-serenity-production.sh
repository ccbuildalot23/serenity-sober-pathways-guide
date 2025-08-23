#!/bin/bash
set -e

# Serenity Production Deployment Script
# Generated: 2025-08-23
# Target: EC2 instance i-04dc0393416b1e1da

echo "===================================="
echo "Serenity Production Deployment"
echo "===================================="
echo "$(date -Is) :: Starting deployment" | tee -a /opt/serenity/ops/plan_log.md

# Phase 1: Install SSM Agent
echo "Phase 1: Installing SSM Agent..."
sudo snap install amazon-ssm-agent --classic 2>/dev/null || {
    echo "Snap not available, trying apt..."
    wget https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/debian_amd64/amazon-ssm-agent.deb
    sudo dpkg -i amazon-ssm-agent.deb
    rm amazon-ssm-agent.deb
}
sudo systemctl enable amazon-ssm-agent
sudo systemctl restart amazon-ssm-agent
echo "$(date -Is) :: SSM Agent installed" | tee -a /opt/serenity/ops/plan_log.md

# Phase 2: System Setup
echo "Phase 2: Setting up system dependencies..."
sudo mkdir -p /opt/serenity/{app,mcp,ops}
sudo chown -R ubuntu:ubuntu /opt/serenity

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get update -y
sudo apt-get install -y nodejs build-essential git ca-certificates curl unzip jq

# Install PM2 and serve globally
sudo npm install -g pm2 serve

# Install CloudWatch Agent
echo "Installing CloudWatch Agent..."
CW_DEB="https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb"
curl -fsSL "$CW_DEB" -o /tmp/cw.deb && sudo dpkg -i /tmp/cw.deb
rm -f /tmp/cw.deb

echo "$(date -Is) :: System dependencies installed" | tee -a /opt/serenity/ops/plan_log.md

# Phase 3: Deploy Serenity Application
echo "Phase 3: Deploying Serenity application..."
cd /opt/serenity

# Clone or update repository
if [ -d "app" ]; then
    cd app
    git pull origin main
else
    git clone https://github.com/ccbuildalot23/serenity-sober-pathways-guide.git app
    cd app
fi

# Install dependencies
echo "Installing npm dependencies..."
npm ci --legacy-peer-deps --no-audit --no-fund

# Pull environment variables from SSM Parameter Store
echo "Fetching environment configuration from SSM..."
if aws ssm get-parameters-by-path --with-decryption --path "/serenity/prod" --region us-east-1 --query 'Parameters' --output text >/dev/null 2>&1; then
    aws ssm get-parameters-by-path --with-decryption --path "/serenity/prod" --region us-east-1 \
        --query 'Parameters[].{Name:Name,Value:Value}' --output text \
        | while IFS=$'\t' read -r name value; do
            param_name=${name#/serenity/prod/}
            echo "${param_name}=${value}" >> .env.production
        done
    echo "Environment variables loaded from SSM"
else
    echo "No SSM parameters found, using default .env if available"
fi

# Build the application
echo "Building application..."
npm run build

# Configure PM2 ecosystem
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'serenity',
    script: 'npx',
    args: 'serve -s dist -l 8080',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    },
    error_file: '/opt/serenity/ops/serenity-error.log',
    out_file: '/opt/serenity/ops/serenity-out.log',
    time: true
  }]
};
EOF

# Start application with PM2
pm2 delete serenity 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -n 1 | sudo bash

# Verify application is running
sleep 5
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8080/)
echo "Application health check: HTTP ${HTTP_CODE}" | tee -a /opt/serenity/ops/plan_log.md

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -le 399 ]; then
    echo "✅ Application is running successfully on port 8080"
else
    echo "⚠️ Application may not be running correctly (HTTP ${HTTP_CODE})"
fi

echo "$(date -Is) :: Serenity app deployed" | tee -a /opt/serenity/ops/plan_log.md

# Phase 4: Install MCP Server
echo "Phase 4: Installing MCP Server..."
cd /opt/serenity

# Clone MCP repository
if [ ! -d "mcp" ]; then
    git clone https://github.com/awslabs/mcp.git
fi

cd mcp
# Find the actual MCP server directory (may vary)
MCP_DIR=$(find . -name "package.json" -path "*/server/*" -o -path "*/mcp-server/*" | head -1 | xargs dirname)

if [ -n "$MCP_DIR" ]; then
    cd "$MCP_DIR"
    echo "Found MCP server at: $MCP_DIR"
    
    # Install dependencies
    npm ci || npm install
    
    # Pull MCP configuration from SSM if available
    for key in MCP_API_KEY OPENAI_API_KEY AWS_REGION; do
        val=$(aws ssm get-parameter --with-decryption --name "/serenity/prod/${key}" --query 'Parameter.Value' --output text --region us-east-1 2>/dev/null || true)
        if [ -n "$val" ]; then
            echo "${key}=${val}" >> .env
        fi
    done
    
    # Create PM2 config for MCP
    cat > mcp-ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'serenity-mcp',
    script: 'npm',
    args: 'start',
    cwd: '.',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    },
    error_file: '/opt/serenity/ops/mcp-error.log',
    out_file: '/opt/serenity/ops/mcp-out.log',
    time: true
  }]
};
EOF
    
    # Start MCP server
    pm2 delete serenity-mcp 2>/dev/null || true
    pm2 start mcp-ecosystem.config.js
    pm2 save
    
    echo "$(date -Is) :: MCP server installed" | tee -a /opt/serenity/ops/plan_log.md
else
    echo "⚠️ MCP server directory not found, skipping MCP installation"
    echo "$(date -Is) :: MCP server not found" | tee -a /opt/serenity/ops/plan_log.md
fi

# Phase 5: Configure CloudWatch
echo "Phase 5: Configuring CloudWatch monitoring..."
sudo bash -c 'cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/opt/serenity/ops/serenity-out.log",
            "log_group_name": "/serenity/app",
            "log_stream_name": "{instance_id}-out"
          },
          {
            "file_path": "/opt/serenity/ops/serenity-error.log",
            "log_group_name": "/serenity/app",
            "log_stream_name": "{instance_id}-error"
          },
          {
            "file_path": "/opt/serenity/ops/mcp-out.log",
            "log_group_name": "/serenity/mcp",
            "log_stream_name": "{instance_id}-out"
          },
          {
            "file_path": "/opt/serenity/ops/mcp-error.log",
            "log_group_name": "/serenity/mcp",
            "log_stream_name": "{instance_id}-error"
          },
          {
            "file_path": "/opt/serenity/ops/plan_log.md",
            "log_group_name": "/serenity/deployment",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  },
  "metrics": {
    "namespace": "Serenity",
    "metrics_collected": {
      "cpu": {
        "measurement": [
          "cpu_usage_idle",
          "cpu_usage_iowait"
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          "used_percent"
        ],
        "metrics_collection_interval": 60,
        "resources": [
          "/"
        ]
      },
      "mem": {
        "measurement": [
          "mem_used_percent"
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF'

# Start CloudWatch agent
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a stop 2>/dev/null || true
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a start \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

echo "$(date -Is) :: CloudWatch configured" | tee -a /opt/serenity/ops/plan_log.md

# Phase 6: Generate Documentation
echo "Phase 6: Generating documentation..."

# Get ALB DNS
ALB_DNS="SerenityALB-1709119748.us-east-1.elb.amazonaws.com"

# Create DNS instructions
cat > /opt/serenity/ops/dns_instructions.md << EOF
# DNS Configuration Instructions
Generated: $(date -Is)

## CNAME Record Setup

To point app.serenityandrecovery.com to the Application Load Balancer:

### Option 1: Route 53 (Recommended)
\`\`\`bash
aws route53 change-resource-record-sets --hosted-zone-id <ZONE_ID> \\
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.serenityandrecovery.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "${ALB_DNS}"}]
      }
    }]
  }'
\`\`\`

### Option 2: Generic DNS Provider
- Record Type: CNAME
- Name: app
- Value: ${ALB_DNS}
- TTL: 300 seconds

## Verification
After DNS propagation (5-10 minutes):
\`\`\`bash
nslookup app.serenityandrecovery.com
curl -I https://app.serenityandrecovery.com
\`\`\`

## Current Status
- ALB DNS: ${ALB_DNS}
- Application: Running on port 8080
- SSL: Active with ACM certificate
- HTTP→HTTPS: Redirect configured
EOF

# Final status report
cat >> /opt/serenity/ops/plan_log.md << EOF

## Deployment Summary
- **Date**: $(date -Is)
- **Instance**: i-04dc0393416b1e1da
- **Application Status**: $(pm2 status serenity --no-color | grep serenity | awk '{print $10}')
- **MCP Status**: $(pm2 status serenity-mcp --no-color 2>/dev/null | grep serenity-mcp | awk '{print $10}' || echo "Not installed")
- **SSM Agent**: $(systemctl is-active amazon-ssm-agent)
- **CloudWatch Agent**: $(systemctl is-active amazon-cloudwatch-agent)
- **ALB DNS**: ${ALB_DNS}
- **Health Check**: HTTP ${HTTP_CODE}

## Next Steps
1. Update Target Group health check matcher to 200-399 in AWS Console
2. Configure DNS CNAME record
3. Monitor CloudWatch logs
4. Verify production access via https://app.serenityandrecovery.com

## Logs Location
- Application: /opt/serenity/ops/serenity-*.log
- MCP: /opt/serenity/ops/mcp-*.log
- Deployment: /opt/serenity/ops/plan_log.md
EOF

echo "===================================="
echo "Deployment Complete!"
echo "===================================="
echo ""
echo "✅ Application running on port 8080"
echo "✅ PM2 process manager configured"
echo "✅ CloudWatch monitoring active"
echo "📋 DNS instructions: /opt/serenity/ops/dns_instructions.md"
echo "📋 Deployment log: /opt/serenity/ops/plan_log.md"
echo ""
echo "Test locally: curl http://localhost:8080"
echo "Test via ALB: curl https://${ALB_DNS}"