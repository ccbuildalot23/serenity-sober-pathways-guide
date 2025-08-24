#!/bin/bash
set -e

# Serenity AWS Production Deployment Script
# Instance: i-0df41383c31631e69
# Generated: 2025-08-24

echo "================================================"
echo "  SERENITY PRODUCTION DEPLOYMENT - AWS EC2"
echo "================================================"
echo "Starting deployment at $(date -Iseconds)"

# Create log file
LOG_FILE="/opt/serenity/ops/deployment_$(date +%Y%m%d_%H%M%S).log"
sudo mkdir -p /opt/serenity/ops
sudo chown -R ubuntu:ubuntu /opt/serenity

# Function to log
log() {
    echo "[$(date -Iseconds)] $1" | tee -a "$LOG_FILE"
}

log "===== PHASE 1: SYSTEM DEPENDENCIES ====="

# Update system
log "Updating system packages..."
sudo apt-get update -y

# Install Node.js 20.x
log "Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install build essentials and git
log "Installing build tools..."
sudo apt-get install -y build-essential git curl unzip jq

# Install global npm packages
log "Installing PM2 and serve..."
sudo npm install -g pm2@latest serve

# Verify installations
log "Node version: $(node --version)"
log "NPM version: $(npm --version)"
log "PM2 version: $(pm2 --version)"

log "===== PHASE 2: SERENITY APPLICATION DEPLOYMENT ====="

# Create application directory
cd /opt/serenity

# Clone or update repository
if [ -d "app" ]; then
    log "Updating existing repository..."
    cd app
    git fetch origin
    git reset --hard origin/main
else
    log "Cloning repository..."
    git clone https://github.com/ccbuildalot23/serenity-sober-pathways-guide.git app
    cd app
fi

# Install dependencies
log "Installing npm dependencies (this may take a few minutes)..."
npm ci --legacy-peer-deps --no-audit --no-fund

# Create production environment file
log "Creating production environment configuration..."
cat > .env.production << 'EOF'
VITE_SUPABASE_URL=https://tqyiqstpvwztvofrxpuf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxeWlxc3Rwd3d6dHZvZnJ4cHVmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI5NDE3NTAsImV4cCI6MjAzODUxNzc1MH0.VJ7m6DYithI_7ZeaRjk1nJwHnXUVRr6YkwwzTFL34bs
NODE_ENV=production
PORT=8080
VITE_APP_ENV=production
EOF

# Build the application
log "Building production bundle..."
npm run build

# Configure PM2 ecosystem file
log "Configuring PM2..."
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
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# Stop existing PM2 processes if any
pm2 delete serenity 2>/dev/null || true

# Start application with PM2
log "Starting Serenity application with PM2..."
pm2 start ecosystem.config.js
pm2 save

# Setup PM2 to start on boot
log "Configuring PM2 startup..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
pm2 save

# Wait for application to start
sleep 5

# Test application locally
log "Testing application on localhost:8080..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/)
log "Health check response: HTTP $HTTP_CODE"

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -le 399 ]; then
    log "✅ Application is running successfully!"
else
    log "⚠️ Application may not be running correctly (HTTP $HTTP_CODE)"
    log "Checking PM2 logs..."
    pm2 logs serenity --lines 20 --nostream
fi

log "===== PHASE 3: AWS MCP SERVER INSTALLATION ====="

cd /opt/serenity

# Try multiple MCP repositories
log "Installing MCP server..."

# Option 1: Try modelcontextprotocol servers
if [ ! -d "mcp" ]; then
    log "Cloning MCP servers repository..."
    git clone https://github.com/modelcontextprotocol/servers.git mcp 2>/dev/null || true
fi

# Option 2: Try awslabs/mcp if first fails
if [ ! -d "mcp" ]; then
    log "Trying awslabs/mcp repository..."
    git clone https://github.com/awslabs/mcp.git mcp 2>/dev/null || true
fi

if [ -d "mcp" ]; then
    cd mcp
    
    # Find AWS-related server
    AWS_SERVER_DIR=""
    for dir in src/aws-kb-retrieval-server src/aws src/aws-serverless-mcp-server servers/aws; do
        if [ -d "$dir" ]; then
            AWS_SERVER_DIR="$dir"
            log "Found AWS MCP server at: $AWS_SERVER_DIR"
            break
        fi
    done
    
    if [ -n "$AWS_SERVER_DIR" ]; then
        cd "$AWS_SERVER_DIR"
        
        # Check if it's a Node.js project
        if [ -f "package.json" ]; then
            log "Installing MCP server dependencies..."
            npm install
            
            # Create environment configuration
            cat > .env << 'EOF'
AWS_REGION=us-east-1
NODE_ENV=production
PORT=3000
EOF
            
            # Create PM2 config for MCP
            cat > mcp-ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'mcp-server',
    script: 'npm',
    args: 'start',
    cwd: '.',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      AWS_REGION: 'us-east-1',
      PORT: 3000
    },
    error_file: '/opt/serenity/ops/mcp-error.log',
    out_file: '/opt/serenity/ops/mcp-out.log',
    time: true
  }]
};
EOF
            
            # Start MCP server
            pm2 delete mcp-server 2>/dev/null || true
            pm2 start mcp-ecosystem.config.js
            pm2 save
            
            log "✅ MCP server installed and started"
        else
            log "⚠️ MCP server is not a Node.js project, skipping..."
        fi
    else
        log "⚠️ AWS MCP server directory not found"
    fi
else
    log "⚠️ Could not clone MCP repository"
fi

log "===== PHASE 4: SSM AGENT INSTALLATION ====="

