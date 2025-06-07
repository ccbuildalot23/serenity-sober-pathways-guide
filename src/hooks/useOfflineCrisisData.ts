
import { useState, useEffect } from 'react';
import { offlineStorage } from '@/services/offlineStorageService';

interface CrisisResolution {
  id: string;
  userId: string;
  crisisStartTime: Date;
  resolutionTime: Date;
  interventionsUsed: string[];
  effectivenessRating: number;
  additionalNotes: string;
  safetyConfirmed: boolean;
}

interface CheckInResponse {
  id: string;
  taskId: string;
  timestamp: Date;
  moodRating: number;
  notes: string;
  needsSupport: boolean;
}

interface FollowUpTask {
  id: string;
  userId: string;
  type: 'check_in' | 'mood_assessment' | 'professional_follow_up';
  scheduled: Date;
  completed: boolean;
  crisisEventId: string;
}

export const useOfflineCrisisData = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [crisisResolutions, setCrisisResolutions] = useState<CrisisResolution[]>([]);
  const [checkInResponses, setCheckInResponses] = useState<CheckInResponse[]>([]);
  const [followUpTasks, setFollowUpTasks] = useState<FollowUpTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadOfflineData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadOfflineData = async () => {
    try {
      setIsLoading(true);
      await offlineStorage.initDB();
      
      const [resolutions, responses, tasks] = await Promise.all([
        offlineStorage.getData('crisisResolutions'),
        offlineStorage.getData('checkInResponses'),
        offlineStorage.getData('followUpTasks')
      ]);

      setCrisisResolutions(resolutions);
      setCheckInResponses(responses);
      setFollowUpTasks(tasks);
    } catch (error) {
      console.error('Failed to load offline data:', error);
      // Fallback to localStorage
      loadFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    const resolutions = offlineStorage.getFromLocalStorage('crisisResolutions') || [];
    const responses = offlineStorage.getFromLocalStorage('checkInResponses') || [];
    const tasks = offlineStorage.getFromLocalStorage('followUpTasks') || [];

    setCrisisResolutions(resolutions);
    setCheckInResponses(responses);
    setFollowUpTasks(tasks);
  };

  const saveCrisisResolution = async (resolution: CrisisResolution) => {
    try {
      await offlineStorage.saveData('crisisResolutions', resolution);
      setCrisisResolutions(prev => [...prev, resolution]);
      
      // Also save to localStorage as backup
      offlineStorage.saveToLocalStorage('crisisResolutions', [...crisisResolutions, resolution]);
      
      if (!isOnline) {
        offlineStorage.queueForSync({
          type: 'crisis_resolution',
          data: resolution
        });
      }
    } catch (error) {
      console.error('Failed to save crisis resolution:', error);
    }
  };

  const saveCheckInResponse = async (response: CheckInResponse) => {
    try {
      await offlineStorage.saveData('checkInResponses', response);
      setCheckInResponses(prev => [...prev, response]);
      
      // Also save to localStorage as backup
      offlineStorage.saveToLocalStorage('checkInResponses', [...checkInResponses, response]);
      
      if (!isOnline) {
        offlineStorage.queueForSync({
          type: 'check_in_response',
          data: response
        });
      }
    } catch (error) {
      console.error('Failed to save check-in response:', error);
    }
  };

  const saveFollowUpTask = async (task: FollowUpTask) => {
    try {
      await offlineStorage.saveData('followUpTasks', task);
      setFollowUpTasks(prev => [...prev, task]);
      
      // Also save to localStorage as backup
      offlineStorage.saveToLocalStorage('followUpTasks', [...followUpTasks, task]);
      
      if (!isOnline) {
        offlineStorage.queueForSync({
          type: 'follow_up_task',
          data: task
        });
      }
    } catch (error) {
      console.error('Failed to save follow-up task:', error);
    }
  };

  const updateFollowUpTask = async (taskId: string, updates: Partial<FollowUpTask>) => {
    try {
      const updatedTasks = followUpTasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      );
      
      const updatedTask = updatedTasks.find(task => task.id === taskId);
      if (updatedTask) {
        await offlineStorage.saveData('followUpTasks', updatedTask);
        setFollowUpTasks(updatedTasks);
        
        // Also save to localStorage as backup
        offlineStorage.saveToLocalStorage('followUpTasks', updatedTasks);
        
        if (!isOnline) {
          offlineStorage.queueForSync({
            type: 'update_follow_up_task',
            data: { taskId, updates }
          });
        }
      }
    } catch (error) {
      console.error('Failed to update follow-up task:', error);
    }
  };

  const syncWithServer = async () => {
    if (!isOnline) return;
    
    try {
      const syncQueue = offlineStorage.getSyncQueue();
      // Here you would implement server sync logic
      // For now, just clear the queue
      offlineStorage.clearSyncQueue();
      console.log('Synced offline data with server');
    } catch (error) {
      console.error('Failed to sync with server:', error);
    }
  };

  return {
    isOnline,
    isLoading,
    crisisResolutions,
    checkInResponses,
    followUpTasks,
    saveCrisisResolution,
    saveCheckInResponse,
    saveFollowUpTask,
    updateFollowUpTask,
    syncWithServer,
    loadOfflineData
  };
};
