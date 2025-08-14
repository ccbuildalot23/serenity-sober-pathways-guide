# Data Retention and Ownership Policy
**Serenity Sober Pathways Platform**  
**Version 1.0 - August 2025**  
**HIPAA Compliant | SOC-2 Certified**

## Executive Summary

This policy defines data retention periods, ownership rights, and deletion procedures for all data types within the Serenity platform. It ensures compliance with HIPAA, state-specific healthcare regulations, and international data protection laws while maintaining operational efficiency and patient care continuity.

## 1. Regulatory Framework

### 1.1 Federal Requirements
- **HIPAA Compliance Records**: 6 years from creation or last effective date (45 CFR §164.530(j))
- **Medicare/Medicaid Records**: 5 years minimum (42 CFR §482.24)
- **Substance Abuse Records**: 5 years per 42 CFR Part 2
- **Clinical Trial Data**: 21 years for FDA-regulated studies

### 1.2 State-Specific Requirements
Healthcare record retention varies by state. The platform enforces the longest applicable period:

| State | Medical Records | Mental Health Records | Substance Abuse | Minor Records |
|-------|----------------|----------------------|-----------------|---------------|
| California | 7 years | 7 years | 5 years | Age 18 + 7 years |
| New York | 6 years | 6 years | 5 years | Age 18 + 6 years |
| Texas | 7 years | 5 years | 5 years | Age 18 + 5 years |
| Florida | 5 years | 5 years | 5 years | Age 18 + 5 years |
| Illinois | 10 years | 5 years | 5 years | Age 18 + 10 years |

### 1.3 International Compliance
- **GDPR (EU)**: Personal data retained only as long as necessary for purpose
- **PIPEDA (Canada)**: Retention limited to fulfillment of identified purposes
- **LGPD (Brazil)**: Data retention must be justified and minimized

## 2. Data Classification and Retention Periods

### 2.1 Clinical Data

| Data Type | Owner | Retention Period | Deletion Method |
|-----------|-------|------------------|-----------------|
| Clinical Notes | Provider/Practice | 7 years from last treatment | Secure cryptographic erasure |
| Treatment Plans | Provider/Practice | 7 years from last update | Secure cryptographic erasure |
| Assessments (PHQ-9, GAD-7) | Patient/Provider shared | 7 years from administration | Secure cryptographic erasure |
| Prescriptions | Provider | 7 years from issuance | Secure cryptographic erasure |
| Lab Results | Provider/Patient shared | 7 years from receipt | Secure cryptographic erasure |
| Crisis Records | Provider/Practice | 10 years from incident | Secure cryptographic erasure |

### 2.2 Administrative Data

| Data Type | Owner | Retention Period | Deletion Method |
|-----------|-------|------------------|-----------------|
| Billing Records | Practice | 7 years | Secure deletion |
| Insurance Claims | Practice | 7 years | Secure deletion |
| Appointment History | Provider/Patient shared | 3 years | Soft delete + purge |
| Communication Logs | Platform | 3 years | Automated purge |
| Consent Forms | Patient | 7 years from signature | Secure cryptographic erasure |

### 2.3 Platform Data

| Data Type | Owner | Retention Period | Deletion Method |
|-----------|-------|------------------|-----------------|
| User Accounts | User | Active + 2 years | Anonymization |
| Session Logs | Platform | 90 days | Automated rotation |
| Audit Trails | Platform | 6 years (HIPAA) | Immutable archive |
| Security Events | Platform | 3 years | Secure archive |
| Performance Metrics | Platform | 1 year | Aggregation + deletion |
| Backup Data | Platform | 30 days rolling | Automated expiration |

### 2.4 Research and Analytics

| Data Type | Owner | Retention Period | Deletion Method |
|-----------|-------|------------------|-----------------|
| De-identified Data | Platform | Indefinite | N/A |
| Aggregated Statistics | Platform | Indefinite | N/A |
| Research Datasets | Researcher/Platform | Per IRB protocol | Secure deletion |
| Quality Metrics | Platform | 5 years | Archival |

## 3. Data Ownership Framework

### 3.1 Ownership Principles
1. **Patient-Centric**: Patients maintain fundamental rights to their health information
2. **Provider Stewardship**: Providers act as stewards of clinical documentation
3. **Practice Custody**: Practices maintain business records and operational data
4. **Platform Facilitation**: Serenity facilitates secure storage without claiming ownership

### 3.2 Ownership Matrix

| Stakeholder | Owns | Controls Access | Can Delete | Can Export |
|-------------|------|-----------------|------------|------------|
| **Patient** | Personal health information, preferences, self-reported data | ✓ (own data) | ✓ (with exceptions¹) | ✓ |
| **Provider** | Clinical notes, treatment documentation, professional opinions | ✓ (assigned patients) | ✓ (after retention) | ✓ |
| **Practice** | Business records, billing, aggregate analytics | ✓ (practice-wide) | ✓ (after retention) | ✓ |
| **Supporter** | Communication logs with patient | Limited | ✗ | ✓ (own messages) |
| **Platform** | Technical logs, security data, de-identified aggregates | ✓ (platform data) | ✓ (per policy) | N/A |

¹ Exceptions: Legal holds, ongoing treatment, regulatory requirements

### 3.3 Transfer of Ownership
- **Provider Departure**: Clinical records transfer to practice or designated provider
- **Practice Closure**: 60-day notice to patients for record transfer
- **Patient Request**: Full export provided within 30 days per HIPAA
- **Death of Patient**: Records retained per state law, access per estate rights

