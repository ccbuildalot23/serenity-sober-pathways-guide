import { supabase } from '@/integrations/supabase/client';
import { serverSideEncryption } from '@/lib/serverSideEncryption';
import type { CrisisResolution, CheckInResponse, FollowUpTask } from '@/types/crisisData';
import { transformCrisisResolution, transformCheckInResponse, transformFollowUpTask } from '@/utils/crisisDataUtils';

/**
 * Ultra-secure crisis data service using server-side encryption
 * All sensitive data is encrypted on the server before storage
 */
export class UltraSecureCrisisDataService {
  static async loadCrisisResolutions(userId: string): Promise<CrisisResolution[]> {
    const { data, error } = await supabase
      .from('crisis_resolutions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Decrypt sensitive data on the server
    const decryptedData = await Promise.all(
      (data || []).map(async (item) => {
        if (item.additional_notes) {
          try {
            item.additional_notes = await serverSideEncryption.decrypt(item.additional_notes);
          } catch (error) {
            console.error('Failed to decrypt crisis resolution notes:', error);
            item.additional_notes = '[Encrypted data - decryption failed]';
          }
        }
        return transformCrisisResolution(item);
      })
    );

    return decryptedData;
  }

  static async loadCheckInResponses(userId: string): Promise<CheckInResponse[]> {
    const { data, error } = await supabase
      .from('check_in_responses')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    
    // Decrypt sensitive data on the server
    const decryptedData = await Promise.all(
      (data || []).map(async (item) => {
        if (item.notes) {
          try {
            item.notes = await serverSideEncryption.decrypt(item.notes);
          } catch (error) {
            console.error('Failed to decrypt check-in notes:', error);
            item.notes = '[Encrypted data - decryption failed]';
          }
        }
        return transformCheckInResponse(item);
      })
    );

    return decryptedData;
  }

  static async saveCrisisResolution(userId: string, resolution: Omit<CrisisResolution, 'id' | 'user_id'>) {
    // Encrypt sensitive data before saving
    const encryptedNotes = resolution.additional_notes 
      ? await serverSideEncryption.encrypt(resolution.additional_notes)
      : null;

    const { data, error } = await supabase
      .from('crisis_resolutions')
      .insert({
        user_id: userId,
        crisis_start_time: resolution.crisis_start_time.toISOString(),
        resolution_time: resolution.resolution_time.toISOString(),
        interventions_used: resolution.interventions_used,
        effectiveness_rating: resolution.effectiveness_rating,
        additional_notes: encryptedNotes,
        safety_confirmed: resolution.safety_confirmed
      })
      .select()
      .single();

    if (error) throw error;
    
    // Decrypt the notes for return value
    if (data.additional_notes) {
      try {
        data.additional_notes = await serverSideEncryption.decrypt(data.additional_notes);
      } catch (error) {
        console.error('Failed to decrypt returned crisis resolution notes:', error);
      }
    }
    
    return transformCrisisResolution(data);
  }

  static async saveCheckInResponse(userId: string, response: Omit<CheckInResponse, 'id' | 'user_id'>) {
    // Encrypt sensitive data before saving
    const encryptedNotes = response.notes 
      ? await serverSideEncryption.encrypt(response.notes)
      : null;

    const { data, error } = await supabase
      .from('check_in_responses')
      .insert({
        user_id: userId,
        task_id: response.task_id,
        mood_rating: response.mood_rating,
        notes: encryptedNotes,
        needs_support: response.needs_support,
        timestamp: response.timestamp.toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    
    // Decrypt the notes for return value
    if (data.notes) {
      try {
        data.notes = await serverSideEncryption.decrypt(data.notes);
      } catch (error) {
        console.error('Failed to decrypt returned check-in notes:', error);
      }
    }
    
    return transformCheckInResponse(data);
  }

  static async loadFollowUpTasks(userId: string): Promise<FollowUpTask[]> {
    const { data, error } = await supabase
      .from('follow_up_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_for', { ascending: true });

    if (error) throw error;
    return (data || []).map(transformFollowUpTask);
  }

  static async saveFollowUpTask(userId: string, task: Omit<FollowUpTask, 'id' | 'user_id'>) {
    const { data, error } = await supabase
      .from('follow_up_tasks')
      .insert({
        user_id: userId,
        task_type: task.task_type,
        scheduled_for: task.scheduled_for.toISOString(),
        completed: task.completed,
        crisis_event_id: task.crisis_event_id
      })
      .select()
      .single();

    if (error) throw error;
    return transformFollowUpTask(data);
  }

  static async updateFollowUpTask(userId: string, taskId: string, updates: Partial<FollowUpTask>) {
    const updateData: any = {};
    if (updates.completed !== undefined) updateData.completed = updates.completed;
    if (updates.scheduled_for) updateData.scheduled_for = updates.scheduled_for.toISOString();
    if (updates.completed) updateData.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from('follow_up_tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) throw error;
  }
}
