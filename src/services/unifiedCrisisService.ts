import { supabase } from '@/integrations/supabase/client';
import { CrisisDataValidator } from '@/lib/crisisDataValidator';
import type { CrisisResolution, CheckInResponse, FollowUpTask } from '@/types/crisisData';
import { transformCrisisResolution, transformCheckInResponse, transformFollowUpTask } from '@/utils/crisisDataUtils';

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
   * Encrypts data using Edge Function
   */
  private static async encryptData(data: any): Promise<string> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await supabase.functions.invoke('encrypt-data', {
        body: { data: JSON.stringify(data) }
      });

      if (response.error) throw response.error;
      return response.data.encryptedData;
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypts data using Edge Function
   */
  private static async decryptData(encryptedData: string): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await supabase.functions.invoke('decrypt-data', {
        body: { encryptedData }
      });

      if (response.error) throw response.error;
      return JSON.parse(response.data.decryptedData);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Creates audit log
   */
  private static async createAuditLog(action: string, data: any) {
    try {
      await supabase.from('audit_logs').insert({
        action,
        user_id: data.user_id,
        resource_type: 'crisis',
        resource_id: data.id,
        metadata: {
          timestamp: new Date().toISOString(),
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
  static async loadCrisisResolutions(userId: string): Promise<CrisisResolution[]> {
    const { data, error } = await supabase
      .from('crisis_resolutions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformCrisisResolution);
  }

  /**
   * Load check-in responses for a user
   */
  static async loadCheckInResponses(userId: string): Promise<CheckInResponse[]> {
    const { data, error } = await supabase
      .from('check_in_responses')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return (data || []).map(transformCheckInResponse);
  }

  /**
   * Load follow-up tasks for a user
   */
  static async loadFollowUpTasks(userId: string): Promise<FollowUpTask[]> {
    const { data, error } = await supabase
      .from('follow_up_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_for', { ascending: true });

    if (error) throw error;
    return (data || []).map(transformFollowUpTask);
  }

  /**
   * Save crisis resolution with encryption - Legacy API compatibility
   */
  static async saveCrisisResolution(
    userId: string, 
    resolution: Omit<CrisisResolution, 'id' | 'user_id'>
  ): Promise<CrisisResolution>;
  static async saveCrisisResolution(
    userId: string, 
    resolution: any
  ): Promise<{ success: boolean; id?: string; error?: string }>;
  static async saveCrisisResolution(
    userId: string, 
    resolution: Omit<CrisisResolution, 'id' | 'user_id'> | any
  ): Promise<CrisisResolution | { success: boolean; id?: string; error?: string }> {
    // Check if this is a legacy call (has crisis_start_time, resolution_time, etc.)
    const isLegacyCall = resolution.crisis_start_time && resolution.resolution_time;
    
    if (isLegacyCall) {
      // Legacy behavior - return CrisisResolution
      const { data, error } = await supabase
        .from('crisis_resolutions')
        .insert({
          user_id: userId,
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
      return transformCrisisResolution(data);
    }

    // New behavior with encryption and validation
    try {
      // Validate input
      const validation = CrisisDataValidator.validateCrisisIntervention(resolution);
      if (!validation.isValid) {
        return { success: false, error: validation.errors.join(', ') };
      }

      const sensitiveData = {
        ...validation.sanitized,
        additional_notes: resolution.additional_notes,
        interventions_used: resolution.interventions_used
      };

      // Encrypt if online, queue if offline
      let encryptedData = '';
      
      if (this.isOnline) {
        try {
          encryptedData = await this.encryptData(sensitiveData);
        } catch (error) {
          // If encryption fails, queue for later
          this.isOnline = false;
        }
      }

      const record = {
        user_id: userId,
        encrypted_data: encryptedData || JSON.stringify(sensitiveData), // Fallback to plain if offline
        crisis_start_time: resolution.crisis_start_time,
        resolution_time: resolution.resolution_time,
        risk_level: resolution.risk_level || 'moderate',
        safety_confirmed: resolution.safety_confirmed
      };

      if (this.isOnline && encryptedData) {
        const { data, error } = await supabase
          .from('crisis_resolutions')
          .insert(record)
          .select()
          .single();

        if (error) throw error;

        await this.createAuditLog('crisis_resolution_created', {
          user_id: userId,
          id: data.id
        });

        return { success: true, id: data.id };
      } else {
        // Offline: Queue for sync
        const tempId = `offline_${Date.now()}`;
        this.syncQueue.set(tempId, {
          type: 'crisis_resolution',
          data: record,
          needsEncryption: !encryptedData,
          timestamp: new Date().toISOString()
        });
        
        this.saveToLocalStorage();
        return { success: true, id: tempId };
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
    userId: string,
    level: 'high' | 'severe',
    location?: { lat: number; lng: number }
  ): Promise<void> {
    await this.createAuditLog('crisis_escalated', {
      user_id: userId,
      level,
      location
    });

    if (this.isOnline) {
      try {
        await supabase.from('crisis_alerts').insert({
          user_id: userId,
          alert_type: 'user_escalation',
          severity: level,
          location,
          requires_immediate_response: true
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
    for (const [tempId, item] of this.syncQueue) {
      try {
        if (item.type === 'crisis_resolution') {
          // Encrypt data if it wasn't encrypted offline
          if (item.needsEncryption && item.data.encrypted_data) {
            const parsed = JSON.parse(item.data.encrypted_data);
            item.data.encrypted_data = await this.encryptData(parsed);
          }

          const { data, error } = await supabase
            .from('crisis_resolutions')
            .insert(item.data)
            .select()
            .single();

          if (!error) {
            this.syncQueue.delete(tempId);
            await this.createAuditLog('crisis_resolution_synced', {
              user_id: item.data.user_id,
              id: data.id,
              offline_duration: Date.now() - new Date(item.timestamp).getTime()
            });
          }
        }
      } catch (error) {
        console.error('Sync failed for:', tempId, error);
      }
    }
    
    this.saveToLocalStorage();
  }

  private static saveToLocalStorage() {
    try {
      const data = {
        syncQueue: Array.from(this.syncQueue.entries()),
        lastSaved: new Date().toISOString()
      };
      localStorage.setItem('serenity_crisis_backup', JSON.stringify(data));
    } catch (error) {
      console.error('LocalStorage save failed:', error);
    }
  }

  /**
   * Save check-in response
   */
  static async saveCheckInResponse(userId: string, response: Omit<CheckInResponse, 'id' | 'user_id'>): Promise<CheckInResponse> {
    const { data, error } = await supabase
      .from('check_in_responses')
      .insert({
        user_id: userId,
        task_id: response.task_id,
        mood_rating: response.mood_rating,
        notes: response.notes,
        needs_support: response.needs_support,
        timestamp: response.timestamp.toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return transformCheckInResponse(data);
  }

  /**
   * Save follow-up task
   */
  static async saveFollowUpTask(userId: string, task: Omit<FollowUpTask, 'id' | 'user_id'>): Promise<FollowUpTask> {
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

  /**
   * Update follow-up task
   */
  static async updateFollowUpTask(userId: string, taskId: string, updates: Partial<FollowUpTask>): Promise<void> {
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

  static async clearLocalData(): Promise<void> {
    this.syncQueue.clear();
    localStorage.removeItem('serenity_crisis_backup');
  }
}

export default UnifiedCrisisService;