# SSL/TLS Certificate Configuration

## Current Issue
The production site at https://serenityalb-1709119748.us-east-1.elb.amazonaws.com has an SSL certificate mismatch. The certificate expects `app.serenityandrecovery.com` but is being accessed via the ALB DNS name.

## Solution Steps

### 1. AWS Certificate Manager (ACM) Configuration
```bash
# Request a new certificate for the domain
aws acm request-certificate \
  --domain-name "app.serenityandrecovery.com" \
  --subject-alternative-names "*.serenityandrecovery.com" "serenityandrecovery.com" \
  --validation-method DNS \
  --region us-east-1

# Note the CertificateArn returned
```

### 2. DNS Validation
Add the CNAME records provided by ACM to your DNS provider to validate domain ownership.

### 3. Update ALB Listener
```bash
# Update the HTTPS listener to use the new certificate
aws elbv2 modify-listener \
  --listener-arn arn:aws:elasticloadbalancing:us-east-1:662658456049:listener/app/SerenityALB/165322e27e517ff7/<listener-id> \
  --certificates CertificateArn=<new-certificate-arn> \
  --region us-east-1
```

### 4. Configure Route 53 (or your DNS provider)
```
Type: CNAME
Name: app.serenityandrecovery.com
Value: serenityalb-1709119748.us-east-1.elb.amazonaws.com
TTL: 300
```

### 5. Update Application Configuration
Update all references to use the proper domain:
- Environment variables
- Frontend configuration
- API endpoints
- Callback URLs in Supabase

## Security Headers
Ensure the ALB is configured with proper security headers:
```json
{
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Content-Security-Policy": "default-src 'self' https://*.supabase.co; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
}
```

## Verification
After configuration:
1. Test SSL certificate: `openssl s_client -connect app.serenityandrecovery.com:443`
2. Check SSL rating: https://www.ssllabs.com/ssltest/analyze.html?d=app.serenityandrecovery.com
3. Verify HSTS header: `curl -I https://app.serenityandrecovery.com`