import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WifiOff, RefreshCw, Database, Clock } from 'lucide-react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

const OfflineModeBanner: React.FC = () => {
  const { 
    isOnline, 
    isSyncing, 
    lastSyncTime, 
    syncQueue, 
    syncData, 
    canWorkOffline,
    getCacheStatus 
  } = useOfflineSync();

  const cacheStatus = getCacheStatus();

  if (isOnline && syncQueue.length === 0) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40">
      <div className="mx-4">
        <Alert className={`${isOnline ? 'border-warning bg-warning/10' : 'border-destructive bg-destructive/10'}`}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4" />
              <div className="flex-1">
                <AlertDescription>
                  {!isOnline ? (
                    <div className="space-y-1">
                      <p className="font-medium">You're offline</p>
                      <p className="text-sm">
                        {canWorkOffline() 
                          ? 'Crisis features and cached data are available'
                          : 'Limited functionality available'
                        }
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-medium">
                        {syncQueue.length} items pending sync
                      </p>
                      {lastSyncTime && (
                        <p className="text-sm flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Last sync: {lastSyncTime.toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  )}
                </AlertDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Cache status */}
              <div className="flex gap-1">
                <Badge variant="outline" className="text-xs">
                  <Database className="h-3 w-3 mr-1" />
                  {cacheStatus.totalItems} cached
                </Badge>
                
                {cacheStatus.isStale && (
                  <Badge variant="destructive" className="text-xs">
                    Stale
                  </Badge>
                )}
              </div>

              {/* Sync button */}
              {isOnline && syncQueue.length > 0 && (
                <Button
                  onClick={syncData}
                  disabled={isSyncing}
                  size="sm"
                  variant="outline"
                  className="h-8"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              )}
            </div>
          </div>
        </Alert>
      </div>
    </div>
  );
};

export default OfflineModeBanner;