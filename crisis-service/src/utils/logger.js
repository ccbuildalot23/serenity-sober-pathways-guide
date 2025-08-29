/**
 * HIPAA-Compliant Logging System
 * Structured logging with audit trail capabilities
 */

const winston = require('winston');
const path = require('path');
const config = require('../config/config');

// Custom log levels for healthcare/crisis management
const customLevels = {
    levels: {
        emergency: 0,    // Crisis situations
        alert: 1,        // High-severity events
        critical: 2,     // Critical system issues
        error: 3,        // Standard errors
        warn: 4,         // Warnings
        notice: 5,       // Normal but significant
        info: 6,         // Informational messages
        debug: 7         // Debug-level messages
    },
    colors: {
        emergency: 'red bold',
        alert: 'red',
        critical: 'magenta',
        error: 'red',
        warn: 'yellow',
        notice: 'cyan',
        info: 'green',
        debug: 'blue'
    }
};

winston.addColors(customLevels.colors);

// Custom format for HIPAA compliance
const hipaaFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        // Remove or mask any potential PHI
        const sanitizedMeta = sanitizePHI(meta);
        const sanitizedMessage = sanitizePHI({ message }).message;
        
        let log = `${timestamp} [${level.toUpperCase()}]: ${sanitizedMessage}`;
        
        if (Object.keys(sanitizedMeta).length > 0) {
            log += ` ${JSON.stringify(sanitizedMeta)}`;
        }
        
        if (stack) {
            log += `\n${stack}`;
        }
        
        return log;
    })
);

// PHI sanitization function
function sanitizePHI(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sensitiveFields = [
        'ssn', 'social_security_number', 'phone', 'email', 'dob', 'date_of_birth',
        'address', 'zip', 'postal_code', 'credit_card', 'password', 'token',
        'api_key', 'secret', 'private_key', 'medical_record_number', 'mrn',
        'insurance_number', 'patient_id', 'member_id'
    ];
    
    const sanitized = { ...obj };
    
    function maskValue(key, value) {
        const lowerKey = key.toLowerCase();
        
        if (sensitiveFields.some(field => lowerKey.includes(field))) {
            if (typeof value === 'string') {
                if (value.length <= 4) return '***';
                return value.substring(0, 2) + '*'.repeat(value.length - 4) + value.slice(-2);
            }
            return '[MASKED]';
        }
        
        return value;
    }
    
    function recursiveSanitize(obj) {
        if (Array.isArray(obj)) {
            return obj.map(item => recursiveSanitize(item));
        }
        
        if (obj && typeof obj === 'object') {
            const result = {};
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'object' && value !== null) {
                    result[key] = recursiveSanitize(value);
                } else {
                    result[key] = maskValue(key, value);
                }
            }
            return result;
        }
        
        return obj;
    }
    
    return recursiveSanitize(sanitized);
}

// Create logger instance
const logger = winston.createLogger({
    levels: customLevels.levels,
    level: config.logging.level,
    format: hipaaFormat,
    defaultMeta: {
        service: 'crisis-service',
        environment: config.environment,
        version: process.env.npm_package_version || '1.0.0'
    },
    transports: [
        // Console transport for development
        ...(config.environment === 'development' ? [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    hipaaFormat
                )
            })
        ] : []),
        
        // File transport for all logs
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'crisis-service.log'),
            maxsize: config.logging.maxSize,
            maxFiles: config.logging.maxFiles,
            tailable: true
        }),
        
        // Separate file for emergency/crisis logs
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'emergency.log'),
            level: 'alert',
            maxsize: config.logging.maxSize,
            maxFiles: config.logging.maxFiles,
            tailable: true
        }),
        
        // Separate file for audit trail
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'audit.log'),
            level: 'info',
            maxsize: config.logging.maxSize,
            maxFiles: config.logging.maxFiles * 2, // Keep more audit logs
            tailable: true,
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            )
        })
    ],
    
    // Handle uncaught exceptions
    exceptionHandlers: [
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'exceptions.log'),
            maxsize: config.logging.maxSize,
            maxFiles: config.logging.maxFiles
        })
    ],
    
    // Handle unhandled promise rejections
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'rejections.log'),
            maxsize: config.logging.maxSize,
            maxFiles: config.logging.maxFiles
        })
    ]
});

// Add audit logging capability
logger.audit = (action, userId, details = {}) => {
    logger.info(`AUDIT: ${action}`, {
        audit: true,
        userId,
        action,
        timestamp: new Date().toISOString(),
        ip: details.ip,
        userAgent: details.userAgent,
        sessionId: details.sessionId,
        resource: details.resource,
        outcome: details.outcome || 'success',
        details: sanitizePHI(details)
    });
};

// Add performance logging
logger.performance = (operation, duration, details = {}) => {
    const level = duration > config.performance.responseTimeThreshold ? 'warn' : 'info';
    logger[level](`PERFORMANCE: ${operation} completed in ${duration}ms`, {
        performance: true,
        operation,
        duration,
        threshold: config.performance.responseTimeThreshold,
        ...sanitizePHI(details)
    });
};

// Add crisis-specific logging
logger.crisis = (event, severity, details = {}) => {
    logger.emergency(`CRISIS EVENT: ${event}`, {
        crisis: true,
        event,
        severity,
        timestamp: new Date().toISOString(),
        responseTime: details.responseTime,
        userId: details.userId,
        location: details.location ? {
            approximate: true, // Don't log exact coordinates
            region: details.location.region
        } : undefined,
        escalationLevel: details.escalationLevel,
        contacts: details.contacts ? details.contacts.map(c => ({
            type: c.type,
            notified: c.notified,
            responseTime: c.responseTime
        })) : undefined
    });
};

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

module.exports = logger;