
// Debug mode for tracking issues
const DEBUG = true;

export const log = (category: string, message: string, data?: any) => {
  if (!DEBUG) return;
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${category.toUpperCase()}] ${message}`, data || '');
  
  // Store in debug log
  if (typeof window !== 'undefined' && window.debugLog) {
    window.debugLog.push({ timestamp, category, message, data });
  }
};

// Initialize debug log
if (typeof window !== 'undefined') {
  (window as any).debugLog = (window as any).debugLog || [];
}
