import express from 'express';
import { database } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { jwtService } from '../services/jwt.service';
import { mfaService } from '../services/mfa.service';
import { rbacService } from '../services/rbac.service';
import { HealthCheckResponse, ServiceStatus } from '../types/api';

const router = express.Router();

// Basic health check
router.get('/', async (req, res) => {
  try {
    const healthStatus: HealthCheckResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services: {
        database: { status: 'healthy', lastChecked: new Date().toISOString() },
        redis: { status: 'healthy', lastChecked: new Date().toISOString() },
        email: { status: 'healthy', lastChecked: new Date().toISOString() },
        sms: { status: 'healthy', lastChecked: new Date().toISOString() },
      },
    };

    res.json(healthStatus);
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  try {
    const checks = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
      checkEmailService(),
      checkSMSService(),
    ]);

    const [dbResult, redisResult, emailResult, smsResult] = checks;

    const services = {
      database: dbResult.status === 'fulfilled' ? dbResult.value : {
        status: 'unhealthy',
        error: dbResult.status === 'rejected' ? dbResult.reason.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      },
      redis: redisResult.status === 'fulfilled' ? redisResult.value : {
        status: 'unhealthy',
        error: redisResult.status === 'rejected' ? redisResult.reason.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      },
      email: emailResult.status === 'fulfilled' ? emailResult.value : {
        status: 'unhealthy',
        error: emailResult.status === 'rejected' ? emailResult.reason.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      },
      sms: smsResult.status === 'fulfilled' ? smsResult.value : {
        status: 'unhealthy',
        error: smsResult.status === 'rejected' ? smsResult.reason.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      },
    };

    // Determine overall status
    const allHealthy = Object.values(services).every(service => service.status === 'healthy');
    const someHealthy = Object.values(services).some(service => service.status === 'healthy');
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    if (allHealthy) {
      overallStatus = 'healthy';
    } else if (someHealthy) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    const healthStatus: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      services,
    };

    const statusCode = overallStatus === 'healthy' ? 200 : 
                       overallStatus === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthStatus);
  } catch (error) {
    logger.error('Detailed health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
});

// Readiness check (for Kubernetes)
router.get('/ready', async (req, res) => {
  try {
    // Check critical services that must be available
    const dbHealth = await checkDatabase();
    const redisHealth = await checkRedis();

    if (dbHealth.status !== 'healthy' || redisHealth.status !== 'healthy') {
      return res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString(),
        services: {
          database: dbHealth,
          redis: redisHealth,
        },
      });
    }

    res.json({
      ready: true,
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        redis: redisHealth,
      },
    });
  } catch (error) {
    logger.error('Readiness check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Readiness check failed',
    });
  }
});

// Liveness check (for Kubernetes)
router.get('/live', (req, res) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
  });
});

// Metrics endpoint
router.get('/metrics', async (req, res) => {
  try {
    const [tokenStats, mfaStats, roleStats] = await Promise.allSettled([
      jwtService.getTokenStatistics(),
      mfaService.getMFAStatistics(),
      rbacService.getRoleStatistics(),
    ]);

    const metrics = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
      database: database.getStatus(),
      redis: {
        isHealthy: redis.isHealthy(),
      },
      tokens: tokenStats.status === 'fulfilled' ? tokenStats.value : {
        activeTokens: 0,
        expiredTokens: 0,
        revokedTokens: 0,
      },
      mfa: mfaStats.status === 'fulfilled' ? mfaStats.value : {
        totalUsersWithMFA: 0,
        mfaAdoptionRate: 0,
        averageBackupCodesRemaining: 0,
      },
      roles: roleStats.status === 'fulfilled' ? roleStats.value : {
        totalRoles: 0,
        systemRoles: 0,
        customRoles: 0,
        totalAssignments: 0,
        activeAssignments: 0,
      },
    };

    res.json(metrics);
  } catch (error) {
    logger.error('Metrics collection failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(500).json({
      error: 'Failed to collect metrics',
      timestamp: new Date().toISOString(),
    });
  }
});

// Service-specific health checks
async function checkDatabase(): Promise<ServiceStatus> {
  try {
    const result = await database.healthCheck();
    return {
      status: result.status as 'healthy' | 'unhealthy',
      responseTime: result.responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Database check failed',
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkRedis(): Promise<ServiceStatus> {
  try {
    const result = await redis.healthCheck();
    return {
      status: result.status as 'healthy' | 'unhealthy',
      responseTime: result.responseTime,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Redis check failed',
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkEmailService(): Promise<ServiceStatus> {
  try {
    // Mock email service check - in real implementation, check SMTP connection
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      return {
        status: 'healthy',
        lastChecked: new Date().toISOString(),
      };
    } else {
      return {
        status: 'degraded',
        error: 'Email service not configured',
        lastChecked: new Date().toISOString(),
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Email service check failed',
      lastChecked: new Date().toISOString(),
    };
  }
}

async function checkSMSService(): Promise<ServiceStatus> {
  try {
    // Mock SMS service check - in real implementation, check Twilio connection
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      return {
        status: 'healthy',
        lastChecked: new Date().toISOString(),
      };
    } else {
      return {
        status: 'degraded',
        error: 'SMS service not configured',
        lastChecked: new Date().toISOString(),
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'SMS service check failed',
      lastChecked: new Date().toISOString(),
    };
  }
}

export default router;