## 4. Deletion and Disposal Procedures

### 4.1 Automatic Deletion Workflow
```
1. Retention period expires
2. System checks for:
   - Active legal holds
   - Ongoing treatment relationships
   - Pending insurance claims
   - Research protocols
3. If clear, mark for deletion
4. 30-day grace period with notifications
5. Cryptographic erasure execution
6. Audit log entry created
7. Backup purge within 30 days
```

### 4.2 Manual Deletion Requests

**Patient-Initiated Deletion:**
- Submit through patient portal or written request
- 15-day review period for exceptions
- Partial deletion available (non-clinical data)
- Confirmation provided within 30 days

**Provider-Initiated Deletion:**
- Requires practice administrator approval
- Must comply with state retention laws
- Cannot delete during active treatment
- Audit trail permanently retained

### 4.3 Secure Deletion Methods

| Method | Use Case | Standard | Verification |
|--------|----------|----------|--------------|
| **Cryptographic Erasure** | PHI, clinical records | NIST 800-88 | Key destruction audit |
| **Secure Overwrite** | Non-encrypted data | DoD 5220.22-M | Write verification |
| **Physical Destruction** | Hardware disposal | NIST 800-88 | Certificate of destruction |
| **Anonymization** | Research data | HIPAA Safe Harbor | Re-identification risk assessment |

## 5. Legal Holds and Exceptions

### 5.1 Automatic Hold Triggers
- Active litigation involving patient/provider
- Government investigation or audit
- Insurance fraud investigation
- Malpractice claims
- Worker's compensation cases

### 5.2 Hold Management
- Legal hold supersedes retention policy
- Automated notification to legal team
- Quarterly hold review process
- Release requires legal approval
- Audit trail of all hold actions

## 6. Implementation and Enforcement

### 6.1 Technical Implementation
```typescript
// Automated retention enforcement
class DataRetentionEnforcer {
  async enforceRetention() {
    const expiredData = await this.identifyExpiredData();
    
    for (const record of expiredData) {
      if (await this.checkLegalHold(record)) continue;
      if (await this.checkActiveTreatment(record)) continue;
      
      await this.scheduleSecureDeletion(record);
      await this.notifyDataOwner(record);
      await this.createAuditEntry(record);
    }
  }
  
  async scheduleSecureDeletion(record: DataRecord) {
    return dataRetentionService.scheduleDeletion({
      recordId: record.id,
      deletionDate: addDays(30),
      method: 'cryptographic_erasure',
      notificationSent: true
    });
  }
}
```

### 6.2 Compliance Monitoring
- **Monthly**: Automated retention compliance reports
- **Quarterly**: Manual audit of deletion procedures
- **Annually**: Third-party compliance assessment
- **Continuous**: Real-time policy violation alerts

### 6.3 Staff Training
- Onboarding: Data retention fundamentals
- Annual: Policy updates and refresher
- Role-specific: Provider, admin, support training
- Incident-based: Lessons learned sessions

## 7. Data Portability and Export

### 7.1 Patient Rights
- **Format Options**: PDF, JSON, FHIR, CCD
- **Delivery Methods**: Secure download, encrypted email, API
- **Timeline**: 30 days standard, 60 days for extensive records
- **Cost**: First request free, subsequent at cost

### 7.2 Provider Transitions
- **Bulk Export**: Full patient panel export
- **Continuity File**: Active treatment summaries
- **Format**: FHIR bulk data or practice-specific
- **Verification**: Cryptographic checksums

## 8. Incident Response

### 8.1 Improper Deletion
1. Immediate deletion freeze
2. Attempt recovery from backups (30-day window)
3. Document incident and impact
4. Notify affected parties within 72 hours
5. Implement corrective measures
6. Update training and procedures

### 8.2 Unauthorized Access Post-Deletion
1. Investigate access logs
2. Verify deletion completion
3. Check all backup locations
4. Security incident response activation
5. Potential breach notification

## 9. Policy Governance

### 9.1 Review Schedule
- **Quarterly**: Operational metrics review
- **Semi-Annually**: State law updates
- **Annually**: Full policy review
- **Ad-hoc**: Regulatory change triggers

### 9.2 Approval Authority
- **Policy Owner**: Chief Compliance Officer
- **Technical Owner**: Chief Technology Officer
- **Legal Review**: General Counsel
- **Final Approval**: CEO + Board Privacy Committee

### 9.3 Version Control
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-08-14 | Compliance Team | Initial policy |

## 10. Appendices

### Appendix A: State-by-State Retention Requirements
[Detailed 50-state matrix available in separate document]

### Appendix B: International Retention Requirements
[Country-specific requirements for supported regions]

### Appendix C: Technical Deletion Procedures
[Step-by-step technical implementation guide]

### Appendix D: Legal Hold Procedure
[Detailed legal hold workflow and responsibilities]

### Appendix E: Audit Log Samples
[Examples of retention-related audit entries]

---

**Contact Information:**
- Compliance Team: compliance@serenitypathways.com
- Privacy Officer: privacy@serenitypathways.com
- Legal Department: legal@serenitypathways.com

**Last Updated:** August 14, 2025  
**Next Review:** November 14, 2025  
**Policy Location:** /docs/compliance/data-retention-policy.md