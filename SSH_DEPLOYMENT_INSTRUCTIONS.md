# SSH Deployment Instructions for Serenity Production

## Quick Start (Copy & Paste)

### Step 1: Connect to EC2 Instance
Open a new terminal/PowerShell window and run:

```bash
ssh -i "C:\keys\serenity-keypair-2.pem" ubuntu@3.88.129.159
```

**Note**: The SSH key has been temporarily added via EC2 Instance Connect and will expire in 60 seconds. If connection fails, re-run the Instance Connect command.

### Step 2: Upload and Execute Deployment Script

#### Option A: Direct Copy-Paste (Recommended)
1. Once connected via SSH, create the deployment script:
```bash
cat > deploy.sh << 'DEPLOY_SCRIPT_EOF'
```

2. Copy the entire contents of `deploy-to-ec2.sh` file

3. Paste into the SSH terminal

4. Close the script with:
```bash
DEPLOY_SCRIPT_EOF
```

5. Make executable and run:
```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

#### Option B: SCP Transfer
From your local PowerShell (separate window):
```powershell
scp -i "C:\keys\serenity-keypair-2.pem" "C:\Users\cmcal\OneDrive\Documents\serenity-sober-pathways-guide\deploy-to-ec2.sh" ubuntu@3.88.129.159:~/deploy.sh
```

Then in the SSH session:
```bash
chmod +x deploy.sh
sudo ./deploy.sh
```

### Step 3: Monitor Deployment
The script will show real-time progress. Expected duration: 10-15 minutes.

Watch for these key milestones:
- ✅ Node.js 20.x installed
- ✅ Application dependencies installed
- ✅ Production build completed
- ✅ PM2 started on port 8080
- ✅ Health check passed

### Step 4: Verify Deployment

After script completes, verify:
```bash
# Check PM2 status
pm2 status

# Test local endpoint
curl -I http://localhost:8080

# View application logs
pm2 logs serenity --lines 50

# Check service status
systemctl status amazon-ssm-agent
```

## If SSH Key Expired

Re-authorize the SSH key:
```powershell
aws ec2-instance-connect send-ssh-public-key `
  --region us-east-1 `
  --instance-id i-0df41383c31631e69 `
  --availability-zone us-east-1b `
  --instance-os-user ubuntu `
  --ssh-public-key "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDQwPGBJ1/nuFtiyWDdnFIWZ7zlu5AWyB6BuO1kE/OmfjKSVTz7SCkjAO32qJ8bwsSSoWmSt8H3Es7uR9r0rJVNwNcehkFQtPiNmWcbPZFA0GN6PfTZmvCkI+d6FBFiVow3uYW4ORt/glhenAEsujFi6tRkTYup7mvntj8phlBnkojzPlYmu8ZzlCckYGFg9/qBS04WDT3OLjVrYwe/U9508wEJHeCGqMdbetoOwAqELVL+BiRaCEHgK1w7xbEgBJJq6zFdVZDrmZKNjR+drW+rxuk9+5+qRDV0omXy0JDprpX5rHLXPWc70Y3/3c1mYDnIaHFIxMsKoltmGIH/vUgd" `
  --profile iamadmin
```

## Post-Deployment Verification

### From AWS Console
1. Navigate to EC2 → Target Groups → SerenityTG
2. Check that instance shows "Healthy" (may take 2-3 minutes)

### From Local Machine
```powershell
# Check Target Group health
aws elbv2 describe-target-health `
  --target-group-arn arn:aws:elasticloadbalancing:us-east-1:662658456049:targetgroup/SerenityTG/0bdde177ad73bd36 `
  --region us-east-1 `
  --profile iamadmin

# Test via ALB
curl -I https://SerenityALB-1709119748.us-east-1.elb.amazonaws.com
```

## Troubleshooting

### If deployment fails:
1. Check logs: `cat /opt/serenity/ops/deployment_*.log`
2. Check PM2 logs: `pm2 logs serenity --lines 100`
3. Verify Node version: `node --version` (should be v20.x)
4. Check disk space: `df -h`
5. Check memory: `free -m`

### If health check fails:
1. Verify app is running: `pm2 status`
2. Test locally: `curl -v http://localhost:8080`
3. Check security group allows port 8080 from ALB
4. Review health check path in Target Group settings

### Common fixes:
```bash
# Restart application
pm2 restart serenity

# Rebuild if needed
cd /opt/serenity/app
npm run build
pm2 restart serenity

# Check port binding
netstat -tlnp | grep 8080

# View real-time logs
pm2 logs serenity --follow
```

## Success Indicators

When deployment is successful, you should see:
- PM2 status shows "online" for serenity app
- Local curl returns HTTP 200-399
- Target Group shows "Healthy" in AWS Console
- ALB endpoint responds with application
- SSM Agent status is "Online" in Systems Manager
- CloudWatch logs are streaming

## Next Steps

After successful deployment:

1. **Configure DNS** (if you have Route53):
   - Create CNAME: app.serenityandrecovery.com → SerenityALB-1709119748.us-east-1.elb.amazonaws.com

2. **Monitor Application**:
   - CloudWatch Logs: /aws/ec2/serenity/app
   - CloudWatch Metrics: Serenity namespace
   - PM2 Web Dashboard (optional)

3. **Security Hardening**:
   - Review security groups
   - Enable AWS WAF on ALB
   - Configure backup strategy

## Support Files

- Deployment Script: `deploy-to-ec2.sh`
- Deployment Logs: `/opt/serenity/ops/deployment_*.log`
- Application Logs: `/opt/serenity/ops/serenity-*.log`
- PM2 Config: `/opt/serenity/app/ecosystem.config.js`
- Summary: `/opt/serenity/ops/deployment_summary.md`