# Install SSM Agent
log "Installing SSM Agent..."
if ! systemctl is-active --quiet snap.amazon-ssm-agent.amazon-ssm-agent.service; then
    sudo snap install amazon-ssm-agent --classic 2>/dev/null || {
        log "Snap not available, installing via .deb package..."
        wget https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/debian_amd64/amazon-ssm-agent.deb
        sudo dpkg -i amazon-ssm-agent.deb
        rm amazon-ssm-agent.deb
    }
fi

# Enable and start SSM agent
sudo systemctl enable snap.amazon-ssm-agent.amazon-ssm-agent.service 2>/dev/null || sudo systemctl enable amazon-ssm-agent
sudo systemctl start snap.amazon-ssm-agent.amazon-ssm-agent.service 2>/dev/null || sudo systemctl start amazon-ssm-agent

# Check SSM agent status
if systemctl is-active --quiet amazon-ssm-agent || systemctl is-active --quiet snap.amazon-ssm-agent.amazon-ssm-agent.service; then
    log "✅ SSM Agent is running"
else
    log "⚠️ SSM Agent may not be running correctly"
fi

log "===== PHASE 5: CLOUDWATCH AGENT INSTALLATION ====="

# Install CloudWatch Agent
log "Installing CloudWatch Agent..."
if [ ! -f "/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl" ]; then
    wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
    sudo dpkg -i amazon-cloudwatch-agent.deb
    rm amazon-cloudwatch-agent.deb
fi

# Configure CloudWatch Agent
log "Configuring CloudWatch Agent..."
sudo mkdir -p /opt/aws/amazon-cloudwatch-agent/etc
sudo tee /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json > /dev/null << 'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/opt/serenity/ops/serenity-out.log",
            "log_group_name": "/aws/ec2/serenity/app",
            "log_stream_name": "{instance_id}/out",
            "timezone": "UTC"
          },
          {
            "file_path": "/opt/serenity/ops/serenity-error.log",
            "log_group_name": "/aws/ec2/serenity/app",
            "log_stream_name": "{instance_id}/error",
            "timezone": "UTC"
          },
          {
            "file_path": "/opt/serenity/ops/mcp-out.log",
            "log_group_name": "/aws/ec2/serenity/mcp",
            "log_stream_name": "{instance_id}/out",
            "timezone": "UTC"
          },
          {
            "file_path": "/opt/serenity/ops/mcp-error.log",
            "log_group_name": "/aws/ec2/serenity/mcp",
            "log_stream_name": "{instance_id}/error",
            "timezone": "UTC"
          },
          {
            "file_path": "/opt/serenity/ops/deployment_*.log",
            "log_group_name": "/aws/ec2/serenity/deployment",
            "log_stream_name": "{instance_id}",
            "timezone": "UTC"
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
          {"name": "cpu_usage_idle", "rename": "CPU_IDLE", "unit": "Percent"},
          {"name": "cpu_usage_iowait", "rename": "CPU_IOWAIT", "unit": "Percent"}
        ],
        "metrics_collection_interval": 60
      },
      "disk": {
        "measurement": [
          {"name": "used_percent", "rename": "DISK_USED", "unit": "Percent"}
        ],
        "metrics_collection_interval": 60,
        "resources": ["/"]
      },
      "mem": {
        "measurement": [
          {"name": "mem_used_percent", "rename": "MEM_USED", "unit": "Percent"}
        ],
        "metrics_collection_interval": 60
      }
    }
  }
}
EOF

# Start CloudWatch Agent
log "Starting CloudWatch Agent..."
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a stop 2>/dev/null || true
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a start \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json

log "===== PHASE 6: FINAL STATUS CHECK ====="

# Display PM2 status
log "Current PM2 processes:"
pm2 list

# Test application endpoint
log "Testing application endpoint..."
curl -I http://localhost:8080/ 2>/dev/null | head -n 5

# Create summary report
cat > /opt/serenity/ops/deployment_summary.md << EOF
# Deployment Summary
Generated: $(date -Iseconds)

## Application Status
- **Serenity App**: $(pm2 info serenity | grep status | awk '{print $4}' || echo "Unknown")
- **MCP Server**: $(pm2 info mcp-server | grep status | awk '{print $4}' 2>/dev/null || echo "Not installed")
- **Health Check**: HTTP $HTTP_CODE

## Services
- **SSM Agent**: $(systemctl is-active amazon-ssm-agent || systemctl is-active snap.amazon-ssm-agent.amazon-ssm-agent.service)
- **CloudWatch Agent**: $(systemctl is-active amazon-cloudwatch-agent)
- **PM2**: $(systemctl is-active pm2-ubuntu)

## Access Points
- **Local**: http://localhost:8080
- **Instance IP**: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8080

## Logs
- Application: /opt/serenity/ops/serenity-*.log
- MCP Server: /opt/serenity/ops/mcp-*.log
- Deployment: $LOG_FILE

## Next Steps
1. Verify Target Group health in AWS Console
2. Test via ALB endpoint
3. Configure DNS for app.serenityandrecovery.com
EOF

log "===== DEPLOYMENT COMPLETE ====="
log "✅ Serenity application deployed successfully!"
log "📋 Summary saved to: /opt/serenity/ops/deployment_summary.md"
log "📊 View logs with: pm2 logs"
log "🔄 Restart app with: pm2 restart serenity"

echo ""
echo "================================================"
echo "  DEPLOYMENT FINISHED - $(date +%H:%M:%S)"
echo "================================================"
echo ""
echo "Test locally: curl http://localhost:8080"
echo "View status: pm2 status"
echo "View logs: pm2 logs serenity"