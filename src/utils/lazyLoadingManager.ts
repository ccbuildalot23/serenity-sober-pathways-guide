// Advanced lazy loading manager for performance optimization
import { lazy, ComponentType, LazyExoticComponent } from 'react';

interface LazyLoadConfig {
  preload?: boolean;
  priority?: 'high' | 'medium' | 'low';
  delay?: number;
}

class LazyLoadingManager {
  private preloadedComponents = new Map<string, Promise<any>>();
  private loadingComponents = new Set<string>();

  /**
   * Create a lazy-loaded component with advanced configuration
   */
  createLazyComponent<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    componentName: string,
    config: LazyLoadConfig = {}
  ): LazyExoticComponent<T> {
    const { preload = false, priority = 'medium', delay = 0 } = config;

    // Create lazy component
    const LazyComponent = lazy(() => {
      if (delay > 0) {
        return new Promise(resolve => {
          setTimeout(() => {
            importFn().then(resolve);
          }, delay);
        });
      }
      return importFn();
    });

    // Handle preloading if enabled
    if (preload) {
      this.preloadComponent(importFn, componentName, priority);
    }

    return LazyComponent;
  }

  /**
   * Preload a component based on priority
   */
  async preloadComponent(
    importFn: () => Promise<any>,
    componentName: string,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    if (this.preloadedComponents.has(componentName) || this.loadingComponents.has(componentName)) {
      return;
    }

    this.loadingComponents.add(componentName);

    const executePreload = async () => {
      try {
        const component = await importFn();
        this.preloadedComponents.set(componentName, Promise.resolve(component));
        this.loadingComponents.delete(componentName);
      } catch (error) {
        console.warn(`Failed to preload component ${componentName}:`, error);
        this.loadingComponents.delete(componentName);
      }
    };

    switch (priority) {
      case 'high':
        // Immediate preload for critical components
        executePreload();
        break;
      case 'medium':
        // Preload when browser is idle
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(() => executePreload());
        } else {
          setTimeout(executePreload, 100);
        }
        break;
      case 'low':
        // Preload with longer delay
        setTimeout(executePreload, 2000);
        break;
    }
  }

  /**
   * Preload components based on route patterns
   */
  preloadRouteComponents(currentRoute: string): void {
    // Crisis routes - always preload
    if (currentRoute.includes('crisis')) {
      this.preloadComponent(
        () => import('@/pages/CrisisHelp'),
        'CrisisHelp',
        'high'
      );
      this.preloadComponent(
        () => import('@/components/crisis/EnhancedCrisisSystem'),
        'EnhancedCrisisSystem',
        'high'
      );
    }

    // Patient dashboard - preload related components
    if (currentRoute.includes('patient') || currentRoute.includes('dashboard')) {
      this.preloadComponent(
        () => import('@/pages/CheckIn'),
        'CheckIn',
        'medium'
      );
      this.preloadComponent(
        () => import('@/pages/Progress'),
        'Progress',
        'medium'
      );
    }

    // Provider dashboard - preload provider-specific components
    if (currentRoute.includes('provider')) {
      this.preloadComponent(
        () => import('@/pages/provider/ProviderPatients'),
        'ProviderPatients',
        'medium'
      );
      this.preloadComponent(
        () => import('@/pages/provider/ProviderAnalytics'),
        'ProviderAnalytics',
        'low'
      );
    }
  }

  /**
   * Get preload status for debugging
   */
  getPreloadStatus(): { loaded: string[]; loading: string[] } {
    return {
      loaded: Array.from(this.preloadedComponents.keys()),
      loading: Array.from(this.loadingComponents)
    };
  }

  /**
   * Clear preloaded components to free memory
   */
  clearPreloadedComponents(): void {
    this.preloadedComponents.clear();
    this.loadingComponents.clear();
  }
}

// Export singleton instance
export const lazyLoadingManager = new LazyLoadingManager();

// Predefined lazy-loaded components with optimized configurations
export const LazyComponents = {
  // Admin and compliance (low priority)
  AdminDashboard: lazyLoadingManager.createLazyComponent(
    () => import('@/pages/AdminDashboard'),
    'AdminDashboard',
    { priority: 'low' }
  ),
  
  SecurityAudit: lazyLoadingManager.createLazyComponent(
    () => import('@/pages/SecurityAudit'),
    'SecurityAudit',
    { priority: 'low' }
  ),

  // Recovery tools (medium priority)
  RecoveryPlanning: lazyLoadingManager.createLazyComponent(
    () => import('@/pages/RecoveryPlanning'),
    'RecoveryPlanning',
    { priority: 'medium' }
  ),

  Motivation: lazyLoadingManager.createLazyComponent(
    () => import('@/pages/Motivation'),
    'Motivation',
    { priority: 'medium' }
  ),

  // Support features (medium priority)
  PeerSupport: lazyLoadingManager.createLazyComponent(
    () => import('@/pages/PeerSupport'),
    'PeerSupport',
    { priority: 'medium' }
  ),

  // Clinical features (low priority)
  ClinicalProtocols: lazyLoadingManager.createLazyComponent(
    () => import('@/pages/ClinicalProtocols'),
    'ClinicalProtocols',
    { priority: 'low' }
  )
};

export default lazyLoadingManager;