import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { generateRequestId, getClientIp } from '@utils/helpers';
import { createLogger, securityLogger } from '@utils/logger';
import { redisManager } from '@utils/redis';
import config from '@config/index';

// Import middleware
import { jwtAuth, apiKeyAuth, optionalAuth, requireRole, requirePermission } from '@middleware/auth';
import { globalRateLimit, rateLimitBypass, ddosProtection } from '@middleware/rateLimiter';
import { requestTransformation, responseTransformation, apiVersioning } from '@middleware/transformation';

// Import services
import { serviceDiscovery } from '@services/serviceDiscovery';
import { loadBalancer } from '@services/loadBalancer';
import { circuitBreakerManager } from '@services/circuitBreaker';
import { initializeWebSocketProxy } from '@services/websocketProxy';
import { fileUploadService } from '@services/fileUpload';
import { monitoringService } from '@services/monitoring';

const logger = createLogger('Server');

export class ApiGatewayServer {
  private app: express.Application;
  private server: any;
  private isShuttingDown = false;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  /**
   * Initialize middleware
   */
  private initializeMiddleware(): void {
    // Trust proxy for proper IP detection
    this.app.set('trust proxy', config.security.cors.credentials);

    // Security middleware
    if (config.security.helmet) {
      this.app.use(helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "ws:"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: false
      }));
    }

    // CORS configuration
    this.app.use(cors({
      origin: config.security.cors.origin,
      credentials: config.security.cors.credentials,
      methods: config.security.cors.methods,
      allowedHeaders: config.security.cors.allowed_headers,
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
      maxAge: 86400 // 24 hours
    }));

    // Compression
    this.app.use(compression({
      threshold: 1024,
      level: 6,
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      }
    }));

    // Body parsing
    this.app.use(express.json({ 
      limit: config.security.input_validation.max_body_size,
      strict: true
    }));
    this.app.use(express.urlencoded({ 
      extended: true, 
      limit: config.security.input_validation.max_body_size 
    }));

    // Request ID and timing
    this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      req.request_id = generateRequestId();
      req.start_time = Date.now();
      
      // Add request ID to response headers
      res.setHeader('X-Request-ID', req.request_id);
      
      next();
    });

    // Logging middleware
    this.app.use((req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.info('Incoming request', {
        request_id: req.request_id,
        method: req.method,
        path: req.path,
        ip: getClientIp(req),
        user_agent: req.headers['user-agent'],
        content_type: req.headers['content-type']
      });
      next();
    });

    // DDoS protection
    this.app.use(ddosProtection);

    // Rate limiting with bypass for health checks
    this.app.use(rateLimitBypass);

    // Monitoring middleware
    this.app.use(monitoringService.requestMetrics());
  }

  /**
   * Initialize routes
   */
  private initializeRoutes(): void {
    // Health check endpoints
    this.app.get('/health', this.healthCheck.bind(this));
    this.app.get('/ready', this.readinessCheck.bind(this));
    this.app.get('/live', this.livenessCheck.bind(this));

    // Metrics endpoint
    if (config.monitoring.prometheus.enabled) {
      this.app.get(config.monitoring.prometheus.path, this.metricsEndpoint.bind(this));
    }

    // Dashboard endpoint (for monitoring UI)
    this.app.get('/dashboard', requireRole(['admin']), this.dashboardEndpoint.bind(this));

    // Service discovery endpoints
    this.app.get('/services', requireRole(['admin']), this.getServices.bind(this));
    this.app.get('/services/:serviceName/health', requireRole(['admin']), this.getServiceHealth.bind(this));

    // Circuit breaker management
    this.app.get('/circuit-breakers', requireRole(['admin']), this.getCircuitBreakers.bind(this));
    this.app.post('/circuit-breakers/:service/reset', requireRole(['admin']), this.resetCircuitBreaker.bind(this));

    // File upload endpoints
    this.app.post('/upload/single', 
      jwtAuth, 
      fileUploadService.uploadSingle(),
      this.handleSingleFileUpload.bind(this)
    );

    this.app.post('/upload/multiple',
      jwtAuth,
      fileUploadService.uploadMultiple(),
      this.handleMultipleFileUpload.bind(this)
    );

    this.app.get('/files/:fileId', jwtAuth, this.getFile.bind(this));
    this.app.delete('/files/:fileId', jwtAuth, this.deleteFile.bind(this));

    // Dynamic service routing
    this.setupServiceRoutes();

    // Catch-all route for undefined endpoints
    this.app.use('*', this.handleNotFound.bind(this));
  }

  /**
   * Setup dynamic service routes
   */
  private setupServiceRoutes(): void {
    for (const route of config.routes) {
      const routePath = route.path;
      const serviceName = route.service;
      const serviceConfig = config.services[serviceName];

      if (!serviceConfig) {
        logger.warn(`Service config not found for route: ${routePath} -> ${serviceName}`);
        continue;
      }

      // Create middleware chain
      const middlewares: express.RequestHandler[] = [];

      // Add authentication if required
      if (route.auth_required) {
        middlewares.push(jwtAuth);
      } else {
        middlewares.push(optionalAuth);
      }

      // Add rate limiting if configured
      if (route.rate_limit) {
        // Custom rate limiter based on route config would go here
        middlewares.push(globalRateLimit);
      }

      // Add transformation middleware if configured
      if (route.transformation) {
        if (route.transformation.request) {
          middlewares.push(requestTransformation(route.transformation));
        }
        if (route.transformation.response) {
          middlewares.push(responseTransformation(route.transformation));
        }
      }

      // Add the proxy middleware
      const proxyMiddleware = this.createServiceProxy(serviceName, route);
      middlewares.push(proxyMiddleware);

      // Register the route
      if (route.method === 'ALL') {
        this.app.use(routePath, ...middlewares);
      } else {
        const method = route.method.toLowerCase() as keyof express.Application;
        if (typeof this.app[method] === 'function') {
          (this.app[method] as any)(routePath, ...middlewares);
        }
      }

      logger.info(`Registered route: ${route.method} ${routePath} -> ${serviceName}`);
    }
  }

  /**
   * Create service proxy middleware
   */
  private createServiceProxy(serviceName: string, route: any): express.RequestHandler {
    return createProxyMiddleware({
      target: 'http://placeholder', // Will be overridden by router
      changeOrigin: true,
      timeout: config.services[serviceName]?.timeout || 5000,
      pathRewrite: route.target_path ? {
        [`^${route.path.replace(/\*/g, '(.*)')}`]: route.target_path
      } : undefined,
      
      // Dynamic target selection using load balancer
      router: async (req) => {
        const instance = loadBalancer.selectInstance(serviceName);
        if (!instance) {
          throw new Error(`No healthy instances available for service: ${serviceName}`);
        }
        return `http://${instance.address}:${instance.port}`;
      },

      // Request interceptor
      onProxyReq: (proxyReq, req: express.Request, res) => {
        // Add headers for service identification
        proxyReq.setHeader('X-Gateway-Request-ID', req.request_id);
        proxyReq.setHeader('X-Gateway-Service', serviceName);
        proxyReq.setHeader('X-Original-IP', getClientIp(req));
        
        if (req.user) {
          proxyReq.setHeader('X-User-ID', req.user.id);
          proxyReq.setHeader('X-User-Role', req.user.role);
        }

        if (req.api_key) {
          proxyReq.setHeader('X-API-Key-ID', req.api_key.id);
        }
      },

      // Response interceptor
      onProxyRes: (proxyRes, req: express.Request, res) => {
        const duration = Date.now() - req.start_time;
        
        // Record metrics
        monitoringService.recordGatewayRequest(
          'gateway',
          serviceName,
          proxyRes.statusCode || 0,
          duration / 1000
        );

        // Update load balancer with response time
        const instance = loadBalancer.selectInstance(serviceName);
        if (instance) {
          loadBalancer.recordResponseTime(serviceName, instance.id, duration);
        }
      },

      // Error handler
      onError: (err, req: express.Request, res) => {
        logger.error(`Proxy error for service ${serviceName}:`, err);
        
        // Release load balancer connection
        const instance = loadBalancer.selectInstance(serviceName);
        if (instance) {
          loadBalancer.releaseConnection(serviceName, instance.id);
        }

        // Check if circuit breaker should be used
        circuitBreakerManager.execute(
          serviceName,
          () => Promise.reject(err),
          () => Promise.resolve({
            error: 'Service temporarily unavailable',
            service: serviceName,
            fallback: true
          })
        ).then(result => {
          res.status(503).json(result);
        }).catch(error => {
          res.status(503).json({
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: `Service ${serviceName} is temporarily unavailable`,
              timestamp: new Date().toISOString(),
              request_id: req.request_id
            }
          });
        });
      }
    });
  }

  /**
   * Initialize error handling
   */
  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', error);

      securityLogger.error('Application error', {
        request_id: req.request_id,
        error: error.message,
        stack: error.stack,
        user_id: req.user?.id,
        ip: getClientIp(req)
      });

      if (!res.headersSent) {
        res.status(500).json({
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An internal server error occurred',
            timestamp: new Date().toISOString(),
            request_id: req.request_id
          }
        });
      }
    });
  }

  /**
   * Health check endpoint
   */
  private async healthCheck(req: express.Request, res: express.Response): Promise<void> {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || '1.0.0',
        environment: config.server.environment,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        services: await this.getServicesHealth(),
        dependencies: {
          redis: await redisManager.ping(),
          service_discovery: serviceDiscovery.isServiceAvailable('gateway')
        }
      };

      res.status(200).json(health);
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Readiness check endpoint
   */
  private async readinessCheck(req: express.Request, res: express.Response): Promise<void> {
    try {
      const isReady = await redisManager.ping() && !this.isShuttingDown;
      
      if (isReady) {
        res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
      } else {
        res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
      }
    } catch (error) {
      res.status(503).json({ status: 'not ready', timestamp: new Date().toISOString() });
    }
  }

  /**
   * Liveness check endpoint
   */
  private livenessCheck(req: express.Request, res: express.Response): void {
    res.status(200).json({ 
      status: 'alive', 
      timestamp: new Date().toISOString(),
      pid: process.pid
    });
  }

  /**
   * Metrics endpoint
   */
  private async metricsEndpoint(req: express.Request, res: express.Response): Promise<void> {
    try {
      const metrics = await monitoringService.getMetrics();
      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics);
    } catch (error) {
      logger.error('Error getting metrics:', error);
      res.status(500).send('Error getting metrics');
    }
  }

  /**
   * Dashboard endpoint
   */
  private async dashboardEndpoint(req: express.Request, res: express.Response): Promise<void> {
    try {
      const dashboard = await monitoringService.getDashboardData();
      res.json(dashboard);
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      res.status(500).json({ error: 'Error getting dashboard data' });
    }
  }

  /**
   * Get services endpoint
   */
  private async getServices(req: express.Request, res: express.Response): Promise<void> {
    try {
      const services = serviceDiscovery.getAllServices();
      const servicesData = Array.from(services.entries()).map(([name, instances]) => ({
        name,
        instances: instances.length,
        healthy_instances: instances.filter(i => i.health === 'passing').length,
        instances_detail: instances
      }));

      res.json({ services: servicesData });
    } catch (error) {
      logger.error('Error getting services:', error);
      res.status(500).json({ error: 'Error getting services' });
    }
  }

  /**
   * Get service health endpoint
   */
  private async getServiceHealth(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { serviceName } = req.params;
      const instances = serviceDiscovery.getInstances(serviceName);
      
      if (instances.length === 0) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const healthData = {
        service: serviceName,
        instances: instances.map(instance => ({
          id: instance.id,
          address: `${instance.address}:${instance.port}`,
          health: instance.health,
          last_health_check: instance.last_health_check
        }))
      };

      res.json(healthData);
    } catch (error) {
      logger.error('Error getting service health:', error);
      res.status(500).json({ error: 'Error getting service health' });
    }
  }

  /**
   * Get circuit breakers endpoint
   */
  private getCircuitBreakers(req: express.Request, res: express.Response): void {
    try {
      const breakers = circuitBreakerManager.getHealthStatus();
      res.json({ circuit_breakers: breakers });
    } catch (error) {
      logger.error('Error getting circuit breakers:', error);
      res.status(500).json({ error: 'Error getting circuit breakers' });
    }
  }

  /**
   * Reset circuit breaker endpoint
   */
  private resetCircuitBreaker(req: express.Request, res: express.Response): void {
    try {
      const { service } = req.params;
      circuitBreakerManager.reset(service);
      
      logger.info(`Circuit breaker reset for service: ${service}`);
      res.json({ message: `Circuit breaker reset for service: ${service}` });
    } catch (error) {
      logger.error('Error resetting circuit breaker:', error);
      res.status(500).json({ error: 'Error resetting circuit breaker' });
    }
  }

  /**
   * Handle single file upload
   */
  private handleSingleFileUpload(req: express.Request, res: express.Response): void {
    try {
      const processedFile = req.uploadedFile;
      if (!processedFile) {
        return res.status(400).json({ error: 'No file processed' });
      }

      res.status(201).json({
        message: 'File uploaded successfully',
        file: {
          id: processedFile.original.id,
          filename: processedFile.original.filename,
          size: processedFile.original.size,
          type: processedFile.original.mimetype,
          processed: !!processedFile.processed,
          thumbnails: processedFile.thumbnails?.length || 0
        }
      });
    } catch (error) {
      logger.error('Error handling file upload:', error);
      res.status(500).json({ error: 'Error processing file upload' });
    }
  }

  /**
   * Handle multiple files upload
   */
  private handleMultipleFileUpload(req: express.Request, res: express.Response): void {
    try {
      const processedFiles = req.uploadedFiles;
      if (!processedFiles || processedFiles.length === 0) {
        return res.status(400).json({ error: 'No files processed' });
      }

      const filesData = processedFiles.map(pf => ({
        id: pf.original.id,
        filename: pf.original.filename,
        size: pf.original.size,
        type: pf.original.mimetype,
        processed: !!pf.processed,
        thumbnails: pf.thumbnails?.length || 0
      }));

      res.status(201).json({
        message: 'Files uploaded successfully',
        files: filesData,
        count: filesData.length
      });
    } catch (error) {
      logger.error('Error handling multiple file upload:', error);
      res.status(500).json({ error: 'Error processing file uploads' });
    }
  }

  /**
   * Get file endpoint
   */
  private async getFile(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const file = await fileUploadService.getFile(fileId);

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check if user has access to this file
      if (file.user_id && file.user_id !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      res.sendFile(file.path);
    } catch (error) {
      logger.error('Error getting file:', error);
      res.status(500).json({ error: 'Error retrieving file' });
    }
  }

  /**
   * Delete file endpoint
   */
  private async deleteFile(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { fileId } = req.params;
      const file = await fileUploadService.getFile(fileId);

      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Check if user has access to delete this file
      if (file.user_id && file.user_id !== req.user?.id && req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
      }

      const deleted = await fileUploadService.deleteFile(fileId);
      if (deleted) {
        res.json({ message: 'File deleted successfully' });
      } else {
        res.status(500).json({ error: 'Failed to delete file' });
      }
    } catch (error) {
      logger.error('Error deleting file:', error);
      res.status(500).json({ error: 'Error deleting file' });
    }
  }

  /**
   * Handle not found routes
   */
  private handleNotFound(req: express.Request, res: express.Response): void {
    logger.warn('Route not found', {
      request_id: req.request_id,
      method: req.method,
      path: req.path,
      ip: getClientIp(req)
    });

    res.status(404).json({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString(),
        request_id: req.request_id
      }
    });
  }

  /**
   * Get services health summary
   */
  private async getServicesHealth(): Promise<Record<string, any>> {
    const services = serviceDiscovery.getAllServices();
    const health: Record<string, any> = {};

    for (const [serviceName, instances] of services) {
      const healthyInstances = instances.filter(i => i.health === 'passing').length;
      health[serviceName] = {
        total: instances.length,
        healthy: healthyInstances,
        status: healthyInstances > 0 ? 'available' : 'unavailable'
      };
    }

    return health;
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Initialize Redis connection
      await redisManager.connect();
      
      // Start service discovery
      await serviceDiscovery.start();
      
      // Restore circuit breaker states
      await circuitBreakerManager.restoreStates();

      // Create HTTP server
      this.server = createServer(this.app);

      // Initialize WebSocket proxy if enabled
      if (process.env.WS_ENABLED === 'true') {
        initializeWebSocketProxy(this.server);
        logger.info('WebSocket proxy initialized');
      }

      // Start listening
      const port = config.server.port;
      const host = config.server.host;

      this.server.listen(port, host, () => {
        logger.info(`API Gateway server started on ${host}:${port}`);
        logger.info(`Environment: ${config.server.environment}`);
        logger.info(`Monitoring enabled: ${config.monitoring.prometheus.enabled}`);
        logger.info(`WebSocket enabled: ${process.env.WS_ENABLED === 'true'}`);
      });

      // Handle server errors
      this.server.on('error', (error: any) => {
        logger.error('Server error:', error);
        process.exit(1);
      });

      // Graceful shutdown handling
      process.on('SIGTERM', this.shutdown.bind(this));
      process.on('SIGINT', this.shutdown.bind(this));

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down API Gateway server...');
    this.isShuttingDown = true;

    try {
      // Close server
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => resolve());
        });
      }

      // Shutdown services
      await serviceDiscovery.stop();
      circuitBreakerManager.shutdown();
      monitoringService.shutdown();
      await redisManager.disconnect();

      logger.info('API Gateway server shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Get Express app (for testing)
   */
  getApp(): express.Application {
    return this.app;
  }
}

// Initialize and start server if not in test mode
if (require.main === module) {
  const server = new ApiGatewayServer();
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default ApiGatewayServer;