
// Debug utilities for realtime services
export const debugLog = (category: string, message: string, data?: any) => {
  if (import.meta.env.DEV) {
    console.log(`[${category}] ${message}`, data || '');
  }
};

export const debugError = (category: string, error: Error, context?: any) => {
  if (import.meta.env.DEV) {
    console.error(`[${category}] Error:`, error.message, context || '');
  }
};

export const debugWarn = (category: string, message: string, data?: any) => {
  if (import.meta.env.DEV) {
    console.warn(`[${category}] Warning: ${message}`, data || '');
  }
};
