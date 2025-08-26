/**
 * Security Compliance Hook
 * Provides real-time security monitoring and compliance status
 */

import { useState, useEffect } from 'react';
import { enhancedSecurityManager, SecurityMetrics } from '@/services/enhancedSecurityManager';
import { securityAuditService } from '@/services/securityAuditService';
import logger from '@/services/loggerService';

export interface ComplianceStatus {
  overall: 'compliant' | 'warning' | 'critical';
  score: number;
  lastCheck: string;
  issues: string[];
  recommendations: string[];
}

export const useSecurityCompliance = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkCompliance = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get security metrics
      const currentMetrics = enhancedSecurityManager.getSecurityMetrics();
      setMetrics(currentMetrics);

      // Run security audit
      const auditReport = await securityAuditService.runSecurityAudit();
      
      // Calculate overall compliance status
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check for critical issues
      if (currentMetrics.violationsBySeverity.critical > 0) {
        issues.push(`${currentMetrics.violationsBySeverity.critical} critical security violations`);
        recommendations.push('Address critical violations immediately');
      }

      // Check audit results
      const failedCriticalTests = auditReport.tests.filter(
        t => t.status === 'failed' && t.severity === 'critical'
      );
      
      if (failedCriticalTests.length > 0) {
        issues.push(`${failedCriticalTests.length} critical security tests failed`);
        recommendations.push('Fix critical security test failures');
      }

      // Check security score
      if (currentMetrics.securityScore < 70) {
        issues.push('Security score below minimum threshold');
        recommendations.push('Implement additional security measures');
      }

      // Check encryption status
      if (currentMetrics.encryptionStatus !== 'enabled') {
        issues.push('Encryption service not fully enabled');
        recommendations.push('Verify and fix encryption configuration');
      }

      // Determine overall status
      let overallStatus: 'compliant' | 'warning' | 'critical';
      if (failedCriticalTests.length > 0 || currentMetrics.violationsBySeverity.critical > 0) {
        overallStatus = 'critical';
      } else if (issues.length > 0 || currentMetrics.securityScore < 85) {
        overallStatus = 'warning';
      } else {
        overallStatus = 'compliant';
      }

      setComplianceStatus({
        overall: overallStatus,
        score: currentMetrics.securityScore,
        lastCheck: new Date().toISOString(),
        issues,
        recommendations: [...recommendations, ...auditReport.recommendations]
      });

      logger.info('Security compliance check completed', {
        component: 'useSecurityCompliance',
        status: overallStatus,
        score: currentMetrics.securityScore
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Security compliance check failed';
      setError(errorMessage);
      logger.error('Security compliance check failed', err, { component: 'useSecurityCompliance' });
    } finally {
      setIsLoading(false);
    }
  };

  const recordSecurityViolation = (violation: {
    type: 'authentication' | 'authorization' | 'data_access' | 'input_validation' | 'session' | 'encryption';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    additionalData?: Record<string, any>;
  }) => {
    enhancedSecurityManager.recordViolation({
      id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: violation.type,
      severity: violation.severity,
      description: violation.description,
      timestamp: new Date().toISOString(),
      additionalData: violation.additionalData
    });

    // Refresh compliance status after recording violation
    checkCompliance();
  };

  const validateUserAccess = async (userId: string, resource: string): Promise<boolean> => {
    return enhancedSecurityManager.validateUserAccess(userId, resource);
  };

  const recordLoginAttempt = (identifier: string, success: boolean): boolean => {
    return enhancedSecurityManager.recordLoginAttempt(identifier, success);
  };

  const generateComplianceReport = async () => {
    return enhancedSecurityManager.generateComplianceReport();
  };

  // Initialize compliance check on mount
  useEffect(() => {
    checkCompliance();

    // Set up periodic compliance checks (every 30 minutes)
    const interval = setInterval(checkCompliance, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Listen for security events
  useEffect(() => {
    const handleSecurityEvent = (event: CustomEvent) => {
      logger.info('Security event detected', {
        component: 'useSecurityCompliance',
        eventType: event.type,
        eventDetail: event.detail
      });
      
      // Refresh compliance status
      checkCompliance();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('securityViolation', handleSecurityEvent as EventListener);
      window.addEventListener('sessionWarning', handleSecurityEvent as EventListener);

      return () => {
        window.removeEventListener('securityViolation', handleSecurityEvent as EventListener);
        window.removeEventListener('sessionWarning', handleSecurityEvent as EventListener);
      };
    }
  }, []);

  return {
    metrics,
    complianceStatus,
    isLoading,
    error,
    checkCompliance,
    recordSecurityViolation,
    validateUserAccess,
    recordLoginAttempt,
    generateComplianceReport,
    // Convenience getters
    isCompliant: complianceStatus?.overall === 'compliant',
    hasWarnings: complianceStatus?.overall === 'warning',
    hasCriticalIssues: complianceStatus?.overall === 'critical',
    securityScore: complianceStatus?.score || 0
  };
};