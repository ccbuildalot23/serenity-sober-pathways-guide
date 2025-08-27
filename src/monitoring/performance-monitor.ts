/**
 * Performance Monitoring System with BMAD Integration
 * Tracks critical metrics for healthcare application performance
 */

import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals';

export interface PerformanceMetrics {
  cls: number | null;  // Cumulative Layout Shift
  fid: number | null;  // First Input Delay
  fcp: number | null;  // First Contentful Paint
  lcp: number | null;  // Largest Contentful Paint
  ttfb: number | null; // Time to First Byte
  customMetrics: Map<string, number>;
}

export interface CrisisMetrics {
  loadTime: number;
  responseTime: number;
  availability: boolean;
  errorRate: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    cls: null,
    fid: null,
    fcp: null,
    lcp: null,
    ttfb: null,
    customMetrics: new Map()
  };

  private crisisMetrics: CrisisMetrics = {
    loadTime: 0,
    responseTime: 0,
    availability: true,
    errorRate: 0
  };

  private observers: Set<(metrics: PerformanceMetrics) => void> = new Set();
  private errorCount = 0;
  private requestCount = 0;

  constructor() {
    this.initializeWebVitals();
    this.setupCrisisMonitoring();
    this.setupResourceTiming();
    this.setupErrorTracking();
  }

  private initializeWebVitals() {
    // Core Web Vitals monitoring
    onCLS((metric) => {
      this.metrics.cls = metric.value;
      this.notifyObservers();
      this.checkThresholds('CLS', metric.value, 0.1);
    });

    onFID((metric) => {
      this.metrics.fid = metric.value;
      this.notifyObservers();
      this.checkThresholds('FID', metric.value, 100);
    });

    onFCP((metric) => {
      this.metrics.fcp = metric.value;
      this.notifyObservers();
      this.checkThresholds('FCP', metric.value, 1800);
    });

    onLCP((metric) => {
      this.metrics.lcp = metric.value;
      this.notifyObservers();
      this.checkThresholds('LCP', metric.value, 2500);
    });

    onTTFB((metric) => {
      this.metrics.ttfb = metric.value;
      this.notifyObservers();
      this.checkThresholds('TTFB', metric.value, 600);
    });
  }

  private setupCrisisMonitoring() {
    // Monitor crisis-critical features
    this.measureCrisisLoadTime();
    this.monitorCrisisAvailability();
  }

  private measureCrisisLoadTime() {
    // Track time to load crisis support features
    const crisisLoadStart = performance.now();
    
    // Check when crisis button is interactive
    const checkCrisisReady = setInterval(() => {
      const crisisButton = document.querySelector('[data-crisis-button]');
      if (crisisButton) {
        const loadTime = performance.now() - crisisLoadStart;
        this.crisisMetrics.loadTime = loadTime;
        
        if (loadTime > 500) {
          console.warn(`Crisis button load time exceeded threshold: ${loadTime}ms`);
          this.sendAlert('CRISIS_SLOW_LOAD', { loadTime });
        }
        
        clearInterval(checkCrisisReady);
      }
    }, 100);

    // Timeout after 5 seconds
    setTimeout(() => clearInterval(checkCrisisReady), 5000);
  }

  private monitorCrisisAvailability() {
    // Periodic health check for crisis services
    setInterval(() => {
      const crisisEndpoint = '/api/crisis/health';
      
      fetch(crisisEndpoint)
        .then(response => {
          this.crisisMetrics.availability = response.ok;
          this.crisisMetrics.responseTime = performance.now();
          
          if (!response.ok) {
            this.sendAlert('CRISIS_UNAVAILABLE', { 
              status: response.status,
              endpoint: crisisEndpoint 
            });
          }
        })
        .catch(error => {
          this.crisisMetrics.availability = false;
          this.sendAlert('CRISIS_ERROR', { error: error.message });
        });
    }, 60000); // Check every minute
  }

  private setupResourceTiming() {
    // Monitor resource loading performance
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as any; // PerformanceResourceTiming
          
          // Track large resources
          if (resourceEntry.transferSize > 500000) { // 500KB
            console.warn(`Large resource detected: ${resourceEntry.name} (${resourceEntry.transferSize} bytes)`);
          }
          
          // Track slow resources
          if (resourceEntry.duration > 3000) { // 3 seconds
            console.warn(`Slow resource: ${resourceEntry.name} (${resourceEntry.duration}ms)`);
          }
        }
      }
    });

    observer.observe({ entryTypes: ['resource'] });
  }

  private setupErrorTracking() {
    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      this.errorCount++;
      this.updateErrorRate();
      
      // Log critical errors
      if (event.error?.stack?.includes('crisis') || 
          event.error?.stack?.includes('emergency')) {
        this.sendAlert('CRITICAL_ERROR', {
          message: event.error.message,
          stack: event.error.stack
        });
      }
    });

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.errorCount++;
      this.updateErrorRate();
      
      console.error('Unhandled promise rejection:', event.reason);
    });
  }

  private updateErrorRate() {
    if (this.requestCount > 0) {
      this.crisisMetrics.errorRate = (this.errorCount / this.requestCount) * 100;
      
      // Alert if error rate is too high
      if (this.crisisMetrics.errorRate > 1) {
        this.sendAlert('HIGH_ERROR_RATE', { 
          rate: this.crisisMetrics.errorRate,
          errors: this.errorCount,
          requests: this.requestCount
        });
      }
    }
  }

  private checkThresholds(metric: string, value: number, threshold: number) {
    if (value > threshold) {
      console.warn(`Performance threshold exceeded for ${metric}: ${value} (threshold: ${threshold})`);
      
      // Send alert for critical metrics
      if (['LCP', 'FID'].includes(metric)) {
        this.sendAlert('PERFORMANCE_DEGRADATION', { metric, value, threshold });
      }
    }
  }

  private sendAlert(type: string, data: Record<string, unknown>) {
    // Send to monitoring service
    if (window.Sentry) {
      window.Sentry.captureMessage(`Performance Alert: ${type}`, {
        level: 'warning',
        tags: { performance: true },
        extra: data
      });
    }

    // Log to BMAD monitoring
    this.logToBMAD(type, data);
  }

  private logToBMAD(event: string, data: Record<string, unknown>) {
    // Integration with BMAD performance monitoring
    if (window.bmadMonitor) {
      window.bmadMonitor.logPerformance(event, data);
    }
  }

  private notifyObservers() {
    this.observers.forEach(observer => observer(this.metrics));
  }

  // Public API
  public subscribe(callback: (metrics: PerformanceMetrics) => void) {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  public measureCustomMetric(name: string, value: number) {
    this.metrics.customMetrics.set(name, value);
    this.notifyObservers();
  }

  public startMeasure(name: string) {
    performance.mark(`${name}-start`);
  }

  public endMeasure(name: string) {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name)[0];
    if (measure) {
      this.measureCustomMetric(name, measure.duration);
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getCrisisMetrics(): CrisisMetrics {
    return { ...this.crisisMetrics };
  }

  public generateReport(): string {
    return `
Performance Report
==================
Core Web Vitals:
- CLS: ${this.metrics.cls?.toFixed(3) || 'N/A'}
- FID: ${this.metrics.fid?.toFixed(0) || 'N/A'}ms
- FCP: ${this.metrics.fcp?.toFixed(0) || 'N/A'}ms
- LCP: ${this.metrics.lcp?.toFixed(0) || 'N/A'}ms
- TTFB: ${this.metrics.ttfb?.toFixed(0) || 'N/A'}ms

Crisis Metrics:
- Load Time: ${this.crisisMetrics.loadTime.toFixed(0)}ms
- Response Time: ${this.crisisMetrics.responseTime.toFixed(0)}ms
- Availability: ${this.crisisMetrics.availability ? 'OK' : 'DOWN'}
- Error Rate: ${this.crisisMetrics.errorRate.toFixed(2)}%

Custom Metrics:
${Array.from(this.metrics.customMetrics.entries())
  .map(([name, value]) => `- ${name}: ${value.toFixed(2)}ms`)
  .join('\n')}
    `;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-initialize on load
if (typeof window !== 'undefined') {
  window.performanceMonitor = performanceMonitor;
}

// TypeScript global augmentation
declare global {
  interface Window {
    performanceMonitor: PerformanceMonitor;
    bmadMonitor?: {
      logPerformance: (event: string, data: Record<string, unknown>) => void;
    };
    Sentry?: {
      captureMessage: (message: string, context?: Record<string, unknown>) => void;
    };
  }
}

export default performanceMonitor;