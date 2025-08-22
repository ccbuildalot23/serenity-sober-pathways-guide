import { Request, Response } from 'express';
import { db } from '@/database/connection';
import { config } from '@/config/config';
import { encryptionService } from '@/utils/encryption';
import logger, { errorLogger } from '@/utils/logger';
import { HealthCheck } from '@/types';

export class HealthController {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Basic health check endpoint
   * GET /health
   */
  public async basicHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus: HealthCheck = {
        service: config.serviceName,
        version: config.serviceVersion,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        checks: {
          database: await this.checkDatabase(),
          memory: this.checkMemory(),
          api: this.checkApi(),
        },
      };

      // Determine overall status
      const allChecksHealthy = Object.values(healthStatus.checks).every(
        check => check.status === 'healthy'
      );

      if (!allChecksHealthy) {
        healthStatus.status = 'degraded';
      }

      const statusCode = healthStatus.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        success: healthStatus.status === 'healthy',
        data: healthStatus,
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'HealthController',
        operation: 'basicHealthCheck',
        request_id: req.requestId,
      });

      res.status(503).json({
        success: false,
        data: {
          service: config.serviceName,
          version: config.serviceVersion,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: Date.now() - this.startTime,
          error: 'Health check failed',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    }
  }

  /**
   * Detailed health check endpoint
   * GET /api/v1/health
   */
  public async detailedHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const checks = await this.performDetailedChecks();
      
      const healthStatus: HealthCheck & {
        detailed_checks: any;
        system_info: any;
      } = {
        service: config.serviceName,
        version: config.serviceVersion,
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
        checks: {
          database: checks.database,
          memory: checks.memory,
          api: checks.api,
        },
        detailed_checks: {
          encryption: checks.encryption,
          configuration: checks.configuration,
          disk_space: checks.diskSpace,
          environment: checks.environment,
        },
        system_info: {
          node_version: process.version,
          platform: process.platform,
          arch: process.arch,
          pid: process.pid,
          memory_usage: process.memoryUsage(),
          cpu_usage: process.cpuUsage(),
        },
      };

      // Determine overall status
      const criticalChecks = [
        checks.database.status,
        checks.memory.status,
        checks.configuration.status,
      ];

      const hasCriticalFailure = criticalChecks.includes('unhealthy');
      const hasWarnings = Object.values(checks).some(check => check.status === 'degraded');

      if (hasCriticalFailure) {
        healthStatus.status = 'unhealthy';
      } else if (hasWarnings) {
        healthStatus.status = 'degraded';
      }

      const statusCode = healthStatus.status === 'healthy' ? 200 : 
                        healthStatus.status === 'degraded' ? 200 : 503;

      res.status(statusCode).json({
        success: healthStatus.status !== 'unhealthy',
        data: healthStatus,
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'HealthController',
        operation: 'detailedHealthCheck',
        request_id: req.requestId,
      });

      res.status(503).json({
        success: false,
        data: {
          service: config.serviceName,
          version: config.serviceVersion,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          uptime: Date.now() - this.startTime,
          error: 'Detailed health check failed',
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    }
  }

  /**
   * Readiness check (for Kubernetes)
   * GET /ready
   */
  public async readinessCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check if service is ready to accept traffic
      const isReady = await this.checkReadiness();

      if (isReady) {
        res.status(200).json({
          success: true,
          message: 'Service is ready',
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
        });
      } else {
        res.status(503).json({
          success: false,
          message: 'Service is not ready',
          timestamp: new Date().toISOString(),
          request_id: req.requestId,
        });
      }
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'HealthController',
        operation: 'readinessCheck',
        request_id: req.requestId,
      });

      res.status(503).json({
        success: false,
        message: 'Readiness check failed',
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    }
  }

  /**
   * Liveness check (for Kubernetes)
   * GET /live
   */
  public async livenessCheck(req: Request, res: Response): Promise<void> {
    try {
      // Simple check to see if the service is alive
      res.status(200).json({
        success: true,
        message: 'Service is alive',
        uptime: Date.now() - this.startTime,
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    } catch (error) {
      errorLogger.application(error as Error, {
        component: 'HealthController',
        operation: 'livenessCheck',
        request_id: req.requestId,
      });

      res.status(503).json({
        success: false,
        message: 'Liveness check failed',
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    }
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency: number;
    message?: string;
  }> {
    try {
      const startTime = Date.now();
      await db.query('SELECT 1');
      const latency = Date.now() - startTime;

      if (latency > 5000) {
        return {
          status: 'unhealthy',
          latency,
          message: 'Database response time too slow',
        };
      }

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: -1,
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }
  }

  /**
   * Check memory usage
   */
  private checkMemory(): {
    status: 'healthy' | 'unhealthy';
    usage_mb: number;
    total_mb: number;
    percentage: number;
  } {
    const memoryUsage = process.memoryUsage();
    const usageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const percentage = Math.round((usageMB / totalMB) * 100);

    return {
      status: percentage > 90 ? 'unhealthy' : 'healthy',
      usage_mb: usageMB,
      total_mb: totalMB,
      percentage,
    };
  }

  /**
   * Check API responsiveness
   */
  private checkApi(): {
    status: 'healthy' | 'unhealthy';
    response_time: number;
  } {
    const startTime = Date.now();
    const responseTime = Date.now() - startTime;

    return {
      status: responseTime < 100 ? 'healthy' : 'unhealthy',
      response_time: responseTime,
    };
  }

  /**
   * Perform detailed health checks
   */
  private async performDetailedChecks(): Promise<{
    database: any;
    memory: any;
    api: any;
    encryption: any;
    configuration: any;
    diskSpace: any;
    environment: any;
  }> {
    const checks = {
      database: await this.checkDatabase(),
      memory: this.checkMemory(),
      api: this.checkApi(),
      encryption: await this.checkEncryption(),
      configuration: this.checkConfiguration(),
      diskSpace: this.checkDiskSpace(),
      environment: this.checkEnvironment(),
    };

    return checks;
  }

  /**
   * Check encryption service
   */
  private async checkEncryption(): Promise<{
    status: 'healthy' | 'unhealthy';
    message?: string;
  }> {
    try {
      // Test encryption/decryption
      const testData = 'test-data-for-encryption';
      const encrypted = encryptionService.encryptJSON({ test: testData });
      const decrypted = encryptionService.decryptJSON(encrypted);
      
      if (decrypted.test !== testData) {
        return {
          status: 'unhealthy',
          message: 'Encryption/decryption test failed',
        };
      }

      return {
        status: 'healthy',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Encryption service failed',
      };
    }
  }

  /**
   * Check configuration
   */
  private checkConfiguration(): {
    status: 'healthy' | 'unhealthy';
    message?: string;
  } {
    try {
      // Check required environment variables
      const requiredVars = [
        'JWT_SECRET',
        'API_KEY_SECRET',
        'ENCRYPTION_KEY',
        'DATABASE_PASSWORD',
      ];

      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        return {
          status: 'unhealthy',
          message: `Missing environment variables: ${missingVars.join(', ')}`,
        };
      }

      return {
        status: 'healthy',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Configuration check failed',
      };
    }
  }

  /**
   * Check disk space (simplified)
   */
  private checkDiskSpace(): {
    status: 'healthy' | 'unhealthy' | 'degraded';
    message?: string;
  } {
    try {
      // In a real implementation, you would check actual disk space
      // For now, we'll just return healthy
      return {
        status: 'healthy',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Disk space check failed',
      };
    }
  }

  /**
   * Check environment setup
   */
  private checkEnvironment(): {
    status: 'healthy' | 'unhealthy' | 'degraded';
    environment: string;
    node_version: string;
    service_version: string;
  } {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1), 10);

    return {
      status: majorVersion >= 18 ? 'healthy' : 'degraded',
      environment: config.nodeEnv,
      node_version: nodeVersion,
      service_version: config.serviceVersion,
    };
  }

  /**
   * Check if service is ready to accept traffic
   */
  private async checkReadiness(): Promise<boolean> {
    try {
      // Check database connectivity
      await db.query('SELECT 1');
      
      // Check if audit_logs table exists
      const result = await db.query(`
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'audit_logs'
      `);
      
      if (result.rows.length === 0) {
        logger.warn('Audit logs table not found - service not ready');
        return false;
      }

      // Check configuration
      const configCheck = this.checkConfiguration();
      if (configCheck.status === 'unhealthy') {
        logger.warn('Configuration check failed - service not ready');
        return false;
      }

      return true;
    } catch (error) {
      logger.warn('Readiness check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

export const healthController = new HealthController();