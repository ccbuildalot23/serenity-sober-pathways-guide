import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { createServer } from 'http';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { database } from '@/models/database';
import { queueService } from '@/services/QueueService';
import { inAppService } from '@/services/channels/InAppService';
import { templateService } from '@/services/TemplateService';

// Import middleware
import {
  generalLimiter,
  healthCheckLimiter,
  cleanup as cleanupRateLimit
} from '@/middleware/rateLimiter';
import {
  authenticateJWT,
  authenticateService,
  optionalAuth,
  requirePermissions,
  requireRole,
  requireHipaaAuthorization,
  requireUserOwnership
} from '@/middleware/auth';
import {
  handleValidationErrors,
  validateNotificationRequest,
  validateBulkNotificationRequest,
  validateTemplateCreation,
  validateTemplateUpdate,
  validateUserPreferences,
  validateNotificationQuery,
  validateUUIDParam,
  validateUserIdParam,
  validateDeviceToken,
  validateMarkAsRead,
  validateMetricsQuery,
  validateHipaaAccess,
  sanitizeInput
} from '@/middleware/validation';

// Import controllers
import { notificationController } from '@/controllers/NotificationController';
import { templateController } from '@/controllers/TemplateController';
import { userPreferencesController } from '@/controllers/UserPreferencesController';
import { healthController } from '@/controllers/HealthController';

