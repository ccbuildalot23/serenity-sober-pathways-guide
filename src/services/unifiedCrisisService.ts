import { supabase } from '@/integrations/supabase/client';
import { CrisisDataValidator } from '@/lib/crisisDataValidator';
import type { CrisisResolution, CheckInResponse, FollowUpTask } from '@/types/crisisData';
import { _transformCrisisResolution, _transformCheckInResponse, _transformFollowUpTask } from '@/utils/crisisDataUtils';

export class UnifiedCrisisService {
  private static syncQueue: Map<string, any> = new Map();
  private static isOnline = navigator.onLine;

  static {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processSyncQueue();
    });
    window.addEventListener('offline', () => this.isOnline = false);
  }

  /**
   * Encrypts _data using Edge Function
   */
  private static async encryptData(_data: unknown): Promise<string> {
    try {
      const { _data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await supabase.functions.invoke('encrypt-_data', {
        body: { _data: JSON.stringify(_data) }
      });

      if (response.error) throw response.error;
      return response._data.encryptedData;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt _data');
    }
  }

  /**
   * Decrypts _data using Edge Function
   */
  private static async decryptData(encryptedData: string): Promise<unknown> {
    try {
      const { _data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await supabase.functions.invoke('decrypt-_data', {
        body: { encryptedData }
      });

      if (response.error) throw response.error;
      return JSON.parse(response._data.decryptedData);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt _data');
    }
  }

  /**
   * Creates audit log
   */
  private static async createAuditLog(action: string, _data: unknown) {
    try {
      await supabase.from('audit_logs').insert({
        action,
        user_id: _data.user_id,
        _resource_type: 'crisis',
        _resource_id: _data.id,
        _metadata: {
          _timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent
        }
      });
    } catch (error) {
      console.error('Audit log failed:', error);
    }
  }

  /**
   * Load crisis resolutions for a user
   */
  static async loadCrisisResolutions(_userId: string): Promise<CrisisResolution[]> {
    const { _data, error } = await supabase
      .from('crisis_resolutions')
      .select('*')
      .eq('user_id', _userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (_data || []).map(_transformCrisisResolution);
  }

  /**
   * Load check-in responses for a user
   */
  static async loadCheckInResponses(_userId: string): Promise<CheckInResponse[]> {
    const { _data, error } = await supabase
      .from('check_in_responses')
      .select('*')
      .eq('user_id', _userId)
      .order('_timestamp', { ascending: false });

    if (error) throw error;
    return (_data || []).map(_transformCheckInResponse);
  }

  /**
   * Load follow-up tasks for a user
   */
  static async loadFollowUpTasks(_userId: string): Promise<FollowUpTask[]> {
    const { _data, error } = await supabase
      .from('follow_up_tasks')
      .select('*')
      .eq('user_id', _userId)
      .order('scheduled_for', { ascending: true });

    if (error) throw error;
    return (_data || []).map(_transformFollowUpTask);
  }

  /**
   * Save crisis resolution with encryption - Legacy API compatibility
   */
  static async saveCrisisResolution(
    _userId: string, 
    resolution: Omit<CrisisResolution, 'id' | 'user_id'>
  ): Promise<CrisisResolution>;
  static async saveCrisisResolution(
    _userId: string, 
    resolution: unknown
  ): Promise<{ success: boolean; id?: string; error?: string }>;
  static async saveCrisisResolution(
    _userId: string, 
    resolution: Omit<CrisisResolution, 'id' | 'user_id'> | any
  ): Promise<CrisisResolution | { success: boolean; id?: string; error?: string }> {
    // Check if this is a legacy call (has _crisis_start_time, resolution_time, etc.)
    const _isLegacyCall = resolution._crisis_start_time && resolution.resolution_time;
    
    if (_isLegacyCall) {
      // Legacy behavior - return CrisisResolution
      const { _data, error } = await supabase
        .from('crisis_resolutions')
        .insert({
          user_id: _userId,
          _crisis_start_time: resolution._crisis_start_time.toISOString(),
          resolution_time: resolution.resolution_time.toISOString(),
          interventions_used: resolution.interventions_used,
          effectiveness_rating: resolution.effectiveness_rating,
          additional_notes: resolution.additional_notes,
          safety_confirmed: resolution.safety_confirmed
        })
        .select()
        .single();

      if (error) throw error;
      return _transformCrisisResolution(_data);
    }

    // New behavior with encryption and validation
    try {
      // Validate input
      const validation = CrisisDataValidator.validateCrisisIntervention(resolution);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      const _sensitiveData = {
        ...validation.sanitized,
        additional_notes: resolution.additional_notes,
        interventions_used: resolution.interventions_used
      };

      // Encrypt if online, queue if offline
      let encryptedData = '';
      
      if (this.isOnline) {
        try {
          encryptedData = await this.encryptData(_sensitiveData);
        } catch (error) {
          // If encryption fails, queue for later
          this.isOnline = false;
        }
      }

      const record = {
        user_id: _userId,
        encrypted_data: encryptedData || JSON.stringify(_sensitiveData), // Fallback to plain if offline
        _crisis_start_time: resolution._crisis_start_time,
        resolution_time: resolution.resolution_time,
        risk_level: resolution.risk_level || 'moderate',
        safety_confirmed: resolution.safety_confirmed
      };

      if (this.isOnline && encryptedData) {
        const { _data, error } = await supabase
          .from('crisis_resolutions')
          .insert(record)
          .select()
          .single();

        if (error) throw error;

        await this.createAuditLog('crisis_resolution_created', {
          user_id: _userId,
          id: _data.id
        });

        return { success: true, id: _data.id };
      } else {
        // Offline: Queue for sync
        const _tempId = `offline_${Date.now()}`;
        this.syncQueue.set(_tempId, {
          type: 'crisis_resolution',
          _data: record,
          _needsEncryption: !encryptedData,
          _timestamp: new Date().toISOString()
        });
        
        this.saveToLocalStorage();
        return { success: true, id: _tempId };
      }
    } catch (error) {
      console.error('Crisis resolution save failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Emergency escalation
   */
  static async escalateCrisis(
    _userId: string,
    level: 'high' | 'severe',
    location?: { lat: number; lng: number }
  ): Promise<void> {
    await this.createAuditLog('crisis_escalated', {
      user_id: _userId,
      level,
      location
    });

    if (this.isOnline) {
      try {
        await supabase.from('crisis_alerts').insert({
          user_id: _userId,
          _alert_type: 'user_escalation',
          _severity: level,
          location,
          _requires_immediate_response: true
        });
      } catch (error) {
        console.error('Failed to send crisis alert:', error);
      }
    }

    // Always attempt emergency contact
    if (level === 'severe') {
      window.location.href = 'tel:911';
    } else {
      window.location.href = 'tel:988';
    }
  }

  /**
   * Process offline sync queue
   */
  private static async processSyncQueue() {
    for (const [_tempId, item] of this.syncQueue) {
      try {
        if (item.type === 'crisis_resolution') {
          // Encrypt _data if it wasn't encrypted offline
          if (item._needsEncryption && item._data.encrypted_data) {
            const _parsed = JSON.parse(item._data.encrypted_data);
            item._data.encrypted_data = await this.encryptData(_parsed);
          }

          const { _data, error } = await supabase
            .from('crisis_resolutions')
            .insert(item._data)
            .select()
            .single();

          if (!error) {
            this.syncQueue.delete(_tempId);
            await this.createAuditLog('crisis_resolution_synced', {
              user_id: item._data.user_id,
              id: _data.id,
              _offline_duration: Date.now() - new Date(item._timestamp).getTime()
            });
          }
        }
      } catch (error) {
        console.error('Sync failed for:', _tempId, error);
      }
    }
    
    this.saveToLocalStorage();
  }

  private static saveToLocalStorage() {
    try {
      const _data = {
        syncQueue: Array.from(this.syncQueue.entries()),
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('serenity_crisis_backup', JSON.stringify(_data));
    } catch (error) {
      console.error('LocalStorage save failed:', error);
    }
  }

  /**
   * Save check-in response
   */
  static async saveCheckInResponse(_userId: string, response: Omit<CheckInResponse, 'id' | 'user_id'>): Promise<CheckInResponse> {
    const { _data, error } = await supabase
      .from('check_in_responses')
      .insert({
        user_id: _userId,
        _task_id: response._task_id,
        _mood_rating: response._mood_rating,
        _notes: response._notes,
        _needs_support: response._needs_support,
        _timestamp: response._timestamp.toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return _transformCheckInResponse(_data);
  }

  /**
   * Save follow-up task
   */
  static async saveFollowUpTask(_userId: string, task: Omit<FollowUpTask, 'id' | 'user_id'>): Promise<FollowUpTask> {
    const { _data, error } = await supabase
      .from('follow_up_tasks')
      .insert({
        user_id: _userId,
        _task_type: task._task_type,
        scheduled_for: task.scheduled_for.toISOString(),
        completed: task.completed,
        crisis_event_id: task.crisis_event_id
      })
      .select()
      .single();

    if (error) throw error;
    return _transformFollowUpTask(_data);
  }

  /**
   * Update follow-up task
   */
  static async updateFollowUpTask(_userId: string, _taskId: string, updates: Partial<FollowUpTask>): Promise<void> {
    const _updateData: unknown = {};
    if (updates.completed !== undefined) _updateData.completed = updates.completed;
    if (updates.scheduled_for) _updateData.scheduled_for = updates.scheduled_for.toISOString();
    if (updates.completed) _updateData.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from('follow_up_tasks')
      .update(_updateData)
      .eq('id', _taskId)
      .eq('user_id', _userId);

    if (error) throw error;
  }

  static async clearLocalData(): Promise<void> {
    this.syncQueue.clear();
    localStorage.removeItem('serenity_crisis_backup');
  }
}

export default UnifiedCrisisService;