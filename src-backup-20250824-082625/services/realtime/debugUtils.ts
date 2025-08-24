import logger from '../loggerService';

// Debug utilities for realtime services
export const debugLog = (category: string, message: string, data?: unknown) => {
  if (import.meta.env.DEV) {
    logger.debug(`[${category}] ${message}`, data || '', { component: 'debugUtils' });
  }
};

export const debugError = (category: string, error: Error, context?: unknown) => {
  if (import.meta.env.DEV) {
    console.error(`[${category}] Error:`, error.message, context || '');
  }
};

export const debugWarn = (category: string, message: string, data?: unknown) => {
  if (import.meta.env.DEV) {
    logger.warn(`[${category}] Warning: ${message}`, data || '', { component: 'debugUtils' });
  }
};

// Add the missing 'log' export
export const log = debugLog;
