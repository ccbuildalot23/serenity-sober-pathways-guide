import cluster from 'cluster';
import os from 'os';
import { App } from './app';
import { config } from './config/config';
import { logger } from './utils/logger';

// Handle graceful shutdown
const gracefulShutdown = async (app: App, signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, config.app.gracefulShutdownTimeout);
  
  try {
    await app.stop();
    clearTimeout(shutdownTimeout);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
};

// Start single worker
const startWorker = async (): Promise<void> => {
  try {
    const app = new App();
    
    // Setup signal handlers for graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(app, 'SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown(app, 'SIGINT'));
    
    // Handle worker-specific shutdown in cluster mode
    if (cluster.isWorker) {
      process.on('message', (msg) => {
        if (msg === 'shutdown') {
          gracefulShutdown(app, 'CLUSTER_SHUTDOWN');
        }
      });
    }
    
    await app.start();
    
    logger.info(`Worker ${process.pid} started successfully`);
  } catch (error) {
    logger.error('Failed to start worker:', error);
    process.exit(1);
  }
};

// Main entry point
const main = async (): Promise<void> => {
  try {
    // Determine number of workers
    const numWorkers = config.app.clusterWorkers || os.cpus().length;
    
    if (config.app.env === 'production' && numWorkers > 1) {
      // Cluster mode for production
      if (cluster.isPrimary) {
        logger.info(`Starting ${numWorkers} workers...`);
        
        // Fork workers
        for (let i = 0; i < numWorkers; i++) {
          const worker = cluster.fork();
          logger.info(`Started worker ${worker.process.pid}`);
        }
        
        // Handle worker exits
        cluster.on('exit', (worker, code, signal) => {
          logger.warn(`Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
          
          if (!worker.exitedAfterDisconnect) {
            logger.info('Starting a new worker...');
            const newWorker = cluster.fork();
            logger.info(`Started replacement worker ${newWorker.process.pid}`);
          }
        });
        
        // Graceful shutdown for cluster master
        const shutdownCluster = async (signal: string) => {
          logger.info(`Received ${signal}. Shutting down cluster...`);
          
          // Disconnect all workers
          for (const id in cluster.workers) {
            const worker = cluster.workers[id];
            if (worker) {
              worker.send('shutdown');
              worker.disconnect();
            }
          }
          
          // Wait for workers to exit
          const timeout = setTimeout(() => {
            logger.warn('Some workers did not exit gracefully, forcing kill');
            for (const id in cluster.workers) {
              const worker = cluster.workers[id];
              if (worker && !worker.isDead()) {
                worker.kill('SIGKILL');
              }
            }
            process.exit(1);
          }, config.app.gracefulShutdownTimeout);
          
          cluster.on('exit', () => {
            const aliveWorkers = Object.values(cluster.workers || {})
              .filter(worker => worker && !worker.isDead()).length;
            
            if (aliveWorkers === 0) {
              clearTimeout(timeout);
              logger.info('All workers shut down successfully');
              process.exit(0);
            }
          });
        };
        
        process.on('SIGTERM', () => shutdownCluster('SIGTERM'));
        process.on('SIGINT', () => shutdownCluster('SIGINT'));
        
        logger.info('Cluster master started');
      } else {
        // Worker process
        await startWorker();
      }
    } else {
      // Single process mode
      logger.info('Starting in single process mode...');
      await startWorker();
    }
  } catch (error) {
    logger.error('Failed to start notification service:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error starting application:', error);
    process.exit(1);
  });
}

export { App };