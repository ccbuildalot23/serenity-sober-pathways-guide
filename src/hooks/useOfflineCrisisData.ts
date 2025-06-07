
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { offlineStorage } from '@/services/offlineStorageService';

interface CrisisResolution {
  id: string;
  user_id: string;
  crisis_start_time: Date;
  resolution_time: Date;
  interventions_used: string[];
  effectiveness_rating: number;
  additional_notes: string;
  safety_confirmed: boolean;
}

interface CheckInResponse {
  id: string;
  user_id: string;
  task_id: string;
  timestamp: Date;
  mood_rating: number;
  notes: string;
  needs_support: boolean;
}

interface FollowUpTask {
  id: string;
  user_id: string;
  task_type: 'automated_check_in' | 'mood_assessment' | 'professional_follow_up';
  scheduled_for: Date;
  completed: boolean;
  crisis_event_id?: string;
}

export const useOfflineCrisisData = () => {
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
      const [resolutionsData, responsesData, tasksData] = await Promise.all([
        supabase
          .from('crisis_resolutions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('check_in_responses')
          .select('*')
          .eq('user_id', user.id)
          .order('timestamp', { ascending: false }),
        supabase
          .from('follow_up_tasks')
          .select('*')
          .eq('user_id', user.id)
          .order('scheduled_for', { ascending: true })
      ]);

      if (resolutionsData.error) throw resolutionsData.error;
      if (responsesData.error) throw responsesData.error;
      if (tasksData.error) throw tasksData.error;

      const transformedResolutions = (resolutionsData.data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        crisis_start_time: new Date(item.crisis_start_time),
        resolution_time: new Date(item.resolution_time),
        interventions_used: Array.isArray(item.interventions_used) ? item.interventions_used : [],
        effectiveness_rating: item.effectiveness_rating,
        additional_notes: item.additional_notes || '',
        safety_confirmed: item.safety_confirmed
      }));

      const transformedResponses = (responsesData.data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        task_id: item.task_id,
        timestamp: new Date(item.timestamp),
        mood_rating: item.mood_rating,
        notes: item.notes || '',
        needs_support: item.needs_support
      }));

      const transformedTasks = (tasksData.data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        task_type: item.task_type as any,
        scheduled_for: new Date(item.scheduled_for),
        completed: item.completed,
        crisis_event_id: item.crisis_event_id
      }));

      setCrisisResolutions(transformedResolutions);
      setCheckInResponses(transformedResponses);
      setFollowUpTasks(transformedTasks);

      // Save to offline storage as backup
      offlineStorage.saveToLocalStorage('crisisResolutions', transformedResolutions);
      offlineStorage.saveToLocalStorage('checkInResponses', transformedResponses);
      offlineStorage.saveToLocalStorage('followUpTasks', transformedTasks);
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

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const saveCrisisResolution = async (resolution: Omit<CrisisResolution, 'id' | 'user_id'>) => {
    if (!user) return;

    try {
      const newResolution = {
        ...resolution,
        user_id: user.id,
        id: generateUUID()
      };

      if (isOnline) {
        const { data, error } = await supabase
          .from('crisis_resolutions')
          .insert({
            user_id: user.id,
            crisis_start_time: resolution.crisis_start_time.toISOString(),
            resolution_time: resolution.resolution_time.toISOString(),
            interventions_used: resolution.interventions_used,
            effectiveness_rating: resolution.effectiveness_rating,
            additional_notes: resolution.additional_notes,
            safety_confirmed: resolution.safety_confirmed
          })
          .select()
          .single();

        if (error) throw error;
        
        newResolution.id = data.id;
      } else {
        await offlineStorage.saveData('crisisResolutions', newResolution);
        offlineStorage.queueForSync({
          type: 'crisis_resolution',
          data: newResolution
        });
      }

      setCrisisResolutions(prev => [newResolution, ...prev]);
      offlineStorage.saveToLocalStorage('crisisResolutions', [newResolution, ...crisisResolutions]);
    } catch (error) {
      console.error('Failed to save crisis resolution:', error);
    }
  };

  const saveCheckInResponse = async (response: Omit<CheckInResponse, 'id' | 'user_id'>) => {
    if (!user) return;

    try {
      const newResponse = {
        ...response,
        user_id: user.id,
        id: generateUUID()
      };

      if (isOnline) {
        const { data, error } = await supabase
          .from('check_in_responses')
          .insert({
            user_id: user.id,
            task_id: response.task_id,
            mood_rating: response.mood_rating,
            notes: response.notes,
            needs_support: response.needs_support,
            timestamp: response.timestamp.toISOString()
          })
          .select()
          .single();

        if (error) throw error;
        
        newResponse.id = data.id;
      } else {
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

  const saveFollowUpTask = async (task: Omit<FollowUpTask, 'id' | 'user_id'>) => {
    if (!user) return;

    try {
      const newTask = {
        ...task,
        user_id: user.id,
        id: generateUUID()
      };

      if (isOnline) {
        const { data, error } = await supabase
          .from('follow_up_tasks')
          .insert({
            user_id: user.id,
            task_type: task.task_type,
            scheduled_for: task.scheduled_for.toISOString(),
            completed: task.completed,
            crisis_event_id: task.crisis_event_id
          })
          .select()
          .single();

        if (error) throw error;
        
        newTask.id = data.id;
      } else {
        await offlineStorage.saveData('followUpTasks', newTask);
        offlineStorage.queueForSync({
          type: 'follow_up_task',
          data: newTask
        });
      }

      setFollowUpTasks(prev => [...prev, newTask].sort((a, b) => 
        a.scheduled_for.getTime() - b.scheduled_for.getTime()
      ));
      offlineStorage.saveToLocalStorage('followUpTasks', [...followUpTasks, newTask]);
    } catch (error) {
      console.error('Failed to save follow-up task:', error);
    }
  };

  const updateFollowUpTask = async (taskId: string, updates: Partial<FollowUpTask>) => {
    if (!user) return;

    try {
      if (isOnline) {
        const updateData: any = {};
        if (updates.completed !== undefined) updateData.completed = updates.completed;
        if (updates.scheduled_for) updateData.scheduled_for = updates.scheduled_for.toISOString();
        if (updates.completed) updateData.completed_at = new Date().toISOString();

        const { error } = await supabase
          .from('follow_up_tasks')
          .update(updateData)
          .eq('id', taskId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        offlineStorage.queueForSync({
          type: 'update_follow_up_task',
          data: { taskId, updates }
        });
      }

      const updatedTasks = followUpTasks.map(task =>
        task.id === taskId ? { ...task, ...updates } : task
      );
      
      setFollowUpTasks(updatedTasks);
      offlineStorage.saveToLocalStorage('followUpTasks', updatedTasks);
    } catch (error) {
      console.error('Failed to update follow-up task:', error);
    }
  };

  const syncWithServer = async () => {
    if (!isOnline || !user) return;
    
    try {
      const syncQueue = offlineStorage.getSyncQueue();
      
      for (const item of syncQueue) {
        switch (item.type) {
          case 'crisis_resolution':
            await supabase
              .from('crisis_resolutions')
              .insert({
                user_id: user.id,
                crisis_start_time: item.data.crisis_start_time,
                resolution_time: item.data.resolution_time,
                interventions_used: item.data.interventions_used,
                effectiveness_rating: item.data.effectiveness_rating,
                additional_notes: item.data.additional_notes,
                safety_confirmed: item.data.safety_confirmed
              });
            break;
          
          case 'check_in_response':
            await supabase
              .from('check_in_responses')
              .insert({
                user_id: user.id,
                task_id: item.data.task_id,
                mood_rating: item.data.mood_rating,
                notes: item.data.notes,
                needs_support: item.data.needs_support,
                timestamp: item.data.timestamp
              });
            break;
          
          case 'follow_up_task':
            await supabase
              .from('follow_up_tasks')
              .insert({
                user_id: user.id,
                task_type: item.data.task_type,
                scheduled_for: item.data.scheduled_for,
                completed: item.data.completed,
                crisis_event_id: item.data.crisis_event_id
              });
            break;
          
          case 'update_follow_up_task':
            const updateData: any = {};
            if (item.data.updates.completed !== undefined) updateData.completed = item.data.updates.completed;
            if (item.data.updates.scheduled_for) updateData.scheduled_for = item.data.updates.scheduled_for;
            if (item.data.updates.completed) updateData.completed_at = new Date().toISOString();

            await supabase
              .from('follow_up_tasks')
              .update(updateData)
              .eq('id', item.data.taskId)
              .eq('user_id', user.id);
            break;
        }
      }
      
      offlineStorage.clearSyncQueue();
      console.log('Synced offline crisis data with server');
      
      // Reload data from server after sync
      await loadFromDatabase();
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
    loadOfflineData: loadData
  };
};
