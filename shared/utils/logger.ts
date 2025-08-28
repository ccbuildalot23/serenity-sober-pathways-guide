import winston from 'winston';

export const createLogger = (serviceName: string) => {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: serviceName },
    transports: [
      new winston.transports.File({ 
        filename: `logs/${serviceName}-error.log`, 
        level: 'error' 
      }),
      new winston.transports.File({ 
        filename: `logs/${serviceName}-combined.log` 
      }),
    ],
  });
};

if (process.env.NODE_ENV !== 'production') {
  const consoleTransport = new winston.transports.Console({
    format: winston.format.simple()
  });
  
  // Add console transport to existing loggers if needed
}
