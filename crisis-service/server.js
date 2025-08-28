/**
 * Enhanced Crisis Management Service
 * Advanced HIPAA-compliant real-time crisis detection and emergency response
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Import core modules
const config = require('./src/config/config');
const logger = require('./src/utils/logger');
const { connectDatabase } = require('./src/database/connection');
const { connectRedis } = require('./src/cache/redis');
const WebSocketManager = require('./src/websocket/manager');
const CrisisDetectionEngine = require('./src/detection/engine');
const EmergencyResponseSystem = require('./src/emergency/response');
const LocationTracker = require('./src/location/tracker');
const PredictionService = require('./src/ml/prediction');
const SafetyToolsService = require('./src/safety/tools');

// Import routes
const crisisRoutes = require('./src/routes/crisis');
const emergencyRoutes = require('./src/routes/emergency');
const locationRoutes = require('./src/routes/location');
const predictionRoutes = require('./src/routes/prediction');
const safetyRoutes = require('./src/routes/safety');
const healthRoutes = require('./src/routes/health');

class CrisisService {
    constructor() {
        this.app = express();
        this.server = createServer(this.app);
        this.io = new Server(this.server, {
            cors: {
                origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
                credentials: true
            }
        });
        
        this.initializeServices();
    }

    async initializeServices() {
        try {
            // Initialize core services
            await this.setupSecurity();
            await this.setupMiddleware();
            await this.connectDatabases();
            await this.initializeDetection();
            await this.setupRoutes();
            await this.startServer();
            
            logger.info('Crisis service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize crisis service:', error);
            process.exit(1);
        }
    }

    async setupSecurity() {
        // Security headers
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'"],
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
            hsts: {
                maxAge: 31536000,
                includeSubDomains: true,
                preload: true
            }
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 1000, // limit each IP to 1000 requests per windowMs
            message: {
                error: 'Too many requests from this IP, please try again later.',
                retryAfter: '15 minutes'
            },
            standardHeaders: true,
            legacyHeaders: false,
        });

        // Emergency endpoints have higher limits
        const emergencyLimiter = rateLimit({
            windowMs: 1 * 60 * 1000, // 1 minute
            max: 100, // Higher limit for emergency endpoints
            skip: (req) => {
                // Skip rate limiting for critical emergency calls
                return req.headers['x-emergency-override'] === process.env.EMERGENCY_OVERRIDE_KEY;
            }
        });

        this.app.use('/api/emergency', emergencyLimiter);
        this.app.use('/api/crisis/alert', emergencyLimiter);
        this.app.use(limiter);
    }

    async setupMiddleware() {
        // CORS
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Emergency-Override']
        }));

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging
        this.app.use((req, res, next) => {
            const start = Date.now();
            res.on('finish', () => {
                const duration = Date.now() - start;
                logger.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
                
                // Log emergency requests specially
                if (req.path.includes('/emergency') || req.path.includes('/crisis/alert')) {
                    logger.emergency(`EMERGENCY REQUEST: ${req.method} ${req.path} - Response: ${duration}ms`, {
                        ip: req.ip,
                        userAgent: req.get('user-agent'),
                        body: req.body
                    });
                }
            });
            next();
        });
    }

    async connectDatabases() {
        // Connect to PostgreSQL
        await connectDatabase();
        
        // Connect to Redis
        await connectRedis();
        
        logger.info('Database connections established');
    }

    async initializeDetection() {
        // Initialize WebSocket manager
        this.wsManager = new WebSocketManager(this.io);
        
        // Initialize crisis detection engine
        this.detectionEngine = new CrisisDetectionEngine();
        await this.detectionEngine.initialize();
        
        // Initialize emergency response system
        this.emergencyResponse = new EmergencyResponseSystem();
        await this.emergencyResponse.initialize();
        
        // Initialize location tracker
        this.locationTracker = new LocationTracker();
        
        // Initialize ML prediction service
        this.predictionService = new PredictionService();
        await this.predictionService.initialize();
        
        // Initialize safety tools
        this.safetyTools = new SafetyToolsService();
        
        // Connect services
        this.detectionEngine.on('crisis-detected', (crisis) => {
            this.handleCrisisDetected(crisis);
        });
        
        this.emergencyResponse.on('escalation-triggered', (escalation) => {
            this.wsManager.broadcastToUser(escalation.userId, 'escalation-update', escalation);
        });
        
        logger.info('Crisis detection and response systems initialized');
    }

    async handleCrisisDetected(crisis) {
        try {
            const startTime = Date.now();
            
            // Log crisis detection
            logger.emergency('Crisis detected', crisis);
            
            // Start emergency response
            const response = await this.emergencyResponse.triggerResponse(crisis);
            
            // Broadcast to real-time clients
            this.wsManager.broadcastToUser(crisis.userId, 'crisis-alert', {
                ...crisis,
                response,
                responseTime: Date.now() - startTime
            });
            
            // Ensure sub-500ms response time
            const responseTime = Date.now() - startTime;
            if (responseTime > 500) {
                logger.warn(`Crisis response time exceeded 500ms: ${responseTime}ms`);
            }
            
        } catch (error) {
            logger.error('Failed to handle crisis detection:', error);
        }
    }

    setupRoutes() {
        // Health check (must be first)
        this.app.use('/health', healthRoutes);
        
        // API routes
        this.app.use('/api/crisis', crisisRoutes);
        this.app.use('/api/emergency', emergencyRoutes);
        this.app.use('/api/location', locationRoutes);
        this.app.use('/api/prediction', predictionRoutes);
        this.app.use('/api/safety', safetyRoutes);
        
        // Error handling middleware
        this.app.use((err, req, res, next) => {
            logger.error('Unhandled error:', err);
            
            // Don't expose internal errors in production
            const isDevelopment = process.env.NODE_ENV === 'development';
            
            res.status(err.status || 500).json({
                error: 'Internal server error',
                message: isDevelopment ? err.message : 'An unexpected error occurred',
                ...(isDevelopment && { stack: err.stack }),
                timestamp: new Date().toISOString(),
                requestId: req.headers['x-request-id']
            });
        });
        
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not found',
                message: `Route ${req.method} ${req.originalUrl} not found`,
                timestamp: new Date().toISOString()
            });
        });
    }

    async startServer() {
        const port = config.port;
        
        this.server.listen(port, () => {
            logger.info(`Crisis service running on port ${port}`);
            logger.info(`Environment: ${config.environment}`);
            logger.info(`Health check: http://localhost:${port}/health`);
            
            // Setup graceful shutdown
            this.setupGracefulShutdown();
        });
    }

    setupGracefulShutdown() {
        const gracefulShutdown = async (signal) => {
            logger.info(`Received ${signal}, starting graceful shutdown`);
            
            // Stop accepting new connections
            this.server.close(async () => {
                logger.info('HTTP server closed');
                
                try {
                    // Close database connections
                    await this.closeConnections();
                    logger.info('All connections closed');
                    process.exit(0);
                } catch (error) {
                    logger.error('Error during shutdown:', error);
                    process.exit(1);
                }
            });
            
            // Force close after 10 seconds
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };
        
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    }

    async closeConnections() {
        // Close WebSocket connections
        if (this.wsManager) {
            await this.wsManager.close();
        }
        
        // Close detection engine
        if (this.detectionEngine) {
            await this.detectionEngine.close();
        }
        
        // Close emergency response system
        if (this.emergencyResponse) {
            await this.emergencyResponse.close();
        }
        
        // Close database connections will be handled by connection modules
    }
}

// Start the service
const crisisService = new CrisisService();
// startServer is called in initializeServices()

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = CrisisService;