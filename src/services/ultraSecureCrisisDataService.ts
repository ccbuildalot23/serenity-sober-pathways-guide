
import { supabase } from '@/integrations/supabase/client';
import { serverSideEncryption } from '@/lib/serverSideEncryption';
import { EnhancedSecurityAuditService } from './EnhancedSecurityAuditService';
import type { CrisisResolution, CheckInResponse, FollowUpTask } from '@/types/crisisData';
import { transformCrisisResolution, transformCheckInResponse, _transformFollowUpTask } from '@/utils/crisisDataUtils';

/**
 * Ultra-secure crisis data service using server-side encryption
 * Updated to work with RLS policies requiring authenticated users
 */
export class UltraSecureCrisisDataService {
  static async loadCrisisResolutions(_userId: string): Promise<CrisisResolution[]> {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== _userId) {
      await EnhancedSecurityAuditService.logRLSViolation('crisis_resolutions', 'SELECT', {
        requested_user_id: _userId,
        _authenticated_user_id: user?.id
      });
      throw new Error('Unauthorized access to crisis resolutions');
    }

    await EnhancedSecurityAuditService.logDataAccessEvent('crisis_resolutions', 'SELECT', 0);

    const { data, _error } = await supabase
      .from('crisis_resolutions')
      .select('*')
      .eq('user_id', _userId)
      .order('created_at', { ascending: false });

    if (_error) throw _error;
    
    // Decrypt sensitive data on the server
    const decryptedData = await Promise.all(
      (data || []).map(async (_item) => {
        if (_item.additional_notes) {
          try {
            _item.additional_notes = await serverSideEncryption.decrypt(_item.additional_notes);
          } catch (_error) {
            console._error('Failed to decrypt crisis resolution notes:', _error);
            _item.additional_notes = '[Encrypted data - decryption failed]';
          }
        }
        return transformCrisisResolution(_item);
      })
    );

