import { Request, Response } from 'express';
import { database } from '@/models/database';
import { queueService } from '@/services/QueueService';
import { emailService } from '@/services/channels/EmailService';
import { smsService } from '@/services/channels/SMSService';
import { pushService } from '@/services/channels/PushService';
import { inAppService } from '@/services/channels/InAppService';
import { logger } from '@/utils/logger';
import { HealthCheckResult, APIResponse } from '@/types';

export class HealthController {
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Perform health checks in parallel
      const [
        databaseHealth,
        redisHealth,
        rabbitmqHealth,
        emailHealth,
        smsHealth,
        pushHealth
      ] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkRabbitMQ(),
        this.checkEmail(),
        this.checkSMS(),
        this.checkPush()
      ]);

      const checks = {
        database: databaseHealth.status === 'fulfilled' && databaseHealth.value,
        redis: redisHealth.status === 'fulfilled' && redisHealth.value,
        rabbitmq: rabbitmqHealth.status === 'fulfilled' && rabbitmqHealth.value,
        email: emailHealth.status === 'fulfilled' && emailHealth.value,
        sms: smsHealth.status === 'fulfilled' && smsHealth.value,
        push: pushHealth.status === 'fulfilled' && pushHealth.value
      };

      const allHealthy = Object.values(checks).every(check => check === true);
      const someHealthy = Object.values(checks).some(check => check === true);
      
      let status: 'healthy' | 'unhealthy' | 'degraded';
      if (allHealthy) {
        status = 'healthy';
      } else if (someHealthy) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      const healthResult: HealthCheckResult = {
        status,
        checks,
        timestamp: new Date(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0'
      };

      const response: APIResponse<HealthCheckResult> = {
        success: allHealthy || someHealthy,
        data: healthResult,
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      const responseTime = Date.now() - startTime;
      res.set('X-Response-Time', `${responseTime}ms`);

      // Set appropriate HTTP status code
      if (status === 'healthy') {
        res.status(200).json(response);
      } else if (status === 'degraded') {
        res.status(200).json(response); // Still return 200 for degraded state
      } else {
        res.status(503).json(response);
      }

      // Log health check results
      logger.info('Health check completed', {
        status,
        checks,
        responseTime,
        uptime: healthResult.uptime
      });

    } catch (error: any) {
      logger.error('Health check failed', { error: error.message });

      const errorResponse: APIResponse = {
        success: false,
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Health check failed',
          details: error.message
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.status(503).json(errorResponse);
    }
  }

  async readinessCheck(req: Request, res: Response): Promise<void> {
    try {
      // Check only critical dependencies for readiness
      const [databaseReady, queueReady] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkRabbitMQ()
      ]);

      const isReady = 
        databaseReady.status === 'fulfilled' && databaseReady.value &&
        queueReady.status === 'fulfilled' && queueReady.value;

      const response: APIResponse = {
        success: isReady,
        data: {
          ready: isReady,
          checks: {
            database: databaseReady.status === 'fulfilled' && databaseReady.value,
            queue: queueReady.status === 'fulfilled' && queueReady.value
          },
          timestamp: new Date()
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.status(isReady ? 200 : 503).json(response);

    } catch (error: any) {
      logger.error('Readiness check failed', { error: error.message });

      res.status(503).json({
        success: false,
        error: {
          code: 'READINESS_CHECK_ERROR',
          message: 'Readiness check failed'
        }
      });
    }
  }

  async livenessCheck(req: Request, res: Response): Promise<void> {
    try {
      // Simple liveness check - just verify the service is running
      const response: APIResponse = {
        success: true,
        data: {
          alive: true,
          timestamp: new Date(),
          uptime: process.uptime(),
          pid: process.pid,
          memory: process.memoryUsage(),
          version: process.env.npm_package_version || '1.0.0'
        },
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.status(200).json(response);

    } catch (error: any) {
      logger.error('Liveness check failed', { error: error.message });

      res.status(503).json({
        success: false,
        error: {
          code: 'LIVENESS_CHECK_ERROR',
          message: 'Liveness check failed'
        }
      });
    }
  }

  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const queueStats = await queueService.getQueueStats();
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const metrics = {
        system: {
          uptime: process.uptime(),
          memory: {
            rss: memoryUsage.rss,
            heapTotal: memoryUsage.heapTotal,
            heapUsed: memoryUsage.heapUsed,
            external: memoryUsage.external,
            arrayBuffers: memoryUsage.arrayBuffers
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          },
          pid: process.pid,
          version: process.version,
          platform: process.platform,
          arch: process.arch
        },
        queues: queueStats,
        notifications: {
          // These would be populated from a metrics service
          totalSent: 0,
          totalFailed: 0,
          averageProcessingTime: 0,
          channelBreakdown: {},
          typeBreakdown: {}
        },
        timestamp: new Date()
      };

      const response: APIResponse = {
        success: true,
        data: metrics,
        meta: {
          timestamp: new Date(),
          requestId: req.headers['x-request-id'] as string || 'unknown',
          version: '1.0.0'
        }
      };

      res.status(200).json(response);

    } catch (error: any) {
      logger.error('Failed to get metrics', { error: error.message });

      res.status(500).json({
        success: false,
        error: {
          code: 'METRICS_ERROR',
          message: 'Failed to retrieve metrics'
        }
      });
    }
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      return await database.healthCheck();
    } catch (error) {
      logger.error('Database health check failed', { error });
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      return await inAppService.verifyConnection();
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return false;
    }
  }

  private async checkRabbitMQ(): Promise<boolean> {
    try {
      return await queueService.isHealthy();
    } catch (error) {
      logger.error('RabbitMQ health check failed', { error });
      return false;
    }
  }

  private async checkEmail(): Promise<boolean> {
    try {
      return await emailService.verifyConnection();
    } catch (error) {
      logger.error('Email service health check failed', { error });
      return false;
    }
  }

  private async checkSMS(): Promise<boolean> {
    try {
      return await smsService.verifyConnection();
    } catch (error) {
      logger.error('SMS service health check failed', { error });
      return false;
    }
  }

  private async checkPush(): Promise<boolean> {
    try {
      return await pushService.verifyConnection();
    } catch (error) {
      logger.error('Push service health check failed', { error });
      return false;
    }
  }
}

export const healthController = new HealthController();