import dotenv from 'dotenv';
import { app } from './app';
import { logger } from './utils/logger';
import { initializeDatabase } from './config/database';
import { initializeWebSocket } from './services/websocket.service';
import { startScheduledJobs } from './services/scheduler.service';
import http from 'http';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket for real-time features
initializeWebSocket(server);

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Start server
const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase();
    logger.info('Database connection established');
    
    // Start scheduled jobs (reminders, notifications, etc.)
    startScheduledJobs();
    logger.info('Scheduled jobs started');
    
    // Start listening
    server.listen(PORT, () => {
      logger.info(`
        ╔═══════════════════════════════════════════╗
        ║     SERENITY BACKEND SERVER STARTED      ║
        ╠═══════════════════════════════════════════╣
        ║                                           ║
        ║  Environment: ${process.env.NODE_ENV || 'development'}              ║
        ║  Port: ${PORT}                               ║
        ║  API URL: http://localhost:${PORT}/api       ║
        ║  Health: http://localhost:${PORT}/health     ║
        ║                                           ║
        ║  Features:                                ║
        ║  ✅ Authentication & Authorization        ║
        ║  ✅ Daily Check-ins & Tracking           ║
        ║  ✅ Crisis Support System                ║
        ║  ✅ Provider Dashboard                   ║
        ║  ✅ Billing Automation                   ║
        ║  ✅ Real-time Notifications              ║
        ║  ✅ HIPAA Compliant                      ║
        ║                                           ║
        ╚═══════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();