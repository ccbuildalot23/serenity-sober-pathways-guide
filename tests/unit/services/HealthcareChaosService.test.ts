/**
 * HealthcareChaosService Unit Tests
 * Comprehensive test suite for healthcare chaos engineering
 */

// Jest provides describe, beforeEach, afterEach, it, expect globally
import { healthcareChaosService, HealthcareChaosService } from '@/services/HealthcareChaosService';
import { enhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';
import { roiValidationService } from '@/services/ROIValidationService';

// Mock external dependencies
jest.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          gte: jest.fn().mockResolvedValue({ data: [], error: null })
        }))
      }))
    })),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user' } } })
    }
  }
}));

jest.mock('@/services/EnhancedSecurityAuditService', () => ({
  enhancedSecurityAuditService: {
    logSecurityEvent: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('@/services/ROIValidationService', () => ({
  roiValidationService: {
    getInstance: jest.fn(),
    validateProviderCalculations: jest.fn().mockResolvedValue({
      validationScore: 0.9,
      reimbursementAccuracy: 0.95
    })
  }
}));

describe('HealthcareChaosService', () => {
  let chaosService: HealthcareChaosService;

  beforeEach(() => {
    chaosService = HealthcareChaosService.getInstance();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Crisis Response Time Testing', () => {
    it('should test crisis response times within 250ms SLA', async () => {
      const result = await chaosService.testCrisisResponseTimes(10);

      expect(result).toBeDefined();
      expect(result.experimentId).toBe('crisis_response_time_test');
      expect(result.success).toBeDefined();
      expect(result.systemMetrics).toBeDefined();
      expect(result.patientImpact).toBeDefined();
      expect(result.recommendations).toBeDefined();
      
      // Verify audit logging
      expect(enhancedSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        'CHAOS_EXPERIMENT_STARTED',
        expect.objectContaining({
          experimentId: 'crisis_response_time_test',
          category: 'crisis_response'
        }),
        'high'
      );
    });

    it('should detect SLA violations when response time exceeds 250ms', async () => {
      // Mock slow response times
      const slowResponseSpy = jest.spyOn(chaosService as any, 'measureCrisisResponseTimes')
        .mockResolvedValue({
          averageResponseTime: 350,
          maxResponseTime: 500,
          minResponseTime: 200,
          slaViolations: 5,
          totalAlerts: 10
        });

      const result = await chaosService.testCrisisResponseTimes(10);

      expect(result.slaViolations).toHaveLength(2); // Average response time and violations count
      expect(result.slaViolations[0].metric).toBe('average_response_time');
      expect(result.slaViolations[0].actual).toBe(350);
      expect(result.slaViolations[0].expected).toBe(250);
      expect(result.success).toBe(false);

      slowResponseSpy.mockRestore();
    });

    it('should handle concurrent crisis alerts efficiently', async () => {
      const result = await chaosService.testCrisisResponseTimes(50);

      expect(result.patientImpact.affectedPatients).toBeDefined();
      expect(result.systemMetrics.responseTime).toBeDefined();
      expect(result.riskScore).toBeTypeOf('number');
    });

    it('should generate appropriate recommendations for slow response times', async () => {
      const slowResponseSpy = jest.spyOn(chaosService as any, 'measureCrisisResponseTimes')
        .mockResolvedValue({
          averageResponseTime: 400,
          slaViolations: 3
        });

      const result = await chaosService.testCrisisResponseTimes(10);

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].priority).toBe('critical');
      expect(result.recommendations[0].category).toBe('Performance');
      expect(result.recommendations[0].actionItems).toContain('Implement response time monitoring');

      slowResponseSpy.mockRestore();
    });
  });

  describe('Tenant Isolation Testing', () => {
    it('should validate tenant isolation security', async () => {
      const result = await chaosService.testTenantIsolation(5);

      expect(result).toBeDefined();
      expect(result.experimentId).toBe('tenant_isolation_test');
      expect(result.complianceViolations).toBeDefined();
      expect(result.systemMetrics).toBeDefined();

      // Verify compliance requirements
      expect(enhancedSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        'CHAOS_EXPERIMENT_STARTED',
        expect.objectContaining({
          experimentId: 'tenant_isolation_test',
          category: 'tenant_isolation'
        }),
        'high'
      );
    });

    it('should detect tenant isolation breaches', async () => {
      const isolationSpy = jest.spyOn(chaosService as any, 'performTenantIsolationTest')
        .mockResolvedValue({
          tenantA: 'test-tenant-a-0',
          tenantB: 'test-tenant-b-0',
          dataLeakage: true,
          crossTenantAccess: false,
          isolationScore: 0.5,
          violations: ['Data leakage detected']
        });

      const result = await chaosService.testTenantIsolation(1);

      expect(result.complianceViolations).toHaveLength(1);
      expect(result.complianceViolations[0].type).toBe('data_breach');
      expect(result.complianceViolations[0].severity).toBe('critical');
      expect(result.success).toBe(false);

      isolationSpy.mockRestore();
    });

    it('should test row level security enforcement', async () => {
      const rlsSpy = jest.spyOn(chaosService as any, 'testRowLevelSecurity')
        .mockResolvedValue({ enforced: true, violations: [] });

      const result = await chaosService.testTenantIsolation(3);

      expect(rlsSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);

      rlsSpy.mockRestore();
    });

    it('should generate security recommendations for isolation failures', async () => {
      const isolationSpy = jest.spyOn(chaosService as any, 'performTenantIsolationTest')
        .mockResolvedValue({
          dataLeakage: true,
          violations: ['Cross-tenant access detected']
        });

      const result = await chaosService.testTenantIsolation(1);

      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].priority).toBe('critical');
      expect(result.recommendations[0].category).toBe('Security');

      isolationSpy.mockRestore();
    });
  });

  describe('HIPAA Compliance Under Stress', () => {
    it('should validate HIPAA compliance under high load', async () => {
      const result = await chaosService.testHIPAAComplianceUnderStress(10);

      expect(result).toBeDefined();
      expect(result.experimentId).toBe('hipaa_stress_test');
      expect(result.complianceViolations).toBeDefined();
      
      // Verify HIPAA-specific compliance requirements
      expect(enhancedSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        'CHAOS_EXPERIMENT_STARTED',
        expect.objectContaining({
          category: 'hipaa_compliance'
        }),
        'medium'
      );
    });

    it('should detect encryption failures under stress', async () => {
      const encryptionSpy = jest.spyOn(chaosService as any, 'testEncryptionUnderStress')
        .mockResolvedValue({ maintained: false, errorRate: 0.05 });

      const result = await chaosService.testHIPAAComplianceUnderStress(15);

      expect(result.complianceViolations).toHaveLength(1);
      expect(result.complianceViolations[0].rule).toBe('HIPAA Encryption Requirements');
      expect(result.complianceViolations[0].severity).toBe('critical');
      expect(result.success).toBe(false);

      encryptionSpy.mockRestore();
    });

    it('should detect audit logging failures under load', async () => {
      const auditSpy = jest.spyOn(chaosService as any, 'testAuditLoggingUnderLoad')
        .mockResolvedValue({ complete: false, logLoss: 15 });

      const result = await chaosService.testHIPAAComplianceUnderStress(20);

      expect(result.complianceViolations).toHaveLength(1);
      expect(result.complianceViolations[0].rule).toBe('HIPAA Audit Controls');
      expect(result.complianceViolations[0].severity).toBe('high');

      auditSpy.mockRestore();
    });

    it('should test Business Associate Agreement compliance', async () => {
      const baaSpy = jest.spyOn(chaosService as any, 'testBAAComplianceUnderStress')
        .mockResolvedValue({ compliant: true, violations: [] });

      const result = await chaosService.testHIPAAComplianceUnderStress(10);

      expect(baaSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);

      baaSpy.mockRestore();
    });
  });

  describe('Concurrent Crisis Scenarios', () => {
    it('should handle multiple concurrent crisis alerts', async () => {
      const scenario = {
        crisisCount: 20,
        patientIds: Array.from({length: 20}, (_, i) => `patient-${i}`),
        severityLevels: Array.from({length: 20}, () => 'critical'),
        responseTimeRequirement: 250,
        concurrencyLevel: 5
      };

      const result = await chaosService.testConcurrentCrisisScenarios(scenario);

      expect(result).toBeDefined();
      expect(result.experimentId).toBe('concurrent_crisis_test');
      expect(result.patientImpact).toBeDefined();
      expect(result.dataConsistencyResults).toBeDefined();
    });

    it('should test crisis queue management under load', async () => {
      const queueSpy = jest.spyOn(chaosService as any, 'testCrisisQueueManagement')
        .mockResolvedValue({ queueProcessed: 50, averageWaitTime: 100 });

      const scenario = {
        crisisCount: 50,
        patientIds: Array.from({length: 50}, (_, i) => `patient-${i}`),
        severityLevels: Array.from({length: 50}, () => 'critical'),
        responseTimeRequirement: 250,
        concurrencyLevel: 10
      };

      const result = await chaosService.testConcurrentCrisisScenarios(scenario);

      expect(queueSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);

      queueSpy.mockRestore();
    });

    it('should test escalation load balancing', async () => {
      const escalationSpy = jest.spyOn(chaosService as any, 'testEscalationLoadBalancing')
        .mockResolvedValue({ loadBalanced: true, evenDistribution: true });

      const scenario = {
        crisisCount: 30,
        patientIds: Array.from({length: 30}, (_, i) => `patient-${i}`),
        severityLevels: Array.from({length: 30}, () => 'high'),
        responseTimeRequirement: 250,
        concurrencyLevel: 6
      };

      const result = await chaosService.testConcurrentCrisisScenarios(scenario);

      expect(escalationSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);

      escalationSpy.mockRestore();
    });
  });

  describe('Automatic Rollback Mechanisms', () => {
    it('should test database rollback functionality', async () => {
      const result = await chaosService.testAutomaticRollbackMechanisms();

      expect(result).toBeDefined();
      expect(result.experimentId).toBe('rollback_mechanism_test');
      expect(result.rollbackResults).toBeDefined();
      expect(result.dataConsistencyResults).toBeDefined();
    });

    it('should verify rollback data integrity', async () => {
      const result = await chaosService.testAutomaticRollbackMechanisms();

      expect(result.rollbackResults).toHaveLength(3); // Database, application, configuration
      expect(result.rollbackResults.every(r => r.success)).toBe(true);
      expect(result.rollbackResults.every(r => r.dataIntegrityMaintained)).toBe(true);
    });

    it('should test automatic rollback triggers', async () => {
      const dbRollbackSpy = jest.spyOn(chaosService as any, 'testDatabaseRollback')
        .mockResolvedValue({
          triggered: true,
          triggerCondition: 'database_error',
          rollbackTime: 3000,
          success: true,
          automaticRollback: true,
          dataIntegrityMaintained: true
        });

      const result = await chaosService.testAutomaticRollbackMechanisms();

      expect(dbRollbackSpy).toHaveBeenCalled();
      expect(result.rollbackResults[0].triggered).toBe(true);
      expect(result.rollbackResults[0].automaticRollback).toBe(true);

      dbRollbackSpy.mockRestore();
    });
  });

  describe('ROI Validation Under Load', () => {
    it('should validate ROI calculations under high load', async () => {
      const result = await chaosService.testROICalculationsUnderLoad(20);

      expect(result).toBeDefined();
      expect(result.experimentId).toBe('roi_validation_load_test');
      expect(result.systemMetrics).toBeDefined();
    });

    it('should detect calculation accuracy issues under load', async () => {
      const accuracySpy = jest.spyOn(chaosService as any, 'testROICalculationAccuracy')
        .mockResolvedValue({ errorRate: 0.02, calculationsCompleted: 200 });

      const result = await chaosService.testROICalculationsUnderLoad(10);

      expect(result.slaViolations).toHaveLength(1);
      expect(result.slaViolations[0].metric).toBe('calculation_accuracy');
      expect(result.success).toBe(false);

      accuracySpy.mockRestore();
    });

    it('should test provider validation under stress', async () => {
      const validationSpy = jest.spyOn(chaosService as any, 'testProviderValidationUnderStress')
        .mockResolvedValue({ validationsCompleted: 50, errorRate: 0.001 });

      const result = await chaosService.testROICalculationsUnderLoad(10);

      expect(validationSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);

      validationSpy.mockRestore();
    });
  });

  describe('Data Consistency During Chaos', () => {
    it('should monitor data consistency during chaos scenarios', async () => {
      const result = await chaosService.testDataConsistencyDuringChaos();

      expect(result).toBeDefined();
      expect(result.experimentId).toBe('data_consistency_chaos_test');
      expect(result.dataConsistencyResults).toBeDefined();
    });

    it('should detect data corruption during chaos', async () => {
      const consistencySpy = jest.spyOn(chaosService as any, 'monitorDataConsistency')
        .mockResolvedValue([{
          table: 'patient_data',
          recordsChecked: 5000,
          inconsistencies: 5,
          dataLoss: false,
          corruptionDetected: true,
          auditTrailIntact: false
        }]);

      const result = await chaosService.testDataConsistencyDuringChaos();

      expect(result.success).toBe(false);
      expect(result.dataConsistencyResults[0].corruptionDetected).toBe(true);

      consistencySpy.mockRestore();
    });

    it('should test transaction integrity during failures', async () => {
      const transactionSpy = jest.spyOn(chaosService as any, 'testTransactionIntegrity')
        .mockResolvedValue({ transactionsChecked: 1000, rollbacksSuccessful: 1000 });

      const result = await chaosService.testDataConsistencyDuringChaos();

      expect(transactionSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);

      transactionSpy.mockRestore();
    });
  });

  describe('Healthcare-Specific Scenarios', () => {
    it('should simulate mass casualty events', async () => {
      const massEvent = {
        eventType: 'pandemic_surge' as const,
        affectedPatients: 1000,
        criticalPatients: 100,
        expectedLoadIncrease: 10,
        duration: 300000
      };

      const result = await chaosService.testHealthcareSpecificScenarios(massEvent);

      expect(result).toBeDefined();
      expect(result.experimentId).toBe('healthcare_specific_chaos_test');
      expect(result.patientImpact).toBeDefined();
    });

    it('should test system scaling under extreme load', async () => {
      const scalingSpy = jest.spyOn(chaosService as any, 'testSystemScalingUnderLoad')
        .mockResolvedValue({ success: true, scaledCapacity: 10, responseTime: 180 });

      const massEvent = {
        eventType: 'natural_disaster' as const,
        affectedPatients: 500,
        criticalPatients: 50,
        expectedLoadIncrease: 5,
        duration: 180000
      };

      const result = await chaosService.testHealthcareSpecificScenarios(massEvent);

      expect(scalingSpy).toHaveBeenCalledWith(5);
      expect(result.success).toBe(true);

      scalingSpy.mockRestore();
    });

    it('should test crisis triage during mass events', async () => {
      const triageSpy = jest.spyOn(chaosService as any, 'testCrisisTriageDuringMassEvent')
        .mockResolvedValue({ triageSuccess: true, criticalPatientsProcessed: 75 });

      const massEvent = {
        eventType: 'mass_shooting' as const,
        affectedPatients: 200,
        criticalPatients: 75,
        expectedLoadIncrease: 3,
        duration: 120000
      };

      const result = await chaosService.testHealthcareSpecificScenarios(massEvent);

      expect(triageSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);

      triageSpy.mockRestore();
    });

    it('should test emergency communication systems', async () => {
      const communicationSpy = jest.spyOn(chaosService as any, 'testEmergencyCommunicationSystems')
        .mockResolvedValue({ success: true, notificationsSent: 800 });

      const massEvent = {
        eventType: 'cyber_attack' as const,
        affectedPatients: 1000,
        criticalPatients: 200,
        expectedLoadIncrease: 8,
        duration: 240000
      };

      const result = await chaosService.testHealthcareSpecificScenarios(massEvent);

      expect(communicationSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);

      communicationSpy.mockRestore();
    });
  });

  describe('Comprehensive Test Suite', () => {
    it('should run comprehensive chaos test suite', async () => {
      // Mock all test methods to return success for comprehensive test
      const mockResults = {
        success: true,
        riskScore: 0.2,
        slaViolations: [],
        complianceViolations: [],
        recommendations: []
      };

      jest.spyOn(chaosService, 'testCrisisResponseTimes').mockResolvedValue(mockResults as any);
      jest.spyOn(chaosService, 'testTenantIsolation').mockResolvedValue(mockResults as any);
      jest.spyOn(chaosService, 'testHIPAAComplianceUnderStress').mockResolvedValue(mockResults as any);
      jest.spyOn(chaosService, 'testConcurrentCrisisScenarios').mockResolvedValue(mockResults as any);
      jest.spyOn(chaosService, 'testAutomaticRollbackMechanisms').mockResolvedValue(mockResults as any);
      jest.spyOn(chaosService, 'testROICalculationsUnderLoad').mockResolvedValue(mockResults as any);
      jest.spyOn(chaosService, 'testDataConsistencyDuringChaos').mockResolvedValue(mockResults as any);
      jest.spyOn(chaosService, 'testHealthcareSpecificScenarios').mockResolvedValue(mockResults as any);

      const result = await chaosService.runComprehensiveChaosTestSuite();

      expect(result).toBeDefined();
      expect(result.totalExperiments).toBe(8);
      expect(result.passed).toBe(8);
      expect(result.failed).toBe(0);
      expect(result.criticalFailures).toBe(0);
      expect(result.overallResilience).toBe(100);
      expect(result.complianceScore).toBe(100);
      expect(result.recommendations).toBeDefined();
    });

    it('should handle mixed success/failure results', async () => {
      const successResult = {
        success: true,
        riskScore: 0.1,
        slaViolations: [],
        complianceViolations: [],
        recommendations: []
      };

      const failureResult = {
        success: false,
        riskScore: 0.9,
        slaViolations: [{ metric: 'test', expected: 1, actual: 2, severity: 'critical', duration: 1000, impact: 'test' }],
        complianceViolations: [{ rule: 'test', type: 'test', description: 'test', severity: 'critical', remediation: 'test', regulatory_impact: 'test' }],
        recommendations: [{ priority: 'critical', category: 'test', description: 'test', actionItems: [], estimatedImpact: 'test' }]
      };

      jest.spyOn(chaosService, 'testCrisisResponseTimes').mockResolvedValue(successResult as any);
      jest.spyOn(chaosService, 'testTenantIsolation').mockResolvedValue(failureResult as any);
      jest.spyOn(chaosService, 'testHIPAAComplianceUnderStress').mockResolvedValue(successResult as any);
      jest.spyOn(chaosService, 'testConcurrentCrisisScenarios').mockResolvedValue(failureResult as any);
      jest.spyOn(chaosService, 'testAutomaticRollbackMechanisms').mockResolvedValue(successResult as any);
      jest.spyOn(chaosService, 'testROICalculationsUnderLoad').mockResolvedValue(successResult as any);
      jest.spyOn(chaosService, 'testDataConsistencyDuringChaos').mockResolvedValue(failureResult as any);
      jest.spyOn(chaosService, 'testHealthcareSpecificScenarios').mockResolvedValue(failureResult as any);

      const result = await chaosService.runComprehensiveChaosTestSuite();

      expect(result.totalExperiments).toBe(8);
      expect(result.passed).toBe(4);
      expect(result.failed).toBe(4);
      expect(result.criticalFailures).toBe(3); // High risk failures
      expect(result.overallResilience).toBe(50);
      expect(result.complianceScore).toBe(40); // 2 out of 5 compliance tests passed
    });

    it('should aggregate recommendations properly', async () => {
      const recommendation1 = {
        priority: 'critical' as const,
        category: 'Performance',
        description: 'Optimize crisis response',
        actionItems: ['Add monitoring'],
        estimatedImpact: 'Reduce response time'
      };

      const recommendation2 = {
        priority: 'high' as const,
        category: 'Security',
        description: 'Strengthen isolation',
        actionItems: ['Review policies'],
        estimatedImpact: 'Eliminate breaches'
      };

      const resultWithRecs = {
        success: false,
        riskScore: 0.3,
        slaViolations: [],
        complianceViolations: [],
        recommendations: [recommendation1, recommendation2]
      };

      jest.spyOn(chaosService, 'testCrisisResponseTimes').mockResolvedValue(resultWithRecs as any);
      jest.spyOn(chaosService, 'testTenantIsolation').mockResolvedValue(resultWithRecs as any);
      jest.spyOn(chaosService, 'testHIPAAComplianceUnderStress').mockResolvedValue({ ...resultWithRecs, success: true } as any);
      jest.spyOn(chaosService, 'testConcurrentCrisisScenarios').mockResolvedValue({ ...resultWithRecs, success: true } as any);
      jest.spyOn(chaosService, 'testAutomaticRollbackMechanisms').mockResolvedValue({ ...resultWithRecs, success: true } as any);
      jest.spyOn(chaosService, 'testROICalculationsUnderLoad').mockResolvedValue({ ...resultWithRecs, success: true } as any);
      jest.spyOn(chaosService, 'testDataConsistencyDuringChaos').mockResolvedValue({ ...resultWithRecs, success: true } as any);
      jest.spyOn(chaosService, 'testHealthcareSpecificScenarios').mockResolvedValue({ ...resultWithRecs, success: true } as any);

      const result = await chaosService.runComprehensiveChaosTestSuite();

      expect(result.recommendations).toHaveLength(2);
      expect(result.recommendations[0].priority).toBe('critical'); // Higher priority first
      expect(result.recommendations[1].priority).toBe('high');
    });
  });

  describe('Risk Score Calculation', () => {
    it('should calculate risk score based on various factors', async () => {
      const highRiskResult = {
        slaViolations: [
          { metric: 'response_time', expected: 250, actual: 500, severity: 'critical', duration: 60000, impact: 'High impact' },
          { metric: 'availability', expected: 99.9, actual: 95.0, severity: 'high', duration: 30000, impact: 'Medium impact' }
        ],
        complianceViolations: [
          { rule: 'HIPAA Encryption', type: 'encryption_failure', description: 'Encryption failed', severity: 'critical', remediation: 'Fix encryption', regulatory_impact: 'Major violation' }
        ],
        patientImpact: {
          affectedPatients: 10,
          criticalAlertsDelayed: 5,
          crisisResponseDelayed: true,
          dataAccessInterrupted: true,
          clinicalWorkflowDisrupted: false,
          emergencyContactsNotified: true
        },
        dataConsistencyResults: [
          { table: 'patient_data', recordsChecked: 1000, inconsistencies: 0, dataLoss: true, corruptionDetected: false, auditTrailIntact: true }
        ]
      };

      const riskScore = (chaosService as any).calculateRiskScore(highRiskResult);

      expect(riskScore).toBeGreaterThan(0.8); // High risk scenario
      expect(riskScore).toBeLessThanOrEqual(1.0);
    });

    it('should calculate low risk score for good results', async () => {
      const lowRiskResult = {
        slaViolations: [],
        complianceViolations: [],
        patientImpact: {
          affectedPatients: 0,
          criticalAlertsDelayed: 0,
          crisisResponseDelayed: false,
          dataAccessInterrupted: false,
          clinicalWorkflowDisrupted: false,
          emergencyContactsNotified: true
        },
        dataConsistencyResults: [
          { table: 'patient_data', recordsChecked: 1000, inconsistencies: 0, dataLoss: false, corruptionDetected: false, auditTrailIntact: true }
        ]
      };

      const riskScore = (chaosService as any).calculateRiskScore(lowRiskResult);

      expect(riskScore).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle experiment errors gracefully', async () => {
      const processCrisisAlertSpy = jest.spyOn(chaosService as any, 'processCrisisAlert')
        .mockRejectedValue(new Error('Crisis processing failed'));

      const result = await chaosService.testCrisisResponseTimes(5);

      expect(result.success).toBe(false);
      expect(enhancedSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        'CHAOS_EXPERIMENT_ERROR',
        expect.objectContaining({
          experimentId: 'crisis_response_time_test',
          error: 'Crisis processing failed'
        }),
        'high'
      );

      processCrisisAlertSpy.mockRestore();
    });

    it('should clean up resources after experiments', async () => {
      const cleanupSpy = jest.spyOn(chaosService as any, 'cleanupExperiment');

      await chaosService.testCrisisResponseTimes(3);

      expect(cleanupSpy).toHaveBeenCalled();
      expect(enhancedSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        'CHAOS_EXPERIMENT_CLEANUP',
        expect.objectContaining({
          experimentId: 'crisis_response_time_test'
        }),
        'low'
      );

      cleanupSpy.mockRestore();
    });

    it('should handle storage failures gracefully', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const insertSpy = jest.mocked(supabase.from).mockReturnValue({
        insert: jest.fn().mockRejectedValue(new Error('Storage failed'))
      } as any);

      const result = await chaosService.testCrisisResponseTimes(1);

      expect(result).toBeDefined();
      expect(enhancedSecurityAuditService.logSecurityEvent).toHaveBeenCalledWith(
        'CHAOS_RESULT_STORAGE_FAILED',
        expect.objectContaining({
          experimentId: 'crisis_response_time_test',
          error: 'Storage failed'
        }),
        'medium'
      );

      insertSpy.mockRestore();
    });
  });

  describe('Integration Points', () => {
    it('should integrate with security audit service', async () => {
      await chaosService.testCrisisResponseTimes(1);

      expect(enhancedSecurityAuditService.logSecurityEvent).toHaveBeenCalledTimes(3); // Start, cleanup, and potentially others
    });

    it('should store results in database', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const insertSpy = jest.mocked(supabase.from).mockReturnValue({
        insert: jest.fn().mockResolvedValue({ data: null, error: null })
      } as any);

      await chaosService.testCrisisResponseTimes(1);

      expect(supabase.from).toHaveBeenCalledWith('chaos_experiment_results');
      expect(insertSpy().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          experiment_id: 'crisis_response_time_test',
          success: expect.any(Boolean),
          start_time: expect.any(String),
          end_time: expect.any(String)
        })
      );

      insertSpy.mockRestore();
    });
  });

  describe('Healthcare-Specific Validations', () => {
    it('should enforce 250ms crisis response SLA', async () => {
      const result = await chaosService.testCrisisResponseTimes(1);
      
      // Verify SLA requirement is enforced
      expect(result.systemMetrics.responseTime).toBeDefined();
      if (result.systemMetrics.responseTime > 250) {
        expect(result.slaViolations.some(v => v.metric.includes('response_time'))).toBe(true);
      }
    });

    it('should validate HIPAA compliance requirements', async () => {
      const result = await chaosService.testHIPAAComplianceUnderStress(5);
      
      // Verify HIPAA-specific validations
      expect(result.complianceViolations).toBeDefined();
      result.complianceViolations.forEach(violation => {
        expect(['hipaa', 'soc2', 'gdpr', 'hitech']).toContain(
          expect.stringContaining(violation.type.toLowerCase())
        );
      });
    });

    it('should assess patient safety impact', async () => {
      const result = await chaosService.testCrisisResponseTimes(10);
      
      expect(result.patientImpact).toBeDefined();
      expect(result.patientImpact.affectedPatients).toBeTypeOf('number');
      expect(result.patientImpact.crisisResponseDelayed).toBeTypeOf('boolean');
      expect(result.patientImpact.emergencyContactsNotified).toBeTypeOf('boolean');
    });
  });
});