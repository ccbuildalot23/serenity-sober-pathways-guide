import logger from './loggerService';
// Performance optimization utilities
class PerformanceOptimizationService {
  private cache = new Map<string, { data: unknown; _timestamp: number; _ttl: number }>();
  private imageCache = new Map<string, HTMLImageElement>();
  
  // API Response Caching
  async cacheApiResponse<T>(
    _key: string, 
    apiCall: () => Promise<T>, 
    ttlMs: number = 5 * 60 * 1000 // 5 minutes default
  ): Promise<T> {
    const cached = this.cache.get(_key);
    const now = Date.now();
    
    if (cached && (now - cached._timestamp) < cached._ttl) {
      return cached.data;
    }
    
    const data = await apiCall();
    this.cache.set(_key, { data, _timestamp: now, _ttl: ttlMs });
    return data;
  }

  // Image Preloading and Optimization
  async preloadImage(src: string): Promise<HTMLImageElement> {
    if (this.imageCache.has(src)) {
      return this.imageCache.get(src)!;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.imageCache.set(src, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  // Lazy Loading Observer
  createLazyLoadObserver(_callback: (entries: IntersectionObserverEntry[]) => void): IntersectionObserver {
    return new IntersectionObserver(_callback, {
      rootMargin: '50px 0px',
      _threshold: 0.01
    });
  }

  // Bundle Analysis
  async analyzeBundleSize(): Promise<{
    totalSize: number;
    resourceCount: number;
    largestResources: { name: string; size: number }[];
    recommendations: string[];
  }> {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    let totalSize = 0;
    const resourceSizes: { name: string; size: number }[] = [];
    
    resources.forEach(resource => {
      const size = resource.transferSize || resource.decodedBodySize || 0;
      totalSize += size;
      resourceSizes.push({
        name: resource.name.split('/').pop() || resource.name,
        size
      });
    });

    const largestResources = resourceSizes
      .sort((a, b) => b.size - a.size)
      .slice(0, 10);

    const recommendations: string[] = [];
    
    if (totalSize > 2 * 1024 * 1024) { // 2MB
      recommendations.push('Consider code splitting to reduce initial bundle size');
    }
    
    if (largestResources.some(r => r.size > 500 * 1024)) { // 500KB
      recommendations.push('Large resources detected - consider compression or lazy loading');
    }
    
    if (resources.length > 100) {
      recommendations.push('High resource count - consider bundling or reducing dependencies');
    }

    return {
      totalSize,
      resourceCount: resources.length,
      largestResources,
      recommendations
    };
  }

  // Performance Metrics
  getPerformanceMetrics(): {
    navigation: PerformanceNavigationTiming | null;
    paint: { firstPaint?: number; firstContentfulPaint?: number };
    resources: PerformanceResourceTiming[];
    memory?: unknown;
  } {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paintEntries = performance.getEntriesByType('paint');
    
    const paint = {
      firstPaint: paintEntries.find(p => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: paintEntries.find(p => p.name === 'first-contentful-paint')?.startTime
    };

    return {
      navigation,
      paint,
      resources: performance.getEntriesByType('resource') as PerformanceResourceTiming[],
      memory: (performance as any).memory
    };
  }

  // Code Splitting Helper
  async loadChunk<T>(importFn: () => Promise<{ default: T }>): Promise<T> {
    try {
      const module = await importFn();
      return module.default;
    } catch (_error) {
      console._error('Failed to load chunk:', _error);
      throw _error;
    }
  }

  // Service Worker Registration for Caching
  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        logger.debug('Service Worker registered:', registration, { component: 'performanceOptimizationService' });
        return registration;
      } catch (_error) {
        console._error('Service Worker registration failed:', _error);
        return null;
      }
    }
    return null;
  }

  // Memory Management
  clearCache(): void {
    this.cache.clear();
    this.imageCache.clear();
  }

  getCacheStats(): {
    apiCacheSize: number;
    imageCacheSize: number;
    totalMemoryUsage: number;
  } {
    const apiCacheSize = this.cache.size;
    const imageCacheSize = this.imageCache.size;
    
    // Estimate memory usage
    let totalMemoryUsage = 0;
    this.cache.forEach(item => {
      totalMemoryUsage += JSON.stringify(item.data).length * 2; // Rough estimate
    });

    return {
      apiCacheSize,
      imageCacheSize,
      totalMemoryUsage
    };
  }
}

export const performanceOptimizationService = new PerformanceOptimizationService();