class NotificationServer {
  private app: express.Application;
  private httpServer: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
          'http://localhost:3000',
          'http://localhost:8080',
          'https://serenity.com'
        ];
        
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Service-Name', 'X-Service-Token']
    }));

    // Compression and parsing
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    if (config.monitoring.enableRequestLogging) {
      this.app.use((req, res, next) => {
        const start = Date.now();
        
        res.on('finish', () => {
          const duration = Date.now() - start;
          logger.info('Request completed', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
            requestId: req.headers['x-request-id']
          });
        });

        next();
      });
    }

    // Add request ID if not present
    this.app.use((req, res, next) => {
      if (!req.headers['x-request-id']) {
        req.headers['x-request-id'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      res.set('X-Request-ID', req.headers['x-request-id'] as string);
      next();
    });

    // Input sanitization
    this.app.use(sanitizeInput);

    // Rate limiting
    this.app.use('/health', healthCheckLimiter);
    this.app.use(generalLimiter);
  }

  private setupRoutes(): void {
    // Health check routes (no authentication required)
    this.app.get('/health', healthController.healthCheck.bind(healthController));
    this.app.get('/health/ready', healthController.readinessCheck.bind(healthController));
    this.app.get('/health/live', healthController.livenessCheck.bind(healthController));
    this.app.get('/metrics', optionalAuth, healthController.getMetrics.bind(healthController));

    // API version prefix
    const apiRouter = express.Router();

    // Notification routes
    const notificationRouter = express.Router();

    // Send single notification
    notificationRouter.post('/send',
      authenticateJWT,
      validateNotificationRequest,
      handleValidationErrors,
      requirePermissions(['notifications:send']),
      notificationController.sendNotification.bind(notificationController)
    );

    // Send bulk notifications
    notificationRouter.post('/bulk',
      authenticateJWT,
      validateBulkNotificationRequest,
      handleValidationErrors,
      requirePermissions(['notifications:bulk']),
      notificationController.sendBulkNotifications.bind(notificationController)
    );

    // Get notification status
    notificationRouter.get('/status/:id',
      optionalAuth,
      validateUUIDParam('id'),
      handleValidationErrors,
      notificationController.getNotificationStatus.bind(notificationController)
    );

    // Get user notifications
    notificationRouter.get('/user/:userId',
      authenticateJWT,
      validateUserIdParam,
      validateNotificationQuery,
      handleValidationErrors,
      requireUserOwnership('userId'),
      notificationController.getUserNotifications.bind(notificationController)
    );

    // Mark notification as read
    notificationRouter.put('/:id/read',
      authenticateJWT,
      validateMarkAsRead,
      handleValidationErrors,
      notificationController.markNotificationAsRead.bind(notificationController)
    );

    // Retry notification
    notificationRouter.post('/:id/retry',
      authenticateJWT,
      validateUUIDParam('id'),
      handleValidationErrors,
      requirePermissions(['notifications:retry']),
      notificationController.retryNotification.bind(notificationController)
    );

    // Cancel notification
    notificationRouter.delete('/:id',
      authenticateJWT,
      validateUUIDParam('id'),
      handleValidationErrors,
      requirePermissions(['notifications:cancel']),
      notificationController.cancelNotification.bind(notificationController)
    );

    // Get notification metrics
    notificationRouter.get('/metrics',
      authenticateJWT,
      validateMetricsQuery,
      handleValidationErrors,
      requireRole(['admin', 'provider']),
      notificationController.getNotificationMetrics.bind(notificationController)
    );

    // Template routes
    const templateRouter = express.Router();

    // Get template
    templateRouter.get('/:id',
      authenticateJWT,
      validateUUIDParam('id'),
      handleValidationErrors,
      templateController.getTemplate.bind(templateController)
    );

    // Get templates by type
    templateRouter.get('/type/:type',
      authenticateJWT,
      handleValidationErrors,
      templateController.getTemplatesByType.bind(templateController)
    );

    // Create template
    templateRouter.post('/',
      authenticateJWT,
      validateTemplateCreation,
      handleValidationErrors,
      requirePermissions(['templates:create']),
      templateController.createTemplate.bind(templateController)
    );

    // Update template
    templateRouter.put('/:id',
      authenticateJWT,
      validateUUIDParam('id'),
      validateTemplateUpdate,
      handleValidationErrors,
      requirePermissions(['templates:update']),
      templateController.updateTemplate.bind(templateController)
    );

    // Delete template
    templateRouter.delete('/:id',
      authenticateJWT,
      validateUUIDParam('id'),
      handleValidationErrors,
      requirePermissions(['templates:delete']),
      templateController.deleteTemplate.bind(templateController)
    );

    // Render template
    templateRouter.post('/:id/render',
      authenticateJWT,
      validateUUIDParam('id'),
      handleValidationErrors,
      templateController.renderTemplate.bind(templateController)
    );

    // Preview template
    templateRouter.post('/preview',
      authenticateJWT,
      handleValidationErrors,
      templateController.previewTemplate.bind(templateController)
    );

    // Extract template variables
    templateRouter.post('/variables',
      authenticateJWT,
      handleValidationErrors,
      templateController.getTemplateVariables.bind(templateController)
    );

    // Clone template
    templateRouter.post('/:id/clone',
      authenticateJWT,
      validateUUIDParam('id'),
      handleValidationErrors,
      requirePermissions(['templates:create']),
      templateController.cloneTemplate.bind(templateController)
    );

    // User preferences routes
    const preferencesRouter = express.Router();

    // Get user preferences
    preferencesRouter.get('/:userId',
      authenticateJWT,
      validateUserIdParam,
      handleValidationErrors,
      requireUserOwnership('userId'),
      userPreferencesController.getUserPreferences.bind(userPreferencesController)
    );

    // Update user preferences
    preferencesRouter.put('/:userId',
      authenticateJWT,
      validateUserIdParam,
      validateUserPreferences,
      handleValidationErrors,
      requireUserOwnership('userId'),
      userPreferencesController.updateUserPreferences.bind(userPreferencesController)
    );

    // Add device token
    preferencesRouter.post('/:userId/device-tokens',
      authenticateJWT,
      validateUserIdParam,
      validateDeviceToken,
      handleValidationErrors,
      requireUserOwnership('userId'),
      userPreferencesController.addDeviceToken.bind(userPreferencesController)
    );

    // Remove device token
    preferencesRouter.delete('/:userId/device-tokens',
      authenticateJWT,
      validateUserIdParam,
      validateDeviceToken,
      handleValidationErrors,
      requireUserOwnership('userId'),
      userPreferencesController.removeDeviceToken.bind(userPreferencesController)
    );

    // Update notification type preference
    preferencesRouter.put('/:userId/types/:type',
      authenticateJWT,
      validateUserIdParam,
      handleValidationErrors,
      requireUserOwnership('userId'),
      userPreferencesController.updateNotificationTypePreference.bind(userPreferencesController)
    );

    // Verify contact method
    preferencesRouter.put('/:userId/verify/:method',
      authenticateJWT,
      validateUserIdParam,
      handleValidationErrors,
      requireUserOwnership('userId'),
      userPreferencesController.verifyContactMethod.bind(userPreferencesController)
    );

    // Delete user preferences
    preferencesRouter.delete('/:userId',
      authenticateJWT,
      validateUserIdParam,
      handleValidationErrors,
      requireUserOwnership('userId'),
      userPreferencesController.deleteUserPreferences.bind(userPreferencesController)
    );

    // Export user preferences
    preferencesRouter.get('/:userId/export',
      authenticateJWT,
      validateUserIdParam,
      handleValidationErrors,
      requireUserOwnership('userId'),
      userPreferencesController.exportUserPreferences.bind(userPreferencesController)
    );

    // Bulk preferences (admin only)
    preferencesRouter.post('/bulk',
      authenticateJWT,
      requireRole(['admin']),
      userPreferencesController.getBulkUserPreferences.bind(userPreferencesController)
    );

    // HIPAA protected routes
    const hipaaRouter = express.Router();
    hipaaRouter.use(validateHipaaAccess);
    hipaaRouter.use(requireHipaaAuthorization);

    // Add HIPAA routes here if needed

    // Service-to-service routes
    const serviceRouter = express.Router();
    serviceRouter.use(authenticateService);

    // Service notification endpoint
    serviceRouter.post('/notifications/send',
      validateNotificationRequest,
      handleValidationErrors,
      notificationController.sendNotification.bind(notificationController)
    );

    // Mount routers
    apiRouter.use('/notifications', notificationRouter);
    apiRouter.use('/templates', templateRouter);
    apiRouter.use('/preferences', preferencesRouter);
    apiRouter.use('/hipaa', hipaaRouter);
    apiRouter.use('/service', serviceRouter);

    this.app.use('/api/v1', apiRouter);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Serenity Notification Service',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        docs: '/api/v1/docs'
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Route ${req.method} ${req.originalUrl} not found`
        }
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error', {
        error: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        body: req.body,
        headers: req.headers
      });

      // Don't expose internal errors in production
      const message = config.env === 'production' 
        ? 'Internal server error' 
        : err.message;

      res.status(err.status || 500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message
        }
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', { error });
      process.exit(1);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
      process.exit(1);
    });
  }

  async start(): Promise<void> {
    try {
      // Initialize services
      logger.info('Initializing notification service...');

      // Test database connection
      await database.healthCheck();
      logger.info('Database connection established');

      // Initialize default templates
      await templateService.initializeDefaultTemplates();
      logger.info('Default templates initialized');

      // Create HTTP server
      this.httpServer = createServer(this.app);

      // Initialize Socket.IO for in-app notifications
      inAppService.initializeSocketServer(this.httpServer);
      logger.info('Socket.IO server initialized');

      // Start server
      this.httpServer.listen(config.port, config.host, () => {
        logger.info(`Notification service started`, {
          port: config.port,
          host: config.host,
          env: config.env,
          version: '1.0.0'
        });
      });

      // Graceful shutdown
      this.setupGracefulShutdown();

    } catch (error) {
      logger.error('Failed to start notification service', { error });
      process.exit(1);
    }
  }

  private setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      // Stop accepting new connections
      if (this.httpServer) {
        this.httpServer.close(async () => {
          logger.info('HTTP server closed');

          try {
            // Close all services
            await Promise.all([
              queueService.close(),
              inAppService.close(),
              database.close(),
              cleanupRateLimit()
            ]);

            logger.info('All services closed successfully');
            process.exit(0);
          } catch (error) {
            logger.error('Error during graceful shutdown', { error });
            process.exit(1);
          }
        });
      }

      // Force exit after 30 seconds
      setTimeout(() => {
        logger.error('Graceful shutdown timeout, forcing exit');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new NotificationServer();
  server.start().catch((error) => {
    logger.error('Failed to start server', { error });
    process.exit(1);
  });
}

export default NotificationServer;