
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { offlineStorage } from '@/services/offlineStorageService';
import UnifiedCrisisService from '@/services/unifiedCrisisService';
import { CrisisSyncService } from '@/services/crisisSyncService';
import { generateUUID } from '@/utils/crisisDataUtils';
import type { CrisisResolution, CheckInResponse, FollowUpTask } from '@/types/crisisData';

// Recovery-first offline support - works when they need it most
export const useOfflineSupport = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [crisisResolutions, setCrisisResolutions] = useState<CrisisResolution[]>([]);
  const [checkInResponses, setCheckInResponses] = useState<CheckInResponse[]>([]);
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (user) {
      loadData();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      if (isOnline) {
        await loadFromDatabase();
      } else {
        await loadFromOfflineStorage();
      }
    } catch (error) {
      console.error('Failed to load crisis data:', error);
      await loadFromOfflineStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromDatabase = async () => {
    if (!user) return;

    try {
      const [resolutions, responses, tasks] = await Promise.all([
        UnifiedCrisisService.loadCrisisResolutions(user.id),
        UnifiedCrisisService.loadCheckInResponses(user.id),
        UnifiedCrisisService.loadFollowUpTasks(user.id)
      ]);

      setCrisisResolutions(resolutions);
      setCheckInResponses(responses);
      setFollowUpTasks(tasks);

      // Save to offline storage as backup
      offlineStorage.saveToLocalStorage('crisisResolutions', resolutions);
      offlineStorage.saveToLocalStorage('checkInResponses', responses);
      offlineStorage.saveToLocalStorage('followUpTasks', tasks);
    } catch (error) {
      console.error('Error loading from database:', error);
      throw error;
    }
  };

  const loadFromOfflineStorage = async () => {
    try {
      await offlineStorage.initDB();
      
      const [resolutions, responses, tasks] = await Promise.all([
        offlineStorage.getData('crisisResolutions'),
        offlineStorage.getData('checkInResponses'),
        offlineStorage.getData('followUpTasks')
      ]);

      setCrisisResolutions(resolutions || []);
      setCheckInResponses(responses || []);
      setFollowUpTasks(tasks || []);
    } catch (error) {
      console.error('Failed to load offline data:', error);
      // Fallback to localStorage
      const resolutions = offlineStorage.getFromLocalStorage('crisisResolutions') || [];
      const responses = offlineStorage.getFromLocalStorage('checkInResponses') || [];
      const tasks = offlineStorage.getFromLocalStorage('followUpTasks') || [];

      setCrisisResolutions(resolutions);
      setCheckInResponses(responses);
      setFollowUpTasks(tasks);
    }
  };

  const saveHelpMoment = async (resolution: Omit<CrisisResolution, 'id' | 'user_id'>) => {
    if (!user) return;

    try {
      let newMoment: CrisisResolution;

      if (isOnline) {
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
    } catch (error) {
      console.error('Failed to save help moment:', error);
    }
  };

  const saveCheckInResponse = async (response: Omit<CheckInResponse, 'id' | 'user_id'>) => {
    if (!user) return;

    try {
      let newResponse: CheckInResponse;

      if (isOnline) {
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
    } catch (error) {
      console.error('Failed to save check-in response:', error);
    }
  };

  const saveNextStep = async (task: Omit<FollowUpTask, 'id' | 'user_id'>) => {
    if (!user) return;

    try {
      let newStep: FollowUpTask;

      if (isOnline) {
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
    } catch (error) {
      console.error('Failed to save next step:', error);
    }
  };

  const updateNextStep = async (taskId: string, updates: Partial<FollowUpTask>) => {
    if (!user) return;

    try {
      if (isOnline) {
        await UnifiedCrisisService.updateFollowUpTask(user.id, taskId, updates);
      } else {
        offlineStorage.queueForSync({
          type: 'update_follow_up_task',
          data: { taskId, updates }
        });
      }

      const updatedSteps = followUpTasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      );
      
      setFollowUpTasks(updatedSteps);
      offlineStorage.saveToLocalStorage('followUpTasks', updatedSteps);
    } catch (error) {
      console.error('Failed to update next step:', error);
    }
  };

  const syncWithServer = async () => {
    if (!isOnline || !user) return;
    
    try {
      await CrisisSyncService.syncWithServer(user.id);
      console.log('Synced offline support data with server');
      
      // Reload data from server after sync
      await loadFromDatabase();
    } catch (error) {
      console.error('Failed to sync with server:', error);
    }
  };

  return {
    isOnline,
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
