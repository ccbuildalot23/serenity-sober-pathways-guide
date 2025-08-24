// Performance monitoring for crisis features and bundle optimization
import { lazyLoadingManager } from './lazyLoadingManager';
import logger from '../services/loggerService';

interface PerformanceMetrics {
  chunkLoadTime: number;
  componentRenderTime: number;
  crisisFeatureReady: number;
  totalBundleSize: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private startTimes = new Map<string, number>();

  /**
   * Start timing for a specific operation
   */
  startTimer(operation: string): void {
    this.startTimes.set(operation, performance.now());
  }

  /**
   * End timing and record metrics
   */
  endTimer(operation: string): number {
    const startTime = this.startTimes.get(operation);
    if (!startTime) {
      logger.warn(`No start time found for operation: ${operation}`, {
        component: 'PerformanceMonitor',
        action: 'missing_timer',
        operation
      });
      return 0;
    }

    const duration = performance.now() - startTime;
    this.startTimes.delete(operation);
    
    // Log performance for crisis-critical operations
    if (operation.includes('crisis')) {
      logger.performance(`Crisis Feature Performance: ${operation}`, duration, {
        component: 'PerformanceMonitor',
        action: 'crisis_timing'
      });
      
      // Alert if crisis features take too long
      if (duration > 1000) {
        logger.warn(`Crisis feature loading slowly: ${duration.toFixed(2)}ms`, {
          component: 'PerformanceMonitor',
          action: 'slow_crisis_load',
          duration
        });
      }
    }

    return duration;
  }

  /**
   * Monitor chunk loading performance
   */
  monitorChunkLoading(): void {
    // Override dynamic import to track loading times
    const originalImport = window.import || ((path: string) => import(path));
    
    window.import = async (path: string) => {
      const startTime = performance.now();
      try {
        const module = await originalImport(path);
        const loadTime = performance.now() - startTime;
        
        logger.performance(`Chunk loaded: ${path}`, loadTime, {
          component: 'PerformanceMonitor',
          action: 'chunk_load'
        });
        
        // Track crisis-related chunks specifically
        if (path.includes('crisis') || path.includes('Crisis')) {
          logger.performance(`Crisis chunk loaded`, loadTime, {
            component: 'PerformanceMonitor',
            action: 'crisis_chunk_load',
            path
          });
        }
        
        return module;
      } catch (error) {
        logger.error(`Failed to load chunk: ${path}`, error, {
          component: 'PerformanceMonitor',
          action: 'chunk_load_error',
          path
        });
        throw error;
      }
    };
  }

