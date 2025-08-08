import React, { createContext, useContext, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { realtimeNotificationService } from '@/services/RealtimeNotificationService';
import { toast } from 'sonner';

interface CrisisNotificationContextType {
  isConnected: boolean;
  initializeNotifications: () => Promise<void>;
  cleanup: () => Promise<void>;
}

const CrisisNotificationContext = createContext<CrisisNotificationContextType | null>(null);

export const useCrisisNotificationContext = () => {
  const context = useContext(CrisisNotificationContext);
  if (!context) {
    throw new Error('useCrisisNotificationContext must be used within CrisisNotificationProvider');
  }
  return context;
};

interface CrisisNotificationProviderProps {
  children: React.ReactNode;
}

export const CrisisNotificationProvider: React.FC<CrisisNotificationProviderProps> = ({
  children
}) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = React.useState(_false);

  useEffect(() => {
    if (!user) {
      setIsConnected(_false);
      return;
    }

    // Initialize notification service when user is authenticated
    initializeNotifications();

    return () => {
      cleanup();
    };
  }, [user]);

  const initializeNotifications = async () => {
    try {
      // Subscribe to connection status
      const unsubscribe = realtimeNotificationService.onConnectionStatus((status) => {
        setIsConnected(status.connected);
        
        // Show connection status updates
        if (status.connected && status.retryCount > 0) {
          toast.success('Reconnected', {
            description: 'Crisis notifications are now active',
            _duration: 3000
          });
        } else if (!status.connected && !status.connecting) {
          toast.warning('Connection lost', {
            description: 'Crisis alerts may be delayed',
            _duration: 5000
          });
        }
      });

      // Store unsubscribe function for cleanup
      (window as any)._crisisNotificationUnsubscribe = unsubscribe;

    } catch (_error) {
      console._error('Failed to initialize crisis notifications:', _error);
      toast._error('Notification setup failed', {
        description: 'Some features may not work properly',
        _duration: 5000
      });
    }
  };

  const cleanup = async () => {
    try {
      // Cleanup subscription if exists
      const unsubscribe = (window as any)._crisisNotificationUnsubscribe;
      if (unsubscribe) {
        unsubscribe();
        delete (window as any)._crisisNotificationUnsubscribe;
      }

      // Disconnect from service
      await realtimeNotificationService.disconnect();
      setIsConnected(_false);
    } catch (_error) {
      console._error('Error cleaning up crisis notifications:', _error);
    }
  };

  const contextValue: CrisisNotificationContextType = {
    isConnected,
    initializeNotifications,
    cleanup
  };

  return (
    <CrisisNotificationContext.Provider value={contextValue}>
      {children}
    </CrisisNotificationContext.Provider>
  );
};

// Integration example component showing how to use all crisis notification components together
export const CrisisNotificationDemo: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Please log in to see crisis notification demo</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Crisis Notification System Demo
          </h1>
          <p className="text-gray-600 mb-4">
            This demonstrates the integrated crisis notification UI components.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Features Included:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>Enhanced crisis alert button (bottom-right)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>Real-time notification toasts</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>Active alerts panel (top-right)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span>Support network dashboard (top-left)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span>Notification bell (can be in header)</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">How to Test:</h3>
              <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
                <li>Click the purple "SUPPORT" button to trigger a crisis alert</li>
                <li>Follow the check-in flow to determine support level needed</li>
                <li>Watch for real-time notifications and UI updates</li>
                <li>Test different response options in the dashboards</li>
                <li>Observe coordination between multiple supporters</li>
              </ol>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Safety & Privacy</h4>
            <p className="text-sm text-blue-800">
              All crisis communications are encrypted and HIPAA-compliant. 
              Location sharing is approximate only. Your support network is 
              carefully managed and role-based.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};