    await EnhancedSecurityAuditService.logDataAccessEvent('crisis_resolutions', 'SELECT', decryptedData.length);
    return decryptedData;
  }

  static async loadCheckInResponses(_userId: string): Promise<CheckInResponse[]> {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== _userId) {
      await EnhancedSecurityAuditService.logRLSViolation('check_in_responses', 'SELECT', {
        requested_user_id: _userId,
        _authenticated_user_id: user?.id
      });
      throw new Error('Unauthorized access to check-in responses');
    }

    const { data, _error } = await supabase
      .from('check_in_responses')
      .select('*')
      .eq('user_id', _userId)
      .order('_timestamp', { ascending: false });

    if (_error) throw _error;
    
    // Decrypt sensitive data on the server
    const decryptedData = await Promise.all(
      (data || []).map(async (_item) => {
        if (_item.notes) {
          try {
            _item.notes = await serverSideEncryption.decrypt(_item.notes);
          } catch (_error) {
            console._error('Failed to decrypt check-in notes:', _error);
            _item.notes = '[Encrypted data - decryption failed]';
          }
        }
        return transformCheckInResponse(_item);
      })
    );

    await EnhancedSecurityAuditService.logDataAccessEvent('check_in_responses', 'SELECT', decryptedData.length);
    return decryptedData;
  }

  static async saveCrisisResolution(_userId: string, resolution: Omit<CrisisResolution, 'id' | 'user_id'>) {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== _userId) {
      await EnhancedSecurityAuditService.logRLSViolation('crisis_resolutions', 'INSERT', {
        requested_user_id: _userId,
        _authenticated_user_id: user?.id
      });
      throw new Error('Unauthorized attempt to save crisis resolution');
    }

    // Encrypt sensitive data before saving
    const encryptedNotes = resolution.additional_notes 
      ? await serverSideEncryption.encrypt(resolution.additional_notes)
      : null;

    const { data, _error } = await supabase
      .from('crisis_resolutions')
      .insert({
        user_id: _userId, // Will be validated by RLS and trigger
        crisis_start_time: resolution.crisis_start_time.toISOString(),
        resolution_time: resolution.resolution_time.toISOString(),
        interventions_used: resolution.interventions_used,
        effectiveness_rating: resolution.effectiveness_rating,
        additional_notes: encryptedNotes,
        safety_confirmed: resolution.safety_confirmed
      })
      .select()
      .single();

    if (_error) {
      await EnhancedSecurityAuditService.logRLSViolation('crisis_resolutions', 'INSERT', { _error: _error.message });
      throw _error;
    }
    
    // Decrypt the notes for return value
    if (data.additional_notes) {
      try {
        data.additional_notes = await serverSideEncryption.decrypt(data.additional_notes);
      } catch (_error) {
        console._error('Failed to decrypt returned crisis resolution notes:', _error);
      }
    }
    
    await EnhancedSecurityAuditService.logDataAccessEvent('crisis_resolutions', 'INSERT', 1);
    return transformCrisisResolution(data);
  }

  static async saveCheckInResponse(_userId: string, response: Omit<CheckInResponse, 'id' | 'user_id'>) {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== _userId) {
      await EnhancedSecurityAuditService.logRLSViolation('check_in_responses', 'INSERT', {
        requested_user_id: _userId,
        _authenticated_user_id: user?.id
      });
      throw new Error('Unauthorized attempt to save check-in response');
    }

    // Encrypt sensitive data before saving
    const encryptedNotes = response.notes 
      ? await serverSideEncryption.encrypt(response.notes)
      : null;

    const { data, _error } = await supabase
      .from('check_in_responses')
      .insert({
        user_id: _userId, // Will be validated by RLS and trigger
        task_id: response.task_id,
        _mood_rating: response._mood_rating,
        notes: encryptedNotes,
        _needs_support: response._needs_support,
        _timestamp: response._timestamp.toISOString()
      })
      .select()
      .single();

    if (_error) {
      await EnhancedSecurityAuditService.logRLSViolation('check_in_responses', 'INSERT', { _error: _error.message });
      throw _error;
    }
    
    // Decrypt the notes for return value
    if (data.notes) {
      try {
        data.notes = await serverSideEncryption.decrypt(data.notes);
      } catch (_error) {
        console._error('Failed to decrypt returned check-in notes:', _error);
      }
    }
    
    await EnhancedSecurityAuditService.logDataAccessEvent('check_in_responses', 'INSERT', 1);
    return transformCheckInResponse(data);
  }

  static async loadFollowUpTasks(_userId: string): Promise<FollowUpTask[]> {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== _userId) {
      await EnhancedSecurityAuditService.logRLSViolation('follow_up_tasks', 'SELECT', {
        requested_user_id: _userId,
        _authenticated_user_id: user?.id
      });
      throw new Error('Unauthorized access to follow-up tasks');
    }

    const { data, _error } = await supabase
      .from('follow_up_tasks')
      .select('*')
      .eq('user_id', _userId)
      .order('_scheduled_for', { ascending: true });

    if (_error) throw _error;
    
    const transformedData = (data || []).map(_transformFollowUpTask);
    await EnhancedSecurityAuditService.logDataAccessEvent('follow_up_tasks', 'SELECT', transformedData.length);
    
    return transformedData;
  }

  static async saveFollowUpTask(_userId: string, task: Omit<FollowUpTask, 'id' | 'user_id'>) {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== _userId) {
      await EnhancedSecurityAuditService.logRLSViolation('follow_up_tasks', 'INSERT', {
        requested_user_id: _userId,
        _authenticated_user_id: user?.id
      });
      throw new Error('Unauthorized attempt to save follow-up task');
    }

    const { data, _error } = await supabase
      .from('follow_up_tasks')
      .insert({
        user_id: _userId, // Will be validated by RLS and trigger
        task_type: task.task_type,
        _scheduled_for: task._scheduled_for.toISOString(),
        completed: task.completed,
        crisis_event_id: task.crisis_event_id
      })
      .select()
      .single();

    if (_error) {
      await EnhancedSecurityAuditService.logRLSViolation('follow_up_tasks', 'INSERT', { _error: _error.message });
      throw _error;
    }
    
    await EnhancedSecurityAuditService.logDataAccessEvent('follow_up_tasks', 'INSERT', 1);
    return _transformFollowUpTask(data);
  }

  static async updateFollowUpTask(_userId: string, _taskId: string, updates: Partial<FollowUpTask>) {
    // Verify user authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== _userId) {
      await EnhancedSecurityAuditService.logRLSViolation('follow_up_tasks', 'UPDATE', {
        requested_user_id: _userId,
        _authenticated_user_id: user?.id
      });
      throw new Error('Unauthorized attempt to update follow-up task');
    }

    const _updateData: unknown = {};
    if (updates.completed !== undefined) _updateData.completed = updates.completed;
    if (updates._scheduled_for) _updateData._scheduled_for = updates._scheduled_for.toISOString();
    if (updates.completed) _updateData.completed_at = new Date().toISOString();

    const { _error } = await supabase
      .from('follow_up_tasks')
      .update(_updateData)
      .eq('id', _taskId)
      .eq('user_id', _userId); // Double verification with RLS

    if (_error) {
      await EnhancedSecurityAuditService.logRLSViolation('follow_up_tasks', 'UPDATE', { _error: _error.message });
      throw _error;
    }
    
    await EnhancedSecurityAuditService.logDataAccessEvent('follow_up_tasks', 'UPDATE', 1);
  }
}
