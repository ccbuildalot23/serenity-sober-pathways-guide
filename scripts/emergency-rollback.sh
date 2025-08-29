#!/bin/bash
# Emergency Rollback Script for Vercel Deployment
# This script will rollback to the previous stable deployment

set -e

echo "🔄 EMERGENCY ROLLBACK INITIATED"
echo "================================"

# Check if VERCEL_TOKEN is set
if [ -z "$VERCEL_TOKEN" ]; then
  echo "❌ Error: VERCEL_TOKEN not set"
  echo "Please set: export VERCEL_TOKEN=your-token"
  exit 1
fi

# Get the list of deployments
echo "📋 Fetching deployment history..."
DEPLOYMENTS=$(vercel ls --token $VERCEL_TOKEN --json 2>/dev/null | jq -r '.[] | select(.state == "READY") | .url' | head -5)

if [ -z "$DEPLOYMENTS" ]; then
  echo "❌ No deployments found"
  exit 1
fi

echo "🔍 Recent deployments:"
echo "$DEPLOYMENTS" | nl

# Get the previous deployment (second in list, first is current)
PREVIOUS_DEPLOYMENT=$(echo "$DEPLOYMENTS" | sed -n '2p')

if [ -z "$PREVIOUS_DEPLOYMENT" ]; then
  echo "❌ No previous deployment found"
  exit 1
fi

echo ""
echo "🎯 Rolling back to: $PREVIOUS_DEPLOYMENT"
echo ""

# Perform the rollback by aliasing to production
echo "⚡ Executing rollback..."
vercel alias set $PREVIOUS_DEPLOYMENT serenity-sober-pathways-guide.vercel.app --token $VERCEL_TOKEN

# Verify the rollback
echo ""
echo "✅ Rollback complete!"
echo "🔍 Verifying deployment..."

# Check health endpoint
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://serenity-sober-pathways-guide.vercel.app/api/health)

if [ "$HEALTH_CHECK" = "200" ]; then
  echo "✅ Health check passed (HTTP $HEALTH_CHECK)"
  echo "🎉 Rollback successful!"
else
  echo "⚠️ Health check returned HTTP $HEALTH_CHECK"
  echo "Please verify the deployment manually"
fi

# Log the rollback
echo ""
echo "📝 Rollback details:"
echo "  - Timestamp: $(date)"
echo "  - Rolled back to: $PREVIOUS_DEPLOYMENT"
echo "  - Health status: $HEALTH_CHECK"

# Create rollback record
cat > rollback-$(date +%Y%m%d-%H%M%S).log << EOF
Rollback executed at: $(date)
Previous deployment: $PREVIOUS_DEPLOYMENT
Health check status: $HEALTH_CHECK
Executed by: $USER
EOF

echo ""
echo "📄 Rollback logged to: rollback-$(date +%Y%m%d-%H%M%S).log"
echo "🔔 Remember to investigate the issue that caused the rollback"