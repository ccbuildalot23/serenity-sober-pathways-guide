import { supabase } from '@/integrations/supabase/client';

export interface SupportMember {
  id: string;
  support_member_id: string;
  relationship_type: 'family' | 'friend' | 'sponsor' | 'therapist' | 'peer_supporter' | 'emergency_contact';
  permissions: {
    view_mood: boolean;
    view_checkins: boolean;
    crisis_alerts: boolean;
    milestone_alerts: boolean;
  };
  status: 'active' | 'pending' | 'inactive' | 'blocked';
  last_activity: string;
  created_at: string;
  // Joined data from profiles and presence
  member_name?: string;
  member_email?: string;
  presence_status?: 'online' | 'away' | 'busy' | 'offline';
  last_seen?: string;
  do_not_disturb?: boolean;
}

export interface PresenceStatus {
  user_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen: string;
  do_not_disturb: boolean;
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
        support_member_presence!support_network_support_member_id_fkey(status, last_seen, do_not_disturb)
      `)
      .eq('patient_id', patientId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching support network:', error);
      throw new Error('Failed to fetch support network');
    }

    return data?.map((member: any) => ({
      id: member.id,
      support_member_id: member.support_member_id,
      relationship_type: member.relationship_type,
      permissions: member.permissions,
      status: member.status,
      last_activity: member.last_activity,
      created_at: member.created_at,
      member_name: member.profiles?.full_name || 'Unknown',
      member_email: member.profiles?.email,
      presence_status: member.support_member_presence?.status || 'offline',
      last_seen: member.support_member_presence?.last_seen,
      do_not_disturb: member.support_member_presence?.do_not_disturb || false,
    })) || [];
  },

  // Add new support member
  async addSupportMember(patientId: string, supportMemberId: string, relationshipType: string): Promise<void> {
    console.log('Adding support member:', { patientId, supportMemberId, relationshipType });

    const { error } = await supabase
      .from('support_network')
      .insert({
        patient_id: patientId,
        support_member_id: supportMemberId,
        relationship_type: relationshipType,
        status: 'pending'
      });

    if (error) {
      console.error('Error adding support member:', error);
      throw new Error('Failed to add support member');
    }
  },

  // Update support member permissions
  async updateMemberPermissions(membershipId: string, permissions: Partial<SupportMember['permissions']>): Promise<void> {
    console.log('Updating member permissions:', { membershipId, permissions });

    const { error } = await supabase
      .from('support_network')
      .update({ permissions })
      .eq('id', membershipId);

    if (error) {
      console.error('Error updating member permissions:', error);
      throw new Error('Failed to update permissions');
    }
  },

  // Update support member status
  async updateMemberStatus(membershipId: string, status: SupportMember['status']): Promise<void> {
    console.log('Updating member status:', { membershipId, status });

    const { error } = await supabase
      .from('support_network')
      .update({ status })
      .eq('id', membershipId);

    if (error) {
      console.error('Error updating member status:', error);
      throw new Error('Failed to update member status');
    }
  },

  // Send alert to support member
  async sendAlert(supportMemberId: string, patientId: string, alertType: string, message: string): Promise<void> {
    console.log('Sending alert:', { supportMemberId, patientId, alertType, message });

    // Insert into audit_logs for now - in production would integrate with actual notification system
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: supportMemberId,
        action: `SUPPORT_ALERT_${alertType.toUpperCase()}`,
        details_encrypted: JSON.stringify({
          patient_id: patientId,
          alert_type: alertType,
          message: message,
          timestamp: new Date().toISOString()
        })
      });

    if (error) {
      console.error('Error sending alert:', error);
      throw new Error('Failed to send alert');
    }
  },

  // Update user presence status
  async updatePresence(userId: string, status: PresenceStatus['status'], doNotDisturb: boolean = false): Promise<void> {
    console.log('Updating presence:', { userId, status, doNotDisturb });

    const { error } = await supabase
      .from('support_member_presence')
      .upsert({
        user_id: userId,
        status,
        do_not_disturb: doNotDisturb,
        last_seen: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating presence:', error);
      throw new Error('Failed to update presence');
    }
  },

  // Get notification preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences | null> {
    console.log('Fetching notification preferences for user:', userId);

    const { data, error } = await supabase
      .from('support_notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences found, return default
        return null;
      }
      console.error('Error fetching notification preferences:', error);
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

    const { error } = await supabase
      .from('support_notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      });

    if (error) {
      console.error('Error updating notification preferences:', error);
      throw new Error('Failed to update notification preferences');
    }
  },

  // Search for users to add as support members
  async searchUsers(query: string): Promise<{ id: string; full_name: string; email: string }[]> {
    console.log('Searching users:', query);

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error('Error searching users:', error);
      throw new Error('Failed to search users');
    }

    return data || [];
  }
};