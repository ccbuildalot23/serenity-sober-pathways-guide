import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config, validateConfig, corsOptions, helmetOptions } from '@/config/config';
import { createRequestLogger } from '@/utils/logger';
import logger, { auditLogger, errorLogger } from '@/utils/logger';
import { db } from '@/database/connection';
import { DatabaseMigrator } from '@/database/migrate';
import { defaultRateLimiter, emergencyBypass } from '@/middleware/rateLimiter';
import { sanitizeInput } from '@/middleware/validation';

// Import routes
import auditRoutes from '@/routes/auditRoutes';
import healthRoutes from '@/routes/healthRoutes';

class SecurityService {
  private app: express.Application;
  private server: any;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet(helmetOptions));
    this.app.use(cors(corsOptions));

    // Emergency rate limit bypass (must be before rate limiting)
    this.app.use(emergencyBypass);

    // Rate limiting
    this.app.use(defaultRateLimiter);

    // Body parsing and compression
    this.app.use(express.json({ limit: config.performance.maxRequestSize }));
    this.app.use(express.urlencoded({ extended: true, limit: config.performance.maxRequestSize }));
    this.app.use(compression());

    // Request logging
    if (config.nodeEnv === 'development') {
      this.app.use(morgan('dev'));
    }
    this.app.use(createRequestLogger());

    // Input sanitization
    this.app.use(sanitizeInput);

    // Request timeout
    this.app.use((req, res, next) => {
      const timeout = setTimeout(() => {
        if (!res.headersSent) {
          errorLogger.application(new Error('Request timeout'), {
            component: 'SecurityService',
            operation: 'requestTimeout',
            url: req.url,
            method: req.method,
          });

          res.status(408).json({
            success: false,
            error: {
              code: 'REQUEST_TIMEOUT',
              message: 'Request timeout',
            },
            timestamp: new Date().toISOString(),
            request_id: req.requestId,
          });
        }
      }, config.performance.requestTimeout);

      res.on('finish', () => {
        clearTimeout(timeout);
      });

      next();
    });
  }

  private initializeRoutes(): void {
    // Health check routes (no API prefix for Kubernetes)
    this.app.use('/', healthRoutes);

    // API routes
    this.app.use('/api/v1/audit', auditRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: config.serviceName,
        version: config.serviceVersion,
        status: 'running',
        environment: config.nodeEnv,
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          detailed_health: '/api/v1/health',
          audit_logs: '/api/v1/audit/logs',
          audit_search: '/api/v1/audit/search',
          create_audit: '/api/v1/audit/log',
        },
        documentation: 'See README.md for API documentation',
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'ENDPOINT_NOT_FOUND',
          message: `Endpoint ${req.method} ${req.originalUrl} not found`,
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    });
  }

  private initializeErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      errorLogger.application(error, {
        component: 'SecurityService',
        operation: 'globalErrorHandler',
        url: req.url,
        method: req.method,
        user_id: req.user?.id,
        request_id: req.requestId,
      });

      // Don't send error details in production
      const isDevelopment = config.nodeEnv === 'development';

      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
          details: isDevelopment ? error.message : undefined,
          stack: isDevelopment ? error.stack : undefined,
        },
        timestamp: new Date().toISOString(),
        request_id: req.requestId,
      });
    });

    // Unhandled promise rejection handler
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled promise rejection', {
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : undefined,
        promise: promise.toString(),
      });

      // Don't exit in production, just log
      if (config.nodeEnv === 'development') {
        process.exit(1);
      }
    });

    // Uncaught exception handler
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught exception', {
        error: error.message,
        stack: error.stack,
      });

      // Give time for logs to be written
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, starting graceful shutdown');
      this.gracefulShutdown();
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, starting graceful shutdown');
      this.gracefulShutdown();
    });
  }

  private async gracefulShutdown(): Promise<void> {
    try {
      logger.info('Starting graceful shutdown...');

      // Stop accepting new connections
      if (this.server) {
        this.server.close((error: Error | undefined) => {
          if (error) {
            logger.error('Error closing server', { error: error.message });
          } else {
            logger.info('Server closed successfully');
          }
        });
      }

      // Close database connections
      await db.close();
      logger.info('Database connections closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      logger.error('Error during graceful shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();
      logger.info('Configuration validated successfully');

      // Initialize database
      const migrator = new DatabaseMigrator();
      const isReady = await db.isReady();
      
      if (!isReady) {
        logger.info('Database not ready, initializing schema...');
        await migrator.initializeSchema();
      } else {
        logger.info('Database ready, running migrations...');
        await migrator.migrate();
      }

      // Start server
      this.server = this.app.listen(config.port, () => {
        logger.info(`Security Service started successfully`, {
          service: config.serviceName,
          version: config.serviceVersion,
          port: config.port,
          environment: config.nodeEnv,
          endpoints: {
            health: `http://localhost:${config.port}/health`,
            audit: `http://localhost:${config.port}/api/v1/audit`,
          },
        });

        // Log service startup
        auditLogger.securityEvent('SERVICE_STARTUP', 'LOW', {
          service: config.serviceName,
          version: config.serviceVersion,
          port: config.port,
          environment: config.nodeEnv,
        });
      });

      // Handle server errors
      this.server.on('error', (error: Error) => {
        logger.error('Server error', {
          error: error.message,
          stack: error.stack,
        });
      });

    } catch (error) {
      logger.error('Failed to start Security Service', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.exit(1);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }

  public async stop(): Promise<void> {
    await this.gracefulShutdown();
  }
}

// Start the service if this file is run directly
if (require.main === module) {
  const service = new SecurityService();
  service.start().catch((error) => {
    console.error('Failed to start Security Service:', error);
    process.exit(1);
  });
}

export default SecurityService;