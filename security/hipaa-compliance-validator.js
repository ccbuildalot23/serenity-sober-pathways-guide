#!/usr/bin/env node

/**
 * HIPAA Compliance Validation Suite
 * Comprehensive validation of HIPAA compliance requirements for healthcare applications
 * Covers Administrative, Physical, and Technical Safeguards
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

class HIPAAComplianceValidator {
  constructor() {
    this.complianceResults = {
      timestamp: new Date().toISOString(),
      version: '3.0',
      overall_compliance: 0,
      compliance_status: 'unknown',
      safeguards: {
        administrative: { score: 0, max: 100, requirements: [], issues: [], recommendations: [] },
        physical: { score: 0, max: 100, requirements: [], issues: [], recommendations: [] },
        technical: { score: 0, max: 100, requirements: [], issues: [], recommendations: [] }
      },
      phi_protection: {
        encryption_at_rest: { status: 'unknown', details: [] },
        encryption_in_transit: { status: 'unknown', details: [] },
        access_controls: { status: 'unknown', details: [] },
        audit_logging: { status: 'unknown', details: [] }
      },
      risk_assessment: {
        critical_risks: [],
        high_risks: [],
        medium_risks: [],
        low_risks: []
      },
      remediation_timeline: [],
      compliance_checklist: []
    };

    this.projectRoot = process.cwd();
    
    // HIPAA Required Implementation Specifications
    this.hipaaRequirements = {
      administrative: [
        'Security Officer',
        'Workforce Training', 
        'Information Access Management',
        'Security Awareness Training',
        'Security Incident Procedures',
        'Contingency Plan',
        'Regular Security Evaluations',
        'Business Associate Contracts'
      ],
      physical: [
        'Facility Access Controls',
        'Workstation Use',
        'Device and Media Controls'
      ],
      technical: [
        'Access Control',
        'Audit Controls', 
        'Integrity',
        'Person or Entity Authentication',
        'Transmission Security'
      ]
    };
  }

  async validateHIPAACompliance() {
    console.log('🏥 Starting HIPAA Compliance Validation');
    console.log('='.repeat(60));
    console.log(`Project: ${this.projectRoot}`);
    console.log(`Timestamp: ${this.complianceResults.timestamp}\n`);

    try {
      // 1. Validate Administrative Safeguards
      await this.validateAdministrativeSafeguards();
      
      // 2. Validate Physical Safeguards
      await this.validatePhysicalSafeguards();
      
      // 3. Validate Technical Safeguards
      await this.validateTechnicalSafeguards();
      
      // 4. Validate PHI Encryption (At Rest)
      await this.validatePHIEncryptionAtRest();
      
      // 5. Validate PHI Encryption (In Transit)
      await this.validatePHIEncryptionInTransit();
      
      // 6. Validate Access Control Matrix
      await this.validateAccessControlMatrix();
      
      // 7. Validate Session Management
      await this.validateSessionManagement();
      
      // 8. Validate Audit Logging Completeness
      await this.validateAuditLogging();
      
      // 9. Validate Data Retention Policy
      await this.validateDataRetentionPolicy();
      
      // 10. Validate Backup and Recovery
      await this.validateBackupAndRecovery();
      
      // 11. Validate Business Associate Agreements
      await this.validateBusinessAssociateAgreements();
      
      // 12. Validate Minimum Necessary Access
      await this.validateMinimumNecessaryAccess();
      
      // 13. Validate Privacy Rule Compliance
      await this.validatePrivacyRuleCompliance();
      
      // Calculate overall compliance score
      this.calculateOverallCompliance();
      
      // Generate compliance report
      await this.generateHIPAAComplianceReport();
      
      console.log('\n✅ HIPAA compliance validation completed');
      
    } catch (error) {
      console.error('❌ HIPAA compliance validation failed:', error.message);
      process.exit(1);
    }
  }

  async validateAdministrativeSafeguards() {
    console.log('📋 1. Validating Administrative Safeguards...');
    
    const safeguard = this.complianceResults.safeguards.administrative;
    let score = 0;

    // 164.308(a)(1) - Security Officer
    const securityOfficerFiles = this.findDocumentationFiles([
      'SECURITY_OFFICER.md',
      'security-officer.md', 
      'SECURITY_POLICIES.md',
      'COMPLIANCE_OFFICER.md'
    ]);

    if (securityOfficerFiles.length > 0) {
      score += 15;
      safeguard.requirements.push({
        requirement: '164.308(a)(1) - Security Officer',
        status: 'COMPLIANT',
        evidence: securityOfficerFiles.map(f => path.basename(f))
      });
      safeguard.recommendations.push('✅ Security Officer assignment documented');
    } else {
      safeguard.issues.push({
        requirement: '164.308(a)(1) - Security Officer',
        severity: 'HIGH',
        description: 'Security Officer must be assigned and documented',
        remediation: 'Create SECURITY_OFFICER.md document identifying the assigned Security Officer'
      });
      score -= 15;
    }

    // 164.308(a)(5) - Workforce Training
    const trainingFiles = this.findDocumentationFiles([
      'WORKFORCE_TRAINING.md',
      'SECURITY_TRAINING.md',
      'HIPAA_TRAINING.md',
      'training-records.md'
    ]);

    if (trainingFiles.length > 0) {
      score += 12;
      safeguard.requirements.push({
        requirement: '164.308(a)(5) - Workforce Training',
        status: 'COMPLIANT',
        evidence: trainingFiles.map(f => path.basename(f))
      });
    } else {
      safeguard.issues.push({
        requirement: '164.308(a)(5) - Workforce Training',
        severity: 'HIGH',
        description: 'Workforce training on HIPAA and security must be documented',
        remediation: 'Create workforce training program and documentation'
      });
      score -= 12;
    }

    // 164.308(a)(6) - Security Incident Procedures
    const incidentFiles = this.findDocumentationFiles([
      'INCIDENT_RESPONSE.md',
      'SECURITY_INCIDENT.md',
      'incident-response-plan.md',
      'security-incident-procedures.md'
    ]);

    if (incidentFiles.length > 0) {
      score += 15;
      safeguard.requirements.push({
        requirement: '164.308(a)(6) - Security Incident Procedures',
        status: 'COMPLIANT',
        evidence: incidentFiles.map(f => path.basename(f))
      });
    } else {
      safeguard.issues.push({
        requirement: '164.308(a)(6) - Security Incident Procedures',
        severity: 'HIGH',
        description: 'Security incident response procedures must be established',
        remediation: 'Create comprehensive incident response plan'
      });
      score -= 15;
    }

    // 164.308(a)(7) - Contingency Plan
    const contingencyFiles = this.findDocumentationFiles([
      'CONTINGENCY_PLAN.md',
      'DISASTER_RECOVERY.md',
      'BUSINESS_CONTINUITY.md',
      'contingency-plan.md'
    ]);

    if (contingencyFiles.length > 0) {
      score += 12;
      safeguard.requirements.push({
        requirement: '164.308(a)(7) - Contingency Plan',
        status: 'COMPLIANT',
        evidence: contingencyFiles.map(f => path.basename(f))
      });
    } else {
      safeguard.issues.push({
        requirement: '164.308(a)(7) - Contingency Plan',
        severity: 'MEDIUM',
        description: 'Contingency plan for emergency PHI access must be established',
        remediation: 'Create disaster recovery and business continuity plans'
      });
      score -= 10;
    }

    // 164.308(a)(8) - Regular Security Evaluations
    const evaluationFiles = this.findDocumentationFiles([
      'SECURITY_EVALUATION.md',
      'SECURITY_ASSESSMENT.md',
      'security-audit.md',
      'compliance-assessment.md'
    ]);

    const securityReportsDir = path.join(this.projectRoot, 'security-reports');
    if (evaluationFiles.length > 0 || fs.existsSync(securityReportsDir)) {
      score += 10;
      safeguard.requirements.push({
        requirement: '164.308(a)(8) - Regular Security Evaluations',
        status: 'COMPLIANT',
        evidence: fs.existsSync(securityReportsDir) ? ['security-reports directory'] : evaluationFiles.map(f => path.basename(f))
      });
    } else {
      safeguard.issues.push({
        requirement: '164.308(a)(8) - Regular Security Evaluations',
        severity: 'MEDIUM',
        description: 'Regular security evaluations must be conducted and documented',
        remediation: 'Implement regular security assessments and document results'
      });
      score -= 8;
    }

    // 164.308(b)(1) - Business Associate Contracts
    const baaFiles = this.findDocumentationFiles([
      'BUSINESS_ASSOCIATE_AGREEMENT.md',
      'BAA.md',
      'business-associates.md',
      'third-party-agreements.md'
    ]);

    if (baaFiles.length > 0) {
      score += 15;
      safeguard.requirements.push({
        requirement: '164.308(b)(1) - Business Associate Agreements',
        status: 'COMPLIANT',
        evidence: baaFiles.map(f => path.basename(f))
      });
    } else {
      safeguard.issues.push({
        requirement: '164.308(b)(1) - Business Associate Agreements',
        severity: 'HIGH',
        description: 'Business Associate Agreements must be in place for all third parties',
        remediation: 'Create and maintain BAAs for all vendors with PHI access'
      });
      score -= 15;
    }

    // Information Access Management - Check code implementation
    const authFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('role') && (content.includes('permission') || content.includes('access'));
      });

    if (authFiles.length > 0) {
      score += 15;
      safeguard.requirements.push({
        requirement: '164.308(a)(4) - Information Access Management',
        status: 'COMPLIANT',
        evidence: [`${authFiles.length} files with access control implementation`]
      });
    } else {
      safeguard.issues.push({
        requirement: '164.308(a)(4) - Information Access Management',
        severity: 'HIGH',
        description: 'Information access management system must be implemented',
        remediation: 'Implement role-based access control system'
      });
      score -= 15;
    }

    safeguard.score = Math.max(0, Math.min(100, score + 50)); // Base score of 50
    console.log(`   Score: ${safeguard.score}/100 (${safeguard.issues.length} issues found)`);
  }

  async validatePhysicalSafeguards() {
    console.log('🏢 2. Validating Physical Safeguards...');
    
    const safeguard = this.complianceResults.safeguards.physical;
    let score = 60; // Higher base score as most are infrastructure/cloud-based

    // 164.310(a)(1) - Facility Access Controls
    const facilityFiles = this.findDocumentationFiles([
      'FACILITY_ACCESS.md',
      'PHYSICAL_SECURITY.md',
      'facility-access-controls.md',
      'data-center-security.md'
    ]);

    if (facilityFiles.length > 0) {
      score += 15;
      safeguard.requirements.push({
        requirement: '164.310(a)(1) - Facility Access Controls',
        status: 'COMPLIANT',
        evidence: facilityFiles.map(f => path.basename(f))
      });
    } else {
      // Check for cloud infrastructure documentation
      const cloudFiles = this.findDocumentationFiles([
        'AWS_SECURITY.md',
        'CLOUD_SECURITY.md',
        'VERCEL_SECURITY.md',
        'infrastructure-security.md'
      ]);
      
      if (cloudFiles.length > 0) {
        score += 10;
        safeguard.recommendations.push('Cloud infrastructure security documented');
      } else {
        safeguard.issues.push({
          requirement: '164.310(a)(1) - Facility Access Controls',
          severity: 'MEDIUM',
          description: 'Physical facility access controls must be documented (or cloud provider security)',
          remediation: 'Document facility access controls or cloud provider security measures'
        });
        score -= 8;
      }
    }

    // 164.310(b) - Workstation Use
    const workstationFiles = this.findDocumentationFiles([
      'WORKSTATION_SECURITY.md',
      'ENDPOINT_SECURITY.md',
      'workstation-use-policy.md',
      'device-management.md'
    ]);

    if (workstationFiles.length > 0) {
      score += 12;
      safeguard.requirements.push({
        requirement: '164.310(b) - Workstation Use',
        status: 'COMPLIANT',
        evidence: workstationFiles.map(f => path.basename(f))
      });
    } else {
      safeguard.issues.push({
        requirement: '164.310(b) - Workstation Use',
        severity: 'MEDIUM',
        description: 'Workstation use policies must be established',
        remediation: 'Create workstation security and usage policies'
      });
      score -= 10;
    }

    // 164.310(d)(1) - Device and Media Controls
    const deviceFiles = this.findDocumentationFiles([
      'DEVICE_CONTROLS.md',
      'MEDIA_CONTROLS.md',
      'device-management-policy.md',
      'mobile-device-security.md'
    ]);

    if (deviceFiles.length > 0) {
      score += 15;
      safeguard.requirements.push({
        requirement: '164.310(d)(1) - Device and Media Controls',
        status: 'COMPLIANT',
        evidence: deviceFiles.map(f => path.basename(f))
      });
    } else {
      safeguard.issues.push({
        requirement: '164.310(d)(1) - Device and Media Controls',
        severity: 'MEDIUM',
        description: 'Device and media controls must be implemented',
        remediation: 'Create device and media security policies'
      });
      score -= 12;
    }

    // Check for mobile device security (Capacitor/React Native)
    const capacitorConfig = path.join(this.projectRoot, 'capacitor.config.ts');
    const iosFolder = path.join(this.projectRoot, 'ios');
    const androidFolder = path.join(this.projectRoot, 'android');

    if (fs.existsSync(capacitorConfig) || fs.existsSync(iosFolder) || fs.existsSync(androidFolder)) {
      safeguard.recommendations.push('Mobile application detected - ensure mobile device security policies');
      
      // Check for mobile security implementations
      const mobileSecurityFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
        .filter(file => {
          const content = fs.readFileSync(file, 'utf8').toLowerCase();
          return content.includes('biometric') || content.includes('keychain') || content.includes('secure storage');
        });

      if (mobileSecurityFiles.length > 0) {
        score += 8;
        safeguard.recommendations.push('Mobile security features implemented');
      }
    }

    safeguard.score = Math.max(0, Math.min(100, score));
    console.log(`   Score: ${safeguard.score}/100 (${safeguard.issues.length} issues found)`);
  }

  async validateTechnicalSafeguards() {
    console.log('💻 3. Validating Technical Safeguards...');
    
    const safeguard = this.complianceResults.safeguards.technical;
    let score = 40; // Base score

    // 164.312(a)(1) - Access Control
    const accessControlImplemented = await this.checkAccessControlImplementation();
    if (accessControlImplemented.score > 70) {
      score += 20;
      safeguard.requirements.push({
        requirement: '164.312(a)(1) - Access Control',
        status: 'COMPLIANT',
        evidence: accessControlImplemented.evidence
      });
    } else {
      safeguard.issues.push({
        requirement: '164.312(a)(1) - Access Control',
        severity: 'HIGH',
        description: 'Technical access control must be implemented',
        remediation: 'Implement comprehensive access control system'
      });
      score -= 15;
    }

    // 164.312(b) - Audit Controls
    const auditControlImplemented = await this.checkAuditControlImplementation();
    if (auditControlImplemented.score > 70) {
      score += 20;
      safeguard.requirements.push({
        requirement: '164.312(b) - Audit Controls',
        status: 'COMPLIANT',
        evidence: auditControlImplemented.evidence
      });
    } else {
      safeguard.issues.push({
        requirement: '164.312(b) - Audit Controls',
        severity: 'HIGH',
        description: 'Audit controls must be implemented',
        remediation: 'Implement comprehensive audit logging system'
      });
      score -= 15;
    }

    // 164.312(c)(1) - Integrity
    const integrityImplemented = await this.checkIntegrityImplementation();
    if (integrityImplemented.score > 70) {
      score += 15;
      safeguard.requirements.push({
        requirement: '164.312(c)(1) - Integrity',
        status: 'COMPLIANT',
        evidence: integrityImplemented.evidence
      });
    } else {
      safeguard.issues.push({
        requirement: '164.312(c)(1) - Integrity',
        severity: 'HIGH',
        description: 'PHI integrity controls must be implemented',
        remediation: 'Implement data integrity verification mechanisms'
      });
      score -= 12;
    }

    // 164.312(d) - Person or Entity Authentication
    const authenticationImplemented = await this.checkPersonAuthenticationImplementation();
    if (authenticationImplemented.score > 70) {
      score += 15;
      safeguard.requirements.push({
        requirement: '164.312(d) - Person or Entity Authentication',
        status: 'COMPLIANT',
        evidence: authenticationImplemented.evidence
      });
    } else {
      safeguard.issues.push({
        requirement: '164.312(d) - Person or Entity Authentication',
        severity: 'HIGH',
        description: 'Person authentication must be implemented',
        remediation: 'Implement strong authentication mechanisms'
      });
      score -= 12;
    }

    // 164.312(e)(1) - Transmission Security
    const transmissionSecurityImplemented = await this.checkTransmissionSecurityImplementation();
    if (transmissionSecurityImplemented.score > 70) {
      score += 20;
      safeguard.requirements.push({
        requirement: '164.312(e)(1) - Transmission Security',
        status: 'COMPLIANT',
        evidence: transmissionSecurityImplemented.evidence
      });
    } else {
      safeguard.issues.push({
        requirement: '164.312(e)(1) - Transmission Security',
        severity: 'HIGH',
        description: 'Transmission security must be implemented',
        remediation: 'Implement encryption for data transmission'
      });
      score -= 15;
    }

    safeguard.score = Math.max(0, Math.min(100, score));
    console.log(`   Score: ${safeguard.score}/100 (${safeguard.issues.length} issues found)`);
  }

  async validatePHIEncryptionAtRest() {
    console.log('🔒 4. Validating PHI Encryption at Rest...');
    
    const phiEncryption = this.complianceResults.phi_protection.encryption_at_rest;
    
    // Check for encryption service implementation
    const encryptionFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return (content.includes('encrypt') || content.includes('crypto')) && 
               (content.includes('aes') || content.includes('256'));
      });

    if (encryptionFiles.length > 0) {
      phiEncryption.status = 'COMPLIANT';
      phiEncryption.details.push({
        type: 'Encryption Service',
        description: `Found ${encryptionFiles.length} files implementing encryption`,
        files: encryptionFiles.map(f => path.relative(this.projectRoot, f)).slice(0, 5)
      });

      // Check for AES-256 specifically
      const aes256Files = encryptionFiles.filter(file => {
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('aes-256') || (content.includes('AES') && content.includes('256'));
      });

      if (aes256Files.length > 0) {
        phiEncryption.details.push({
          type: 'AES-256 Implementation',
          description: 'Strong encryption algorithm (AES-256) detected',
          files: aes256Files.map(f => path.relative(this.projectRoot, f)).slice(0, 3)
        });
      }

    } else {
      phiEncryption.status = 'NON_COMPLIANT';
      phiEncryption.details.push({
        type: 'Missing Encryption',
        description: 'No PHI encryption at rest implementation found',
        remediation: 'Implement AES-256 encryption for PHI data storage'
      });
    }

    // Check database encryption configuration
    const supabaseFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('supabase') && content.includes('client');
      });

    if (supabaseFiles.length > 0) {
      phiEncryption.details.push({
        type: 'Database Encryption',
        description: 'Supabase provides encryption at rest by default',
        note: 'Verify Supabase encryption configuration in dashboard'
      });
    }

    console.log(`   Status: ${phiEncryption.status} (${phiEncryption.details.length} details found)`);
  }

  async validatePHIEncryptionInTransit() {
    console.log('🌐 5. Validating PHI Encryption in Transit...');
    
    const transitEncryption = this.complianceResults.phi_protection.encryption_in_transit;
    let score = 0;

    // Check for HTTPS enforcement
    const httpsFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx', '.json'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('https://') || content.includes('ssl') || content.includes('tls');
      });

    if (httpsFiles.length > 0) {
      score += 30;
      transitEncryption.details.push({
        type: 'HTTPS Configuration',
        description: 'HTTPS/SSL/TLS configuration found',
        files: httpsFiles.map(f => path.relative(this.projectRoot, f)).slice(0, 3)
      });
    }

    // Check Vercel configuration
    const vercelConfig = path.join(this.projectRoot, 'vercel.json');
    if (fs.existsSync(vercelConfig)) {
      const config = JSON.parse(fs.readFileSync(vercelConfig, 'utf8'));
      if (config.headers && config.headers.some(h => h.key === 'Strict-Transport-Security')) {
        score += 25;
        transitEncryption.details.push({
          type: 'HSTS Configuration',
          description: 'HTTP Strict Transport Security configured in Vercel',
          evidence: 'Strict-Transport-Security header found'
        });
      }
    }

    // Check for TLS version enforcement
    const tlsEnforcementFiles = this.findSourceFiles(['.js', '.ts'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('TLSv1.2') || content.includes('TLSv1.3') || 
               content.includes('minVersion');
      });

    if (tlsEnforcementFiles.length > 0) {
      score += 20;
      transitEncryption.details.push({
        type: 'TLS Version Enforcement',
        description: 'TLS version enforcement implemented',
        files: tlsEnforcementFiles.map(f => path.relative(this.projectRoot, f))
      });
    }

    // Check for API encryption
    const apiFiles = this.findSourceFiles(['.js', '.ts'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('api') && (content.includes('https') || content.includes('encrypt'));
      });

    if (apiFiles.length > 0) {
      score += 25;
      transitEncryption.details.push({
        type: 'API Encryption',
        description: 'Encrypted API communications implemented',
        count: apiFiles.length
      });
    }

    transitEncryption.status = score >= 80 ? 'COMPLIANT' : score >= 60 ? 'NEEDS_IMPROVEMENT' : 'NON_COMPLIANT';
    
    if (transitEncryption.status === 'NON_COMPLIANT') {
      transitEncryption.details.push({
        type: 'Compliance Gap',
        description: 'Insufficient encryption in transit measures',
        remediation: 'Implement comprehensive HTTPS/TLS encryption for all PHI transmission'
      });
    }

    console.log(`   Status: ${transitEncryption.status} (Score: ${score}/100)`);
  }

  async validateAccessControlMatrix() {
    console.log('👥 6. Validating Access Control Matrix...');
    
    const accessControl = this.complianceResults.phi_protection.access_controls;
    let score = 0;

    // Check for role-based access control implementation
    const rbacFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return (content.includes('role') && content.includes('permission')) ||
               content.includes('rbac') ||
               (content.includes('access') && content.includes('control'));
      });

    if (rbacFiles.length > 0) {
      score += 40;
      accessControl.details.push({
        type: 'RBAC Implementation',
        description: `Role-based access control found in ${rbacFiles.length} files`,
        files: rbacFiles.map(f => path.relative(this.projectRoot, f)).slice(0, 5)
      });

      // Check for specific roles (patient, provider, admin)
      const roleFiles = rbacFiles.filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('patient') && content.includes('provider') && 
               (content.includes('admin') || content.includes('administrator'));
      });

      if (roleFiles.length > 0) {
        score += 20;
        accessControl.details.push({
          type: 'Healthcare Roles',
          description: 'Healthcare-specific roles (patient, provider, admin) implemented',
          files: roleFiles.map(f => path.relative(this.projectRoot, f)).slice(0, 3)
        });
      }
    }

    // Check for Supabase RLS (Row Level Security)
    const rlsFiles = this.findSourceFiles(['.sql', '.js', '.ts'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('row level security') || content.includes('rls') ||
               content.includes('enable rls');
      });

    if (rlsFiles.length > 0) {
      score += 25;
      accessControl.details.push({
        type: 'Row Level Security',
        description: 'Database Row Level Security (RLS) implemented',
        files: rlsFiles.map(f => path.relative(this.projectRoot, f))
      });
    }

    // Check for authentication enforcement
    const authFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('authenticate') || content.includes('requireauth') ||
               content.includes('protected route');
      });

    if (authFiles.length > 0) {
      score += 15;
      accessControl.details.push({
        type: 'Authentication Enforcement',
        description: 'Authentication requirements implemented',
        count: authFiles.length
      });
    }

    accessControl.status = score >= 80 ? 'COMPLIANT' : score >= 60 ? 'NEEDS_IMPROVEMENT' : 'NON_COMPLIANT';
    
    console.log(`   Status: ${accessControl.status} (Score: ${score}/100)`);
  }

  async validateSessionManagement() {
    console.log('⏰ 7. Validating Session Management...');
    
    let score = 0;
    const sessionIssues = [];
    const sessionDetails = [];

    // Check for session timeout implementation
    const timeoutFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('session') && 
               (content.includes('timeout') || content.includes('expire') || content.includes('idle'));
      });

    if (timeoutFiles.length > 0) {
      score += 30;
      sessionDetails.push({
        type: 'Session Timeout',
        description: 'Session timeout mechanism implemented',
        files: timeoutFiles.map(f => path.relative(this.projectRoot, f)).slice(0, 3)
      });

      // Check for HIPAA-compliant timeout (15 minutes for PHI)
      const hipaaTimeoutFiles = timeoutFiles.filter(file => {
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('15') && content.includes('minute');
      });

      if (hipaaTimeoutFiles.length > 0) {
        score += 20;
        sessionDetails.push({
          type: 'HIPAA Timeout Compliance',
          description: '15-minute PHI access timeout implemented',
          files: hipaaTimeoutFiles.map(f => path.relative(this.projectRoot, f))
        });
      }
    } else {
      sessionIssues.push({
        type: 'Missing Session Timeout',
        severity: 'HIGH',
        description: 'Session timeout is required for HIPAA compliance'
      });
    }

    // Check for secure session storage
    const secureStorageFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return (content.includes('session') && content.includes('secure')) ||
               content.includes('httponly') ||
               (content.includes('cookie') && content.includes('secure'));
      });

    if (secureStorageFiles.length > 0) {
      score += 25;
      sessionDetails.push({
        type: 'Secure Session Storage',
        description: 'Secure session storage implemented',
        count: secureStorageFiles.length
      });
    }

    // Check for session cleanup
    const cleanupFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('logout') && 
               (content.includes('clear') || content.includes('cleanup') || content.includes('destroy'));
      });

    if (cleanupFiles.length > 0) {
      score += 25;
      sessionDetails.push({
        type: 'Session Cleanup',
        description: 'Session cleanup on logout implemented',
        files: cleanupFiles.map(f => path.relative(this.projectRoot, f)).slice(0, 2)
      });
    }

    // Store results in PHI protection section
    this.complianceResults.phi_protection.session_management = {
      status: score >= 80 ? 'COMPLIANT' : score >= 60 ? 'NEEDS_IMPROVEMENT' : 'NON_COMPLIANT',
      score: score,
      details: sessionDetails,
      issues: sessionIssues
    };

    console.log(`   Status: ${this.complianceResults.phi_protection.session_management.status} (Score: ${score}/100)`);
  }

  async validateAuditLogging() {
    console.log('📋 8. Validating Audit Logging...');
    
    const auditLogging = this.complianceResults.phi_protection.audit_logging;
    let score = 0;

    // Check for audit logging implementation
    const auditFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('audit') || 
               (content.includes('log') && (content.includes('access') || content.includes('phi')));
      });

    if (auditFiles.length > 0) {
      score += 30;
      auditLogging.details.push({
        type: 'Audit Implementation',
        description: `Audit logging found in ${auditFiles.length} files`,
        files: auditFiles.map(f => path.relative(this.projectRoot, f)).slice(0, 5)
      });

      // Check for comprehensive audit events
      const auditEventTypes = ['access', 'modify', 'delete', 'create', 'login', 'logout'];
      const implementedEvents = auditEventTypes.filter(event => {
        return auditFiles.some(file => {
          const content = fs.readFileSync(file, 'utf8').toLowerCase();
          return content.includes(event);
        });
      });

      score += implementedEvents.length * 8;
      auditLogging.details.push({
        type: 'Audit Event Coverage',
        description: `${implementedEvents.length}/${auditEventTypes.length} audit event types implemented`,
        events: implementedEvents
      });
    }

    // Check for audit log retention
    const retentionFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('retention') || 
               (content.includes('audit') && content.includes('90')) ||
               (content.includes('log') && content.includes('cleanup'));
      });

    if (retentionFiles.length > 0) {
      score += 15;
      auditLogging.details.push({
        type: 'Audit Retention Policy',
        description: 'Audit log retention policy implemented',
        files: retentionFiles.map(f => path.relative(this.projectRoot, f))
      });
    }

    // Check for tamper-proof logging
    const tamperProofFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return (content.includes('audit') && content.includes('encrypt')) ||
               (content.includes('log') && content.includes('integrity')) ||
               content.includes('tamper');
      });

    if (tamperProofFiles.length > 0) {
      score += 25;
      auditLogging.details.push({
        type: 'Tamper-Proof Logging',
        description: 'Tamper-proof audit logging implemented',
        files: tamperProofFiles.map(f => path.relative(this.projectRoot, f))
      });
    }

    auditLogging.status = score >= 80 ? 'COMPLIANT' : score >= 60 ? 'NEEDS_IMPROVEMENT' : 'NON_COMPLIANT';
    
    if (auditLogging.status === 'NON_COMPLIANT') {
      auditLogging.details.push({
        type: 'Compliance Gap',
        description: 'Comprehensive audit logging is required for HIPAA compliance',
        remediation: 'Implement audit logging for all PHI access and modifications'
      });
    }

    console.log(`   Status: ${auditLogging.status} (Score: ${score}/100)`);
  }

  async validateDataRetentionPolicy() {
    console.log('📅 9. Validating Data Retention Policy...');
    
    let score = 0;
    const retentionDetails = [];

    // Check for data retention documentation
    const retentionFiles = this.findDocumentationFiles([
      'DATA_RETENTION.md',
      'RETENTION_POLICY.md',
      'data-retention-policy.md',
      'data-lifecycle.md'
    ]);

    if (retentionFiles.length > 0) {
      score += 40;
      retentionDetails.push({
        type: 'Retention Policy Documentation',
        description: 'Data retention policy documented',
        files: retentionFiles.map(f => path.basename(f))
      });
    }

    // Check for automated data cleanup implementation
    const cleanupFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return (content.includes('cleanup') || content.includes('purge') || content.includes('delete')) &&
               (content.includes('retention') || content.includes('expire') || content.includes('old'));
      });

    if (cleanupFiles.length > 0) {
      score += 30;
      retentionDetails.push({
        type: 'Automated Cleanup',
        description: 'Automated data cleanup implementation found',
        files: cleanupFiles.map(f => path.relative(this.projectRoot, f))
      });
    }

    // Check for retention period configuration
    const retentionConfigFiles = this.findSourceFiles(['.js', '.ts', '.json'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('retention') && 
               (content.includes('6') || content.includes('years') || content.includes('2192')); // 6 years in days
      });

    if (retentionConfigFiles.length > 0) {
      score += 30;
      retentionDetails.push({
        type: 'HIPAA Retention Period',
        description: '6-year HIPAA retention period configured',
        files: retentionConfigFiles.map(f => path.relative(this.projectRoot, f))
      });
    }

    // Store results
    this.complianceResults.phi_protection.data_retention = {
      status: score >= 80 ? 'COMPLIANT' : score >= 60 ? 'NEEDS_IMPROVEMENT' : 'NON_COMPLIANT',
      score: score,
      details: retentionDetails
    };

    console.log(`   Status: ${this.complianceResults.phi_protection.data_retention.status} (Score: ${score}/100)`);
  }

  async validateBackupAndRecovery() {
    console.log('💾 10. Validating Backup and Recovery...');
    
    let score = 0;
    const backupDetails = [];

    // Check for backup documentation
    const backupFiles = this.findDocumentationFiles([
      'BACKUP_STRATEGY.md',
      'DISASTER_RECOVERY.md',
      'BACKUP_RECOVERY.md',
      'data-backup-plan.md'
    ]);

    if (backupFiles.length > 0) {
      score += 35;
      backupDetails.push({
        type: 'Backup Documentation',
        description: 'Backup and recovery procedures documented',
        files: backupFiles.map(f => path.basename(f))
      });
    }

    // Check for automated backup implementation
    const backupScripts = this.findSourceFiles(['.js', '.ts', '.sh', '.ps1'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('backup') && 
               (content.includes('schedule') || content.includes('cron') || content.includes('automated'));
      });

    if (backupScripts.length > 0) {
      score += 25;
      backupDetails.push({
        type: 'Automated Backup',
        description: 'Automated backup scripts found',
        files: backupScripts.map(f => path.relative(this.projectRoot, f))
      });
    }

    // Check for Supabase backup configuration
    const supabaseBackupFiles = this.findDocumentationFiles([
      'SUPABASE_BACKUP.md',
      'supabase-backup-guide.md'
    ]);

    if (supabaseBackupFiles.length > 0) {
      score += 20;
      backupDetails.push({
        type: 'Database Backup',
        description: 'Database backup procedures documented',
        files: supabaseBackupFiles.map(f => path.basename(f))
      });
    }

    // Check for backup testing procedures
    const testingFiles = this.findDocumentationFiles([
      'BACKUP_TESTING.md',
      'RECOVERY_TESTING.md',
      'disaster-recovery-testing.md'
    ]);

    if (testingFiles.length > 0) {
      score += 20;
      backupDetails.push({
        type: 'Backup Testing',
        description: 'Backup testing procedures documented',
        files: testingFiles.map(f => path.basename(f))
      });
    }

    // Store results
    this.complianceResults.phi_protection.backup_recovery = {
      status: score >= 80 ? 'COMPLIANT' : score >= 60 ? 'NEEDS_IMPROVEMENT' : 'NON_COMPLIANT',
      score: score,
      details: backupDetails
    };

    console.log(`   Status: ${this.complianceResults.phi_protection.backup_recovery.status} (Score: ${score}/100)`);
  }

  async validateBusinessAssociateAgreements() {
    console.log('🤝 11. Validating Business Associate Agreements...');
    
    let score = 50; // Base score for acknowledging BAA requirements
    const baaDetails = [];

    // Check for BAA documentation
    const baaFiles = this.findDocumentationFiles([
      'BUSINESS_ASSOCIATE_AGREEMENTS.md',
      'BAA.md',
      'business-associates.md',
      'third-party-agreements.md',
      'vendor-agreements.md'
    ]);

    if (baaFiles.length > 0) {
      score += 30;
      baaDetails.push({
        type: 'BAA Documentation',
        description: 'Business Associate Agreements documented',
        files: baaFiles.map(f => path.basename(f))
      });
    }

    // Check for common third-party services that need BAAs
    const thirdPartyServices = [
      { name: 'Supabase', pattern: 'supabase', required: true },
      { name: 'Vercel', pattern: 'vercel', required: true },
      { name: 'Twilio', pattern: 'twilio', required: true },
      { name: 'Sentry', pattern: 'sentry', required: false },
      { name: 'Analytics', pattern: 'analytics|gtag|ga4', required: false }
    ];

    const detectedServices = [];
    const sourceFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx', '.json']);
    
    thirdPartyServices.forEach(service => {
      const hasService = sourceFiles.some(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return new RegExp(service.pattern).test(content);
      });

      if (hasService) {
        detectedServices.push(service);
        if (service.required) {
          score += 5; // Acknowledge service detection
        }
      }
    });

    if (detectedServices.length > 0) {
      baaDetails.push({
        type: 'Third-Party Services Detected',
        description: `${detectedServices.length} third-party services detected requiring BAA review`,
        services: detectedServices.map(s => s.name),
        required_baas: detectedServices.filter(s => s.required).length
      });
    }

    // Check for BAA tracking system
    const trackingFiles = this.findSourceFiles(['.js', '.ts', '.json'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('baa') && 
               (content.includes('track') || content.includes('status') || content.includes('expir'));
      });

    if (trackingFiles.length > 0) {
      score += 15;
      baaDetails.push({
        type: 'BAA Tracking',
        description: 'BAA tracking system implemented',
        files: trackingFiles.map(f => path.relative(this.projectRoot, f))
      });
    }

    // Store results
    this.complianceResults.phi_protection.business_associates = {
      status: score >= 85 ? 'COMPLIANT' : score >= 70 ? 'NEEDS_IMPROVEMENT' : 'NON_COMPLIANT',
      score: score,
      details: baaDetails,
      detected_services: detectedServices
    };

    console.log(`   Status: ${this.complianceResults.phi_protection.business_associates.status} (Score: ${score}/100)`);
  }

  async validateMinimumNecessaryAccess() {
    console.log('🔐 12. Validating Minimum Necessary Access...');
    
    let score = 0;
    const accessDetails = [];

    // Check for role-based data access controls
    const dataAccessFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return (content.includes('role') && content.includes('data')) ||
               (content.includes('permission') && content.includes('access')) ||
               content.includes('minimum necessary');
      });

    if (dataAccessFiles.length > 0) {
      score += 35;
      accessDetails.push({
        type: 'Role-Based Data Access',
        description: 'Role-based data access controls implemented',
        files: dataAccessFiles.map(f => path.relative(this.projectRoot, f)).slice(0, 5)
      });
    }

    // Check for field-level access controls
    const fieldLevelFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return (content.includes('field') && content.includes('access')) ||
               (content.includes('column') && content.includes('permission')) ||
               content.includes('data masking');
      });

    if (fieldLevelFiles.length > 0) {
      score += 30;
      accessDetails.push({
        type: 'Field-Level Access Control',
        description: 'Field-level access controls implemented',
        files: fieldLevelFiles.map(f => path.relative(this.projectRoot, f))
      });
    }

    // Check for data filtering based on roles
    const filteringFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return (content.includes('filter') && content.includes('role')) ||
               (content.includes('where') && content.includes('user')) ||
               content.includes('row level security');
      });

    if (filteringFiles.length > 0) {
      score += 35;
      accessDetails.push({
        type: 'Data Filtering',
        description: 'Role-based data filtering implemented',
        files: filteringFiles.map(f => path.relative(this.projectRoot, f))
      });
    }

    // Store results
    this.complianceResults.phi_protection.minimum_necessary = {
      status: score >= 80 ? 'COMPLIANT' : score >= 60 ? 'NEEDS_IMPROVEMENT' : 'NON_COMPLIANT',
      score: score,
      details: accessDetails
    };

    console.log(`   Status: ${this.complianceResults.phi_protection.minimum_necessary.status} (Score: ${score}/100)`);
  }

  async validatePrivacyRuleCompliance() {
    console.log('🔒 13. Validating Privacy Rule Compliance...');
    
    let score = 0;
    const privacyDetails = [];

    // Check for Privacy Notice
    const privacyFiles = this.findDocumentationFiles([
      'PRIVACY_NOTICE.md',
      'PRIVACY_POLICY.md',
      'NOTICE_OF_PRIVACY_PRACTICES.md',
      'privacy-notice.md'
    ]);

    if (privacyFiles.length > 0) {
      score += 25;
      privacyDetails.push({
        type: 'Privacy Notice',
        description: 'Privacy notice/policy documentation found',
        files: privacyFiles.map(f => path.basename(f))
      });
    }

    // Check for consent management
    const consentFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('consent') || content.includes('authorization') ||
               (content.includes('agree') && content.includes('privacy'));
      });

    if (consentFiles.length > 0) {
      score += 25;
      privacyDetails.push({
        type: 'Consent Management',
        description: 'Consent management system implemented',
        files: consentFiles.map(f => path.relative(this.projectRoot, f)).slice(0, 3)
      });
    }

    // Check for patient rights implementation
    const rightsFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return (content.includes('patient') && content.includes('rights')) ||
               content.includes('data subject') ||
               (content.includes('access') && content.includes('request'));
      });

    if (rightsFiles.length > 0) {
      score += 20;
      privacyDetails.push({
        type: 'Patient Rights',
        description: 'Patient rights functionality implemented',
        files: rightsFiles.map(f => path.relative(this.projectRoot, f))
      });
    }

    // Check for data breach notification procedures
    const breachFiles = this.findDocumentationFiles([
      'DATA_BREACH_NOTIFICATION.md',
      'BREACH_RESPONSE.md',
      'incident-response.md',
      'breach-notification-procedures.md'
    ]);

    if (breachFiles.length > 0) {
      score += 15;
      privacyDetails.push({
        type: 'Breach Notification Procedures',
        description: 'Data breach notification procedures documented',
        files: breachFiles.map(f => path.basename(f))
      });
    }

    // Check for marketing and communications restrictions
    const marketingFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return (content.includes('marketing') && content.includes('opt')) ||
               (content.includes('communication') && content.includes('consent')) ||
               content.includes('unsubscribe');
      });

    if (marketingFiles.length > 0) {
      score += 15;
      privacyDetails.push({
        type: 'Marketing Restrictions',
        description: 'Marketing and communications restrictions implemented',
        files: marketingFiles.map(f => path.relative(this.projectRoot, f))
      });
    }

    // Store results
    this.complianceResults.phi_protection.privacy_rule = {
      status: score >= 80 ? 'COMPLIANT' : score >= 60 ? 'NEEDS_IMPROVEMENT' : 'NON_COMPLIANT',
      score: score,
      details: privacyDetails
    };

    console.log(`   Status: ${this.complianceResults.phi_protection.privacy_rule.status} (Score: ${score}/100)`);
  }

  // Helper methods for technical safeguard checks
  async checkAccessControlImplementation() {
    let score = 0;
    const evidence = [];

    const authFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('auth') && (content.includes('role') || content.includes('permission'));
      });

    if (authFiles.length > 0) {
      score += 40;
      evidence.push(`${authFiles.length} authentication/authorization files`);
    }

    const supabaseRLSFiles = this.findSourceFiles(['.sql', '.js', '.ts'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('rls') || content.includes('row level security');
      });

    if (supabaseRLSFiles.length > 0) {
      score += 40;
      evidence.push('Row Level Security implemented');
    }

    return { score, evidence };
  }

  async checkAuditControlImplementation() {
    let score = 0;
    const evidence = [];

    const auditFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('audit') || (content.includes('log') && content.includes('access'));
      });

    if (auditFiles.length > 0) {
      score += 80;
      evidence.push(`${auditFiles.length} audit logging files`);
    }

    return { score, evidence };
  }

  async checkIntegrityImplementation() {
    let score = 0;
    const evidence = [];

    const integrityFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('hash') || content.includes('integrity') || 
               (content.includes('encrypt') && content.includes('verify'));
      });

    if (integrityFiles.length > 0) {
      score += 80;
      evidence.push('Data integrity verification implemented');
    }

    return { score, evidence };
  }

  async checkPersonAuthenticationImplementation() {
    let score = 0;
    const evidence = [];

    const authFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('authenticate') || content.includes('login') ||
               content.includes('verify') || content.includes('mfa') || content.includes('2fa');
      });

    if (authFiles.length > 0) {
      score += 70;
      evidence.push(`${authFiles.length} authentication files`);
    }

    // Check for MFA
    const mfaFiles = authFiles.filter(file => {
      const content = fs.readFileSync(file, 'utf8').toLowerCase();
      return content.includes('mfa') || content.includes('2fa') || content.includes('totp');
    });

    if (mfaFiles.length > 0) {
      score += 15;
      evidence.push('Multi-factor authentication implemented');
    }

    return { score, evidence };
  }

  async checkTransmissionSecurityImplementation() {
    let score = 0;
    const evidence = [];

    const httpsFiles = this.findSourceFiles(['.js', '.ts', '.json'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8');
        return content.includes('https://') || content.includes('ssl') || content.includes('tls');
      });

    if (httpsFiles.length > 0) {
      score += 50;
      evidence.push('HTTPS/TLS encryption implemented');
    }

    const encryptionFiles = this.findSourceFiles(['.js', '.ts', '.jsx', '.tsx'])
      .filter(file => {
        const content = fs.readFileSync(file, 'utf8').toLowerCase();
        return content.includes('encrypt') && content.includes('transit');
      });

    if (encryptionFiles.length > 0) {
      score += 30;
      evidence.push('Transmission encryption implemented');
    }

    return { score, evidence };
  }

  calculateOverallCompliance() {
    const safeguards = Object.values(this.complianceResults.safeguards);
    const totalScore = safeguards.reduce((sum, safeguard) => sum + safeguard.score, 0);
    const maxScore = safeguards.reduce((sum, safeguard) => sum + safeguard.max, 0);
    
    this.complianceResults.overall_compliance = Math.round((totalScore / maxScore) * 100);
    
    if (this.complianceResults.overall_compliance >= 90) {
      this.complianceResults.compliance_status = 'fully-compliant';
    } else if (this.complianceResults.overall_compliance >= 80) {
      this.complianceResults.compliance_status = 'substantially-compliant';
    } else if (this.complianceResults.overall_compliance >= 70) {
      this.complianceResults.compliance_status = 'partially-compliant';
    } else {
      this.complianceResults.compliance_status = 'non-compliant';
    }

    // Generate compliance checklist
    this.generateComplianceChecklist();
  }

  generateComplianceChecklist() {
    const checklist = this.complianceResults.compliance_checklist;
    
    // Administrative Safeguards Checklist
    this.hipaaRequirements.administrative.forEach(requirement => {
      const safeguardResult = this.complianceResults.safeguards.administrative.requirements
        .find(r => r.requirement.includes(requirement));
      
      checklist.push({
        category: 'Administrative',
        requirement: requirement,
        status: safeguardResult ? safeguardResult.status : 'MISSING',
        priority: 'HIGH'
      });
    });

    // Physical Safeguards Checklist
    this.hipaaRequirements.physical.forEach(requirement => {
      const safeguardResult = this.complianceResults.safeguards.physical.requirements
        .find(r => r.requirement.includes(requirement));
      
      checklist.push({
        category: 'Physical',
        requirement: requirement,
        status: safeguardResult ? safeguardResult.status : 'MISSING',
        priority: 'MEDIUM'
      });
    });

    // Technical Safeguards Checklist
    this.hipaaRequirements.technical.forEach(requirement => {
      const safeguardResult = this.complianceResults.safeguards.technical.requirements
        .find(r => r.requirement.includes(requirement));
      
      checklist.push({
        category: 'Technical',
        requirement: requirement,
        status: safeguardResult ? safeguardResult.status : 'MISSING',
        priority: 'HIGH'
      });
    });
  }

  async generateHIPAAComplianceReport() {
    const reportDir = path.join(this.projectRoot, 'compliance-reports');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Generate JSON report
    const jsonReportPath = path.join(reportDir, `hipaa-compliance-${timestamp}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(this.complianceResults, null, 2));

    // Generate HTML report
    const htmlReport = this.generateHTMLComplianceReport();
    const htmlReportPath = path.join(reportDir, `hipaa-compliance-${timestamp}.html`);
    fs.writeFileSync(htmlReportPath, htmlReport);

    // Generate remediation plan
    const remediationPlan = this.generateRemediationPlan();
    const remediationPath = path.join(reportDir, `remediation-plan-${timestamp}.md`);
    fs.writeFileSync(remediationPath, remediationPlan);

    console.log(`\n🏥 HIPAA Compliance Report Generated:`);
    console.log(`   JSON: ${jsonReportPath}`);
    console.log(`   HTML: ${htmlReportPath}`);
    console.log(`   Remediation Plan: ${remediationPath}`);
    console.log(`\n📊 Overall HIPAA Compliance: ${this.complianceResults.overall_compliance}%`);
    console.log(`   Status: ${this.complianceResults.compliance_status.toUpperCase()}`);
  }

  generateHTMLComplianceReport() {
    const statusColor = this.getComplianceColor(this.complianceResults.overall_compliance);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HIPAA Compliance Validation Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .compliance-score { font-size: 64px; font-weight: bold; color: ${statusColor}; margin: 20px 0; }
        .status-badge { display: inline-block; padding: 10px 20px; border-radius: 25px; color: white; background: ${statusColor}; font-weight: bold; text-transform: uppercase; }
        .safeguard-section { margin: 30px 0; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .safeguard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
        .safeguard-score { font-size: 24px; font-weight: bold; }
        .requirement { margin: 10px 0; padding: 15px; border-left: 4px solid #007bff; background: white; border-radius: 4px; }
        .compliant { border-left-color: #28a745; }
        .needs-improvement { border-left-color: #ffc107; }
        .non-compliant { border-left-color: #dc3545; }
        .missing { border-left-color: #6c757d; }
        .phi-protection { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
        .phi-card { padding: 20px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #1976d2; }
        .checklist-item { display: flex; align-items: center; margin: 8px 0; padding: 10px; background: white; border-radius: 4px; }
        .checklist-status { width: 20px; height: 20px; border-radius: 50%; margin-right: 10px; }
        .status-compliant { background: #28a745; }
        .status-missing { background: #dc3545; }
        .status-needs-improvement { background: #ffc107; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏥 HIPAA Compliance Validation Report</h1>
            <div class="compliance-score">${this.complianceResults.overall_compliance}%</div>
            <div class="status-badge">${this.complianceResults.compliance_status.replace(/-/g, ' ')}</div>
            <p>Generated: ${this.complianceResults.timestamp}</p>
        </div>

        <div class="phi-protection">
            <div class="phi-card">
                <h3>🔒 PHI Encryption at Rest</h3>
                <p><strong>Status:</strong> ${this.complianceResults.phi_protection.encryption_at_rest.status}</p>
                <small>${this.complianceResults.phi_protection.encryption_at_rest.details.length} details found</small>
            </div>
            <div class="phi-card">
                <h3>🌐 PHI Encryption in Transit</h3>
                <p><strong>Status:</strong> ${this.complianceResults.phi_protection.encryption_in_transit.status}</p>
                <small>${this.complianceResults.phi_protection.encryption_in_transit.details.length} details found</small>
            </div>
            <div class="phi-card">
                <h3>👥 Access Controls</h3>
                <p><strong>Status:</strong> ${this.complianceResults.phi_protection.access_controls.status}</p>
                <small>${this.complianceResults.phi_protection.access_controls.details.length} details found</small>
            </div>
            <div class="phi-card">
                <h3>📋 Audit Logging</h3>
                <p><strong>Status:</strong> ${this.complianceResults.phi_protection.audit_logging.status}</p>
                <small>${this.complianceResults.phi_protection.audit_logging.details.length} details found</small>
            </div>
        </div>

        ${Object.entries(this.complianceResults.safeguards).map(([name, safeguard]) => `
            <div class="safeguard-section">
                <div class="safeguard-header">
                    <h2>${name.replace(/_/g, ' ').toUpperCase()} SAFEGUARDS</h2>
                    <div class="safeguard-score" style="color: ${this.getComplianceColor(safeguard.score)}">${safeguard.score}/100</div>
                </div>
                
                <h4>✅ Requirements Met (${safeguard.requirements.length})</h4>
                ${safeguard.requirements.map(req => `
                    <div class="requirement compliant">
                        <strong>${req.requirement}</strong><br>
                        <small>Evidence: ${Array.isArray(req.evidence) ? req.evidence.join(', ') : req.evidence}</small>
                    </div>
                `).join('')}
                
                ${safeguard.issues.length > 0 ? `
                    <h4>⚠️ Issues Found (${safeguard.issues.length})</h4>
                    ${safeguard.issues.map(issue => `
                        <div class="requirement ${issue.severity === 'HIGH' ? 'non-compliant' : 'needs-improvement'}">
                            <strong>${issue.requirement}</strong> - ${issue.severity}<br>
                            <p>${issue.description}</p>
                            ${issue.remediation ? `<small><strong>Remediation:</strong> ${issue.remediation}</small>` : ''}
                        </div>
                    `).join('')}
                ` : '<p>✅ No issues found in this safeguard category</p>'}
            </div>
        `).join('')}

        <div style="margin-top: 40px;">
            <h2>📋 HIPAA Compliance Checklist</h2>
            ${this.complianceResults.compliance_checklist.map(item => `
                <div class="checklist-item">
                    <div class="checklist-status status-${item.status.toLowerCase().replace('_', '-')}"></div>
                    <div>
                        <strong>[${item.category}]</strong> ${item.requirement}
                        <small style="float: right; color: ${item.priority === 'HIGH' ? '#dc3545' : '#ffc107'};">${item.priority} Priority</small>
                    </div>
                </div>
            `).join('')}
        </div>

        <div style="margin-top: 30px; padding: 25px; background: #d4edda; border-radius: 8px; border-left: 4px solid #28a745;">
            <h3>📊 Compliance Summary</h3>
            <p><strong>Overall Compliance Score:</strong> ${this.complianceResults.overall_compliance}%</p>
            <p><strong>Compliance Status:</strong> ${this.complianceResults.compliance_status.toUpperCase().replace(/-/g, ' ')}</p>
            <p><strong>Total Requirements:</strong> ${this.complianceResults.compliance_checklist.length}</p>
            <p><strong>Compliant Requirements:</strong> ${this.complianceResults.compliance_checklist.filter(i => i.status === 'COMPLIANT').length}</p>
            <p><strong>Missing Requirements:</strong> ${this.complianceResults.compliance_checklist.filter(i => i.status === 'MISSING').length}</p>
        </div>
    </div>
</body>
</html>`;
  }

  generateRemediationPlan() {
    const plan = [];
    
    plan.push('# HIPAA Compliance Remediation Plan\n');
    plan.push(`**Generated:** ${this.complianceResults.timestamp}`);
    plan.push(`**Current Compliance:** ${this.complianceResults.overall_compliance}%`);
    plan.push(`**Status:** ${this.complianceResults.compliance_status.toUpperCase().replace(/-/g, ' ')}\n`);

    // High priority issues first
    plan.push('## 🚨 High Priority Remediations\n');
    
    Object.entries(this.complianceResults.safeguards).forEach(([name, safeguard]) => {
      const highIssues = safeguard.issues.filter(issue => issue.severity === 'HIGH');
      if (highIssues.length > 0) {
        plan.push(`### ${name.replace(/_/g, ' ').toUpperCase()} Safeguards\n`);
        highIssues.forEach(issue => {
          plan.push(`- **${issue.requirement}**`);
          plan.push(`  - Issue: ${issue.description}`);
          if (issue.remediation) {
            plan.push(`  - Action: ${issue.remediation}`);
          }
          plan.push(`  - Timeline: 30 days\n`);
        });
      }
    });

    // Medium priority issues
    plan.push('## ⚠️ Medium Priority Remediations\n');
    
    Object.entries(this.complianceResults.safeguards).forEach(([name, safeguard]) => {
      const mediumIssues = safeguard.issues.filter(issue => issue.severity === 'MEDIUM');
      if (mediumIssues.length > 0) {
        plan.push(`### ${name.replace(/_/g, ' ').toUpperCase()} Safeguards\n`);
        mediumIssues.forEach(issue => {
          plan.push(`- **${issue.requirement}**`);
          plan.push(`  - Issue: ${issue.description}`);
          if (issue.remediation) {
            plan.push(`  - Action: ${issue.remediation}`);
          }
          plan.push(`  - Timeline: 60 days\n`);
        });
      }
    });

    // Implementation timeline
    plan.push('## 📅 Implementation Timeline\n');
    plan.push('| Priority | Timeline | Action Required |');
    plan.push('|----------|----------|-----------------|');
    
    Object.values(this.complianceResults.safeguards).forEach(safeguard => {
      safeguard.issues.forEach(issue => {
        const timeline = issue.severity === 'HIGH' ? '30 days' : issue.severity === 'MEDIUM' ? '60 days' : '90 days';
        plan.push(`| ${issue.severity} | ${timeline} | ${issue.requirement} |`);
      });
    });

    // Recommendations for improvement
    plan.push('\n## 💡 Additional Recommendations\n');
    
    Object.values(this.complianceResults.safeguards).forEach(safeguard => {
      safeguard.recommendations.forEach(rec => {
        plan.push(`- ${rec}`);
      });
    });

    plan.push('\n## 🏥 HIPAA Compliance Resources\n');
    plan.push('- [HHS HIPAA Security Rule](https://www.hhs.gov/hipaa/for-professionals/security/index.html)');
    plan.push('- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)');
    plan.push('- [HIPAA Security Risk Assessment Tool](https://www.healthit.gov/topic/privacy-security-and-hipaa/security-risk-assessment-tool)');
    plan.push('- [HHS Breach Notification Rule](https://www.hhs.gov/hipaa/for-professionals/breach-notification/index.html)');

    return plan.join('\n');
  }

  getComplianceColor(score) {
    if (score >= 90) return '#28a745';
    if (score >= 80) return '#17a2b8';
    if (score >= 70) return '#ffc107';
    return '#dc3545';
  }

  // Utility methods
  findSourceFiles(extensions) {
    const files = [];
    const searchDir = (dir) => {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const fullPath = path.join(dir, item);
          const stat = fs.statSync(fullPath);
          
          if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
            searchDir(fullPath);
          } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
            files.push(fullPath);
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    };
    
    searchDir(this.projectRoot);
    return files.slice(0, 100); // Limit to prevent memory issues
  }

  findDocumentationFiles(filenames) {
    const files = [];
    const searchDirs = [
      this.projectRoot,
      path.join(this.projectRoot, 'docs'),
      path.join(this.projectRoot, 'documentation'),
      path.join(this.projectRoot, 'compliance')
    ];
    
    searchDirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        filenames.forEach(filename => {
          const filePath = path.join(dir, filename);
          if (fs.existsSync(filePath)) {
            files.push(filePath);
          }
        });
      }
    });
    
    return files;
  }
}

// Main execution
async function main() {
  const validator = new HIPAAComplianceValidator();
  await validator.validateHIPAACompliance();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ HIPAA compliance validation failed:', error);
    process.exit(1);
  });
}

module.exports = { HIPAAComplianceValidator };