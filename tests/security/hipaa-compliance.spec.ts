import { test, expect } from '@playwright/test';
import { TestHelpers } from '../utils/test-helpers';
import { SecurityTestSuite } from '../utils/security-test-suite';
import { HIPAAValidator } from '../utils/hipaa-validator';
import { AuditLogAnalyzer } from '../utils/audit-log-analyzer';

test.describe('HIPAA Compliance and Security Tests', () => {
  let testHelpers: TestHelpers;
  let securityTestSuite: SecurityTestSuite;
  let hipaaValidator: HIPAAValidator;
  let auditLogAnalyzer: AuditLogAnalyzer;
  let testPatientUser: any;
  let testProviderUser: any;

  test.beforeAll(async () => {
    testHelpers = new TestHelpers();
    securityTestSuite = new SecurityTestSuite();
    hipaaValidator = new HIPAAValidator();
    auditLogAnalyzer = new AuditLogAnalyzer();
    
    await testHelpers.setupTestEnvironment();
    
    // Create test users with PHI data
    testPatientUser = await testHelpers.createTestUser({
      email: 'hipaa-patient@test.com',
      role: 'patient',
      phone: '+1234567890',
      firstName: 'Jane',
      lastName: 'Doe',
      ssn: '123-45-6789', // Test SSN
      dateOfBirth: '1985-03-15',
      medicalRecordNumber: 'MRN123456',
      diagnosis: ['F10.20', 'F41.1'], // ICD-10 codes
      medications: ['Naloxone', 'Buprenorphine']
    });

    testProviderUser = await testHelpers.createTestUser({
      email: 'hipaa-provider@test.com',
      role: 'provider',
      phone: '+1987654321',
      firstName: 'Dr. Smith',
      lastName: 'Johnson',
      npi: '1234567890', // National Provider Identifier
      licenseNumber: 'MD12345'
    });
  });

  test.afterAll(async () => {
    await testHelpers.cleanup();
  });

  describe('PHI Data Protection', () => {
    test('should encrypt PHI data in notifications at rest and in transit', async ({ page }) => {
      // Send notification containing PHI
      const phiNotification = {
        userId: testPatientUser.id,
        type: 'appointment_reminder',
        channels: ['email', 'sms'],
        content: 'Appointment reminder for Jane Doe (MRN: MRN123456)',
        templateData: {
          patientName: 'Jane Doe',
          medicalRecordNumber: 'MRN123456',
          appointmentDate: '2024-02-15',
          diagnosis: 'F10.20'
        },
        containsPHI: true
      };

      const notificationId = await testHelpers.triggerNotification(phiNotification);
      
      // Verify PHI is encrypted in database
      const storedNotification = await testHelpers.getStoredNotification(notificationId);
      expect(storedNotification.content).not.toContain('Jane Doe');
      expect(storedNotification.content).not.toContain('MRN123456');
      expect(storedNotification.templateData).toBeUndefined(); // Should be encrypted
      expect(storedNotification.encryptedData).toBeDefined();
      expect(storedNotification.encryptionKeyId).toBeDefined();

      // Verify PHI is encrypted in transit
      const transmissionLogs = await testHelpers.getTransmissionLogs(notificationId);
      transmissionLogs.forEach(log => {
        expect(log.encryptionProtocol).toBe('TLS 1.3');
        expect(log.dataEncrypted).toBe(true);
        expect(log.plainTextPHI).toBeUndefined();
      });

      // Verify PHI masking in logs
      const applicationLogs = await testHelpers.getApplicationLogs({
        notificationId,
        includePHI: false
      });
      
      applicationLogs.forEach(logEntry => {
        expect(logEntry.message).not.toContain('Jane Doe');
        expect(logEntry.message).not.toContain('MRN123456');
        expect(logEntry.message).not.toContain('123-45-6789');
        // Should contain masked versions
        expect(logEntry.message).toMatch(/Jane\s*\*+/); // Name masking
        expect(logEntry.message).toMatch(/MRN\*+/); // MRN masking
      });
    });

    test('should validate data minimization in notifications', async ({ page }) => {
      const minimizationTestCases = [
        {
          type: 'daily_checkin_reminder',
          expectedPHI: ['firstName'],
          prohibitedPHI: ['ssn', 'medicalRecordNumber', 'diagnosis', 'medications']
        },
        {
          type: 'appointment_reminder',
          expectedPHI: ['firstName', 'appointmentDate'],
          prohibitedPHI: ['ssn', 'diagnosis', 'medications']
        },
        {
          type: 'crisis_alert',
          expectedPHI: ['firstName', 'lastName', 'phone'], // More PHI allowed for emergencies
          prohibitedPHI: ['ssn']
        }
      ];

      for (const testCase of minimizationTestCases) {
        const notification = await testHelpers.triggerNotification({
          userId: testPatientUser.id,
          type: testCase.type,
          channels: ['email'],
          templateData: {
            firstName: 'Jane',
            lastName: 'Doe',
            ssn: '123-45-6789',
            medicalRecordNumber: 'MRN123456',
            diagnosis: 'F10.20',
            medications: 'Naloxone',
            appointmentDate: '2024-02-15',
            phone: '+1234567890'
          }
        });

        const processedNotification = await testHelpers.getProcessedNotification(notification);
        const dataMinimizationResult = await hipaaValidator.validateDataMinimization(
          processedNotification,
          testCase
        );

        expect(dataMinimizationResult.compliant).toBe(true);
        expect(dataMinimizationResult.violations).toHaveLength(0);
        
        // Verify only expected PHI is included
        testCase.expectedPHI.forEach(phiElement => {
          expect(dataMinimizationResult.includedPHI).toContain(phiElement);
        });

        // Verify prohibited PHI is excluded
        testCase.prohibitedPHI.forEach(phiElement => {
          expect(dataMinimizationResult.includedPHI).not.toContain(phiElement);
        });
      }
    });

    test('should implement proper data retention and deletion', async ({ page }) => {
      // Create notifications with different retention requirements
      const retentionTestNotifications = [
        {
          type: 'daily_checkin',
          retentionPeriod: '7 days',
          containsPHI: false
        },
        {
          type: 'crisis_alert',
          retentionPeriod: '7 years', // HIPAA requirement for crisis records
          containsPHI: true
        },
        {
          type: 'appointment_reminder',
          retentionPeriod: '6 years', // Standard HIPAA retention
          containsPHI: true
        }
      ];

      const notificationIds = [];
      for (const notificationConfig of retentionTestNotifications) {
        const id = await testHelpers.triggerNotification({
          userId: testPatientUser.id,
          ...notificationConfig
        });
        notificationIds.push(id);
      }

      // Simulate time passage and run retention cleanup
      await testHelpers.simulateTimePassage('8 days');
      await testHelpers.runRetentionCleanup();

      // Verify short-retention data is deleted
      const dailyCheckinNotification = await testHelpers.getStoredNotification(notificationIds[0]);
      expect(dailyCheckinNotification).toBeNull();

      // Verify long-retention data is preserved
      const crisisNotification = await testHelpers.getStoredNotification(notificationIds[1]);
      expect(crisisNotification).toBeDefined();

      const appointmentNotification = await testHelpers.getStoredNotification(notificationIds[2]);
      expect(appointmentNotification).toBeDefined();

      // Verify audit trail for deletions
      const deletionLogs = await auditLogAnalyzer.getDataDeletionLogs();
      expect(deletionLogs).toContainEqual(
        expect.objectContaining({
          action: 'DATA_DELETED',
          notificationId: notificationIds[0],
          reason: 'RETENTION_PERIOD_EXPIRED',
          deletionDate: expect.any(String),
          dataType: 'NOTIFICATION',
          containedPHI: false
        })
      );
    });
  });

  describe('Access Control and Authentication', () => {
    test('should enforce role-based access to PHI notifications', async ({ page }) => {
      // Create PHI notification for patient
      const phiNotification = await testHelpers.triggerNotification({
        userId: testPatientUser.id,
        type: 'medical_update',
        content: 'Lab results available for Jane Doe (MRN: MRN123456)',
        containsPHI: true,
        accessControlList: [testPatientUser.id, testProviderUser.id]
      });

      // Test patient access (should be allowed)
      await testHelpers.loginAs(testPatientUser);
      const patientAccessResult = await testHelpers.attemptNotificationAccess(phiNotification);
      expect(patientAccessResult.allowed).toBe(true);
      expect(patientAccessResult.auditLogged).toBe(true);

      // Test provider access (should be allowed)
      await testHelpers.loginAs(testProviderUser);
      const providerAccessResult = await testHelpers.attemptNotificationAccess(phiNotification);
      expect(providerAccessResult.allowed).toBe(true);
      expect(providerAccessResult.auditLogged).toBe(true);

      // Test unauthorized user access (should be denied)
      const unauthorizedUser = await testHelpers.createTestUser({
        email: 'unauthorized@test.com',
        role: 'supporter'
      });
      
      await testHelpers.loginAs(unauthorizedUser);
      const unauthorizedAccessResult = await testHelpers.attemptNotificationAccess(phiNotification);
      expect(unauthorizedAccessResult.allowed).toBe(false);
      expect(unauthorizedAccessResult.auditLogged).toBe(true);
      expect(unauthorizedAccessResult.denialReason).toBe('INSUFFICIENT_PRIVILEGES');

      // Verify access audit logs
      const accessLogs = await auditLogAnalyzer.getAccessLogs(phiNotification);
      expect(accessLogs).toHaveLength(3);
      
      const deniedAccess = accessLogs.find(log => log.result === 'DENIED');
      expect(deniedAccess).toBeDefined();
      expect(deniedAccess?.userId).toBe(unauthorizedUser.id);
      expect(deniedAccess?.reason).toBe('INSUFFICIENT_PRIVILEGES');
    });

    test('should implement secure session management', async ({ page }) => {
      await testHelpers.loginAs(testProviderUser);
      
      // Verify session security properties
      const sessionInfo = await testHelpers.getSessionInfo();
      expect(sessionInfo.secure).toBe(true);
      expect(sessionInfo.httpOnly).toBe(true);
      expect(sessionInfo.sameSite).toBe('Strict');
      expect(sessionInfo.maxAge).toBeLessThanOrEqual(900000); // 15 minutes max

      // Test session timeout for PHI access
      await testHelpers.accessPHIResource(testPatientUser.id);
      
      // Simulate 16 minutes of inactivity
      await testHelpers.simulateInactivity(960000);
      
      // Attempt PHI access after timeout
      const timedOutAccess = await testHelpers.attemptPHIAccess(testPatientUser.id);
      expect(timedOutAccess.allowed).toBe(false);
      expect(timedOutAccess.reason).toBe('SESSION_EXPIRED');

      // Verify automatic session cleanup
      const activeSession = await testHelpers.getActiveSession();
      expect(activeSession).toBeNull();

      // Verify timeout audit log
      const timeoutLogs = await auditLogAnalyzer.getSessionTimeoutLogs();
      expect(timeoutLogs).toContainEqual(
        expect.objectContaining({
          event: 'SESSION_TIMEOUT',
          userId: testProviderUser.id,
          reason: 'INACTIVITY_TIMEOUT',
          phiAccessAttempt: true
        })
      );
    });

    test('should implement multi-factor authentication for sensitive operations', async ({ page }) => {
      await testHelpers.loginAs(testProviderUser);

      // Attempt to access bulk PHI export (should require MFA)
      const bulkExportAttempt = await testHelpers.attemptBulkPHIExport({
        patients: [testPatientUser.id],
        dateRange: { start: '2024-01-01', end: '2024-02-01' }
      });

      expect(bulkExportAttempt.mfaRequired).toBe(true);
      expect(bulkExportAttempt.allowed).toBe(false);

      // Complete MFA challenge
      const mfaChallenge = await testHelpers.initiateMFAChallenge();
      expect(mfaChallenge.method).toBe('TOTP');
      
      const mfaResponse = await testHelpers.completeMFAChallenge(mfaChallenge.challengeId, '123456');
      expect(mfaResponse.verified).toBe(true);

      // Retry bulk export with MFA completed
      const authenticatedExportAttempt = await testHelpers.attemptBulkPHIExport({
        patients: [testPatientUser.id],
        dateRange: { start: '2024-01-01', end: '2024-02-01' },
        mfaToken: mfaResponse.token
      });

      expect(authenticatedExportAttempt.allowed).toBe(true);
      expect(authenticatedExportAttempt.exportId).toBeDefined();

      // Verify MFA audit logging
      const mfaLogs = await auditLogAnalyzer.getMFALogs();
      expect(mfaLogs).toContainEqual(
        expect.objectContaining({
          event: 'MFA_CHALLENGE_COMPLETED',
          userId: testProviderUser.id,
          operation: 'BULK_PHI_EXPORT',
          success: true
        })
      );
    });
  });

  describe('Audit Logging and Monitoring', () => {
    test('should create comprehensive HIPAA audit logs', async ({ page }) => {
      const auditableOperations = [
        {
          action: 'PHI_ACCESSED',
          operation: () => testHelpers.viewPatientNotifications(testPatientUser.id)
        },
        {
          action: 'PHI_TRANSMITTED',
          operation: () => testHelpers.triggerNotification({
            userId: testPatientUser.id,
            type: 'medical_update',
            containsPHI: true
          })
        },
        {
          action: 'PHI_MODIFIED',
          operation: () => testHelpers.updatePatientPreferences(testPatientUser.id, {
            email: 'newemail@test.com'
          })
        },
        {
          action: 'PHI_DELETED',
          operation: () => testHelpers.deletePatientNotification(testPatientUser.id, 'notification-123')
        }
      ];

      await testHelpers.loginAs(testProviderUser);

      for (const { action, operation } of auditableOperations) {
        await operation();
        
        // Verify comprehensive audit log creation
        const auditLogs = await auditLogAnalyzer.getRecentAuditLogs(action, 1);
        expect(auditLogs).toHaveLength(1);
        
        const auditLog = auditLogs[0];
        expect(auditLog).toMatchObject({
          timestamp: expect.any(String),
          userId: testProviderUser.id,
          userRole: 'provider',
          action,
          patientId: testPatientUser.id,
          ipAddress: expect.any(String),
          userAgent: expect.any(String),
          sessionId: expect.any(String),
          success: true,
          details: expect.any(Object)
        });

        // Verify audit log immutability
        const auditLogId = auditLog.id;
        const modificationAttempt = await testHelpers.attemptAuditLogModification(auditLogId, {
          action: 'MODIFIED_ACTION'
        });
        expect(modificationAttempt.success).toBe(false);
        expect(modificationAttempt.error).toBe('AUDIT_LOG_IMMUTABLE');

        // Verify original log remains unchanged
        const unchangedLog = await auditLogAnalyzer.getAuditLog(auditLogId);
        expect(unchangedLog.action).toBe(action);
      }
    });

    test('should detect and alert on suspicious activity patterns', async ({ page }) => {
      await testHelpers.loginAs(testProviderUser);

      // Generate suspicious activity patterns
      const suspiciousPatterns = [
        {
          pattern: 'excessive_phi_access',
          actions: Array.from({ length: 50 }, () => 
            testHelpers.viewPatientNotifications(testPatientUser.id)
          )
        },
        {
          pattern: 'off_hours_access',
          actions: [
            testHelpers.simulateTimeChange('2024-02-15 02:30:00'),
            testHelpers.viewPatientNotifications(testPatientUser.id)
          ]
        },
        {
          pattern: 'bulk_data_access',
          actions: [
            testHelpers.attemptBulkPHIExport({
              patients: Array.from({ length: 1000 }, (_, i) => `patient-${i}`)
            })
          ]
        }
      ];

      for (const { pattern, actions } of suspiciousPatterns) {
        // Execute suspicious actions
        for (const action of actions) {
          await action;
        }

        // Verify suspicious activity detection
        const suspiciousActivityAlerts = await auditLogAnalyzer.getSuspiciousActivityAlerts(pattern);
        expect(suspiciousActivityAlerts).toHaveLength(1);
        
        const alert = suspiciousActivityAlerts[0];
        expect(alert).toMatchObject({
          pattern,
          userId: testProviderUser.id,
          riskLevel: expect.oneOf(['MEDIUM', 'HIGH', 'CRITICAL']),
          alertTime: expect.any(String),
          details: expect.any(Object)
        });

        // Verify automatic notification to compliance team
        const complianceNotifications = await testHelpers.getComplianceNotifications();
        const patternAlert = complianceNotifications.find(n => n.alertType === pattern);
        expect(patternAlert).toBeDefined();
        expect(patternAlert?.priority).toBe('HIGH');
      }
    });

    test('should maintain audit log integrity and non-repudiation', async ({ page }) => {
      await testHelpers.loginAs(testProviderUser);

      // Generate audit events
      await testHelpers.viewPatientNotifications(testPatientUser.id);
      const auditEvent = await auditLogAnalyzer.getRecentAuditLogs('PHI_ACCESSED', 1)[0];

      // Verify digital signature
      const signatureVerification = await auditLogAnalyzer.verifyAuditLogSignature(auditEvent.id);
      expect(signatureVerification.valid).toBe(true);
      expect(signatureVerification.signingKey).toBeDefined();
      expect(signatureVerification.timestamp).toBeDefined();

      // Verify hash chain integrity
      const chainIntegrity = await auditLogAnalyzer.verifyAuditChainIntegrity({
        startDate: new Date(Date.now() - 86400000), // Last 24 hours
        endDate: new Date()
      });
      expect(chainIntegrity.valid).toBe(true);
      expect(chainIntegrity.brokenLinks).toHaveLength(0);

      // Test tampering detection
      const tamperingAttempt = await testHelpers.simulateAuditLogTampering(auditEvent.id);
      const tamperingDetection = await auditLogAnalyzer.detectTampering();
      expect(tamperingDetection.detected).toBe(true);
      expect(tamperingDetection.affectedLogs).toContain(auditEvent.id);

      // Verify automatic security incident creation
      const securityIncidents = await testHelpers.getSecurityIncidents();
      const tamperingIncident = securityIncidents.find(i => i.type === 'AUDIT_LOG_TAMPERING');
      expect(tamperingIncident).toBeDefined();
      expect(tamperingIncident?.severity).toBe('CRITICAL');
    });
  });

  describe('Data Breach Detection and Response', () => {
    test('should detect potential data breaches', async ({ page }) => {
      const breachScenarios = [
        {
          name: 'unauthorized_bulk_access',
          setup: async () => {
            const maliciousUser = await testHelpers.createCompromisedUser();
            await testHelpers.loginAs(maliciousUser);
            return maliciousUser;
          },
          actions: [
            () => testHelpers.accessMultiplePatientRecords(100),
            () => testHelpers.attemptDataExport(['*'])
          ]
        },
        {
          name: 'sql_injection_attempt',
          setup: async () => {
            await testHelpers.loginAs(testProviderUser);
            return testProviderUser;
          },
          actions: [
            () => testHelpers.attemptSQLInjection("'; DROP TABLE notifications; --")
          ]
        },
        {
          name: 'unusual_access_pattern',
          setup: async () => {
            await testHelpers.loginAs(testProviderUser);
            return testProviderUser;
          },
          actions: [
            () => testHelpers.accessPHIFromUnusualLocation('198.51.100.1'), // Different country
            () => testHelpers.accessPHIAtUnusualTime('03:00') // 3 AM
          ]
        }
      ];

      for (const scenario of breachScenarios) {
        const actor = await scenario.setup();

        // Execute breach scenario
        for (const action of scenario.actions) {
          await action();
        }

        // Verify breach detection
        const breachDetection = await securityTestSuite.detectPotentialBreach(scenario.name);
        expect(breachDetection.detected).toBe(true);
        expect(breachDetection.confidence).toBeGreaterThan(0.8);
        expect(breachDetection.affectedRecords).toBeDefined();

        // Verify automatic incident response
        const incidentResponse = await testHelpers.getIncidentResponse(scenario.name);
        expect(incidentResponse).toMatchObject({
          incidentId: expect.any(String),
          type: 'POTENTIAL_DATA_BREACH',
          severity: 'HIGH',
          status: 'INVESTIGATING',
          affectedUsers: expect.arrayContaining([actor.id]),
          responseActions: expect.arrayContaining(['ACCOUNT_SUSPENDED', 'AUDIT_REVIEW_INITIATED'])
        });

        // Verify notification to compliance and security teams
        const breachNotifications = await testHelpers.getBreachNotifications();
        const scenarioNotification = breachNotifications.find(n => n.scenario === scenario.name);
        expect(scenarioNotification).toBeDefined();
        expect(scenarioNotification?.sentToCompliance).toBe(true);
        expect(scenarioNotification?.sentToSecurity).toBe(true);
      }
    });

    test('should execute automated breach response procedures', async ({ page }) => {
      // Simulate confirmed data breach
      const breachIncident = await testHelpers.simulateDataBreach({
        type: 'unauthorized_access',
        affectedPatients: 50,
        exposedDataTypes: ['name', 'phone', 'treatment_history'],
        detectionTime: new Date()
      });

      // Verify immediate response actions
      const immediateResponse = await testHelpers.getBreachResponseActions(breachIncident.id, 'immediate');
      expect(immediateResponse).toContainEqual(
        expect.objectContaining({ action: 'CONTAIN_BREACH', status: 'COMPLETED' })
      );
      expect(immediateResponse).toContainEqual(
        expect.objectContaining({ action: 'SUSPEND_AFFECTED_ACCOUNTS', status: 'COMPLETED' })
      );
      expect(immediateResponse).toContainEqual(
        expect.objectContaining({ action: 'PRESERVE_EVIDENCE', status: 'COMPLETED' })
      );

      // Verify forensic data collection
      const forensicData = await testHelpers.getForensicData(breachIncident.id);
      expect(forensicData).toMatchObject({
        auditLogs: expect.any(Array),
        systemLogs: expect.any(Array),
        networkLogs: expect.any(Array),
        accessLogs: expect.any(Array),
        integrityHashes: expect.any(Array)
      });

      // Verify patient notification requirements
      const patientNotifications = await testHelpers.getBreachNotificationStatus(breachIncident.id);
      expect(patientNotifications.notificationRequired).toBe(true);
      expect(patientNotifications.timelineToNotify).toBeLessThanOrEqual(60); // Days
      expect(patientNotifications.notificationMethod).toContain('WRITTEN_NOTICE');

      // Verify regulatory reporting
      const regulatoryReporting = await testHelpers.getRegulatoryReporting(breachIncident.id);
      expect(regulatoryReporting.hhs_required).toBe(true); // > 500 records or high risk
      expect(regulatoryReporting.state_ag_required).toBe(true);
      expect(regulatoryReporting.deadline).toBeDefined();
    });
  });

  describe('Business Associate Agreement Compliance', () => {
    test('should enforce BAA requirements for third-party integrations', async ({ page }) => {
      const thirdPartyServices = [
        {
          name: 'Twilio',
          type: 'SMS_PROVIDER',
          baaStatus: 'SIGNED',
          dataTypes: ['phone_numbers', 'message_content']
        },
        {
          name: 'SendGrid',
          type: 'EMAIL_PROVIDER',
          baaStatus: 'SIGNED',
          dataTypes: ['email_addresses', 'message_content']
        },
        {
          name: 'UnauthorizedService',
          type: 'ANALYTICS_PROVIDER',
          baaStatus: 'NOT_SIGNED',
          dataTypes: ['user_behavior', 'phi_data']
        }
      ];

      for (const service of thirdPartyServices) {
        const integrationTest = await hipaaValidator.validateThirdPartyIntegration(service);
        
        if (service.baaStatus === 'SIGNED') {
          expect(integrationTest.compliant).toBe(true);
          expect(integrationTest.phiTransmissionAllowed).toBe(true);
        } else {
          expect(integrationTest.compliant).toBe(false);
          expect(integrationTest.phiTransmissionAllowed).toBe(false);
          expect(integrationTest.violations).toContain('NO_BAA_AGREEMENT');
        }

        // Verify data transmission restrictions
        const transmissionAttempt = await testHelpers.attemptPHITransmission(service.name, {
          patientId: testPatientUser.id,
          dataTypes: service.dataTypes
        });

        if (service.baaStatus === 'SIGNED') {
          expect(transmissionAttempt.allowed).toBe(true);
        } else {
          expect(transmissionAttempt.allowed).toBe(false);
          expect(transmissionAttempt.blockReason).toBe('BAA_REQUIRED');
        }
      }
    });

    test('should monitor BAA compliance continuously', async ({ page }) => {
      // Simulate BAA expiration
      await testHelpers.expireBAAgreement('Twilio', new Date(Date.now() - 86400000)); // Expired yesterday

      // Attempt PHI transmission to expired BAA service
      const expiredBAATransmission = await testHelpers.attemptPHITransmission('Twilio', {
        patientId: testPatientUser.id,
        message: 'Crisis alert for Jane Doe'
      });

      expect(expiredBAATransmission.allowed).toBe(false);
      expect(expiredBAATransmission.blockReason).toBe('BAA_EXPIRED');

      // Verify automatic compliance alert
      const complianceAlerts = await testHelpers.getComplianceAlerts();
      const baaAlert = complianceAlerts.find(alert => alert.type === 'BAA_EXPIRED');
      expect(baaAlert).toBeDefined();
      expect(baaAlert?.service).toBe('Twilio');
      expect(baaAlert?.severity).toBe('HIGH');

      // Verify service suspension
      const serviceStatus = await testHelpers.getThirdPartyServiceStatus('Twilio');
      expect(serviceStatus.suspended).toBe(true);
      expect(serviceStatus.suspensionReason).toBe('BAA_EXPIRED');
    });
  });

  describe('Risk Assessment and Mitigation', () => {
    test('should conduct automated HIPAA risk assessment', async ({ page }) => {
      const riskAssessment = await hipaaValidator.conductComprehensiveRiskAssessment({
        scope: 'NOTIFICATION_SYSTEM',
        includeInfrastructure: true,
        includeProcesses: true,
        includePolicies: true
      });

      // Verify risk assessment completeness
      expect(riskAssessment.assessmentId).toBeDefined();
      expect(riskAssessment.completedDate).toBeDefined();
      expect(riskAssessment.overallRiskScore).toBeGreaterThan(0);
      expect(riskAssessment.overallRiskScore).toBeLessThan(100);

      // Verify identified risks
      expect(riskAssessment.identifiedRisks).toBeInstanceOf(Array);
      riskAssessment.identifiedRisks.forEach(risk => {
        expect(risk).toMatchObject({
          category: expect.any(String),
          description: expect.any(String),
          likelihood: expect.oneOf(['LOW', 'MEDIUM', 'HIGH']),
          impact: expect.oneOf(['LOW', 'MEDIUM', 'HIGH']),
          riskLevel: expect.oneOf(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
          currentControls: expect.any(Array),
          recommendedActions: expect.any(Array)
        });
      });

      // Verify no critical unmitigated risks
      const criticalRisks = riskAssessment.identifiedRisks.filter(r => r.riskLevel === 'CRITICAL');
      criticalRisks.forEach(risk => {
        expect(risk.currentControls.length).toBeGreaterThan(0);
        expect(risk.mitigated).toBe(true);
      });

      // Verify compliance with HIPAA Security Rule
      expect(riskAssessment.hipaaCompliance).toMatchObject({
        administrativeSafeguards: expect.objectContaining({ compliant: true }),
        physicalSafeguards: expect.objectContaining({ compliant: true }),
        technicalSafeguards: expect.objectContaining({ compliant: true })
      });
    });

    test('should validate encryption implementation', async ({ page }) => {
      const encryptionValidation = await securityTestSuite.validateEncryptionImplementation({
        scope: 'NOTIFICATION_SYSTEM',
        includeAtRest: true,
        includeInTransit: true,
        includeBackups: true
      });

      // Verify encryption at rest
      expect(encryptionValidation.atRest).toMatchObject({
        algorithm: 'AES-256-GCM',
        keyManagement: 'AWS_KMS',
        keyRotation: true,
        compliant: true
      });

      // Verify encryption in transit
      expect(encryptionValidation.inTransit).toMatchObject({
        protocol: 'TLS_1_3',
        certificateValidation: true,
        perfectForwardSecrecy: true,
        compliant: true
      });

      // Verify backup encryption
      expect(encryptionValidation.backups).toMatchObject({
        encrypted: true,
        keyRotation: true,
        accessControls: true,
        compliant: true
      });

      // Test encryption strength
      const encryptionStrengthTest = await securityTestSuite.testEncryptionStrength();
      expect(encryptionStrengthTest.bruteForceResistance).toBeGreaterThan(128); // 128-bit minimum
      expect(encryptionStrengthTest.quantumResistance).toBe(true);
    });
  });

  test('should generate comprehensive HIPAA compliance report', async ({ page }) => {
    const complianceReport = await hipaaValidator.generateComplianceReport({
      reportType: 'COMPREHENSIVE',
      dateRange: {
        start: new Date(Date.now() - 7776000000), // Last 90 days
        end: new Date()
      },
      includeRecommendations: true,
      includeEvidence: true
    });

    // Verify report completeness
    expect(complianceReport).toMatchObject({
      reportId: expect.any(String),
      generatedDate: expect.any(String),
      reportPeriod: expect.any(Object),
      overallComplianceScore: expect.any(Number),
      executiveSummary: expect.any(String),
      findings: expect.any(Array),
      recommendations: expect.any(Array),
      evidence: expect.any(Array)
    });

    // Verify high compliance score
    expect(complianceReport.overallComplianceScore).toBeGreaterThan(90);

    // Verify all required HIPAA safeguards are addressed
    const requiredSafeguards = [
      'ASSIGNED_SECURITY_RESPONSIBILITY',
      'WORKFORCE_TRAINING',
      'INFORMATION_ACCESS_MANAGEMENT',
      'SECURITY_AWARENESS',
      'SECURITY_INCIDENT_PROCEDURES',
      'CONTINGENCY_PLAN',
      'EVALUATION',
      'UNIQUE_USER_IDENTIFICATION',
      'EMERGENCY_ACCESS_PROCEDURES',
      'AUTOMATIC_LOGOFF',
      'ENCRYPTION_DECRYPTION'
    ];

    requiredSafeguards.forEach(safeguard => {
      const safeguardFinding = complianceReport.findings.find(f => f.safeguard === safeguard);
      expect(safeguardFinding).toBeDefined();
      expect(safeguardFinding?.compliant).toBe(true);
    });

    console.log('HIPAA Compliance Report Generated:', {
      reportId: complianceReport.reportId,
      overallScore: `${complianceReport.overallComplianceScore}%`,
      totalFindings: complianceReport.findings.length,
      criticalIssues: complianceReport.findings.filter(f => f.severity === 'CRITICAL').length,
      recommendations: complianceReport.recommendations.length
    });
  });
});