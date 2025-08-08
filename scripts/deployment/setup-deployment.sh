#!/bin/bash

# Serenity Deployment Setup Script
# Prepares the app for production deployment

echo "🚀 SERENITY DEPLOYMENT SETUP"
echo "==========================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✅ .env file created${NC}"
else
    echo -e "${GREEN}✅ .env file exists${NC}"
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

# Build the project
echo ""
echo "🔨 Building for production..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
fi

# Check TypeScript
echo ""
echo "📝 Checking TypeScript..."
npm run typecheck

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ TypeScript check passed${NC}"
else
    echo -e "${RED}❌ TypeScript errors found${NC}"
    exit 1
fi

# Create deployment info file
echo ""
echo "📄 Creating deployment info..."
cat > dist/deployment-info.json << EOF
{
  "version": "1.0.0",
  "buildDate": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "features": {
    "hipaaCompliant": true,
    "offlineSupport": true,
    "peerSupport": true,
    "crisisIntervention": true,
    "encryption": "AES-256-GCM"
  }
}
EOF

echo -e "${GREEN}✅ Deployment info created${NC}"

# Show deployment checklist
echo ""
echo "📋 DEPLOYMENT CHECKLIST"
echo "======================"
echo ""
echo "1. Supabase Setup:"
echo "   [ ] Upgrade to Pro/Enterprise plan for BAA"
echo "   [ ] Set ENCRYPTION_SECRET in Edge Functions"
echo "   [ ] Deploy Edge Functions: supabase functions deploy"
echo "   [ ] Configure Auth redirect URLs"
echo "   [ ] Enable email confirmations"
echo ""
echo "2. Environment Variables (set in hosting platform):"
echo "   [ ] VITE_SUPABASE_URL"
echo "   [ ] VITE_SUPABASE_ANON_KEY"
echo ""
echo "3. Hosting Platform:"
echo "   [ ] Create project on Vercel/Netlify"
echo "   [ ] Connect GitHub repository"
echo "   [ ] Set environment variables"
echo "   [ ] Configure custom domain (optional)"
echo ""
echo "4. Security:"
echo "   [ ] Review all RLS policies"
echo "   [ ] Test authentication flow"
echo "   [ ] Verify encryption is working"
echo "   [ ] Check audit logging"
echo ""
echo "5. HIPAA Compliance:"
echo "   [ ] Sign BAA with Supabase"
echo "   [ ] Sign BAA with hosting provider"
echo "   [ ] Designate Security Officer"
echo "   [ ] Complete risk assessment"
echo ""

# Show deployment commands
echo "🚀 DEPLOYMENT COMMANDS"
echo "===================="
echo ""
echo "For Vercel:"
echo -e "${YELLOW}vercel --prod${NC}"
echo ""
echo "For Netlify:"
echo -e "${YELLOW}netlify deploy --prod${NC}"
echo ""
echo "For manual deployment:"
echo -e "${YELLOW}npm run preview${NC} (to test locally)"
echo ""

echo -e "${GREEN}✅ Setup complete! The app is ready for deployment.${NC}"
echo ""
echo "Next steps:"
echo "1. Complete the checklist above"
echo "2. Run deployment command for your platform"
echo "3. Test the deployed app thoroughly"
echo ""