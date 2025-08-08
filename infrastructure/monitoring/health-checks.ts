/**
 * HIPAA-Compliant Health Check System
 * Monitors system health after security patches and RLS changes
 */

import { supabase } from '@/integrations/supabase/client';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';

interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'critical';
  timestamp: string;
  duration_ms: number;
  details?: any;
  error?: string;
}

interface SystemHealthReport {
  overall_status: 'healthy' | 'degraded' | 'critical';
  checks: Record<string, HealthCheckResult>;
  timestamp: string;
  uptime_percentage: number;
  recommendations: string[];
}

export class HealthCheckService {
  private static instance: HealthCheckService;
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60000; // 1 minute
  private readonly alertThresholds = {
    database_response_time_ms: 1000,
    authentication_success_rate: 0.95,
    api_error_rate: 0.01,
    rls_policy_check_time_ms: 500
  };

  static getInstance(): HealthCheckService {
    if (!this.instance) {
      this.instance = new HealthCheckService();
    }
    return this.instance;
  }

  async startMonitoring(): Promise<void> {
    console.log('Starting HIPAA health monitoring...');
    
    // Initial health check
    await this.performHealthCheck();
    
    // Schedule regular checks
    this.checkInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Health check failed:', error);
        await EnhancedSecurityAuditService.getInstance().logSecurityEvent(
          'HEALTH_CHECK_FAILED',
          { error: error instanceof Error ? error.message : 'Unknown error' },
          'high'
        );
      }
    }, this.CHECK_INTERVAL_MS);
  }

  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  async performHealthCheck(): Promise<SystemHealthReport> {
    const startTime = Date.now();
    const checks: Record<string, HealthCheckResult> = {};

    try {
      // Database connectivity and performance
      checks.database = await this.checkDatabaseHealth();
      
      // RLS policy verification after security patches
      checks.rls_policies = await this.checkRLSPolicies();
      
      // Authentication system health
      checks.authentication = await this.checkAuthenticationHealth();
      
      // API response times and error rates
      checks.api_performance = await this.checkAPIPerformance();
      
      // Security audit system
      checks.audit_system = await this.checkAuditSystemHealth();
      
      // User session validation
      checks.session_security = await this.checkSessionSecurity();

      // Determine overall status
      const criticalChecks = Object.values(checks).filter(c => c.status === 'critical');
      const warningChecks = Object.values(checks).filter(c => c.status === 'warning');
      
      let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
      if (criticalChecks.length > 0) {
        overallStatus = 'critical';
      } else if (warningChecks.length > 0) {
        overallStatus = 'degraded';
      }

      // Calculate uptime (simplified - in production would use historical data)
      const healthyChecks = Object.values(checks).filter(c => c.status === 'healthy');
      const uptimePercentage = healthyChecks.length / Object.values(checks).length;

      const recommendations = this.generateRecommendations(checks);

      const report: SystemHealthReport = {
        overall_status: overallStatus,
        checks,
        timestamp: new Date().toISOString(),
        uptime_percentage: uptimePercentage,
        recommendations
      };

      // Log health check results
      await EnhancedSecurityAuditService.getInstance().logSecurityEvent(
        'HEALTH_CHECK_COMPLETED',
        {
          overall_status: overallStatus,
          check_count: Object.keys(checks).length,
          duration_ms: Date.now() - startTime,
          uptime_percentage: uptimePercentage
        },
        overallStatus === 'critical' ? 'high' : 'low'
      );

      return report;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await EnhancedSecurityAuditService.getInstance().logSecurityEvent(
        'HEALTH_CHECK_ERROR',
        { error: errorMessage },
        'critical'
      );

      return {
        overall_status: 'critical',
        checks: {
          system_error: {
            status: 'critical',
            timestamp: new Date().toISOString(),
            duration_ms: Date.now() - startTime,
            error: errorMessage
          }
        },
        timestamp: new Date().toISOString(),
        uptime_percentage: 0,
        recommendations: ['System experiencing critical errors - immediate attention required']
      };
    }
  }

  private async checkDatabaseHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Test basic connectivity
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
        .maybeSingle();

      const duration = Date.now() - startTime;

      if (error) {
        return {
          status: 'critical',
          timestamp: new Date().toISOString(),
          duration_ms: duration,
          error: error.message
        };
      }

      const status = duration > this.alertThresholds.database_response_time_ms ? 'warning' : 'healthy';

      return {
        status,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        details: { response_time_ms: duration }
      };
    } catch (error) {
      return {
        status: 'critical',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Database check failed'
      };
    }
  }

  private async checkRLSPolicies(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Test RLS policies are working correctly after security patches
      const { data: currentUser } = await supabase.auth.getUser();
      
      if (!currentUser.user) {
        return {
          status: 'warning',
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          details: { message: 'No authenticated user for RLS testing' }
        };
      }

      // Test user_roles RLS (critical after the security fix)
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.user.id);

      if (rolesError) {
        return {
          status: 'critical',
          timestamp: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          error: `RLS policy check failed: ${rolesError.message}`
        };
      }

      // Test security_audit_logs RLS
      const { data: auditLogs, error: auditError } = await supabase
        .from('security_audit_logs')
        .select('id')
        .eq('user_id', currentUser.user.id)
        .limit(1);

      const duration = Date.now() - startTime;
      const status = duration > this.alertThresholds.rls_policy_check_time_ms ? 'warning' : 'healthy';

      return {
        status: auditError ? 'warning' : status,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        details: {
          user_roles_accessible: !rolesError,
          audit_logs_accessible: !auditError,
          rls_response_time_ms: duration
        }
      };
    } catch (error) {
      return {
        status: 'critical',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'RLS policy check failed'
      };
    }
  }

  private async checkAuthenticationHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Get recent authentication statistics
      const auditService = EnhancedSecurityAuditService.getInstance();
      const failedLogins = await auditService.getFailedLoginAttempts(1); // Last hour
      
      const { data: recentSessions } = await supabase
        .from('security_audit_logs')
        .select('event_type')
        .in('event_type', ['AUTH_SUCCESS', 'AUTH_FAILURE'])
        .gte('timestamp', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      const totalAttempts = recentSessions?.length || 0;
      const successfulLogins = recentSessions?.filter(s => s.event_type === 'AUTH_SUCCESS').length || 0;
      const successRate = totalAttempts > 0 ? successfulLogins / totalAttempts : 1;

      const duration = Date.now() - startTime;

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (successRate < this.alertThresholds.authentication_success_rate) {
        status = 'warning';
      }
      if (failedLogins.length > 20) { // More than 20 failed logins in an hour
        status = 'critical';
      }

      return {
        status,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        details: {
          success_rate: successRate,
          total_attempts_last_hour: totalAttempts,
          failed_logins_last_hour: failedLogins.length,
          authentication_health: successRate >= this.alertThresholds.authentication_success_rate
        }
      };
    } catch (error) {
      return {
        status: 'warning',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Auth health check failed'
      };
    }
  }

  private async checkAPIPerformance(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      // Test multiple API endpoints
      const endpoints = [
        { name: 'profiles', table: 'profiles' },
        { name: 'security_audit_logs', table: 'security_audit_logs' },
        { name: 'user_roles', table: 'user_roles' }
      ];

      const results = await Promise.allSettled(
        endpoints.map(async (endpoint) => {
          const testStart = Date.now();
          const { error } = await supabase
            .from(endpoint.table)
            .select('id')
            .limit(1);
          
          return {
            endpoint: endpoint.name,
            response_time_ms: Date.now() - testStart,
            error: error?.message
          };
        })
      );

      const successfulTests = results.filter(r => r.status === 'fulfilled').length;
      const errorRate = 1 - (successfulTests / results.length);
      const avgResponseTime = results
        .filter(r => r.status === 'fulfilled')
        .reduce((sum, r) => sum + (r.value as any).response_time_ms, 0) / successfulTests;

      const duration = Date.now() - startTime;

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      if (errorRate > this.alertThresholds.api_error_rate) {
        status = 'warning';
      }
      if (errorRate > 0.1) { // More than 10% error rate
        status = 'critical';
      }

      return {
        status,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        details: {
          error_rate: errorRate,
          average_response_time_ms: avgResponseTime,
          endpoints_tested: endpoints.length,
          successful_tests: successfulTests
        }
      };
    } catch (error) {
      return {
        status: 'critical',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'API performance check failed'
      };
    }
  }

  private async checkAuditSystemHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const auditService = EnhancedSecurityAuditService.getInstance();
      
      // Test audit logging functionality
      await auditService.logSecurityEvent(
        'HEALTH_CHECK_AUDIT_TEST',
        { test: true, timestamp: new Date().toISOString() },
        'low'
      );

      // Verify we can generate security reports
      const report = await auditService.generateSecurityReport();

      const duration = Date.now() - startTime;

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        details: {
          audit_logging_functional: true,
          report_generation_functional: !!report,
          total_events_in_report: report.summary?.total_events || 0
        }
      };
    } catch (error) {
      return {
        status: 'critical',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Audit system check failed'
      };
    }
  }

  private async checkSessionSecurity(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      const { data: session } = await supabase.auth.getSession();

      const duration = Date.now() - startTime;

      let status: 'healthy' | 'warning' | 'critical' = 'healthy';
      const details: any = {
        user_authenticated: !!currentUser.user,
        session_valid: !!session.session,
        session_expires_at: session.session?.expires_at
      };

      if (session.session) {
        const expiresAt = new Date(session.session.expires_at! * 1000);
        const timeUntilExpiry = expiresAt.getTime() - Date.now();
        const hoursUntilExpiry = timeUntilExpiry / (1000 * 60 * 60);

        details.hours_until_expiry = hoursUntilExpiry;

        if (hoursUntilExpiry < 1) {
          status = 'warning';
        }
      }

      return {
        status,
        timestamp: new Date().toISOString(),
        duration_ms: duration,
        details
      };
    } catch (error) {
      return {
        status: 'warning',
        timestamp: new Date().toISOString(),
        duration_ms: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Session security check failed'
      };
    }
  }

  private generateRecommendations(checks: Record<string, HealthCheckResult>): string[] {
    const recommendations: string[] = [];

    Object.entries(checks).forEach(([checkName, result]) => {
      if (result.status === 'critical') {
        recommendations.push(`CRITICAL: ${checkName} requires immediate attention - ${result.error || 'Unknown issue'}`);
      } else if (result.status === 'warning') {
        switch (checkName) {
          case 'database':
            recommendations.push('Database response time is elevated - consider optimization');
            break;
          case 'authentication':
            recommendations.push('Authentication success rate is below threshold - investigate failed logins');
            break;
          case 'api_performance':
            recommendations.push('API performance is degraded - check server resources');
            break;
          case 'rls_policies':
            recommendations.push('RLS policy response time is elevated - monitor database performance');
            break;
          case 'session_security':
            recommendations.push('User session is expiring soon - consider refreshing');
            break;
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('All systems operating normally');
    }

    return recommendations;
  }

  async getHealthHistory(hours: number = 24): Promise<any[]> {
    try {
      const timeframe = new Date();
      timeframe.setHours(timeframe.getHours() - hours);

      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('*')
        .eq('event_type', 'HEALTH_CHECK_COMPLETED')
        .gte('timestamp', timeframe.toISOString())
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Failed to get health history:', error);
      return [];
    }
  }
}

export const healthCheckService = HealthCheckService.getInstance();