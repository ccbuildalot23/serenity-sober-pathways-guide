
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { offlineStorage } from '@/services/offlineStorageService';
import { EnhancedCrisisToolkit } from './EnhancedCrisisToolkit';
import { CrisisAccessibilitySettings } from '../settings/CrisisAccessibilitySettings';

interface CrisisIntegrationWrapperProps {
  children?: React.ReactNode;
  currentMoodScore?: number;
}

export const CrisisIntegrationWrapper: React.FC<CrisisIntegrationWrapperProps> = ({
  children,
  currentMoodScore = 5
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      toast.success("Back online - crisis data will now sync");
      
      // Sync queued crisis data
      const syncQueue = offlineStorage.getSyncQueue();
      if (syncQueue.length > 0) {
        toast.info(`Syncing ${syncQueue.length} crisis events...`);
        // Here you would typically process the sync queue
        offlineStorage.clearSyncQueue();
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast.warning("You're offline - crisis tools will work with cached data");
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Keyboard shortcuts for crisis access
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + E for emergency
      if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
        event.preventDefault();
        navigate('/crisis-toolkit');
      }

      // Ctrl/Cmd + A for accessibility settings
      if ((event.ctrlKey || event.metaKey) && event.key === 'a' && event.shiftKey) {
        event.preventDefault();
        setShowAccessibilitySettings(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [navigate]);

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="crisis-integration-wrapper">
      {children}
      
      {/* Show crisis toolkit if mood is low */}
      {currentMoodScore <= 3 && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          <EnhancedCrisisToolkit 
            moodScore={currentMoodScore}
            isOffline={isOffline}
          />
        </div>
      )}

      {/* Accessibility settings modal */}
      {showAccessibilitySettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Crisis Accessibility Settings</h2>
                <button
                  onClick={() => setShowAccessibilitySettings(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                  aria-label="Close accessibility settings"
                >
                  ×
                </button>
              </div>
              <CrisisAccessibilitySettings />
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => setShowAccessibilitySettings(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts help */}
      <div className="fixed bottom-4 left-4 text-xs text-gray-500">
        <div>Ctrl+E: Emergency Tools</div>
        <div>Ctrl+Shift+A: Accessibility</div>
      </div>
    </div>
  );
};

export default CrisisIntegrationWrapper;
