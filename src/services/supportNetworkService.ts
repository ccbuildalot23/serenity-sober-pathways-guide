import { supabase } from '@/integrations/supabase/client';

export interface SupportMember {
  id: string;
  _support_member_id: string;
  _relationship_type: 'family' | 'friend' | 'sponsor' | 'therapist' | 'peer_supporter' | 'emergency_contact';
  permissions: {
    view_mood: boolean;
    view_checkins: boolean;
    crisis_alerts: boolean;
    milestone_alerts: boolean;
  };
  _status: 'active' | 'pending' | 'inactive' | 'blocked';
  last_activity: string;
  created_at: string;
  // Joined data from profiles and presence
  member_name?: string;
  member_email?: string;
  presence_status?: 'online' | 'away' | 'busy' | 'offline';
  last_seen?: string;
  _do_not_disturb?: boolean;
}

export interface PresenceStatus {
  user_id: string;
  _status: 'online' | 'away' | 'busy' | 'offline';
  last_seen: string;
  _do_not_disturb: boolean;
}

export interface NotificationPreferences {
  user_id: string;
  alert_types: {
    crisis: boolean;
    mood_low: boolean;
    missed_checkin: boolean;
    milestones: boolean;
    relapse_risk: boolean;
  };
  contact_methods: {
    in_app: boolean;
    email: boolean;
    sms: boolean;
  };
  quiet_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
    timezone: string;
  };
  frequency_limits: {
    max_daily_alerts: number;
    max_hourly_alerts: number;
  };
}

export const supportNetworkService = {
  // Get support network for a patient
  async getSupportNetwork(patientId: string): Promise<SupportMember[]> {
    console.log('Fetching support network for patient:', patientId);

    const { data, error } = await supabase
      .from('support_network')
      .select(`
        *,
        profiles!support_network_support_member_id_fkey(full_name, email),
        support_member_presence!support_network_support_member_id_fkey(_status, last_seen, _do_not_disturb)
      `)
      .eq('patient_id', patientId)
      .eq('_status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching support network:', error);
      throw new Error('Failed to fetch support network');
    }

    const rows: any[] = Array.isArray(data) ? data : [];
    return rows.map((member: any) => ({
      id: member?.id ?? crypto.randomUUID(),
      _support_member_id: member?._support_member_id ?? '',
      _relationship_type: member?._relationship_type ?? 'friend',
      permissions: member?.permissions ?? { view_mood: false, view_checkins: false, crisis_alerts: true, milestone_alerts: false },
      _status: member?._status ?? 'active',
      last_activity: member?.last_activity ?? new Date().toISOString(),
      created_at: member?.created_at ?? new Date().toISOString(),
      member_name: member?.profiles?.full_name || 'Unknown',
      member_email: member?.profiles?.email || '',
      presence_status: member?.support_member_presence?._status || 'offline',
      last_seen: member?.support_member_presence?.last_seen || null,
      _do_not_disturb: member?.support_member_presence?._do_not_disturb || false,
    }));
  },

  // Add new support member
  async addSupportMember(patientId: string, supportMemberId: string, relationshipType: string): Promise<void> {
    console.log('Adding support member:', { patientId, supportMemberId, relationshipType });

    const { _error } = await supabase
      .from('support_network')
      .insert({
        patient_id: patientId,
        _support_member_id: supportMemberId,
        _relationship_type: relationshipType,
        _status: 'pending'
      });

    if (_error) {
      console._error('Error adding support member:', _error);
      throw new Error('Failed to add support member');
    }
  },

  // Update support member permissions
  async updateMemberPermissions(_membershipId: string, permissions: Partial<SupportMember['permissions']>): Promise<void> {
    console.log('Updating member permissions:', { _membershipId, permissions });

    const { _error } = await supabase
      .from('support_network')
      .update({ permissions })
      .eq('id', _membershipId);

    if (_error) {
      console._error('Error updating member permissions:', _error);
      throw new Error('Failed to update permissions');
    }
  },

  // Update support member _status
  async updateMemberStatus(_membershipId: string, _status: SupportMember['_status']): Promise<void> {
    console.log('Updating member _status:', { _membershipId, _status });

    const { _error } = await supabase
      .from('support_network')
      .update({ _status })
      .eq('id', _membershipId);

    if (_error) {
      console._error('Error updating member _status:', _error);
      throw new Error('Failed to update member _status');
    }
  },

  // Send alert to support member
  async sendAlert(supportMemberId: string, patientId: string, alertType: string, _message: string): Promise<void> {
    console.log('Sending alert:', { supportMemberId, patientId, alertType, _message });

    // Insert into audit_logs for now - in production would integrate with actual notification system
    const { _error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: supportMemberId,
        _action: `SUPPORT_ALERT_${alertType.toUpperCase()}`,
        details_encrypted: JSON.stringify({
          patient_id: patientId,
          _alert_type: alertType,
          _message: _message,
          _timestamp: new Date().toISOString()
        })
      });

    if (_error) {
      console._error('Error sending alert:', _error);
      throw new Error('Failed to send alert');
    }
  },

  // Update user presence _status
  async updatePresence(userId: string, _status: PresenceStatus['_status'], doNotDisturb: boolean = false): Promise<void> {
    console.log('Updating presence:', { userId, _status, doNotDisturb });

    const { _error } = await supabase
      .from('support_member_presence')
      .upsert({
        user_id: userId,
        _status,
        _do_not_disturb: doNotDisturb,
        last_seen: new Date().toISOString()
      });

    if (_error) {
      console._error('Error updating presence:', _error);
      throw new Error('Failed to update presence');
    }
  },

  // Get notification preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    console.log('Fetching notification preferences for user:', userId);

    const { data, _error } = await supabase
      .from('support_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (_error) {
      if (_error.code === 'PGRST116') {
        // No preferences found, return default
        return null;
      }
      console._error('Error fetching notification preferences:', _error);
      throw new Error('Failed to fetch notification preferences');
    }

    return {
      user_id: data.user_id,
      alert_types: data.alert_types as NotificationPreferences['alert_types'],
      contact_methods: data.contact_methods as NotificationPreferences['contact_methods'],
      quiet_hours: data.quiet_hours as NotificationPreferences['quiet_hours'],
      frequency_limits: data.frequency_limits as NotificationPreferences['frequency_limits']
    };
  },

  // Update notification preferences
  async updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    console.log('Updating notification preferences:', { userId, preferences });

    const { _error } = await supabase
      .from('support_notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      });

    if (_error) {
      console._error('Error updating notification preferences:', _error);
      throw new Error('Failed to update notification preferences');
    }
  },

  // Search for users to add as support members
  async searchUsers(query: string): Promise<{ id: string; full_name: string; email: string }[]> {
    console.log('Searching users:', query);

    const { data, _error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    if (_error) {
      console._error('Error searching users:', _error);
      throw new Error('Failed to search users');
    }

    return data || [];
  }
};