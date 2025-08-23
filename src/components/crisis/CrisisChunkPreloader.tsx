import { lazy, Suspense } from 'react';
import LoadingState from '@/components/LoadingState';

// Pre-load crisis components with high priority
export const CrisisChunkPreloader = {
  // Crisis components that should load immediately in emergency scenarios
  preloadCrisisChunks: () => {
    // Preload crisis-related chunks with high priority
    const crisisImports = [
      () => import('@/pages/CrisisHelp'),
      () => import('@/pages/CrisisSupport'),
      () => import('@/components/crisis/EnhancedCrisisSystem'),
      () => import('@/services/unifiedCrisisService'),
      () => import('@/hooks/useCrisisSystem'),
      () => import('@/hooks/useCrisisManagement')
    ];

    // Use requestIdleCallback for non-blocking preloading
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => {
        crisisImports.forEach(importFn => {
          importFn().catch(() => {
            // Silently handle preload failures
          });
        });
      });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        crisisImports.forEach(importFn => {
          importFn().catch(() => {
            // Silently handle preload failures
          });
        });
      }, 100);
    }
  },

  // Lazy load with crisis-specific loading state
  CrisisLazyWrapper: ({ importFn, fallback }: { 
    importFn: () => Promise<any>;
    fallback?: React.ComponentType;
  }) => {
    const Component = lazy(importFn);
    const FallbackComponent = fallback || LoadingState;

    return (props: any) => (
      <Suspense fallback={<FallbackComponent />}>
        <Component {...props} />
      </Suspense>
    );
  }
};

export default CrisisChunkPreloader;