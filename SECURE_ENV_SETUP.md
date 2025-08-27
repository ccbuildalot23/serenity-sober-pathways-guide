# 🔐 Secure Environment Configuration Guide

## ⚠️ CRITICAL SECURITY NOTICE

The following sensitive values have been removed from `.env` for security. 
**NEVER commit these values to version control!**

## Required Environment Variables for Production

### 1. Vercel Dashboard Configuration

Navigate to: https://vercel.com/[your-org]/serenity/settings/environment-variables

Add these variables:

```bash
# App Store Connect (PRODUCTION ONLY)
APP_STORE_CONNECT_API_KEY_ID=4YBU7UC32Y
APP_STORE_CONNECT_ISSUER_ID=acb9e47c-6935-4933-ae2c-6170b5d90234
APPLE_ID=[Stored in .env.backup.secure]

# Encryption Key (Generate new one for production!)
VITE_ENCRYPTION_MASTER_KEY=[Generate with: openssl rand -hex 32]

# Sentry Error Monitoring (Create account at sentry.io)
SENTRY_DSN=[Get from Sentry dashboard]
SENTRY_AUTH_TOKEN=[Get from Sentry settings]
```

### 2. GitHub Secrets Configuration

For CI/CD, add to: Settings > Secrets and variables > Actions

```bash
P12_PASSWORD=[Stored in .env.backup.secure]
KEYCHAIN_PASSWORD=[Generate dynamically in CI]
APP_STORE_CONNECT_KEY=[Store the private key content]
```

### 3. Local Development (.env.local)

For local development ONLY (add to .gitignore):

```bash
# Copy from .env.backup.secure ONLY for local testing
# NEVER commit this file!
```

## Security Best Practices

1. **Rotate Keys Regularly**: Change all keys every 90 days
2. **Use Different Keys**: Never use production keys in development
3. **Audit Access**: Log all secret access attempts
4. **Principle of Least Privilege**: Grant minimal necessary permissions
5. **Enable 2FA**: On all accounts with secret access

## Verification Checklist

- [ ] All sensitive values removed from `.env`
- [ ] `.env.backup.secure` stored securely offline
- [ ] Vercel environment variables configured
- [ ] GitHub Secrets configured for CI/CD
- [ ] New encryption key generated for production
- [ ] Apple API keys rotated after exposure
- [ ] Team notified of security changes

## Emergency Procedures

If secrets are exposed:
1. Rotate all affected keys immediately
2. Audit access logs for unauthorized use
3. Update all environment configurations
4. Notify security team
5. Document incident

## Support

For help with secret management:
- Vercel Docs: https://vercel.com/docs/environment-variables
- GitHub Secrets: https://docs.github.com/en/actions/security-guides/secrets
- Best Practices: https://owasp.org/www-project-secrets-management/