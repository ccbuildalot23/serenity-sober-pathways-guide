
import { supabase } from '@/integrations/supabase/client';
import { serverSideEncryption } from '@/lib/serverSideEncryption';
import { EnhancedSecurityAuditService } from './enhancedSecurityAuditService';
import type { CrisisResolution, CheckInResponse, FollowUpTask } from '@/types/crisisData';
import { transformCrisisResolution, transformCheckInResponse, transformFollowUpTask } from '@/utils/crisisDataUtils';

/**
 * Ultra-secure crisis data service using server-side encryption
 * Updated to work with RLS policies requiring authenticated users
 */
export class UltraSecureCrisisDataService {
  static async loadCrisisResolutions(userId: string): Promise<CrisisResolution[]> {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      await EnhancedSecurityAuditService.logRLSViolation('crisis_resolutions', 'SELECT', {
        requested_user_id: userId,
        authenticated_user_id: user?.id
      });
      throw new Error('Unauthorized access to crisis resolutions');
    }

    await EnhancedSecurityAuditService.logDataAccessEvent('crisis_resolutions', 'SELECT', 0);

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

    await EnhancedSecurityAuditService.logDataAccessEvent('crisis_resolutions', 'SELECT', decryptedData.length);
    return decryptedData;
  }

  static async loadCheckInResponses(userId: string): Promise<CheckInResponse[]> {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      await EnhancedSecurityAuditService.logRLSViolation('check_in_responses', 'SELECT', {
        requested_user_id: userId,
        authenticated_user_id: user?.id
      });
      throw new Error('Unauthorized access to check-in responses');
    }

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

    await EnhancedSecurityAuditService.logDataAccessEvent('check_in_responses', 'SELECT', decryptedData.length);
    return decryptedData;
  }

  static async saveCrisisResolution(userId: string, resolution: Omit<CrisisResolution, 'id' | 'user_id'>) {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      await EnhancedSecurityAuditService.logRLSViolation('crisis_resolutions', 'INSERT', {
        requested_user_id: userId,
        authenticated_user_id: user?.id
      });
      throw new Error('Unauthorized attempt to save crisis resolution');
    }

    // Encrypt sensitive data before saving
    const encryptedNotes = resolution.additional_notes 
      ? await serverSideEncryption.encrypt(resolution.additional_notes)
      : null;

    const { data, error } = await supabase
      .from('crisis_resolutions')
      .insert({
        user_id: userId, // Will be validated by RLS and trigger
        crisis_start_time: resolution.crisis_start_time.toISOString(),
        resolution_time: resolution.resolution_time.toISOString(),
        interventions_used: resolution.interventions_used,
        effectiveness_rating: resolution.effectiveness_rating,
        additional_notes: encryptedNotes,
        safety_confirmed: resolution.safety_confirmed
      })
      .select()
      .single();

    if (error) {
      await EnhancedSecurityAuditService.logRLSViolation('crisis_resolutions', 'INSERT', { error: error.message });
      throw error;
    }
    
    // Decrypt the notes for return value
    if (data.additional_notes) {
      try {
        data.additional_notes = await serverSideEncryption.decrypt(data.additional_notes);
      } catch (error) {
        console.error('Failed to decrypt returned crisis resolution notes:', error);
      }
    }
    
    await EnhancedSecurityAuditService.logDataAccessEvent('crisis_resolutions', 'INSERT', 1);
    return transformCrisisResolution(data);
  }

  static async saveCheckInResponse(userId: string, response: Omit<CheckInResponse, 'id' | 'user_id'>) {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      await EnhancedSecurityAuditService.logRLSViolation('check_in_responses', 'INSERT', {
        requested_user_id: userId,
        authenticated_user_id: user?.id
      });
      throw new Error('Unauthorized attempt to save check-in response');
    }

    // Encrypt sensitive data before saving
    const encryptedNotes = response.notes 
      ? await serverSideEncryption.encrypt(response.notes)
      : null;

    const { data, error } = await supabase
      .from('check_in_responses')
      .insert({
        user_id: userId, // Will be validated by RLS and trigger
        task_id: response.task_id,
        mood_rating: response.mood_rating,
        notes: encryptedNotes,
        needs_support: response.needs_support,
        timestamp: response.timestamp.toISOString()
      })
      .select()
      .single();

    if (error) {
      await EnhancedSecurityAuditService.logRLSViolation('check_in_responses', 'INSERT', { error: error.message });
      throw error;
    }
    
    // Decrypt the notes for return value
    if (data.notes) {
      try {
        data.notes = await serverSideEncryption.decrypt(data.notes);
      } catch (error) {
        console.error('Failed to decrypt returned check-in notes:', error);
      }
    }
    
    await EnhancedSecurityAuditService.logDataAccessEvent('check_in_responses', 'INSERT', 1);
    return transformCheckInResponse(data);
  }

  static async loadFollowUpTasks(userId: string): Promise<FollowUpTask[]> {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      await EnhancedSecurityAuditService.logRLSViolation('follow_up_tasks', 'SELECT', {
        requested_user_id: userId,
        authenticated_user_id: user?.id
      });
      throw new Error('Unauthorized access to follow-up tasks');
    }

    const { data, error } = await supabase
      .from('follow_up_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_for', { ascending: true });

    if (error) throw error;
    
    const transformedData = (data || []).map(transformFollowUpTask);
    await EnhancedSecurityAuditService.logDataAccessEvent('follow_up_tasks', 'SELECT', transformedData.length);
    
    return transformedData;
  }

  static async saveFollowUpTask(userId: string, task: Omit<FollowUpTask, 'id' | 'user_id'>) {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      await EnhancedSecurityAuditService.logRLSViolation('follow_up_tasks', 'INSERT', {
        requested_user_id: userId,
        authenticated_user_id: user?.id
      });
      throw new Error('Unauthorized attempt to save follow-up task');
    }

    const { data, error } = await supabase
      .from('follow_up_tasks')
      .insert({
        user_id: userId, // Will be validated by RLS and trigger
        task_type: task.task_type,
        scheduled_for: task.scheduled_for.toISOString(),
        completed: task.completed,
        crisis_event_id: task.crisis_event_id
      })
      .select()
      .single();

    if (error) {
      await EnhancedSecurityAuditService.logRLSViolation('follow_up_tasks', 'INSERT', { error: error.message });
      throw error;
    }
    
    await EnhancedSecurityAuditService.logDataAccessEvent('follow_up_tasks', 'INSERT', 1);
    return transformFollowUpTask(data);
  }

  static async updateFollowUpTask(userId: string, taskId: string, updates: Partial<FollowUpTask>) {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== userId) {
      await EnhancedSecurityAuditService.logRLSViolation('follow_up_tasks', 'UPDATE', {
        requested_user_id: userId,
        authenticated_user_id: user?.id
      });
      throw new Error('Unauthorized attempt to update follow-up task');
    }

    const updateData: any = {};
    if (updates.completed !== undefined) updateData.completed = updates.completed;
    if (updates.scheduled_for) updateData.scheduled_for = updates.scheduled_for.toISOString();
    if (updates.completed) updateData.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from('follow_up_tasks')
      .update(updateData)
      .eq('id', taskId)
      .eq('user_id', userId); // Double verification with RLS

    if (error) {
      await EnhancedSecurityAuditService.logRLSViolation('follow_up_tasks', 'UPDATE', { error: error.message });
      throw error;
    }
    
    await EnhancedSecurityAuditService.logDataAccessEvent('follow_up_tasks', 'UPDATE', 1);
  }
}
