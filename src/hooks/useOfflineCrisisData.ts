
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { offlineStorage } from '@/services/offlineStorageService';
import UnifiedCrisisService from '@/services/unifiedCrisisService';
import { CrisisSyncService } from '@/services/crisisSyncService';
import { generateUUID } from '@/utils/crisisDataUtils';
import type { CrisisResolution, CheckInResponse, FollowUpTask } from '@/types/crisisData';

// Recovery-first offline support - works when they need it most
export const useOfflineSupport = () => {
  const [_isOnline, setIsOnline] = useState(navigator.onLine);
  const [crisisResolutions, setCrisisResolutions] = useState<CrisisResolution[]>([]);
  const [checkInResponses, setCheckInResponses] = useState<CheckInResponse[]>([]);
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    const _handleOnline = () => setIsOnline(true);
    const _handleOffline = () => setIsOnline(false);

    window.addEventListener('online', _handleOnline);
    window.addEventListener('offline', _handleOffline);

    if (user) {
      loadData();
    }

    return () => {
      window.removeEventListener('online', _handleOnline);
      window.removeEventListener('offline', _handleOffline);
    };
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      if (_isOnline) {
        await loadFromDatabase();
      } else {
        await loadFromOfflineStorage();
      }
    } catch (_error) {
      console._error('Failed to load crisis data:', _error);
      await loadFromOfflineStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromDatabase = async () => {
    if (!user) return;

    try {
      const [_resolutions, _responses, _tasks] = await Promise.all([
        UnifiedCrisisService.loadCrisisResolutions(user.id),
        UnifiedCrisisService.loadCheckInResponses(user.id),
        UnifiedCrisisService.loadFollowUpTasks(user.id)
      ]);

      setCrisisResolutions(_resolutions);
      setCheckInResponses(_responses);
      setFollowUpTasks(_tasks);

      // Save to offline storage as backup
      offlineStorage.saveToLocalStorage('crisisResolutions', _resolutions);
      offlineStorage.saveToLocalStorage('checkInResponses', _responses);
      offlineStorage.saveToLocalStorage('followUpTasks', _tasks);
    } catch (_error) {
      console._error('Error loading from database:', _error);
      throw _error;
    }
  };

  const loadFromOfflineStorage = async () => {
    try {
      await offlineStorage.initDB();
      
      const [_resolutions, _responses, _tasks] = await Promise.all([
        offlineStorage.getData('crisisResolutions'),
        offlineStorage.getData('checkInResponses'),
        offlineStorage.getData('followUpTasks')
      ]);

      setCrisisResolutions(_resolutions || []);
      setCheckInResponses(_responses || []);
      setFollowUpTasks(_tasks || []);
    } catch (_error) {
      console._error('Failed to load offline data:', _error);
      // Fallback to localStorage
      const _resolutions = offlineStorage.getFromLocalStorage('crisisResolutions') || [];
      const _responses = offlineStorage.getFromLocalStorage('checkInResponses') || [];
      const _tasks = offlineStorage.getFromLocalStorage('followUpTasks') || [];

      setCrisisResolutions(_resolutions);
      setCheckInResponses(_responses);
      setFollowUpTasks(_tasks);
    }
  };

  const saveHelpMoment = async (resolution: Omit<CrisisResolution, 'id' | 'user_id'>) => {
    if (!user) return;

    try {
      let newMoment: CrisisResolution;

      if (_isOnline) {
        newMoment = await UnifiedCrisisService.saveCrisisResolution(user.id, resolution);
      } else {
        newMoment = {
          ...resolution,
          user_id: user.id,
          id: generateUUID()
        };
        await offlineStorage.saveData('crisisResolutions', newMoment);
        offlineStorage.queueForSync({
          type: 'crisis_resolution',
          data: newMoment
        });
      }

      setCrisisResolutions(prev => [newMoment, ...prev]);
      offlineStorage.saveToLocalStorage('crisisResolutions', [newMoment, ...crisisResolutions]);
    } catch (_error) {
      console._error('Failed to save help moment:', _error);
    }
  };

  const saveCheckInResponse = async (response: Omit<CheckInResponse, 'id' | 'user_id'>) => {
    if (!user) return;

    try {
      let newResponse: CheckInResponse;

      if (_isOnline) {
        newResponse = await UnifiedCrisisService.saveCheckInResponse(user.id, response);
      } else {
        newResponse = {
          ...response,
          user_id: user.id,
          id: generateUUID()
        };
        await offlineStorage.saveData('checkInResponses', newResponse);
        offlineStorage.queueForSync({
          type: 'check_in_response',
          data: newResponse
        });
      }

      setCheckInResponses(prev => [newResponse, ...prev]);
      offlineStorage.saveToLocalStorage('checkInResponses', [newResponse, ...checkInResponses]);
    } catch (_error) {
      console._error('Failed to save check-in response:', _error);
    }
  };

  const saveNextStep = async (task: Omit<FollowUpTask, 'id' | 'user_id'>) => {
    if (!user) return;

    try {
      let newStep: FollowUpTask;

      if (_isOnline) {
        newStep = await UnifiedCrisisService.saveFollowUpTask(user.id, task);
      } else {
        newStep = {
          ...task,
          user_id: user.id,
          id: generateUUID()
        };
        await offlineStorage.saveData('followUpTasks', newStep);
        offlineStorage.queueForSync({
          type: 'follow_up_task',
          data: newStep
        });
      }

      setFollowUpTasks(prev => [...prev, newStep].sort((a, b) => 
        a.scheduled_for.getTime() - b.scheduled_for.getTime()
      ));
      offlineStorage.saveToLocalStorage('followUpTasks', [...followUpTasks, newStep]);
    } catch (_error) {
      console._error('Failed to save next step:', _error);
    }
  };

  const updateNextStep = async (taskId: string, updates: Partial<FollowUpTask>) => {
    if (!user) return;

    try {
      if (_isOnline) {
        await UnifiedCrisisService.updateFollowUpTask(user.id, taskId, updates);
      } else {
        offlineStorage.queueForSync({
          type: 'update_follow_up_task',
          data: { taskId, updates }
        });
      }

      const _updatedSteps = followUpTasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      );
      
      setFollowUpTasks(_updatedSteps);
      offlineStorage.saveToLocalStorage('followUpTasks', _updatedSteps);
    } catch (_error) {
      console._error('Failed to update next step:', _error);
    }
  };

  const syncWithServer = async () => {
    if (!_isOnline || !user) return;
    
    try {
      await CrisisSyncService.syncWithServer(user.id);
      console.log('Synced offline support data with server');
      
      // Reload data from server after sync
      await loadFromDatabase();
    } catch (_error) {
      console._error('Failed to sync with server:', _error);
    }
  };

  return {
    _isOnline,
    isLoading,
    helpMoments: crisisResolutions,
    checkInResponses,
    nextSteps: followUpTasks,
    saveHelpMoment,
    saveCheckInResponse,
    saveNextStep,
    updateNextStep,
    syncWithServer,
    loadOfflineData: loadData
  };
};

// Backward compatibility
export const useOfflineCrisisData = useOfflineSupport;
