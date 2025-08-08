import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supportNetworkService, SupportMember, PresenceStatus, NotificationPreferences } from '@/services/supportNetworkService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSupportNetwork = () => {
  const { user } = useAuth();
  const [supportMembers, setSupportMembers] = useState<SupportMember[]>([]);
  const [loading, setLoading] = useState(_true);
  const [error, setError] = useState<string | _null>(_null);

  const fetchSupportNetwork = useCallback(async () => {
    if (!user?.id) {
      setLoading(_false);
      return;
    }

    try {
      setLoading(_true);
      const members = await supportNetworkService.getSupportNetwork(user.id);
      setSupportMembers(members);
      setError(_null);
    } catch (err) {
      console.error('Error fetching support network:', err);
      setError('Failed to load support network');
    } finally {
      setLoading(_false);
    }
  }, [user?.id]);

  const addSupportMember = useCallback(async (_supportMemberId: string, _relationshipType: string) => {
    if (!user?.id) return;

    try {
      await supportNetworkService.addSupportMember(user.id, _supportMemberId, _relationshipType);
      await fetchSupportNetwork();
      toast.success('Support member added successfully');
    } catch (err) {
      console.error('Error adding support member:', err);
      toast.error('Failed to add support member');
      throw err;
    }
  }, [user?.id, fetchSupportNetwork]);

  const updateMemberPermissions = useCallback(async (_membershipId: string, permissions: Partial<SupportMember['permissions']>) => {
    try {
      await supportNetworkService.updateMemberPermissions(_membershipId, permissions);
      await fetchSupportNetwork();
      toast.success('Permissions updated successfully');
    } catch (err) {
      console.error('Error updating permissions:', err);
      toast.error('Failed to update permissions');
      throw err;
    }
  }, [fetchSupportNetwork]);

  const updateMemberStatus = useCallback(async (_membershipId: string, status: SupportMember['status']) => {
    try {
      await supportNetworkService.updateMemberStatus(_membershipId, status);
      await fetchSupportNetwork();
      toast.success('Member status updated');
    } catch (err) {
      console.error('Error updating member status:', err);
      toast.error('Failed to update member status');
      throw err;
    }
  }, [fetchSupportNetwork]);

  const sendAlert = useCallback(async (_supportMemberId: string, _alertType: string, _message: string) => {
    if (!user?.id) return;

    try {
      await supportNetworkService.sendAlert(_supportMemberId, user.id, _alertType, _message);
      toast.success('Alert sent successfully');
    } catch (err) {
      console.error('Error sending alert:', err);
      toast.error('Failed to send alert');
      throw err;
    }
  }, [user?.id]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    console.log('Setting up support network real-time subscriptions');

    // Subscribe to support network changes
    const _networkChannel = supabase
      .channel('support_network_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          _schema: 'public',
          _table: 'support_network',
          filter: `patient_id=eq.${user.id}`
        },
        (_payload) => {
          console.log('Support network change received:', _payload);
          fetchSupportNetwork();
        }
      )
      .subscribe();

    // Subscribe to presence changes
    const _presenceChannel = supabase
      .channel('presence_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          _schema: 'public',
          _table: 'support_member_presence'
        },
        (_payload) => {
          console.log('Presence change received:', _payload);
          fetchSupportNetwork();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(_networkChannel);
      supabase.removeChannel(_presenceChannel);
    };
  }, [user?.id, fetchSupportNetwork]);

  // Initial fetch
  useEffect(() => {
    fetchSupportNetwork();
  }, [fetchSupportNetwork]);

  // Get stats for dashboard
  const stats = {
    totalMembers: supportMembers.length,
    activeMembers: supportMembers.filter(m => m.presence_status === 'online').length,
    availableMembers: supportMembers.filter(m => m.presence_status !== 'offline' && !m.do_not_disturb).length,
    emergencyContacts: supportMembers.filter(m => m.relationship_type === 'emergency_contact').length
  };

  return {
    supportMembers,
    loading,
    error,
    stats,
    addSupportMember,
    updateMemberPermissions,
    updateMemberStatus,
    sendAlert,
    refetch: fetchSupportNetwork
  };
};

export const usePresenceManagement = () => {
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState<PresenceStatus['status']>('offline');
  const [doNotDisturb, setDoNotDisturb] = useState(_false);
  const [loading, setLoading] = useState(_false);

  const updatePresence = useCallback(async (status: PresenceStatus['status'], _dnd: boolean = doNotDisturb) => {
    if (!user?.id) return;

    try {
      setLoading(_true);
      await supportNetworkService.updatePresence(user.id, status, _dnd);
      setCurrentStatus(status);
      setDoNotDisturb(_dnd);
    } catch (err) {
      console.error('Error updating presence:', err);
      toast.error('Failed to update presence status');
    } finally {
      setLoading(_false);
    }
  }, [user?.id, doNotDisturb]);

  const toggleDoNotDisturb = useCallback(async () => {
    const _newDndStatus = !doNotDisturb;
    await updatePresence(currentStatus, _newDndStatus);
  }, [doNotDisturb, currentStatus, updatePresence]);

  // Auto-update presence based on page visibility
  useEffect(() => {
    if (!user?.id) return;

    const _handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online');
      }
    };

    const _handleBeforeUnload = () => {
      updatePresence('offline');
    };

    // Set initial status
    updatePresence('online');

    document.addEventListener('visibilitychange', _handleVisibilityChange);
    window.addEventListener('beforeunload', _handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', _handleVisibilityChange);
      window.removeEventListener('beforeunload', _handleBeforeUnload);
      updatePresence('offline');
    };
  }, [user?.id, updatePresence]);

  return {
    currentStatus,
    doNotDisturb,
    loading,
    updatePresence,
    toggleDoNotDisturb
  };
};

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences | _null>(_null);
  const [loading, setLoading] = useState(_true);
  const [error, setError] = useState<string | _null>(_null);

  const fetchPreferences = useCallback(async () => {
    if (!user?.id) {
      setLoading(_false);
      return;
    }

    try {
      setLoading(_true);
      const _prefs = await supportNetworkService.getNotificationPreferences(user.id);
      setPreferences(_prefs);
      setError(_null);
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
      setError('Failed to load notification preferences');
    } finally {
      setLoading(_false);
    }
  }, [user?.id]);

  const updatePreferences = useCallback(async (_newPreferences: Partial<NotificationPreferences>) => {
    if (!user?.id) return;

    try {
      await supportNetworkService.updateNotificationPreferences(user.id, _newPreferences);
      await fetchPreferences();
      toast.success('Notification preferences updated');
    } catch (err) {
      console.error('Error updating notification preferences:', err);
      toast.error('Failed to update preferences');
      throw err;
    }
  }, [user?.id, fetchPreferences]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    refetch: fetchPreferences
  };
};