/**
 * Unit Tests for DeploymentValidationService
 * Validates deployment readiness checks and health monitoring
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { DeploymentValidationService } from '@/services/DeploymentValidationService';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
jest.mock('@/integrations/supabase/client');
jest.mock('@/services/SOC2ComplianceService');
jest.mock('@/services/AISafetyGuard');
jest.mock('@/services/PaymentGatewayService');
jest.mock('@/middleware/RolePermissionMiddleware');

describe('DeploymentValidationService', () => {
  let service: DeploymentValidationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = DeploymentValidationService.getInstance();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('runValidation', () => {
    it('should complete validation successfully when all checks pass', async () => {
      // Mock successful responses
      (supabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [{ id: 1 }],
            error: null
          })
        })
      });

      const report = await service.runValidation('production');

      expect(report).toBeDefined();
      expect(report.overallStatus).toBeDefined();
      expect(report.readinessScore).toBeGreaterThanOrEqual(0);
      expect(report.readinessScore).toBeLessThanOrEqual(100);
      expect(report.checks).toBeInstanceOf(Array);
    });

    it('should detect infrastructure issues', async () => {
      // Mock infrastructure failure
      (supabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockRejectedValue(new Error('Database connection failed'))
        })
      });

      const report = await service.runValidation('production');

      expect(report.overallStatus).toBe('not-ready');
      const infrastructureChecks = report.checks.filter(c => c.category === 'infrastructure');
      expect(infrastructureChecks.some(c => c.status === 'failed')).toBe(true);
    });

    it('should validate security configurations', async () => {
      const report = await service.runValidation('production');

      const securityChecks = report.checks.filter(c => c.category === 'security');
      expect(securityChecks.length).toBeGreaterThan(0);
      
      // Should check for critical security items
      const criticalSecurityChecks = ['encryption', 'authentication', 'authorization'];
      criticalSecurityChecks.forEach(checkName => {
        const check = securityChecks.find(c => 
          c.name.toLowerCase().includes(checkName)
        );
        expect(check).toBeDefined();
      });
    });

    it('should validate compliance requirements', async () => {
      const report = await service.runValidation('production');

      const complianceChecks = report.checks.filter(c => c.category === 'compliance');
      expect(complianceChecks.length).toBeGreaterThan(0);

      // Should check HIPAA and SOC-2
      const hipaaCheck = complianceChecks.find(c => c.name.includes('HIPAA'));
      const soc2Check = complianceChecks.find(c => c.name.includes('SOC-2'));
      
      expect(hipaaCheck).toBeDefined();
      expect(soc2Check).toBeDefined();
    });

    it('should calculate readiness score correctly', async () => {
      const report = await service.runValidation('production');

      const passedChecks = report.checks.filter(c => c.status === 'passed').length;
      const totalChecks = report.checks.length;
      const expectedScore = Math.round((passedChecks / totalChecks) * 100);

      expect(report.readinessScore).toBeCloseTo(expectedScore, 5);
    });

    it('should provide remediation suggestions for failures', async () => {
      // Force a failure
      (supabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockRejectedValue(new Error('Test failure'))
        })
      });

      const report = await service.runValidation('production');

      const failedChecks = report.checks.filter(c => c.status === 'failed');
      failedChecks.forEach(check => {
        expect(check.remediation).toBeDefined();
        expect(check.remediation).not.toBe('');
      });
    });

    it('should handle different environments', async () => {
      const environments = ['development', 'staging', 'production'];

      for (const env of environments) {
        const report = await service.runValidation(env);
        expect(report.environment).toBe(env);
        
        // Different thresholds for different environments
        if (env === 'production') {
          expect(report.checks.length).toBeGreaterThan(10);
        }
      }
    });
  });

  describe('startHealthMonitoring', () => {
    it('should start health monitoring successfully', async () => {
      const stopMonitoring = await service.startHealthMonitoring(5000);
      
      expect(stopMonitoring).toBeDefined();
      expect(typeof stopMonitoring).toBe('function');
      
      // Clean up
      stopMonitoring();
    });

    it('should detect health issues during monitoring', async () => {
      const healthCallback = jest.fn();
      
      // Start monitoring with callback
      const stopMonitoring = await service.startHealthMonitoring(1000, healthCallback);
      
      // Wait for at least one health check
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      expect(healthCallback).toHaveBeenCalled();
      
      // Clean up
      stopMonitoring();
    });
  });

  describe('getHealthStatus', () => {
    it('should return current health status', async () => {
      const health = await service.getHealthStatus();
      
      expect(health).toBeDefined();
      expect(health).toBeInstanceOf(Map);
      
      // Should have key services
      const expectedServices = ['database', 'api', 'storage'];
      expectedServices.forEach(service => {
        expect(health.has(service)).toBe(true);
      });
    });

    it('should include status details for each service', async () => {
      const health = await service.getHealthStatus();
      
      health.forEach((status, serviceName) => {
        expect(status).toHaveProperty('status');
        expect(['healthy', 'degraded', 'unhealthy']).toContain(status.status);
        expect(status).toHaveProperty('lastCheck');
        expect(status.lastCheck).toBeInstanceOf(Date);
      });
    });
  });

  describe('validateCriticalServices', () => {
    it('should validate crisis response time', async () => {
      const report = await service.runValidation('production');
      
      const crisisCheck = report.checks.find(c => 
        c.name.toLowerCase().includes('crisis') && 
        c.name.toLowerCase().includes('response')
      );
      
      expect(crisisCheck).toBeDefined();
      expect(crisisCheck?.severity).toBe('critical');
    });

    it('should validate payment gateway', async () => {
      const report = await service.runValidation('production');
      
      const paymentCheck = report.checks.find(c => 
        c.name.toLowerCase().includes('payment') || 
        c.name.toLowerCase().includes('stripe')
      );
      
      expect(paymentCheck).toBeDefined();
      expect(paymentCheck?.category).toBe('integration');
    });

    it('should validate AI safety integration', async () => {
      const report = await service.runValidation('production');
      
      const aiSafetyCheck = report.checks.find(c => 
        c.name.toLowerCase().includes('ai') && 
        c.name.toLowerCase().includes('safety')
      );
      
      expect(aiSafetyCheck).toBeDefined();
      expect(aiSafetyCheck?.status).toBeDefined();
    });
  });

  describe('generateReport', () => {
    it('should generate comprehensive validation report', async () => {
      const report = await service.runValidation('production');
      
      expect(report).toHaveProperty('id');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('version');
      expect(report).toHaveProperty('metrics');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('certifications');
    });

    it('should include certification status', async () => {
      const report = await service.runValidation('production');
      
      expect(report.certifications).toHaveProperty('hipaa');
      expect(report.certifications).toHaveProperty('soc2');
      expect(report.certifications).toHaveProperty('aiSafety');
      
      // All should be boolean
      expect(typeof report.certifications.hipaa).toBe('boolean');
      expect(typeof report.certifications.soc2).toBe('boolean');
      expect(typeof report.certifications.aiSafety).toBe('boolean');
    });

    it('should calculate metrics correctly', async () => {
      const report = await service.runValidation('production');
      
      const { metrics } = report;
      
      expect(metrics.totalChecks).toBe(report.checks.length);
      expect(metrics.passed).toBe(report.checks.filter(c => c.status === 'passed').length);
      expect(metrics.failed).toBe(report.checks.filter(c => c.status === 'failed').length);
      expect(metrics.warnings).toBe(report.checks.filter(c => c.status === 'warning').length);
      expect(metrics.criticalIssues).toBe(
        report.checks.filter(c => c.status === 'failed' && c.severity === 'critical').length
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle network timeouts gracefully', async () => {
      // Mock timeout
      (supabase.from as jest.Mock) = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn(() => new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 100)
          ))
        })
      });

      const report = await service.runValidation('production');
      
      expect(report).toBeDefined();
      expect(report.overallStatus).not.toBe('ready');
    });

    it('should handle partial service failures', async () => {
      let callCount = 0;
      (supabase.from as jest.Mock) = jest.fn().mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockImplementation(() => {
            callCount++;
            // Fail every other call
            if (callCount % 2 === 0) {
              return Promise.reject(new Error('Partial failure'));
            }
            return Promise.resolve({ data: [{ id: 1 }], error: null });
          })
        })
      }));

      const report = await service.runValidation('production');
      
      expect(report.overallStatus).toBe('needs-attention');
      expect(report.checks.some(c => c.status === 'passed')).toBe(true);
      expect(report.checks.some(c => c.status === 'failed')).toBe(true);
    });

    it('should enforce critical thresholds', async () => {
      const report = await service.runValidation('production');
      
      // If any critical check fails, overall should not be ready
      const hasCriticalFailure = report.checks.some(c => 
        c.severity === 'critical' && c.status === 'failed'
      );
      
      if (hasCriticalFailure) {
        expect(report.overallStatus).not.toBe('ready');
      }
    });
  });
});