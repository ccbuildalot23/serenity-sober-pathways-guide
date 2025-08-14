# 🚨 Incident Response Runbooks

**Serenity Sober Pathways Platform**  
**Last Updated:** August 14, 2025  
**Version:** 1.0

## Table of Contents
1. [Crisis Response Failures](#crisis-response-failures)
2. [AI Safety Alerts](#ai-safety-alerts)
3. [Payment Processing Failures](#payment-processing-failures)
4. [Data Breach Response](#data-breach-response)
5. [SOC-2 Compliance Exceptions](#soc-2-compliance-exceptions)
6. [System Outages](#system-outages)
7. [HIPAA Violations](#hipaa-violations)

---

## 🆘 Crisis Response Failures

### Severity: CRITICAL
### Target Response: <5 minutes
### Escalation: Immediate

### Detection Signals
- Crisis response time >250ms
- Failed crisis alert notifications
- Emergency contact unreachable
- Crisis escalation failure

### Immediate Actions (0-5 minutes)

1. **Verify Crisis Alert Status**
```bash
# Check crisis alert service
curl https://api.serenity.health/v1/crisis/status

# Query recent crisis events
psql -c "SELECT * FROM crisis_alerts WHERE created_at > NOW() - INTERVAL '5 minutes' ORDER BY created_at DESC;"
```

2. **Activate Backup Crisis System**
```bash
# Enable backup crisis routing
kubectl set env deployment/crisis-service BACKUP_MODE=true

# Verify backup activation
kubectl logs -f deployment/crisis-backup --tail=100
```

3. **Manual Crisis Intervention**
- Contact on-call crisis counselor: [REDACTED]
- Initiate manual supporter notifications
- Document patient ID and location

### Investigation (5-15 minutes)

1. **Check System Components**
```bash
# Database connectivity
psql -c "SELECT 1;"

# Supabase realtime
curl https://[PROJECT].supabase.co/rest/v1/crisis_alerts?select=*&limit=1

# Notification service
curl https://api.serenity.health/v1/notifications/health
```

2. **Review Error Logs**
```bash
# Application logs
kubectl logs deployment/crisis-service --since=15m

# Database logs
psql -c "SELECT * FROM error_logs WHERE service='crisis' AND created_at > NOW() - INTERVAL '15 minutes';"
```

3. **Check Network Path**
```bash
# Trace network route
traceroute api.serenity.health

# Check DNS resolution
nslookup api.serenity.health
```

### Resolution (15-30 minutes)

1. **Service Restart** (if needed)
```bash
kubectl rollout restart deployment/crisis-service
kubectl rollout status deployment/crisis-service
```

2. **Database Recovery** (if needed)
```bash
# Failover to replica
psql -h replica.db.serenity.health -c "SELECT pg_promote();"

# Verify promotion
psql -h replica.db.serenity.health -c "SELECT pg_is_in_recovery();"
```

3. **Notification Recovery**
```bash
# Reprocess failed notifications
node scripts/reprocess-crisis-notifications.js --since="15 minutes ago"
```

### Post-Incident (30+ minutes)

1. **Patient Safety Verification**
   - Contact all affected patients
   - Verify supporter notifications received
   - Document any harm or near-misses

2. **Root Cause Analysis**
   - Timeline of events
   - System state at failure
   - Contributing factors
   - Prevention measures

3. **Compliance Reporting**
   - File HIPAA breach report if PHI exposed
   - Update SOC-2 incident log
   - Notify insurance carrier if required

---

## 🤖 AI Safety Alerts

### Severity: HIGH
### Target Response: <15 minutes
### Escalation: Clinical team

### Detection Signals
- AI safety score <85%
- Bias detection triggered
- Hallucination detected
- Toxic content flagged
- Medical misinformation identified

### Immediate Actions (0-5 minutes)

1. **Quarantine Unsafe Content**
```javascript
// Disable affected AI agent
await aiSafetyMiddleware.disableAgent('RecoveryCoachAgent');

// Flag content for review
await supabase
  .from('ai_outputs')
  .update({ status: 'quarantined', reviewed: false })
  .eq('agent_id', agentId)
  .gte('created_at', new Date(Date.now() - 3600000));
```

2. **Notify Clinical Team**
```bash
# Send urgent notification
curl -X POST https://api.serenity.health/v1/notifications/urgent \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ai_safety_alert",
    "severity": "high",
    "agent": "RecoveryCoachAgent",
    "recipients": ["clinical-team@serenity.health"]
  }'
```

### Investigation (5-15 minutes)

1. **Review Flagged Content**
```sql
SELECT 
  agent_id,
  input,
  output,
  safety_score,
  concerns
FROM ai_safety_checks
WHERE safety_score < 0.85
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY safety_score ASC;
```

2. **Analyze Patterns**
```javascript
// Get safety metrics
const metrics = await aiSafety.getMetrics({
  start: new Date(Date.now() - 86400000),
  end: new Date()
});

console.log('Bias detections:', metrics.biasDetections);
console.log('Hallucinations:', metrics.hallucinationDetections);
```

3. **Check Model Version**
```bash
# Verify AI model version
curl https://api.openai.com/v1/models

# Check for recent deployments
kubectl describe deployment ai-service | grep "Image:"
```

### Resolution (15-30 minutes)

1. **Content Remediation**
```javascript
// Apply auto-remediation
const remediated = await aiSafetyMiddleware.applyAutoRemediation(
  unsafeContent,
  safetyChecks
);

// Update database
await supabase
  .from('ai_outputs')
  .update({ 
    output: remediated.message,
    safety_remediated: true 
  })
  .eq('id', outputId);
```

2. **Model Adjustment**
```javascript
// Increase safety threshold
aiSafetyMiddleware.configureSafety({
  threshold: 0.90, // Increase from 0.85
  autoRemediate: true
});

// Add problematic patterns to filter
await aiSafety.addBiasPattern({
  category: 'substance_use',
  keywords: ['addict', 'junkie'],
  weight: 0.8
});
```

### Post-Incident

1. **Patient Communication**
   - Identify affected patients
   - Send apology and explanation
   - Offer human counselor session

2. **Model Retraining**
   - Collect problematic outputs
   - Fine-tune safety parameters
   - Schedule retraining job

---

## 💳 Payment Processing Failures

### Severity: HIGH
### Target Response: <30 minutes
### Escalation: Finance team

### Detection Signals
- Stripe webhook failures
- Payment declined rates >10%
- Subscription creation failures
- Invoice generation errors

### Immediate Actions (0-10 minutes)

1. **Check Stripe Status**
```bash
# Stripe API health
curl https://api.stripe.com/v1/charges \
  -u $STRIPE_SECRET_KEY: \
  -d "amount=100" \
  -d "currency=usd" \
  -d "source=tok_visa" \
  --dry-run

# Check webhook endpoint
curl -I https://api.serenity.health/v1/webhooks/stripe
```

2. **Enable Fallback Processing**
```javascript
// Queue failed payments for retry
await supabase
  .from('payment_retry_queue')
  .insert({
    customer_id: customerId,
    amount: amount,
    retry_count: 0,
    next_retry: new Date(Date.now() + 3600000)
  });
```

### Investigation (10-20 minutes)

1. **Review Payment Logs**
```sql
SELECT 
  COUNT(*) as failures,
  failure_reason,
  MAX(created_at) as last_failure
FROM payments
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY failure_reason
ORDER BY failures DESC;
```

2. **Check Webhook Events**
```bash
# List recent webhook attempts
stripe events list --limit 10

# Replay failed webhooks
stripe events resend evt_1234567890
```

### Resolution (20-30 minutes)

1. **Fix Configuration Issues**
```bash
# Update webhook secret
export STRIPE_WEBHOOK_SECRET="whsec_new_secret"

# Restart payment service
kubectl rollout restart deployment/payment-service
```

2. **Process Queued Payments**
```javascript
// Retry failed payments
const retryQueue = await supabase
  .from('payment_retry_queue')
  .select('*')
  .eq('status', 'pending');

for (const payment of retryQueue.data) {
  await paymentService.retryPayment(payment);
}
```

### Post-Incident

1. **Customer Communication**
   - Email affected customers
   - Provide payment update links
   - Offer support for issues

2. **Financial Reconciliation**
   - Verify all payments processed
   - Update financial records
   - Report to CFO

---

## 🔐 Data Breach Response

### Severity: CRITICAL
### Target Response: Immediate
### Escalation: CEO, Legal, CISO

### Immediate Actions (0-15 minutes)

1. **Contain the Breach**
```bash
# Disable compromised accounts
psql -c "UPDATE users SET disabled=true WHERE id IN (SELECT user_id FROM suspicious_activity);"

# Rotate all secrets
./scripts/rotate-secrets.sh --emergency

# Enable enhanced logging
kubectl set env deployment/api-service AUDIT_LEVEL=verbose
```

2. **Preserve Evidence**
```bash
# Snapshot affected systems
aws ec2 create-snapshot --volume-id vol-12345 --description "Breach evidence $(date)"

# Export audit logs
psql -c "\COPY (SELECT * FROM audit_logs WHERE created_at > '2025-08-14') TO '/backup/audit_logs_breach.csv' CSV HEADER;"
```

### Investigation (15-60 minutes)

1. **Determine Scope**
```sql
-- Identify affected records
SELECT 
  table_name,
  COUNT(*) as records_accessed
FROM audit_logs
WHERE event_type = 'data_access'
  AND user_id IN (SELECT id FROM compromised_users)
GROUP BY table_name;

-- Check for data exfiltration
SELECT 
  user_id,
  SUM(response_size) as total_bytes,
  COUNT(*) as request_count
FROM api_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id
HAVING SUM(response_size) > 10000000; -- 10MB threshold
```

2. **Timeline Reconstruction**
```bash
# Correlate events
./scripts/breach-timeline.sh --start="2025-08-14" --user="compromised_user"
```

### HIPAA Breach Notification (Within 60 days)

1. **Individual Notice** (Without unreasonable delay)
   - Notify affected patients
   - Provide breach details
   - Offer credit monitoring

2. **HHS Notice** (Within 60 days)
   - File breach report
   - Provide investigation details
   - Document remediation

3. **Media Notice** (If >500 individuals)
   - Press release
   - Website notice
   - Call center setup

---

## 📋 SOC-2 Compliance Exceptions

### Severity: MEDIUM
### Target Response: <4 hours
### Escalation: Compliance Officer

### Detection Signals
- Control effectiveness <95%
- Missing evidence collection
- Policy violations detected
- Audit finding reported

### Immediate Actions (0-30 minutes)

1. **Run Compliance Check**
```javascript
// Run immediate assessment
const assessment = await soc2Service.runComplianceAssessment(
  ['security', 'availability', 'confidentiality', 'privacy'],
  {
    start: new Date(Date.now() - 86400000),
    end: new Date()
  }
);

console.log('Effectiveness:', assessment.overallEffectiveness);
console.log('Gaps:', assessment.gaps);
```

2. **Document Exception**
```sql
INSERT INTO compliance_exceptions (
  control_id,
  description,
  severity,
  detected_at,
  compensating_controls
) VALUES (
  'CC6.1',
  'MFA adoption below 95% threshold',
  'medium',
  NOW(),
  '["Enhanced monitoring", "Restricted access"]'
);
```

### Resolution (30 minutes - 4 hours)

1. **Implement Compensating Controls**
```javascript
// Enhanced monitoring for non-MFA accounts
await supabase
  .from('user_monitoring')
  .update({ 
    enhanced_monitoring: true,
    alert_threshold: 'low'
  })
  .eq('mfa_enabled', false);
```

2. **Update Evidence Collection**
```bash
# Force evidence collection
node scripts/collect-soc2-evidence.js --control="CC6.1" --force
```

### Post-Incident

1. **Update Risk Register**
2. **Schedule Remediation**
3. **Notify Auditors** (if material)

---

## 🔌 System Outages

### Severity: CRITICAL
### Target Response: <10 minutes
### Escalation: Automatic

### Detection Signals
- Health check failures
- User reports via status page
- Monitoring alerts
- Error rate spike >10%

### Immediate Actions (0-5 minutes)

1. **Activate Status Page**
```bash
# Update status page
curl -X POST https://status.serenity.health/api/v1/incidents \
  -H "Authorization: Bearer $STATUS_PAGE_KEY" \
  -d '{
    "name": "Service Disruption",
    "status": "investigating",
    "impact": "major",
    "components": ["api", "web"]
  }'
```

2. **Failover to Backup Region**
```bash
# DNS failover
aws route53 change-resource-record-sets \
  --hosted-zone-id Z123456 \
  --change-batch file://failover.json

# Verify failover
dig api.serenity.health
```

### Investigation (5-15 minutes)

1. **System Diagnostics**
```bash
# Check all services
kubectl get pods --all-namespaces | grep -v Running

# Database status
psql -c "SELECT pg_is_in_recovery();"

# Redis status
redis-cli ping
```

2. **Resource Utilization**
```bash
# CPU and memory
kubectl top nodes
kubectl top pods

# Disk usage
df -h
```

### Resolution (15-30 minutes)

1. **Scale Resources** (if needed)
```bash
# Horizontal scaling
kubectl scale deployment api-service --replicas=10

# Vertical scaling
kubectl set resources deployment api-service \
  --limits=cpu=2000m,memory=4Gi
```

2. **Service Recovery**
```bash
# Rolling restart
kubectl rollout restart deployment --all

# Verify recovery
./scripts/health-check-all.sh
```

### Post-Incident

1. **Update Status Page**
2. **Customer Communication**
3. **Post-Mortem** (within 48 hours)
4. **SLA Credits** (if applicable)

---

## 🏥 HIPAA Violations

### Severity: CRITICAL
### Target Response: Immediate
### Escalation: Compliance Officer, Legal

### Detection Signals
- Unauthorized PHI access
- Missing audit logs
- Encryption failures
- BAA violations

### Immediate Actions (0-15 minutes)

1. **Stop the Violation**
```sql
-- Revoke access immediately
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM compromised_user;

-- Lock affected records
UPDATE patient_records 
SET locked = true, locked_reason = 'HIPAA investigation'
WHERE id IN (SELECT record_id FROM unauthorized_access);
```

2. **Document the Incident**
```javascript
await supabase
  .from('hipaa_incidents')
  .insert({
    type: 'unauthorized_access',
    affected_records: affectedCount,
    discovered_at: new Date(),
    description: incidentDescription,
    initial_response: responseActions
  });
```

### Investigation (15-60 minutes)

1. **Determine Minimum Necessary**
```sql
-- What was accessed beyond minimum necessary?
SELECT 
  u.email,
  ar.table_name,
  ar.operation,
  COUNT(*) as access_count
FROM audit_logs ar
JOIN users u ON ar.user_id = u.id
WHERE ar.phi_accessed = true
  AND ar.created_at > NOW() - INTERVAL '7 days'
  AND ar.user_id NOT IN (
    SELECT provider_id 
    FROM provider_patient_relationships 
    WHERE patient_id = ar.patient_id
  )
GROUP BY u.email, ar.table_name, ar.operation;
```

2. **Risk Assessment**
- Type of PHI involved
- Number of individuals affected
- Likelihood of compromise
- Potential harm

### Breach Determination (Within 24 hours)

Use the 4-factor test:
1. Nature and extent of PHI
2. Unauthorized person who accessed
3. Whether PHI was acquired/viewed
4. Mitigation extent

### Notification Requirements

**Low probability of compromise:** Document reasoning

**Breach confirmed:**
- Individual notice (60 days)
- HHS notice (60 days)
- Media notice if >500 (60 days)
- Business associates (immediately)

---

## 📞 On-Call Rotation

### Primary On-Call
- **Weekdays:** DevOps Team
- **Weekends:** Rotating (see schedule)
- **Escalation:** Engineering Manager → CTO

### Clinical On-Call
- **24/7 Coverage:** Crisis Response Team
- **Escalation:** Clinical Supervisor → Chief Medical Officer

### Compliance On-Call
- **Business Hours:** Compliance Team
- **After Hours:** Compliance Officer
- **Escalation:** Legal Counsel → CEO

## 📊 Incident Severity Matrix

| Severity | Response Time | Escalation | Examples |
|----------|--------------|------------|----------|
| **CRITICAL** | <5 min | Automatic | Crisis failure, data breach, outage |
| **HIGH** | <30 min | 30 min | Payment failure, AI safety, degradation |
| **MEDIUM** | <4 hours | 2 hours | Compliance gap, performance issue |
| **LOW** | <24 hours | As needed | Minor bug, feature request |

## 🔧 Tools & Resources

### Monitoring Dashboards
- System Health: https://monitoring.serenity.health
- Crisis Response: https://crisis.serenity.health/dashboard
- Payment Status: https://payments.serenity.health/status
- Compliance: https://compliance.serenity.health

### Emergency Contacts
- On-Call: [REDACTED]
- Crisis Hotline: [REDACTED]
- Security Team: [REDACTED]
- Legal Counsel: [REDACTED]

### Critical Scripts
- `/scripts/emergency-shutdown.sh` - Emergency shutdown
- `/scripts/rotate-secrets.sh` - Rotate all secrets
- `/scripts/backup-restore.sh` - Restore from backup
- `/scripts/failover.sh` - Initiate failover

---

**Remember:** Patient safety is our top priority. When in doubt, escalate.

**Last Review:** August 14, 2025  
**Next Review:** November 14, 2025  
**Owner:** Operations Team