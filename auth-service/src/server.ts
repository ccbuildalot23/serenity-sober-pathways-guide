import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import { logger, httpLogger, auditLogger } from './config/logger';
import { database, initializeDatabase } from './config/database';
import { redis } from './config/redis';

// Import routes
import authRoutes from './routes/auth.routes';
import mfaRoutes from './routes/mfa.routes';
import adminRoutes from './routes/admin.routes';
import healthRoutes from './routes/health.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logging.middleware';
import { securityHeaders } from './middleware/security.middleware';
import { rateLimiter } from './middleware/rateLimit.middleware';

class AuthServer {
  private app: express.Application;
  private port: number;
  private server: any;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '3001');
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);

    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }));

    // CORS configuration
    const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
    this.app.use(cors({
      origin: corsOrigins,
      credentials: process.env.CORS_CREDENTIALS === 'true',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Compression
    this.app.use(compression());

    // Security sanitization
    this.app.use(mongoSanitize());
    this.app.use(hpp());

    // Custom security headers
    this.app.use(securityHeaders);

    // Request logging
    this.app.use(requestLogger);

    // Global rate limiting
    this.app.use(rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      message: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later.',
        },
        timestamp: new Date().toISOString(),
        requestId: 'global-rate-limit',
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        auditLogger.securityEvent('global_rate_limit_exceeded', 'medium', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          method: req.method,
        });

        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later.',
          },
          timestamp: new Date().toISOString(),
          requestId: req.get('X-Request-ID') || 'unknown',
        });
      },
    }));

    // API-specific rate limiting
    this.app.use('/api', rateLimiter);
  }

  private setupRoutes(): void {
    const apiVersion = process.env.API_VERSION || 'v1';

    // Health check (no versioning)
    this.app.use('/health', healthRoutes);

    // API routes with versioning
    this.app.use(`/api/${apiVersion}/auth`, authRoutes);
    this.app.use(`/api/${apiVersion}/mfa`, mfaRoutes);
    this.app.use(`/api/${apiVersion}/admin`, adminRoutes);

    // Root endpoint
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Serenity Authentication Service',
        version: process.env.npm_package_version || '1.0.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        apiVersion,
        endpoints: {
          health: '/health',
          auth: `/api/${apiVersion}/auth`,
          mfa: `/api/${apiVersion}/mfa`,
          admin: `/api/${apiVersion}/admin`,
        },
      });
    });

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Endpoint not found',
        },
        timestamp: new Date().toISOString(),
        requestId: req.get('X-Request-ID') || 'unknown',
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler (must be last)
    this.app.use(errorHandler);

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', {
        promise,
        reason,
        stack: reason instanceof Error ? reason.stack : undefined,
      });
      
      auditLogger.securityEvent('unhandled_promise_rejection', 'high', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error('Uncaught Exception:', {
        error: err.message,
        stack: err.stack,
      });
      
      auditLogger.securityEvent('uncaught_exception', 'critical', {
        error: err.message,
        stack: err.stack,
      });

      // Graceful shutdown
      this.shutdown();
    });

    // Handle process termination signals
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      this.shutdown();
    });

    process.on('SIGINT', () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      this.shutdown();
    });
  }

  async start(): Promise<void> {
    try {
      // Initialize database
      await database.connect();
      await initializeDatabase();
      logger.info('Database initialized successfully');

      // Initialize Redis
      await redis.connect();
      logger.info('Redis connected successfully');

      // Start server
      this.server = this.app.listen(this.port, () => {
        logger.info(`Authentication service started successfully`, {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          nodeVersion: process.version,
          timestamp: new Date().toISOString(),
        });

        auditLogger.log('service_started', {
          port: this.port,
          environment: process.env.NODE_ENV || 'development',
          version: process.env.npm_package_version || '1.0.0',
        });
      });

      // Handle server errors
      this.server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${this.port} is already in use`);
        } else {
          logger.error('Server error:', error);
        }
        process.exit(1);
      });

      // Setup periodic cleanup tasks
      this.setupCleanupTasks();

    } catch (error) {
      logger.error('Failed to start authentication service:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      process.exit(1);
    }
  }

  private setupCleanupTasks(): void {
    // JWT token cleanup (every hour)
    setInterval(async () => {
      try {
        const { jwtService } = await import('./services/jwt.service');
        await jwtService.cleanupExpiredTokens();
      } catch (error) {
        logger.error('JWT cleanup task failed:', error);
      }
    }, 3600000);

    // Password reset token cleanup (every hour)
    setInterval(async () => {
      try {
        const { passwordService } = await import('./services/password.service');
        await passwordService.cleanupExpiredTokens();
      } catch (error) {
        logger.error('Password reset token cleanup task failed:', error);
      }
    }, 3600000);

    // Session cleanup (every 30 minutes)
    setInterval(async () => {
      try {
        await database.query(
          'DELETE FROM sessions WHERE expires_at < NOW() OR revoked_at IS NOT NULL'
        );
      } catch (error) {
        logger.error('Session cleanup task failed:', error);
      }
    }, 1800000);

    logger.info('Cleanup tasks scheduled successfully');
  }

  private async shutdown(): Promise<void> {
    logger.info('Shutting down authentication service...');

    auditLogger.log('service_shutdown_initiated', {
      timestamp: new Date().toISOString(),
    });

    // Close server
    if (this.server) {
      this.server.close(() => {
        logger.info('HTTP server closed');
      });
    }

    // Close database connections
    try {
      await database.close();
      logger.info('Database connections closed');
    } catch (error) {
      logger.error('Error closing database:', error);
    }

    // Close Redis connection
    try {
      await redis.disconnect();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis:', error);
    }

    logger.info('Authentication service shut down complete');
    process.exit(0);
  }

  getApp(): express.Application {
    return this.app;
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new AuthServer();
  server.start().catch((error) => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });
}

export { AuthServer };
export default AuthServer;