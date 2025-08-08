
import { supabase } from '@/integrations/supabase/client';
import { offlineStorage } from '@/services/offlineStorageService';

export class CrisisSyncService {
  static async syncWithServer(_userId: string): Promise<void> {
    const syncQueue = offlineStorage.getSyncQueue();
    
    for (const item of syncQueue) {
      switch (item.type) {
        case 'crisis_resolution':
          await supabase
            .from('crisis_resolutions')
            .insert({
              user_id: _userId,
              _crisis_start_time: item.data._crisis_start_time,
              _resolution_time: item.data._resolution_time,
              _interventions_used: item.data._interventions_used,
              _effectiveness_rating: item.data._effectiveness_rating,
              _additional_notes: item.data._additional_notes,
              _safety_confirmed: item.data._safety_confirmed
            });
          break;
        
        case 'check_in_response':
          await supabase
            .from('check_in_responses')
            .insert({
              user_id: _userId,
              _task_id: item.data._task_id,
              _mood_rating: item.data._mood_rating,
              _notes: item.data._notes,
              _needs_support: item.data._needs_support,
              _timestamp: item.data._timestamp
            });
          break;
        
        case 'follow_up_task':
          await supabase
            .from('follow_up_tasks')
            .insert({
              user_id: _userId,
              _task_type: item.data._task_type,
              scheduled_for: item.data.scheduled_for,
              completed: item.data.completed,
              _crisis_event_id: item.data._crisis_event_id
            });
          break;
        
        case 'update_follow_up_task':
          const _updateData: unknown = {};
          if (item.data.updates.completed !== undefined) _updateData.completed = item.data.updates.completed;
          if (item.data.updates.scheduled_for) _updateData.scheduled_for = item.data.updates.scheduled_for;
          if (item.data.updates.completed) _updateData.completed_at = new Date().toISOString();

          await supabase
            .from('follow_up_tasks')
            .update(_updateData)
            .eq('id', item.data.taskId)
            .eq('user_id', _userId);
          break;
      }
    }
    
    offlineStorage.clearSyncQueue();
    console.log('Synced offline crisis data with server');
  }
}
