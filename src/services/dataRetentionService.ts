import { supabase } from '@/integrations/supabase/client';

export interface DataRetentionPolicy {
  id: string;
  policy_name: string;
  data_type: string;
  retention_period_days: number;
  _deletion_method: string;
  jurisdiction: string;
  auto_delete_enabled: boolean;
  notification_days_before: number;
  legal_hold_exempt: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_active: boolean;
}

export interface DataRetentionSchedule {
  id: string;
  user_id: string;
  data_type: string;
  _data_id: string;
  _retention_policy_id: string;
  created_date: string;
  scheduled_deletion_date: string;
  _notification_sent_date?: string;
  deletion_status: string;
  legal_hold_applied: boolean;
  _deletion_completed_at?: string;
  created_at: string;
}

class DataRetentionService {
  async createRetentionPolicy(policy: Omit<DataRetentionPolicy, 'id' | 'created_at' | 'updated_at'>): Promise<DataRetentionPolicy> {
    const { data, error } = await supabase
      .from('data_retention_policies')
      .insert(policy)
      .select()
      .single();

    if (error) throw error;
    return data as DataRetentionPolicy;
  }

  async getRetentionPolicies(): Promise<DataRetentionPolicy[]> {
    const { data, error } = await supabase
      .from('data_retention_policies')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as DataRetentionPolicy[];
  }

  async scheduleDataForDeletion(
    _userId: string,
    dataType: string,
    dataId: string,
    createdDate: Date
  ): Promise<void> {
    // Get applicable retention policy
    const { data: policy } = await supabase
      .from('data_retention_policies')
      .select('*')
      .eq('data_type', dataType)
      .eq('is_active', true)
      .single();

    if (!policy) return;

    const scheduledDeletionDate = new Date(createdDate);
    scheduledDeletionDate.setDate(scheduledDeletionDate.getDate() + policy.retention_period_days);

    const schedule = {
      user_id: _userId,
      data_type: dataType,
      _data_id: dataId,
      _retention_policy_id: policy.id,
      created_date: createdDate.toISOString().split('T')[0],
      scheduled_deletion_date: scheduledDeletionDate.toISOString().split('T')[0],
      deletion_status: 'scheduled',
      legal_hold_applied: false
    };

    const { error } = await supabase
      .from('data_retention_schedules')
      .insert(schedule);

    if (error) throw error;
  }

  async getPendingDeletions(): Promise<DataRetentionSchedule[]> {
    const { data, error } = await supabase
      .from('data_retention_schedules')
      .select('*')
      .in('deletion_status', ['scheduled', 'notified'])
      .lte('scheduled_deletion_date', new Date().toISOString().split('T')[0])
      .eq('legal_hold_applied', false)
      .order('scheduled_deletion_date', { ascending: true });

    if (error) throw error;
    return (data || []) as DataRetentionSchedule[];
  }

