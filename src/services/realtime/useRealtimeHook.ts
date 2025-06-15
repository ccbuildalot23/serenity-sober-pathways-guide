import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeAlert, RealtimePresence } from './types';
import { log } from './debugUtils';

// Hook for React components
export function useRealtime() {
  const [alerts, setAlerts] = React.useState<RealtimeAlert[]>([]);
  const [presence, setPresence] = React.useState<RealtimePresence[]>([]);
  const [isConnected, setIsConnected] = React.useState(false);
  const [connectionError, setConnectionError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let unsubscribeAlert: (() => void) | null = null;
    let unsubscribePresence: (() => void) | null = null;

    const initialize = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          log('error', 'No user found for realtime initialization');
          setConnectionError('Not authenticated');
          return;
        }

        log('realtime', 'Initializing realtime for user', { userId: user.id });
        // Import dynamically to avoid circular dependency
        const { enhancedRealtimeService } = await import('../enhancedRealtimeService');
        await enhancedRealtimeService.initialize(user.id);
        setIsConnected(true);
        setConnectionError(null);

        // Subscribe to alerts
        unsubscribeAlert = enhancedRealtimeService.onAlert((alert) => {
          setAlerts(prev => [alert, ...prev].slice(0, 50));
        });

        // Subscribe to presence
        unsubscribePresence = enhancedRealtimeService.onPresenceUpdate((presenceList) => {
          setPresence(presenceList);
        });

        // Listen for connection issues
        const handleConnectionIssue = (event: CustomEvent) => {
          setIsConnected(false);
          setConnectionError('Connection lost. Retrying...');
          log('realtime', 'Connection issue event received', event.detail);
        };

        window.addEventListener('realtime-connection-issue', handleConnectionIssue as any);

        return () => {
          window.removeEventListener('realtime-connection-issue', handleConnectionIssue as any);
        };
      } catch (error) {
        log('error', 'Failed to initialize realtime', { error: error.message });
        setConnectionError(error.message);
        setIsConnected(false);
      }
    };

    initialize();

    return () => {
      unsubscribeAlert?.();
      unsubscribePresence?.();
      // Import dynamically to avoid circular dependency
      import('../enhancedRealtimeService').then(({ enhancedRealtimeService }) => {
        enhancedRealtimeService.cleanup();
      });
      setIsConnected(false);
    };
  }, []);

  return {
    alerts,
    presence,
    isConnected,
    connectionError,
    sendAlert: async (...args: any[]) => {
      const { enhancedRealtimeService } = await import('../enhancedRealtimeService');
      return enhancedRealtimeService.sendAlert.apply(enhancedRealtimeService, args);
    },
    sendCrisisAlert: async (...args: any[]) => {
      const { enhancedRealtimeService } = await import('../enhancedRealtimeService');
      return enhancedRealtimeService.sendCrisisAlert.apply(enhancedRealtimeService, args);
    },
    updateStatus: async (...args: any[]) => {
      const { enhancedRealtimeService } = await import('../enhancedRealtimeService');
      return enhancedRealtimeService.updateStatus.apply(enhancedRealtimeService, args);
    }
  };
}

