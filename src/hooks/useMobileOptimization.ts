import { useEffect } from 'react';
import { useMobileCrisis } from './useMobileCrisis';
import { useOfflineSync } from './useOfflineSync';
import { serviceWorkerManager } from '@/services/serviceWorkerManager';

export const useMobileOptimization = () => {
  const mobileCrisis = useMobileCrisis({
    shakeThreshold: 15,
    _volumeButtonShortcuts: true,
    _hapticFeedback: true,
    _batteryOptimization: true,
  });

  const offlineSync = useOfflineSync();

  // Initialize mobile optimizations
  useEffect(() => {
    const initMobileFeatures = async () => {
      // Register service worker for offline support
      await serviceWorkerManager.register();
      
      // Cache critical crisis resources
      await serviceWorkerManager.cacheCriticalResources();
      
      // Enable shake detection on mobile
      if (mobileCrisis.isMobile) {
        mobileCrisis.enableShakeDetection();
      }

      // Load offline data
      await offlineSync.loadOfflineData();
    };

    initMobileFeatures();
  }, []);

  return {
    ...mobileCrisis,
    ...offlineSync,
    isOptimizedForMobile: mobileCrisis.isMobile,
    canWorkOffline: offlineSync.canWorkOffline(),
  };
};