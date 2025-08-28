const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const cron = require('node-cron');
const redis = require('redis');
const promClient = require('prometheus-client');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8090;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: '/app/logs/health-checker.log' })
  ]
});

// Redis client for caching health status
let redisClient;
const initRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: 'redis://kong-redis:6379',
      password: 'redis_password',
      database: 2
    });
    
    redisClient.on('error', (err) => {
      logger.error('Redis client error:', err);
    });
    
    await redisClient.connect();
    logger.info('Connected to Redis for health check caching');
  } catch (error) {
    logger.warn('Redis connection failed, continuing without caching:', error.message);
  }
};

// Prometheus metrics
const register = new promClient.Registry();
const serviceHealthGauge = new promClient.Gauge({
  name: 'serenity_service_health',
  help: 'Health status of Serenity microservices (1=healthy, 0=unhealthy)',
  labelNames: ['service_name', 'endpoint']
});

const responseTimeHistogram = new promClient.Histogram({
  name: 'serenity_health_check_duration_seconds',
  help: 'Duration of health checks in seconds',
  labelNames: ['service_name'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

register.registerMetric(serviceHealthGauge);
register.registerMetric(responseTimeHistogram);

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  }
}));
app.use(cors());
app.use(express.json());

// Load microservices configuration
let microservicesConfig;
const loadConfig = async () => {
  try {
    const configPath = path.join(__dirname, 'config', 'microservices.json');
    const configData = await fs.readFile(configPath, 'utf8');
    microservicesConfig = JSON.parse(configData);
    logger.info('Loaded microservices configuration');
  } catch (error) {
    logger.error('Failed to load microservices config:', error);
    // Fallback configuration
    microservicesConfig = {
      services: [
        {
          name: 'auth-service',
          url: 'http://host.docker.internal:3000',
          healthEndpoint: '/health',
          timeout: 5000,
          critical: true
        },
        {
          name: 'notification-service', 
          url: 'http://host.docker.internal:8000',
          healthEndpoint: '/health',
          timeout: 5000,
          critical: false
        },
        {
          name: 'crisis-service',
          url: 'http://host.docker.internal:8080',
          healthEndpoint: '/health',
          timeout: 3000,
          critical: true
        },
        {
          name: 'frontend-app',
          url: 'http://host.docker.internal:8080',
          healthEndpoint: '/',
          timeout: 5000,
          critical: false,
          expectedStatus: 200
        }
      ]
    };
  }
};

// Health check functions
const checkServiceHealth = async (service) => {
  const startTime = Date.now();
  const timer = responseTimeHistogram.startTimer({ service_name: service.name });
  
  try {
    const response = await axios({
      method: 'GET',
      url: service.url + service.healthEndpoint,
      timeout: service.timeout || 5000,
      headers: {
        'User-Agent': 'Serenity-Health-Checker/1.0',
        'Accept': 'application/json'
      },
      validateStatus: (status) => {
        if (service.expectedStatus) {
          return status === service.expectedStatus;
        }
        return status >= 200 && status < 300;
      }
    });
    
    const responseTime = Date.now() - startTime;
    timer();
    
    const healthData = {
      healthy: true,
      responseTime,
      status: response.status,
      timestamp: new Date().toISOString(),
      details: response.data || null
    };
    
    serviceHealthGauge.set({ service_name: service.name, endpoint: service.healthEndpoint }, 1);
    
    // Cache health status
    if (redisClient && redisClient.isOpen) {
      await redisClient.setEx(
        `health:${service.name}`, 
        30, 
        JSON.stringify(healthData)
      );
    }
    
    return healthData;
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    timer();
    
    const healthData = {
      healthy: false,
      responseTime,
      error: error.message,
      code: error.code,
      timestamp: new Date().toISOString()
    };
    
    serviceHealthGauge.set({ service_name: service.name, endpoint: service.healthEndpoint }, 0);
    
    logger.warn(`Health check failed for ${service.name}:`, error.message);
    return healthData;
  }
};

