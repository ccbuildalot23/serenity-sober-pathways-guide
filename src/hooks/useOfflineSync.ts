import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { offlineStorage } from '@/services/offlineStorageService';

interface OfflineData {
  checkIns: unknown[];
  _recoveryPlan: unknown;
  _contacts: unknown[];
  _copingStrategies: unknown[];
  _successStories: unknown[];
  _cbtExercises: unknown[];
  _lastSync: Date | null;
}

interface SyncQueueItem {
  id: string;
  type: string;
  data: unknown;
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
    _recoveryPlan: null,
    _contacts: [],
    _copingStrategies: [],
    _successStories: [],
    _cbtExercises: [],
    _lastSync: null,
  });

  // Monitor online/offline status
  useEffect(() => {
    const _handleOnline = () => {
      setIsOnline(true);
      if (syncQueue.length > 0) {
        syncData();
      }
    };
    
    const _handleOffline = () => setIsOnline(false);

    window.addEventListener('online', _handleOnline);
    window.addEventListener('offline', _handleOffline);

    return () => {
      window.removeEventListener('online', _handleOnline);
      window.removeEventListener('offline', _handleOffline);
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
        _recoveryPlan,
        _contacts,
        _copingStrategies,
        _successStories,
        _cbtExercises
      ] = await Promise.all([
        offlineStorage.getData('checkIns'),
        offlineStorage.getData('_recoveryPlan'),
        offlineStorage.getData('_contacts'),
        offlineStorage.getData('_copingStrategies'),
        offlineStorage.getData('_successStories'),
        offlineStorage.getData('_cbtExercises'),
      ]);

      const _lastSync = localStorage.getItem('lastSyncTime') 
        ? new Date(localStorage.getItem('lastSyncTime')!)
        : null;

      setOfflineData({
        checkIns: checkIns || [],
        _recoveryPlan: _recoveryPlan?.[0] || null,
        _contacts: _contacts || [],
        _copingStrategies: _copingStrategies || [],
        _successStories: _successStories || [],
        _cbtExercises: _cbtExercises || [],
        _lastSync,
      });

      setLastSyncTime(_lastSync);
    } catch (_error) {
      console._error('Failed to load offline data:', _error);
    }
  }, []);

  const loadSyncQueue = useCallback(() => {
    const queue = offlineStorage.getSyncQueue();
    setSyncQueue(queue);
  }, []);

  const addToSyncQueue = useCallback((type: string, data: unknown) => {
    const _item: SyncQueueItem = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: new Date(),
      retryCount: 0,
    };

    offlineStorage.queueForSync(_item);
    setSyncQueue(prev => [...prev, _item]);
  }, []);

  const saveOfflineData = useCallback(async (key: keyof OfflineData, data: unknown) => {
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
    } catch (_error) {
      console._error(`Failed to save offline data for ${key}:`, _error);
    }
  }, [isOnline, addToSyncQueue]);

  const syncData = useCallback(async () => {
    if (!isOnline || isSyncing || !user) return;

    setIsSyncing(true);
    
    try {
      const queue = offlineStorage.getSyncQueue();
      
      for (const _item of queue) {
        try {
          // Process sync _item based on type
          switch (_item.type) {
            case 'save_checkIns':
              // Sync check-ins to server
              console.log('Syncing check-ins:', _item.data);
              break;
            case 'save_recoveryPlan':
              // Sync recovery plan to server
              console.log('Syncing recovery plan:', _item.data);
              break;
            case 'save_contacts':
              // Sync _contacts to server
              console.log('Syncing _contacts:', _item.data);
              break;
            default:
              console.log('Unknown sync type:', _item.type);
          }
        } catch (_error) {
          console._error('Failed to sync _item:', _item, _error);
          
          // Increment retry count
          _item.retryCount += 1;
          
          // Remove _item if too many retries
          if (_item.retryCount >= 3) {
            console.warn('Removing _item after 3 failed attempts:', _item);
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
      
    } catch (_error) {
      console._error('Sync failed:', _error);
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

  const addOfflineCheckIn = useCallback(async (checkInData: unknown) => {
    const checkIn = {
      ...checkInData,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      synced: false,
    };

    const _updatedCheckIns = [...offlineData.checkIns, checkIn];
    await saveOfflineData('checkIns', _updatedCheckIns);
    
    return checkIn;
  }, [offlineData.checkIns, saveOfflineData]);

  const canWorkOffline = useCallback(() => {
    return (
      offlineData._recoveryPlan !== null ||
      offlineData._contacts.length > 0 ||
      offlineData._copingStrategies.length > 0 ||
      offlineData._cbtExercises.length > 0
    );
  }, [offlineData]);

  const getCacheStatus = useCallback(() => {
    const totalItems = Object.values(offlineData).reduce((acc, data) => {
      return acc + (Array.isArray(data) ? data.length : data ? 1 : 0);
    }, 0);

    return {
      totalItems,
      pendingSync: syncQueue.length,
      _lastSync: lastSyncTime,
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