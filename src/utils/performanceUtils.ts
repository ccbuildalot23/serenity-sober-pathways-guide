import logger from '@/services/loggerService';

/**
 * Performance utilities for timeout protection and circuit breaking
 */

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeout?: number;
  timeout?: number;
}

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: number | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private options: CircuitBreakerOptions = {
      failureThreshold: 3,
      resetTimeout: 30000, // 30 seconds
      timeout: 15000 // 15 seconds
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit should be reset
    if (this.state === 'OPEN' && this.lastFailureTime) {
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure > (this.options.resetTimeout || 30000)) {
        this.state = 'HALF_OPEN';
        this.failures = 0;
      }
    }

    // If circuit is open, fail fast
    if (this.state === 'OPEN') {
      throw new Error('Circuit breaker is OPEN - service unavailable');
    }

    try {
      // Execute with timeout
      const result = await withTimeout(fn(), this.options.timeout || 15000);
      
      // Reset on success
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= (this.options.failureThreshold || 3)) {
        this.state = 'OPEN';
        logger.error('Circuit breaker opened due to failures', { 
          failures: this.failures,
          error 
        });
      }
      
      throw error;
    }
  }

  reset() {
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED';
  }
}

/**
 * Wraps a promise with a timeout
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutError)), timeoutMs)
    )
  ]);
}

/**
 * Request deduplication cache
 */
class RequestCache {
  private cache = new Map<string, { promise: Promise<any>, timestamp: number }>();
  private ttl: number;

  constructor(ttlMs = 5000) {
    this.ttl = ttlMs;
    // Clean up old entries periodically
    setInterval(() => this.cleanup(), 60000);
  }

  async get<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      logger.debug('Request deduplicated', { key });
      return cached.promise;
    }

    const promise = factory();
    this.cache.set(key, { promise, timestamp: Date.now() });
    
    // Remove from cache after completion to allow fresh requests
    promise.finally(() => {
      setTimeout(() => this.cache.delete(key), this.ttl);
    });

    return promise;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Debounce function for event handlers
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for rate limiting
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Exponential backoff with jitter
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
        logger.debug(`Retry attempt ${i + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// Export singleton instances
export const dashboardCircuitBreaker = new CircuitBreaker({
  failureThreshold: 2,
  resetTimeout: 20000,
  timeout: 10000
});

export const authCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 30000,
  timeout: 15000
});

export const requestCache = new RequestCache(5000);

/**
 * Performance monitoring
 */
export class PerformanceMonitor {
  private metrics = new Map<string, number[]>();

  startTimer(): () => void {
    const start = performance.now();
    return () => performance.now() - start;
  }

  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 values
    if (values.length > 100) {
      values.shift();
    }
  }

  getAverageMetric(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;
    
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  clearMetrics() {
    this.metrics.clear();
  }
}

export const performanceMonitor = new PerformanceMonitor();