const performHealthChecks = async () => {
  const results = {};
  const promises = microservicesConfig.services.map(async (service) => {
    const health = await checkServiceHealth(service);
    results[service.name] = {
      ...health,
      critical: service.critical || false,
      url: service.url,
      endpoint: service.healthEndpoint
    };
  });
  
  await Promise.all(promises);
  return results;
};

// Calculate overall health
const calculateOverallHealth = (services) => {
  const serviceList = Object.values(services);
  const criticalServices = serviceList.filter(s => s.critical);
  const healthyServices = serviceList.filter(s => s.healthy);
  const healthyCriticalServices = criticalServices.filter(s => s.healthy);
  
  const overallHealthy = criticalServices.length === 0 || 
                        healthyCriticalServices.length === criticalServices.length;
  
  return {
    status: overallHealthy ? 'healthy' : 'unhealthy',
    healthy: overallHealthy,
    summary: {
      total: serviceList.length,
      healthy: healthyServices.length,
      unhealthy: serviceList.length - healthyServices.length,
      critical: criticalServices.length,
      criticalHealthy: healthyCriticalServices.length
    }
  };
};

// Routes
app.get('/health', async (req, res) => {
  try {
    const services = await performHealthChecks();
    const overall = calculateOverallHealth(services);
    
    const response = {
      timestamp: new Date().toISOString(),
      overall,
      services,
      version: '1.0.0',
      uptime: process.uptime()
    };
    
    const statusCode = overall.healthy ? 200 : 503;
    res.status(statusCode).json(response);
    
  } catch (error) {
    logger.error('Health check endpoint error:', error);
    res.status(500).json({
      timestamp: new Date().toISOString(),
      overall: { status: 'error', healthy: false },
      error: 'Health check system error',
      version: '1.0.0'
    });
  }
});

app.get('/health/:serviceName', async (req, res) => {
  const serviceName = req.params.serviceName;
  const service = microservicesConfig.services.find(s => s.name === serviceName);
  
  if (!service) {
    return res.status(404).json({
      error: 'Service not found',
      availableServices: microservicesConfig.services.map(s => s.name)
    });
  }
  
  try {
    const health = await checkServiceHealth(service);
    const statusCode = health.healthy ? 200 : 503;
    
    res.status(statusCode).json({
      service: serviceName,
      ...health,
      critical: service.critical || false
    });
    
  } catch (error) {
    logger.error(`Health check error for ${serviceName}:`, error);
    res.status(500).json({
      service: serviceName,
      healthy: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/status', async (req, res) => {
  try {
    // Get cached health data if available
    const cachedData = {};
    if (redisClient && redisClient.isOpen) {
      for (const service of microservicesConfig.services) {
        try {
          const cached = await redisClient.get(`health:${service.name}`);
          if (cached) {
            cachedData[service.name] = JSON.parse(cached);
          }
        } catch (error) {
          logger.warn(`Failed to get cached data for ${service.name}:`, error.message);
        }
      }
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      cached: cachedData,
      cacheAvailable: redisClient && redisClient.isOpen,
      configuredServices: microservicesConfig.services.length
    });
    
  } catch (error) {
    logger.error('Status endpoint error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Scheduled health checks
cron.schedule('*/30 * * * * *', async () => { // Every 30 seconds
  try {
    await performHealthChecks();
    logger.debug('Scheduled health check completed');
  } catch (error) {
    logger.error('Scheduled health check failed:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
  }
  
  process.exit(0);
});

// Initialize and start server
const startServer = async () => {
  try {
    await loadConfig();
    await initRedis();
    
    app.listen(PORT, () => {
      logger.info(`Health checker service running on port ${PORT}`);
      logger.info(`Monitoring ${microservicesConfig.services.length} services`);
    });
    
  } catch (error) {
    logger.error('Failed to start health checker service:', error);
    process.exit(1);
  }
};

startServer();