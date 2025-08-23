// Performance monitoring for crisis features and bundle optimization
import { lazyLoadingManager } from './lazyLoadingManager';

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
      console.warn(`No start time found for operation: ${operation}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.startTimes.delete(operation);
    
    // Log performance for crisis-critical operations
    if (operation.includes('crisis')) {
      console.log(`🚨 Crisis Feature Performance: ${operation} took ${duration.toFixed(2)}ms`);
      
      // Alert if crisis features take too long
      if (duration > 1000) {
        console.warn(`⚠️ Crisis feature loading slowly: ${duration.toFixed(2)}ms`);
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
        
        console.log(`📦 Chunk loaded: ${path} (${loadTime.toFixed(2)}ms)`);
        
        // Track crisis-related chunks specifically
        if (path.includes('crisis') || path.includes('Crisis')) {
          console.log(`🚨 Crisis chunk loaded in ${loadTime.toFixed(2)}ms`);
        }
        
        return module;
      } catch (error) {
        console.error(`❌ Failed to load chunk: ${path}`, error);
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
        console.log(`📊 LCP: ${lcp.startTime.toFixed(2)}ms`);
        
        if (lcp.startTime > 2500) {
          console.warn('⚠️ LCP is above recommended threshold (2.5s)');
        }
      }
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // FID (First Input Delay)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fid = entry as any;
        console.log(`📊 FID: ${fid.processingStart - fid.startTime}ms`);
        
        if (fid.processingStart - fid.startTime > 100) {
          console.warn('⚠️ FID is above recommended threshold (100ms)');
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
      
      console.log(`📊 CLS: ${clsValue.toFixed(4)}`);
      
      if (clsValue > 0.1) {
        console.warn('⚠️ CLS is above recommended threshold (0.1)');
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
        console.log(`🚨 Crisis features ready in ${readyTime.toFixed(2)}ms`);
        
        // Crisis features should be ready quickly
        if (readyTime > 500) {
          console.warn(`⚠️ Crisis features took ${readyTime.toFixed(2)}ms to load - should be < 500ms`);
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
      console.error('❌ Crisis features not detected after 5 seconds');
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
      
      console.log('📦 Bundle Size Report:');
      console.log(`Total Size: ${(totalSize / 1024).toFixed(2)} KB`);
      
      // Log largest chunks first
      Object.entries(chunkSizes)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([name, size]) => {
          console.log(`  ${name}: ${(size / 1024).toFixed(2)} KB`);
        });
      
      // Alert if total bundle is too large
      if (totalSize > 1024 * 1024) { // 1MB
        console.warn(`⚠️ Total bundle size (${(totalSize / 1024 / 1024).toFixed(2)} MB) exceeds 1MB target`);
      } else {
        console.log(`✅ Bundle size (${(totalSize / 1024).toFixed(2)} KB) is within target`);
      }
    }
  }

  /**
   * Monitor lazy loading performance
   */
  monitorLazyLoading(): void {
    const preloadStatus = lazyLoadingManager.getPreloadStatus();
    console.log('📊 Lazy Loading Status:', preloadStatus);
    
    // Monitor for lazy loading delays
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach((node) => {
            if (node instanceof Element && node.hasAttribute('data-lazy-loading')) {
              console.log('⏳ Lazy component loading detected');
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
    console.log('🎯 Performance Monitor initialized');
    
    this.monitorChunkLoading();
    this.monitorCoreWebVitals();
    this.measureCrisisReadiness();
    this.monitorLazyLoading();
    
    // Generate reports periodically
    setTimeout(() => this.generateBundleSizeReport(), 3000);
    
    // Log preload status
    setTimeout(() => {
      const status = lazyLoadingManager.getPreloadStatus();
      console.log('📊 Component Preload Status:', status);
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