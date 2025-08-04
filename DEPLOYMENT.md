# 🚀 Deployment Guide - Serenity Sober Pathways

This guide will walk you through deploying the Serenity app to production.

## Prerequisites

- Node.js 18+ installed
- Supabase account (Pro/Enterprise for HIPAA)
- Vercel, Netlify, or hosting platform account
- Domain name (optional but recommended)

## Quick Start

```bash
# 1. Run setup script
./scripts/setup-deployment.sh

# 2. Deploy to your platform
vercel --prod  # For Vercel
# OR
netlify deploy --prod  # For Netlify
```

## Detailed Deployment Steps

### 1. Supabase Configuration

#### Upgrade to Pro/Enterprise
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to Settings → Billing
4. Upgrade to Pro ($25/month) or Enterprise
5. Request BAA from support@supabase.com

#### Configure Authentication
1. Go to Authentication → Providers
2. Enable Email provider
3. Set up email templates with recovery-friendly language
4. Configure redirect URLs:
   ```
   https://your-domain.com
   https://your-domain.com/*
   http://localhost:5173 (for development)
   ```

#### Set Edge Function Secrets
```bash
# Install Supabase CLI
npm install -g supabase

# Login and link project
supabase login
supabase link --project-ref tqyiqstpvwztvofrxpuf

# Set encryption secret (generate a secure 32-byte key)
supabase secrets set ENCRYPTION_SECRET=your-32-byte-secret-here

# Deploy edge functions
supabase functions deploy
```

### 2. Environment Variables

Create these in your hosting platform:

```env
VITE_SUPABASE_URL=https://tqyiqstpvwztvofrxpuf.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

⚠️ **NEVER** commit these to Git or expose service role keys

### 3. Deploy to Vercel

#### Via CLI
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod

# Follow prompts to:
# - Link to your Vercel account
# - Set project name
# - Configure build settings
```

#### Via Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Import Git repository
3. Configure:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variables
5. Deploy

### 4. Deploy to Netlify

#### Via CLI
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod

# Follow prompts to:
# - Link to your Netlify account
# - Configure site
```

#### Via Dashboard
1. Go to [netlify.com](https://netlify.com)
2. Drag and drop `dist` folder
3. Configure environment variables
4. Set up continuous deployment

### 5. Post-Deployment Checklist

#### Immediate Tests
- [ ] User registration works
- [ ] Login/logout functions properly
- [ ] Crisis button (988) is accessible
- [ ] Daily check-in saves data
- [ ] Peer chat connects
- [ ] Offline mode works

#### Security Verification
```bash
# Run deployment check
npm run deployment:check

# Test data storage
npm run test:storage
```

#### Configure Monitoring
1. Set up error tracking (Sentry)
2. Configure uptime monitoring
3. Set up backup alerts
4. Monitor Supabase usage

### 6. Custom Domain Setup

#### Vercel
1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS:
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```

#### Netlify
1. Go to Domain Settings
2. Add custom domain
3. Follow DNS instructions

### 7. SSL Certificate
- Vercel/Netlify: Automatic with Let's Encrypt
- Manual: Use Cloudflare or Let's Encrypt

## Production Configuration

### Security Headers
Add to `vercel.json` or `netlify.toml`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "SAMEORIGIN"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "geolocation=(), microphone=(), camera=()"
        }
      ]
    }
  ]
}
```

### Performance Optimization
1. Enable Vercel/Netlify CDN
2. Configure caching headers
3. Enable Brotli compression
4. Optimize images with next-gen formats

## Troubleshooting

### Database Connection Issues
```bash
# Check Supabase status
curl https://tqyiqstpvwztvofrxpuf.supabase.co/rest/v1/

# Verify environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY
```

### Build Failures
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Authentication Issues
1. Check Supabase Auth settings
2. Verify redirect URLs
3. Check email templates
4. Review RLS policies

## Maintenance

### Regular Tasks
- **Daily**: Monitor error logs
- **Weekly**: Check performance metrics
- **Monthly**: Review security audit logs
- **Quarterly**: Update dependencies

### Backup Strategy
- Supabase: Automatic daily backups (Pro plan)
- Code: GitHub repository
- Configurations: Document all settings

### Updates
```bash
# Update dependencies
npm update

# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## Support

### Technical Issues
- Supabase: support@supabase.com
- Vercel: support@vercel.com
- Netlify: support@netlify.com

### HIPAA Compliance
- Review `/docs/compliance/` folder
- Complete all BAAs before going live
- Conduct risk assessment quarterly

## Final Checklist

Before going live:
- [ ] All environment variables set
- [ ] Edge functions deployed
- [ ] Authentication tested
- [ ] Crisis features verified
- [ ] BAAs signed
- [ ] Security officer designated
- [ ] Backups configured
- [ ] Monitoring active
- [ ] SSL certificate active
- [ ] Custom domain configured

## Launch! 🎉

Once everything is checked, your app is ready to help people in recovery. Remember to:

1. Monitor closely for the first 48 hours
2. Have support team ready
3. Gather user feedback
4. Iterate based on real usage

Good luck with your launch! You're about to make a real difference in people's lives. 💜