
import React, { useState, useEffect } from 'react';
import { realtimeService } from '@/services/realtimeService';
import { pollingService } from '@/services/pollingService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Database, RefreshCw } from 'lucide-react';

export const RealtimeDebugPanel: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateDebugInfo = () => {
      const info = realtimeService.getDebugInfo();
      setDebugInfo(info);
    };

    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 2000);

    return () => clearInterval(interval);
  }, []);

  // Only show in development or when explicitly enabled
  useEffect(() => {
    const shouldShow = process.env.NODE_ENV === 'development' || 
                      localStorage.getItem('show-realtime-debug') === 'true';
    setIsVisible(shouldShow);
  }, []);

  const toggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    localStorage.setItem('show-realtime-debug', newVisibility.toString());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800';
      case 'connected-polling':
        return 'bg-blue-100 text-blue-800';
      case 'connecting':
        return 'bg-yellow-100 text-yellow-800';
      case 'disconnected':
        return 'bg-red-100 text-red-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'connected-polling') {
      return <Database className="w-4 h-4" />;
    } else if (status === 'connected') {
      return <Wifi className="w-4 h-4" />;
    } else {
      return <WifiOff className="w-4 h-4" />;
    }
  };

  if (!isVisible) {
    return (
      <button
        onClick={toggleVisibility}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 z-50"
        title="Show Realtime Debug"
      >
        <Wifi className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Realtime Status</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleVisibility}
              className="h-6 w-6 p-0"
            >
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Connection:</span>
            <Badge className={getStatusColor(debugInfo.connectionStatus)}>
              <div className="flex items-center gap-1">
                {getStatusIcon(debugInfo.connectionStatus)}
                {debugInfo.connectionStatus?.replace('-', ' ') || 'unknown'}
              </div>
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Channels:</span>
              <span className="ml-1 font-mono">{debugInfo.channelCount || 0}</span>
            </div>
            <div>
              <span className="text-gray-600">Polling:</span>
              <span className="ml-1 font-mono">{debugInfo.pollingActive || 0}</span>
            </div>
            <div>
              <span className="text-gray-600">Retries:</span>
              <span className="ml-1 font-mono">{debugInfo.reconnectAttempts || 0}</span>
            </div>
            <div>
              <span className="text-gray-600">Mode:</span>
              <span className="ml-1 font-mono">
                {debugInfo.usingPolling ? 'Poll' : 'RT'}
              </span>
            </div>
          </div>

          {debugInfo.connectionStatus === 'error' && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              Connection failed. Using polling fallback.
            </div>
          )}

          {debugInfo.usingPolling && (
            <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
              Using polling mode for real-time updates.
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => window.location.href = '/test-realtime'}
              className="text-xs"
            >
              Test
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => {
                console.log('Realtime Debug Info:', debugInfo);
                console.log('Window Debug Log:', (window as any).debugLog);
              }}
              className="text-xs"
            >
              Log
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealtimeDebugPanel;
