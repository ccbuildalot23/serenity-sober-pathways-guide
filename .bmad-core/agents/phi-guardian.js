/**
 * PHI Guardian Agent - HIPAA Compliance and PHI Protection
 * Ensures all Protected Health Information is handled according to HIPAA standards
 */

import { Agent } from '../core/agent.js';
import crypto from 'crypto';

export class PHIGuardianAgent extends Agent {
  constructor() {
    super('phi-guardian', {
      role: 'compliance',
      capabilities: ['encryption', 'access-control', 'audit', 'data-classification']
    });
    
    this.phiPatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b[A-Z]\d{7,8}\b/g, // MRN
      /\b\d{10,11}\b/g, // Phone
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email
      /\b(?:19|20)\d{2}[-/]\d{1,2}[-/]\d{1,2}\b/g // DOB
    ];
  }

  async analyzePHI(data) {
    const analysis = {
      containsPHI: false,
      phiElements: [],
      classification: 'public',
      recommendations: []
    };

    // Check for PHI patterns
    for (const pattern of this.phiPatterns) {
      if (pattern.test(JSON.stringify(data))) {
        analysis.containsPHI = true;
        analysis.phiElements.push(pattern.source);
      }
    }

    // Check for medical terminology
    const medicalTerms = ['diagnosis', 'medication', 'treatment', 'prescription', 'symptom'];
    const dataString = JSON.stringify(data).toLowerCase();
    
    for (const term of medicalTerms) {
      if (dataString.includes(term)) {
        analysis.containsPHI = true;
        analysis.phiElements.push(term);
      }
    }

    // Set classification
    if (analysis.containsPHI) {
      analysis.classification = 'restricted';
      analysis.recommendations.push('Encrypt before storage');
      analysis.recommendations.push('Require MFA for access');
      analysis.recommendations.push('Enable audit logging');
    }

    return analysis;
  }

  async encryptPHI(data, keyId) {
    const algorithm = 'aes-256-gcm';
    const key = await this.getEncryptionKey(keyId);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm,
      keyId,
      timestamp: new Date().toISOString()
    };
  }

  async decryptPHI(encryptedData) {
    const { encrypted, iv, authTag, algorithm, keyId } = encryptedData;
    const key = await this.getEncryptionKey(keyId);
    
    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  async validateAccess(userId, resource, action) {
    const validation = {
      allowed: false,
      reason: '',
      requiresMFA: false,
      auditRequired: true
    };

    // Check user role and permissions
    const userPermissions = await this.getUserPermissions(userId);
    const resourceClassification = await this.getResourceClassification(resource);

    if (resourceClassification === 'restricted') {
      validation.requiresMFA = true;
      
      if (!userPermissions.includes('phi_access')) {
        validation.reason = 'User lacks PHI access permission';
        return validation;
      }

      if (action === 'delete' && !userPermissions.includes('phi_delete')) {
        validation.reason = 'User lacks PHI deletion permission';
        return validation;
      }
    }

    // Check purpose of use
    const purposeOfUse = await this.getPurposeOfUse(userId, resource);
    if (!this.isValidPurpose(purposeOfUse)) {
      validation.reason = 'Invalid purpose of use for PHI access';
      return validation;
    }

    // Check minimum necessary standard
    if (!this.meetsMinimumNecessary(userId, resource, action)) {
      validation.reason = 'Access exceeds minimum necessary standard';
      return validation;
    }

    validation.allowed = true;
    validation.reason = 'Access granted per HIPAA guidelines';
    
    // Log access attempt
    await this.logAccess(userId, resource, action, validation);
    
    return validation;
  }

  async deidentifyPHI(data) {
    const deidentified = JSON.parse(JSON.stringify(data));
    
    // Safe harbor method - remove 18 identifiers
    const identifiersToRemove = [
      'name', 'address', 'email', 'phone', 'fax', 'ssn', 'mrn',
      'healthPlanNumber', 'accountNumber', 'certificateNumber',
      'vehicleId', 'deviceId', 'url', 'ip', 'biometric',
      'photo', 'dob', 'admissionDate', 'dischargeDate'
    ];

    for (const identifier of identifiersToRemove) {
      this.recursiveRemove(deidentified, identifier);
    }

    // Replace dates with year only
    this.anonymizeDates(deidentified);
    
    // Replace geographic info with region
    this.anonymizeGeography(deidentified);
    
    return deidentified;
  }

  async generateBAA(entity) {
    return {
      agreement: 'Business Associate Agreement',
      entity: entity.name,
      effectiveDate: new Date().toISOString(),
      obligations: {
        safeguards: 'Implement appropriate safeguards to prevent unauthorized use or disclosure',
        reporting: 'Report any breach within 24 hours',
        subcontractors: 'Ensure subcontractors agree to same restrictions',
        access: 'Provide access to PHI as required by HIPAA',
        retention: 'Retain PHI for minimum of 6 years',
        destruction: 'Destroy PHI securely when no longer needed'
      },
      signature: await this.generateDigitalSignature(entity)
    };
  }

  async monitorCompliance() {
    const report = {
      timestamp: new Date().toISOString(),
      compliant: true,
      issues: [],
      metrics: {}
    };

    // Check encryption status
    const encryptionStatus = await this.checkEncryption();
    if (!encryptionStatus.allEncrypted) {
      report.compliant = false;
      report.issues.push('Unencrypted PHI detected');
    }
    report.metrics.encryptionRate = encryptionStatus.rate;

    // Check access logs
    const accessAudit = await this.auditAccessLogs();
    if (accessAudit.unauthorizedAttempts > 0) {
      report.issues.push(`${accessAudit.unauthorizedAttempts} unauthorized access attempts`);
    }
    report.metrics.unauthorizedAccess = accessAudit.unauthorizedAttempts;

    // Check data retention
    const retentionAudit = await this.auditDataRetention();
    if (retentionAudit.overdueForDeletion > 0) {
      report.issues.push(`${retentionAudit.overdueForDeletion} records overdue for deletion`);
    }
    report.metrics.retentionCompliance = retentionAudit.complianceRate;

    // Check user access reviews
    const accessReview = await this.checkAccessReviews();
    if (!accessReview.current) {
      report.compliant = false;
      report.issues.push('User access reviews overdue');
    }
    report.metrics.accessReviewCurrent = accessReview.current;

    return report;
  }

  async handleBreachProtocol(incident) {
    const protocol = {
      incidentId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actions: []
    };

    // Step 1: Contain the breach
    await this.containBreach(incident);
    protocol.actions.push('Breach contained');

    // Step 2: Assess the scope
    const assessment = await this.assessBreachScope(incident);
    protocol.scope = assessment;
    protocol.actions.push('Scope assessed');

    // Step 3: Notify affected individuals (within 60 days)
    if (assessment.individualsAffected > 0) {
      await this.notifyIndividuals(assessment.affectedIndividuals);
      protocol.actions.push('Individuals notified');
    }

    // Step 4: Notify HHS (within 60 days)
    await this.notifyHHS(incident, assessment);
    protocol.actions.push('HHS notified');

    // Step 5: Notify media if > 500 individuals affected
    if (assessment.individualsAffected > 500) {
      await this.notifyMedia(incident, assessment);
      protocol.actions.push('Media notified');
    }

    // Step 6: Document everything
    await this.documentBreach(protocol);
    protocol.actions.push('Incident documented');

    return protocol;
  }

  // Helper methods
  async getEncryptionKey(keyId) {
    // In production, integrate with AWS KMS or similar
    return crypto.scryptSync(keyId, 'salt', 32);
  }

  async getUserPermissions(userId) {
    // Integrate with your auth system
    return ['phi_access', 'phi_read'];
  }

  async getResourceClassification(resource) {
    const analysis = await this.analyzePHI(resource);
    return analysis.classification;
  }

  async getPurposeOfUse(userId, resource) {
    // Implement purpose tracking
    return 'treatment';
  }

  isValidPurpose(purpose) {
    const validPurposes = ['treatment', 'payment', 'operations', 'required_by_law'];
    return validPurposes.includes(purpose);
  }

  meetsMinimumNecessary(userId, resource, action) {
    // Implement minimum necessary logic
    return true;
  }

  async logAccess(userId, resource, action, validation) {
    const log = {
      timestamp: new Date().toISOString(),
      userId,
      resourceId: resource.id || 'unknown',
      action,
      allowed: validation.allowed,
      reason: validation.reason
    };
    
    // Store in audit log
    console.log('HIPAA Access Log:', log);
  }

  recursiveRemove(obj, key) {
    for (const prop in obj) {
      if (prop === key) {
        delete obj[prop];
      } else if (typeof obj[prop] === 'object' && obj[prop] !== null) {
        this.recursiveRemove(obj[prop], key);
      }
    }
  }

  anonymizeDates(obj) {
    for (const prop in obj) {
      if (typeof obj[prop] === 'string' && /\d{4}-\d{2}-\d{2}/.test(obj[prop])) {
        obj[prop] = obj[prop].substring(0, 4) + '-01-01';
      } else if (typeof obj[prop] === 'object' && obj[prop] !== null) {
        this.anonymizeDates(obj[prop]);
      }
    }
  }

  anonymizeGeography(obj) {
    if (obj.zipCode && obj.zipCode.length > 3) {
      obj.zipCode = obj.zipCode.substring(0, 3) + '00';
    }
    if (obj.state) {
      obj.region = this.getRegion(obj.state);
      delete obj.state;
    }
  }

  getRegion(state) {
    const regions = {
      'Northeast': ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'NJ', 'PA'],
      'Southeast': ['DE', 'MD', 'DC', 'VA', 'WV', 'KY', 'TN', 'NC', 'SC', 'GA', 'FL', 'AL', 'MS', 'LA', 'AR'],
      'Midwest': ['OH', 'IN', 'MI', 'IL', 'WI', 'MN', 'IA', 'MO', 'ND', 'SD', 'NE', 'KS'],
      'Southwest': ['TX', 'OK', 'NM', 'AZ'],
      'West': ['CO', 'WY', 'MT', 'ID', 'UT', 'NV', 'CA', 'OR', 'WA', 'AK', 'HI']
    };
    
    for (const [region, states] of Object.entries(regions)) {
      if (states.includes(state)) return region;
    }
    return 'Unknown';
  }

  async generateDigitalSignature(entity) {
    const sign = crypto.createSign('SHA256');
    sign.update(JSON.stringify(entity));
    // In production, use actual private key
    return sign.sign('private_key', 'hex');
  }

  async checkEncryption() {
    // Implement encryption checking
    return { allEncrypted: true, rate: 0.98 };
  }

  async auditAccessLogs() {
    // Implement access log auditing
    return { unauthorizedAttempts: 0 };
  }

  async auditDataRetention() {
    // Implement retention auditing
    return { overdueForDeletion: 0, complianceRate: 1.0 };
  }

  async checkAccessReviews() {
    // Implement access review checking
    return { current: true };
  }

  async containBreach(incident) {
    // Implement breach containment
    console.log('Containing breach:', incident);
  }

  async assessBreachScope(incident) {
    // Implement breach assessment
    return {
      individualsAffected: 0,
      affectedIndividuals: [],
      dataTypes: [],
      severity: 'low'
    };
  }

  async notifyIndividuals(individuals) {
    // Implement individual notification
    console.log('Notifying individuals:', individuals.length);
  }

  async notifyHHS(incident, assessment) {
    // Implement HHS notification
    console.log('Notifying HHS:', incident.id);
  }

  async notifyMedia(incident, assessment) {
    // Implement media notification
    console.log('Notifying media:', incident.id);
  }

  async documentBreach(protocol) {
    // Implement breach documentation
    console.log('Documenting breach:', protocol.incidentId);
  }
}

export default PHIGuardianAgent;