  /**
   * Monitor Core Web Vitals
   */
  monitorCoreWebVitals(): void {
    // LCP (Largest Contentful Paint)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const lcp = entry as any;
        
        logger.performance(`LCP`, lcp.startTime, {
          component: 'PerformanceMonitor',
          action: 'lcp_measurement'
        });
        
        if (lcp.startTime > 2500) {
          logger.warn('LCP is above recommended threshold (2.5s)', {
            component: 'PerformanceMonitor',
            action: 'lcp_threshold_warning',
            duration: lcp.startTime
          });
        }
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // FID (First Input Delay)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fid = entry as any;
        const fidValue = fid.processingStart - fid.startTime;
        
        logger.performance(`FID`, fidValue, {
          component: 'PerformanceMonitor',
          action: 'fid_measurement'
        });
        
        if (fidValue > 100) {
          logger.warn('FID is above recommended threshold (100ms)', {
            component: 'PerformanceMonitor',
            action: 'fid_threshold_warning',
            duration: fidValue
          });
        }
      }
    }).observe({ entryTypes: ['first-input'] });

    // CLS (Cumulative Layout Shift)
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const cls = entry as any;
        if (!cls.hadRecentInput) {
          clsValue += cls.value;
        }
      }
      
      logger.performance(`CLS`, clsValue, {
        component: 'PerformanceMonitor',
        action: 'cls_measurement'
      });
      
      if (clsValue > 0.1) {
        logger.warn('CLS is above recommended threshold (0.1)', {
          component: 'PerformanceMonitor',
          action: 'cls_threshold_warning',
          cls: clsValue
        });
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }

  /**
   * Measure crisis feature readiness time
   */
  measureCrisisReadiness(): void {
    const crisisStartTime = performance.now();
    
    // Check when crisis features become available
    const checkCrisisReady = () => {
      const crisisHelp = document.querySelector('[data-testid="crisis-help"]') ||
                        document.querySelector('.crisis-help') ||
                        document.querySelector('a[href*="crisis"]');
      
      if (crisisHelp) {
        const readyTime = performance.now() - crisisStartTime;
        logger.performance(`Crisis features ready`, readyTime, {
          component: 'PerformanceMonitor',
          action: 'crisis_ready'
        });
        
        // Crisis features should be ready quickly
        if (readyTime > 500) {
          logger.warn(`Crisis features took ${readyTime.toFixed(2)}ms to load - should be < 500ms`, {
            component: 'PerformanceMonitor',
            action: 'crisis_slow_warning',
            duration: readyTime
          });
        }
        
        return true;
      }
      return false;
    };

    // Check periodically until crisis features are ready
    const checkInterval = setInterval(() => {
      if (checkCrisisReady()) {
        clearInterval(checkInterval);
      }
    }, 50);

    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      logger.error('Crisis features not detected after 5 seconds', new Error('Crisis features timeout'), {
        component: 'PerformanceMonitor',
        action: 'crisis_features_timeout'
      });
    }, 5000);
  }

  /**
   * Generate bundle size report
   */
  generateBundleSizeReport(): void {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      let totalSize = 0;
      const chunkSizes: Record<string, number> = {};
      
      resources.forEach(resource => {
        if (resource.name.includes('.js') || resource.name.includes('.css')) {
          const size = resource.transferSize || 0;
          totalSize += size;
          
          // Extract chunk name
          const chunkMatch = resource.name.match(/([^\/]+)\.(js|css)$/);
          if (chunkMatch) {
            const chunkName = chunkMatch[1];
            chunkSizes[chunkName] = (chunkSizes[chunkName] || 0) + size;
          }
        }
      });
      
      const bundleInfo = {
        totalSizeKB: (totalSize / 1024),
        largestChunks: Object.entries(chunkSizes)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([name, size]) => ({ name, sizeKB: (size / 1024) }))
      };
      
      logger.performance('Bundle Size Report', totalSize, {
        component: 'PerformanceMonitor',
        action: 'bundle_analysis',
        ...bundleInfo
      });
      
      // Alert if total bundle is too large
      if (totalSize > 1024 * 1024) { // 1MB
        logger.warn(`Total bundle size (${(totalSize / 1024 / 1024).toFixed(2)} MB) exceeds 1MB target`, {
          component: 'PerformanceMonitor',
          action: 'bundle_size_warning',
          totalSizeMB: totalSize / 1024 / 1024
        });
      } else {
        logger.info(`Bundle size (${(totalSize / 1024).toFixed(2)} KB) is within target`, {
          component: 'PerformanceMonitor',
          action: 'bundle_size_ok',
          totalSizeKB: totalSize / 1024
        });
      }
    }
  }

  /**
   * Monitor lazy loading performance
   */
  monitorLazyLoading(): void {
    const preloadStatus = lazyLoadingManager.getPreloadStatus();
    
    logger.debug('Lazy Loading Status', {
      component: 'PerformanceMonitor',
      action: 'lazy_load_status',
      ...preloadStatus
    });
    
    // Monitor for lazy loading delays
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element && node.hasAttribute('data-lazy-loading')) {
              logger.debug('Lazy component loading detected', {
                component: 'PerformanceMonitor',
                action: 'lazy_component_load'
              });
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Initialize all performance monitoring
   */
  initialize(): void {
    logger.info('Performance Monitor initialized', {
      component: 'PerformanceMonitor',
      action: 'initialize'
    });
    
    this.monitorChunkLoading();
    this.monitorCoreWebVitals();
    this.measureCrisisReadiness();
    this.monitorLazyLoading();
    
    // Generate reports periodically
    setTimeout(() => this.generateBundleSizeReport(), 3000);
    
    // Log preload status
    setTimeout(() => {
      const status = lazyLoadingManager.getPreloadStatus();
      logger.debug('Component Preload Status', {
        component: 'PerformanceMonitor',
        action: 'preload_status',
        ...status
      });
    }, 1000);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): object {
    return {
      metrics: this.metrics,
      activeTimers: Array.from(this.startTimes.keys()),
      preloadStatus: lazyLoadingManager.getPreloadStatus(),
      timestamp: Date.now()
    };
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-initialize in development mode
if (import.meta.env.DEV) {
  performanceMonitor.initialize();
}

export default performanceMonitor;