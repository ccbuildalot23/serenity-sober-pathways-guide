# Business Associate Agreement (BAA) Tracking

## Overview
This document tracks all Business Associate Agreements required for HIPAA compliance for the Serenity Sober Pathways Guide platform.

## Required BAAs

### 1. Supabase (Database Provider)
- **Status**: ⏳ PENDING
- **Contact**: https://supabase.com/security
- **BAA Process**: Enterprise plan required for BAA
- **Action Required**: 
  1. Upgrade to Supabase Pro or Enterprise plan
  2. Contact sales@supabase.com to request BAA
  3. Reference their HIPAA compliance documentation

### 2. Vercel (Hosting Provider)
- **Status**: ⏳ PENDING  
- **Contact**: https://vercel.com/legal/privacy-policy
- **BAA Process**: Enterprise plan required
- **Action Required**:
  1. Upgrade to Vercel Enterprise
  2. Contact enterprise@vercel.com for BAA
  3. Request HIPAA-compliant deployment configuration

### 3. OpenAI (AI Services) - If Used
- **Status**: ⚠️ NOT AVAILABLE
- **Note**: OpenAI does not currently sign BAAs
- **Alternative**: Remove AI features or use HIPAA-compliant alternatives like AWS Comprehend Medical

### 4. Email Provider (If applicable)
- **Status**: ⏳ PENDING
- **Options**:
  - SendGrid (with Twilio BAA)
  - Amazon SES (with AWS BAA)
  - Postmark (HIPAA compliant with BAA)

### 5. SMS Provider (If applicable)
- **Status**: ⏳ PENDING
- **Options**:
  - Twilio (offers BAA)
  - Amazon SNS (with AWS BAA)

## BAA Request Template

Use this template when requesting BAAs from providers:

---

Subject: Business Associate Agreement Request - HIPAA Compliance

Dear [Provider Name] Team,

We are using [Service Name] for our healthcare application that processes Protected Health Information (PHI) under HIPAA regulations. To ensure compliance, we require a Business Associate Agreement (BAA) with your organization.

**Organization Details:**
- Company Name: [Your Company Name]
- Application: Serenity Sober Pathways Guide
- Use Case: Mental health and addiction recovery support platform
- Estimated Monthly Active Users: [Number]

**Services Used:**
- [List specific services/products used]

**Compliance Requirements:**
- HIPAA Business Associate Agreement
- Confirmation of encryption at rest and in transit
- Audit logging capabilities
- Data retention and deletion policies

Please provide:
1. Your standard HIPAA BAA for execution
2. Any additional security documentation
3. Configuration requirements for HIPAA compliance
4. Point of contact for compliance matters

We aim to execute the BAA by [Date]. Please let us know if you need any additional information.

Best regards,
[Your Name]
[Title]
[Contact Information]

---

## Tracking Checklist

- [ ] Identify all third-party services that handle PHI
- [ ] Determine which services offer BAAs
- [ ] Contact each provider for BAA
- [ ] Review BAA terms with legal counsel
- [ ] Execute BAAs
- [ ] Store signed BAAs securely
- [ ] Set annual review reminders
- [ ] Document any services that cannot provide BAAs
- [ ] Implement alternative solutions for non-compliant services

## Important Notes

1. **No BAA = No PHI**: Never transmit PHI to services without signed BAAs
2. **Annual Review**: Review all BAAs annually
3. **Subprocessors**: Ensure BAAs cover any subprocessors
4. **Termination**: Maintain BAAs for 6 years after termination