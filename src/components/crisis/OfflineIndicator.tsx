
import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { offlineStorage } from '@/services/offlineStorageService';

interface OfflineIndicatorProps {
  onSync?: () => void;
}

const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ onSync }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncItems, setPendingSyncItems] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkPendingSync();
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkPendingSync();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const checkPendingSync = () => {
    const syncQueue = offlineStorage.getSyncQueue();
    setPendingSyncItems(syncQueue.length);
  };

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      if (onSync) {
        await onSync();
      }
      checkPendingSync();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isOnline && pendingSyncItems === 0) {
    return null; // Don't show anything when online and synced
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      {!isOnline ? (
        <Alert className="border-orange-200 bg-orange-50">
          <WifiOff className="h-4 w-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-orange-800">
              You're offline. Crisis tools will continue to work.
            </span>
            <Badge variant="outline" className="ml-2 text-orange-600 border-orange-300">
              Offline Mode
            </Badge>
          </AlertDescription>
        </Alert>
      ) : pendingSyncItems > 0 ? (
        <Alert className="border-blue-200 bg-blue-50">
          <Wifi className="h-4 w-4 text-blue-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-blue-800">
              {pendingSyncItems} items waiting to sync
            </span>
            <Button
              onClick={handleSync}
              disabled={isSyncing}
              size="sm"
              variant="outline"
              className="ml-2 border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              {isSyncing ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                'Sync Now'
              )}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
};

export default OfflineIndicator;
