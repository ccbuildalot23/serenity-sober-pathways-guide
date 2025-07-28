import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const TestConnectionMonitor: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const [lastPing, setLastPing] = useState<number>(0);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    const channel = supabase.channel('connection-test');
    
    channel.on('system', { event: 'ping' }, () => {
      setLastPing(Date.now());
      setConnectionStatus('connected');
    });

    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionStatus('connected');
        setErrorCount(0);
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setConnectionStatus('disconnected');
        setErrorCount(prev => prev + 1);
      }
    });

    // Monitor connection health
    const healthCheck = setInterval(() => {
      const timeSinceLastPing = Date.now() - lastPing;
      if (timeSinceLastPing > 60000 && connectionStatus === 'connected') {
        setConnectionStatus('disconnected');
      }
    }, 10000);

    return () => {
      clearInterval(healthCheck);
      supabase.removeChannel(channel);
    };
  }, [lastPing, connectionStatus]);

  const reconnect = async () => {
    setConnectionStatus('reconnecting');
    try {
      const testChannel = supabase.channel('reconnect-test');
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Reconnection timeout')), 5000);
        testChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            resolve(status);
            setConnectionStatus('connected');
            setErrorCount(0);
          }
        });
      });
      supabase.removeChannel(testChannel);
    } catch (error) {
      setConnectionStatus('disconnected');
      setErrorCount(prev => prev + 1);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'default';
      case 'reconnecting': return 'secondary';
      default: return 'destructive';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <Wifi className="w-4 h-4" />;
      case 'reconnecting': return <RefreshCw className="w-4 h-4 animate-spin" />;
      default: return <WifiOff className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant={getStatusColor()} className="flex items-center gap-2">
          {getStatusIcon()}
          Real-time: {connectionStatus}
        </Badge>
        
        {connectionStatus !== 'connected' && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={reconnect}
            disabled={connectionStatus === 'reconnecting'}
          >
            {connectionStatus === 'reconnecting' ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Reconnecting...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reconnect
              </>
            )}
          </Button>
        )}
      </div>

      {errorCount > 0 && (
        <Alert>
          <AlertDescription>
            Connection errors detected: {errorCount}. 
            {lastPing > 0 && ` Last successful ping: ${Math.round((Date.now() - lastPing) / 1000)}s ago`}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default TestConnectionMonitor;