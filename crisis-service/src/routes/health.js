/**
 * Health Check Routes
 * System health and monitoring endpoints
 */

const express = require('express');
const logger = require('../utils/logger');
const config = require('../config/config');
const { getDatabaseConnection } = require('../database/connection');
const { getRedisManager } = require('../cache/redis');

const router = express.Router();

/**
 * Basic health check
 */
router.get('/', async (req, res) => {
    try {
        const healthStatus = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'crisis-service',
            version: process.env.npm_package_version || '2.0.0',
            environment: config.environment,
            uptime: process.uptime(),
            features: {
                crisis_detection: true,
                emergency_response: true,
                location_tracking: true,
                ml_prediction: true,
                safety_tools: true,
                websocket: true
            }
        };

        res.json(healthStatus);
    } catch (error) {
        logger.error('Health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Internal server error'
        });
    }
});

/**
 * Comprehensive health check with dependencies
 */
router.get('/detailed', async (req, res) => {
    const healthChecks = {
        timestamp: new Date().toISOString(),
        service: 'crisis-service',
        version: process.env.npm_package_version || '2.0.0',
        environment: config.environment,
        uptime: process.uptime(),
        status: 'healthy',
        checks: {
            database: { status: 'unknown' },
            redis: { status: 'unknown' },
            memory: { status: 'unknown' },
            disk: { status: 'unknown' }
        }
    };

    try {
        // Database health check
        try {
            const db = getDatabaseConnection();
            const start = Date.now();
            await db.query('SELECT NOW()');
            const responseTime = Date.now() - start;
            
            healthChecks.checks.database = {
                status: 'healthy',
                responseTime: `${responseTime}ms`,
                connected: db.isHealthy()
            };
        } catch (dbError) {
            healthChecks.checks.database = {
                status: 'unhealthy',
                error: dbError.message
            };
            healthChecks.status = 'degraded';
        }

        // Redis health check
        try {
            const redis = getRedisManager();
            const redisHealth = await redis.healthCheck();
            
            healthChecks.checks.redis = {
                status: redisHealth.status,
                responseTime: `${redisHealth.responseTime}ms`,
                connected: redisHealth.isConnected
            };
            
            if (redisHealth.status !== 'healthy') {
                healthChecks.status = 'degraded';
            }
        } catch (redisError) {
            healthChecks.checks.redis = {
                status: 'unhealthy',
                error: redisError.message
            };
            healthChecks.status = 'degraded';
        }

        // Memory health check
        const memoryUsage = process.memoryUsage();
        const memoryUsageMB = {
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024)
        };
        
        const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        
        healthChecks.checks.memory = {
            status: heapUsagePercent > 90 ? 'warning' : 'healthy',
            usage: memoryUsageMB,
            heapUsagePercent: Math.round(heapUsagePercent)
        };

        if (heapUsagePercent > 90) {
            healthChecks.status = 'warning';
        }

        // CPU health check
        const cpuUsage = process.cpuUsage();
        healthChecks.checks.cpu = {
            status: 'healthy',
            user: cpuUsage.user,
            system: cpuUsage.system
        };

        // Overall status determination
        const unhealthyChecks = Object.values(healthChecks.checks).filter(check => check.status === 'unhealthy');
        if (unhealthyChecks.length > 0) {
            healthChecks.status = 'unhealthy';
        }

        // Response status code based on health
        const statusCode = healthChecks.status === 'healthy' ? 200 : 
                          healthChecks.status === 'degraded' ? 200 : 
                          healthChecks.status === 'warning' ? 200 : 503;

        res.status(statusCode).json(healthChecks);

    } catch (error) {
        logger.error('Detailed health check error:', error);
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: 'Health check failed',
            message: error.message
        });
    }
});

/**
 * Readiness check - indicates if service is ready to handle requests
 */
router.get('/ready', async (req, res) => {
    try {
        const readinessChecks = [];
        let isReady = true;

        // Check if database is accessible
        try {
            const db = getDatabaseConnection();
            await db.query('SELECT 1');
            readinessChecks.push({ name: 'database', ready: true });
        } catch (error) {
            readinessChecks.push({ name: 'database', ready: false, error: error.message });
            isReady = false;
        }

        // Check if Redis is accessible
        try {
            const redis = getRedisManager();
            const health = await redis.healthCheck();
            readinessChecks.push({ 
                name: 'redis', 
                ready: health.isConnected,
                ...(health.error && { error: health.error })
            });
            if (!health.isConnected) {
                isReady = false;
            }
        } catch (error) {
            readinessChecks.push({ name: 'redis', ready: false, error: error.message });
            isReady = false;
        }

        // Check critical environment variables
        const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'EMERGENCY_OVERRIDE_KEY'];
        const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        readinessChecks.push({
            name: 'environment',
            ready: missingEnvVars.length === 0,
            ...(missingEnvVars.length > 0 && { missing: missingEnvVars })
        });

        if (missingEnvVars.length > 0) {
            isReady = false;
        }

        const response = {
            ready: isReady,
            timestamp: new Date().toISOString(),
            checks: readinessChecks
        };

        res.status(isReady ? 200 : 503).json(response);

    } catch (error) {
        logger.error('Readiness check error:', error);
        res.status(503).json({
            ready: false,
            timestamp: new Date().toISOString(),
            error: 'Readiness check failed'
        });
    }
});

/**
 * Liveness check - indicates if service is alive
 */
router.get('/live', (req, res) => {
    // Simple liveness check
    res.json({
        alive: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        pid: process.pid
    });
});

/**
 * Metrics endpoint for monitoring
 */
router.get('/metrics', async (req, res) => {
    try {
        const metrics = {
            timestamp: new Date().toISOString(),
            service: 'crisis-service',
            metrics: {
                system: {
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage(),
                    platform: process.platform,
                    nodeVersion: process.version
                },
                application: {
                    environment: config.environment,
                    startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
                }
            }
        };

        // Add performance counters if available
        if (global.performanceCounters) {
            metrics.performance = global.performanceCounters;
        }

        res.json(metrics);

    } catch (error) {
        logger.error('Metrics endpoint error:', error);
        res.status(500).json({
            error: 'Failed to retrieve metrics',
            timestamp: new Date().toISOString()
        });
    }
});

module.exports = router;