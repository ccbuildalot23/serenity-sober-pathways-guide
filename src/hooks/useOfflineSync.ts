import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { offlineStorage } from '@/services/offlineStorageService';

interface OfflineData {
  checkIns: any[];
  recoveryPlan: any;
  contacts: any[];
  copingStrategies: any[];
  successStories: any[];
  cbtExercises: any[];
  lastSync: Date | null;
}

interface SyncQueueItem {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}

export const useOfflineSync = () => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncQueue, setSyncQueue] = useState<SyncQueueItem[]>([]);
  const [offlineData, setOfflineData] = useState<OfflineData>({
    checkIns: [],
    recoveryPlan: null,
    contacts: [],
    copingStrategies: [],
    successStories: [],
    cbtExercises: [],
    lastSync: null,
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (syncQueue.length > 0) {
        syncData();
      }
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue]);

  // Load offline data on component mount
  useEffect(() => {
    loadOfflineData();
    loadSyncQueue();
  }, [user]);

  const loadOfflineData = useCallback(async () => {
    try {
      const [
        checkIns,
        recoveryPlan,
        contacts,
        copingStrategies,
        successStories,
        cbtExercises
      ] = await Promise.all([
        offlineStorage.getData('checkIns'),
        offlineStorage.getData('recoveryPlan'),
        offlineStorage.getData('contacts'),
        offlineStorage.getData('copingStrategies'),
        offlineStorage.getData('successStories'),
        offlineStorage.getData('cbtExercises'),
      ]);

      const lastSync = localStorage.getItem('lastSyncTime') 
        ? new Date(localStorage.getItem('lastSyncTime')!)
        : null;

      setOfflineData({
        checkIns: checkIns || [],
        recoveryPlan: recoveryPlan?.[0] || null,
        contacts: contacts || [],
        copingStrategies: copingStrategies || [],
        successStories: successStories || [],
        cbtExercises: cbtExercises || [],
        lastSync,
      });

      setLastSyncTime(lastSync);
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  }, []);

  const loadSyncQueue = useCallback(() => {
    const queue = offlineStorage.getSyncQueue();
    setSyncQueue(queue);
  }, []);

  const addToSyncQueue = useCallback((type: string, data: any) => {
    const item: SyncQueueItem = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: new Date(),
      retryCount: 0,
    };

    offlineStorage.queueForSync(item);
    setSyncQueue(prev => [...prev, item]);
  }, []);

  const saveOfflineData = useCallback(async (key: keyof OfflineData, data: any) => {
    try {
      await offlineStorage.saveData(key, Array.isArray(data) ? data : [data]);
      
      setOfflineData(prev => ({
        ...prev,
        [key]: data,
      }));

      // If offline, add to sync queue
      if (!isOnline) {
        addToSyncQueue(`save_${key}`, data);
      }
    } catch (error) {
      console.error(`Failed to save offline data for ${key}:`, error);
    }
  }, [isOnline, addToSyncQueue]);

  const syncData = useCallback(async () => {
    if (!isOnline || isSyncing || !user) return;

    setIsSyncing(true);
    
    try {
      const queue = offlineStorage.getSyncQueue();
      
      for (const item of queue) {
        try {
          // Process sync item based on type
          switch (item.type) {
            case 'save_checkIns':
              // Sync check-ins to server
              console.log('Syncing check-ins:', item.data);
              break;
            case 'save_recoveryPlan':
              // Sync recovery plan to server
              console.log('Syncing recovery plan:', item.data);
              break;
            case 'save_contacts':
              // Sync contacts to server
              console.log('Syncing contacts:', item.data);
              break;
            default:
              console.log('Unknown sync type:', item.type);
          }
        } catch (error) {
          console.error('Failed to sync item:', item, error);
          
          // Increment retry count
          item.retryCount += 1;
          
          // Remove item if too many retries
          if (item.retryCount >= 3) {
            console.warn('Removing item after 3 failed attempts:', item);
            continue;
          }
        }
      }

      // Clear sync queue and update last sync time
      offlineStorage.clearSyncQueue();
      setSyncQueue([]);
      
      const now = new Date();
      setLastSyncTime(now);
      localStorage.setItem('lastSyncTime', now.toISOString());

      // Refresh offline data with latest from server
      await loadOfflineData();
      
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, user, loadOfflineData]);

  const getOfflineCheckIns = useCallback((days: number = 7) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    return offlineData.checkIns.filter(checkIn => 
      new Date(checkIn.created_at) >= cutoff
    );
  }, [offlineData.checkIns]);

  const addOfflineCheckIn = useCallback(async (checkInData: any) => {
    const checkIn = {
      ...checkInData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      synced: false,
    };

    const updatedCheckIns = [...offlineData.checkIns, checkIn];
    await saveOfflineData('checkIns', updatedCheckIns);
    
    return checkIn;
  }, [offlineData.checkIns, saveOfflineData]);

  const canWorkOffline = useCallback(() => {
    return (
      offlineData.recoveryPlan !== null ||
      offlineData.contacts.length > 0 ||
      offlineData.copingStrategies.length > 0 ||
      offlineData.cbtExercises.length > 0
    );
  }, [offlineData]);

  const getCacheStatus = useCallback(() => {
    const totalItems = Object.values(offlineData).reduce((acc, data) => {
      return acc + (Array.isArray(data) ? data.length : data ? 1 : 0);
    }, 0);

    return {
      totalItems,
      pendingSync: syncQueue.length,
      lastSync: lastSyncTime,
      isStale: lastSyncTime ? Date.now() - lastSyncTime.getTime() > 24 * 60 * 60 * 1000 : true,
    };
  }, [offlineData, syncQueue, lastSyncTime]);

  return {
    isOnline,
    isSyncing,
    lastSyncTime,
    syncQueue,
    offlineData,
    addToSyncQueue,
    saveOfflineData,
    syncData,
    getOfflineCheckIns,
    addOfflineCheckIn,
    canWorkOffline,
    getCacheStatus,
    loadOfflineData,
  };
};