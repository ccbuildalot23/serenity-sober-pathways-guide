
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage } from '@/services/offlineStorageService';

export class CrisisSyncService {
  static async syncWithServer(userId: string): Promise<void> {
    const syncQueue = offlineStorage.getSyncQueue();
    
    for (const item of syncQueue) {
      switch (item.type) {
        case 'crisis_resolution':
          await supabase
            .from('crisis_resolutions')
            .insert({
              user_id: userId,
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
              user_id: userId,
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
              user_id: userId,
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
            .eq('user_id', userId);
          break;
      }
    }
    
    offlineStorage.clearSyncQueue();
    console.log('Synced offline crisis data with server');
  }
}