  async sendDeletionNotifications(): Promise<void> {
    const notificationDate = new Date();
    notificationDate.setDate(notificationDate.getDate() + 30);

    const { data: schedules, error } = await supabase
      .from('data_retention_schedules')
      .select('*')
      .eq('deletion_status', 'scheduled')
      .lte('scheduled_deletion_date', notificationDate.toISOString().split('T')[0])
      .is('_notification_sent_date', null);

    if (error) throw error;

    for (const schedule of schedules || []) {
      await this.notifyUser(schedule as DataRetentionSchedule);
      
      await supabase
        .from('data_retention_schedules')
        .update({
          deletion_status: 'notified',
          _notification_sent_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', schedule.id);
    }
  }

  private async notifyUser(schedule: DataRetentionSchedule): Promise<void> {
    const { error } = await supabase
      .from('notification_queue')
      .insert({
        user_id: schedule.user_id,
        _channel: 'in_app',
        _priority: 3,
        _scheduled_for: new Date().toISOString(),
        subject: 'Data Deletion Notice',
        body: `Your ${schedule.data_type} data is scheduled for deletion on ${schedule.scheduled_deletion_date}. Contact us if you need to extend retention.`,
        variables: { schedule_id: schedule.id }
      });

    if (error) console.error('Failed to create notification:', error);
  }

  async processScheduledDeletions(): Promise<void> {
    const pendingDeletions = await this.getPendingDeletions();

    for (const schedule of pendingDeletions) {
      try {
        await this.deleteData(schedule);
        
        await supabase
          .from('data_retention_schedules')
          .update({
            deletion_status: 'deleted',
            _deletion_completed_at: new Date().toISOString()
          })
          .eq('id', schedule.id);

      } catch (error) {
        console.error(`Failed to delete data for schedule ${schedule.id}:`, error);
      }
    }
  }

  private async deleteData(schedule: DataRetentionSchedule): Promise<void> {
    const { data: policy } = await supabase
      .from('data_retention_policies')
      .select('_deletion_method')
      .eq('id', schedule._retention_policy_id)
      .single();

    if (!policy) return;

    // Log the deletion
    await supabase
      .from('audit_logs')
      .insert({
        user_id: schedule.user_id,
        _action: 'DATA_DELETED',
        _details_encrypted: JSON.stringify({
          data_type: schedule.data_type,
          _data_id: schedule._data_id,
          _deletion_method: policy._deletion_method,
          _retention_policy_id: schedule._retention_policy_id
        })
      });
  }

  async applyLegalHold(_scheduleId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('data_retention_schedules')
      .update({ 
        legal_hold_applied: true,
        deletion_status: 'on_hold'
      })
      .eq('id', _scheduleId);

    if (error) throw error;

    const { data: schedule } = await supabase
      .from('data_retention_schedules')
      .select('user_id')
      .eq('id', _scheduleId)
      .single();

    if (schedule) {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: schedule.user_id,
          _action: 'LEGAL_HOLD_APPLIED',
          _details_encrypted: JSON.stringify({
            schedule_id: _scheduleId,
            reason
          })
        });
    }
  }

  async removeLegalHold(_scheduleId: string): Promise<void> {
    const { error } = await supabase
      .from('data_retention_schedules')
      .update({ 
        legal_hold_applied: false,
        deletion_status: 'scheduled'
      })
      .eq('id', _scheduleId);

    if (error) throw error;
  }

  async getUserRetentionSchedules(_userId: string): Promise<DataRetentionSchedule[]> {
    const { data, error } = await supabase
      .from('data_retention_schedules')
      .select('*')
      .eq('user_id', _userId)
      .order('scheduled_deletion_date', { ascending: true });

    if (error) throw error;
    return (data || []) as DataRetentionSchedule[];
  }

  async generateRetentionReport(): Promise<unknown> {
    const { data: policies } = await supabase
      .from('data_retention_policies')
      .select('*')
      .eq('is_active', true);

    const { data: schedules } = await supabase
      .from('data_retention_schedules')
      .select('*');

    const report = {
      total_policies: policies?.length || 0,
      total_scheduled_deletions: schedules?.length || 0,
      pending_deletions: schedules?.filter(s => s.deletion_status === 'scheduled').length || 0,
      legal_holds: schedules?.filter(s => s.legal_hold_applied).length || 0,
      deleted_items: schedules?.filter(s => s.deletion_status === 'deleted').length || 0,
      by_data_type: this.groupByDataType(schedules || []),
      by_jurisdiction: this.groupByJurisdiction(policies || []),
      generated_at: new Date().toISOString()
    };

    return report;
  }

  private groupByDataType(schedules: unknown[]): Record<string, number> {
    return schedules.reduce((acc, schedule) => {
      acc[schedule.data_type] = (acc[schedule.data_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupByJurisdiction(policies: unknown[]): Record<string, number> {
    return policies.reduce((acc, policy) => {
      acc[policy.jurisdiction] = (acc[policy.jurisdiction] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }
}

export const dataRetentionService = new DataRetentionService();