import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import config from '@config/index';

const { level, format, output, file_path, max_files, max_size } = config.monitoring.logging;

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for different log levels
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(colors);

// Create log format based on configuration
const logFormat = format === 'json' 
  ? winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.metadata()
    )
  : winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
      winston.format.errors({ stack: true }),
      winston.format.colorize({ all: true }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let metaStr = '';
        if (Object.keys(meta).length > 0) {
          metaStr = ` ${JSON.stringify(meta)}`;
        }
        return `${timestamp} [${level}]: ${message}${metaStr}`;
      })
    );

// Create transports based on configuration
const transports: winston.transport[] = [];

if (output === 'console' || output === 'both') {
  transports.push(
    new winston.transports.Console({
      level,
      format: logFormat
    })
  );
}

if (output === 'file' || output === 'both') {
  transports.push(
    new DailyRotateFile({
      filename: file_path || 'logs/gateway-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: max_size || '20m',
      maxFiles: max_files || '14d',
      level,
      format: logFormat
    })
  );

  // Separate error log file
  transports.push(
    new DailyRotateFile({
      filename: 'logs/gateway-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: max_size || '20m',
      maxFiles: max_files || '14d',
      level: 'error',
      format: logFormat
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level,
  levels,
  format: logFormat,
  transports,
  exitOnError: false
});

// Create child logger with context
export const createLogger = (context: string) => {
  return logger.child({ context });
};

// HTTP request logger middleware
export const httpLogger = winston.createLogger({
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/gateway-http-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

// Security logger for audit trails
export const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.metadata()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/gateway-security-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d' // Keep security logs longer
    })
  ]
});

// Performance logger for metrics
export const performanceLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: 'logs/gateway-performance-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '7d'
    })
  ]
});

export default logger;