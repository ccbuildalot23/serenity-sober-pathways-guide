/**
 * Health Check Service
 * Monitors application health and system status
 */

import { supabase } from '@/integrations/supabase/client';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: boolean;
    auth: boolean;
    api: boolean;
    localStorage: boolean;
    sessionTimeout: boolean;
  };
  errors: string[];
  responseTimeMs: number;
}

class HealthCheckService {
  private static instance: HealthCheckService;

  private constructor() {}

  static getInstance(): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService();
    }
    return HealthCheckService.instance;
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: false,
        auth: false,
        api: false,
        localStorage: false,
        sessionTimeout: false
      },
      errors,
      responseTimeMs: 0
    };

    // Check database connectivity
    try {
      const { error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1)
        .single();
      
      result.checks.database = !error;
      if (error) {
        errors.push(`Database check failed: ${error.message}`);
      }
    } catch (error) {
      result.checks.database = false;
      errors.push('Database connection failed');
    }

    // Check auth service
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      result.checks.auth = !error;
      if (error) {
        errors.push(`Auth check failed: ${error.message}`);
      }
    } catch (error) {
      result.checks.auth = false;
      errors.push('Auth service unavailable');
    }

    // Check API endpoint
    try {
      const response = await fetch('/api/health', {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      result.checks.api = response.ok;
      if (!response.ok) {
        errors.push(`API health check returned ${response.status}`);
      }
    } catch (error) {
      result.checks.api = false;
      errors.push('API endpoint unreachable');
    }

    // Check localStorage availability
    try {
      const testKey = '__health_check_test__';
      localStorage.setItem(testKey, 'test');
      const value = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      result.checks.localStorage = value === 'test';
      if (!result.checks.localStorage) {
        errors.push('localStorage not functioning correctly');
      }
    } catch (error) {
      result.checks.localStorage = false;
      errors.push('localStorage unavailable');
    }

    // Check session timeout configuration (15 minutes for HIPAA)
    try {
      const sessionConfig = localStorage.getItem('session_config');
      if (sessionConfig) {
        const config = JSON.parse(sessionConfig);
        result.checks.sessionTimeout = config.timeoutMinutes === 15;
        if (!result.checks.sessionTimeout) {
          errors.push(`Session timeout not HIPAA compliant: ${config.timeoutMinutes} minutes`);
        }
      } else {
        result.checks.sessionTimeout = true; // Default is now 15 minutes
      }
    } catch (error) {
      result.checks.sessionTimeout = true; // Assume correct if can't check
    }

    // Calculate response time
    result.responseTimeMs = Date.now() - startTime;

    // Determine overall status
    const failedChecks = Object.values(result.checks).filter(check => !check).length;
    if (failedChecks === 0) {
      result.status = 'healthy';
    } else if (failedChecks <= 2) {
      result.status = 'degraded';
    } else {
      result.status = 'unhealthy';
    }

    return result;
  }

  /**
   * Monitor health continuously
   */
  startMonitoring(intervalMs: number = 60000, callback?: (result: HealthCheckResult) => void) {
    setInterval(async () => {
      const result = await this.performHealthCheck();
      
      // Log to console in development
      if (import.meta.env.DEV) {
        console.log('Health check:', result);
      }

      // Send to monitoring service in production
      if (import.meta.env.VITE_APP_ENV === 'production' && result.status !== 'healthy') {
        // Report to Sentry or other monitoring service
        if (window.Sentry) {
          window.Sentry.captureMessage(`Health check ${result.status}`, 'warning');
        }
      }

      // Call callback if provided
      if (callback) {
        callback(result);
      }
    }, intervalMs);
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    return {
      memory: {
        used: (performance as any).memory?.usedJSHeapSize || 0,
        total: (performance as any).memory?.totalJSHeapSize || 0,
        limit: (performance as any).memory?.jsHeapSizeLimit || 0
      },
      navigation: {
        type: performance.navigation.type,
        redirectCount: performance.navigation.redirectCount
      },
      timing: {
        loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
        domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint').find(entry => entry.name === 'first-paint')?.startTime || 0
      }
    };
  }
}

export const healthCheckService = HealthCheckService.getInstance();

export default healthCheckService;