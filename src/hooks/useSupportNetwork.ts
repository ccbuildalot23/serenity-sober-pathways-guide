import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supportNetworkService, SupportMember, PresenceStatus, NotificationPreferences } from '@/services/supportNetworkService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useSupportNetwork = () => {
  const { user } = useAuth();
  const [supportMembers, setSupportMembers] = useState<SupportMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSupportNetwork = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const members = await supportNetworkService.getSupportNetwork(user.id);
      setSupportMembers(members);
      setError(null);
    } catch (err) {
      console.error('Error fetching support network:', err);
      setError('Failed to load support network');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const addSupportMember = useCallback(async (supportMemberId: string, relationshipType: string) => {
    if (!user?.id) return;

    try {
      await supportNetworkService.addSupportMember(user.id, supportMemberId, relationshipType);
      await fetchSupportNetwork();
      toast.success('Support member added successfully');
    } catch (err) {
      console.error('Error adding support member:', err);
      toast.error('Failed to add support member');
      throw err;
    }
  }, [user?.id, fetchSupportNetwork]);

  const updateMemberPermissions = useCallback(async (membershipId: string, permissions: Partial<SupportMember['permissions']>) => {
    try {
      await supportNetworkService.updateMemberPermissions(membershipId, permissions);
      await fetchSupportNetwork();
      toast.success('Permissions updated successfully');
    } catch (err) {
      console.error('Error updating permissions:', err);
      toast.error('Failed to update permissions');
      throw err;
    }
  }, [fetchSupportNetwork]);

  const updateMemberStatus = useCallback(async (membershipId: string, status: SupportMember['status']) => {
    try {
      await supportNetworkService.updateMemberStatus(membershipId, status);
      await fetchSupportNetwork();
      toast.success('Member status updated');
    } catch (err) {
      console.error('Error updating member status:', err);
      toast.error('Failed to update member status');
      throw err;
    }
  }, [fetchSupportNetwork]);

  const sendAlert = useCallback(async (supportMemberId: string, alertType: string, message: string) => {
    if (!user?.id) return;

    try {
      await supportNetworkService.sendAlert(supportMemberId, user.id, alertType, message);
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
    const networkChannel = supabase
      .channel('support_network_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_network',
          filter: `patient_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Support network change received:', payload);
          fetchSupportNetwork();
        }
      )
      .subscribe();

    // Subscribe to presence changes
    const presenceChannel = supabase
      .channel('presence_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_member_presence'
        },
        (payload) => {
          console.log('Presence change received:', payload);
          fetchSupportNetwork();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(networkChannel);
      supabase.removeChannel(presenceChannel);
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
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const [loading, setLoading] = useState(false);

  const updatePresence = useCallback(async (status: PresenceStatus['status'], dnd: boolean = doNotDisturb) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      await supportNetworkService.updatePresence(user.id, status, dnd);
      setCurrentStatus(status);
      setDoNotDisturb(dnd);
    } catch (err) {
      console.error('Error updating presence:', err);
      toast.error('Failed to update presence status');
    } finally {
      setLoading(false);
    }
  }, [user?.id, doNotDisturb]);

  const toggleDoNotDisturb = useCallback(async () => {
    const newDndStatus = !doNotDisturb;
    await updatePresence(currentStatus, newDndStatus);
  }, [doNotDisturb, currentStatus, updatePresence]);

  // Auto-update presence based on page visibility
  useEffect(() => {
    if (!user?.id) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away');
      } else {
        updatePresence('online');
      }
    };

    const handleBeforeUnload = () => {
      updatePresence('offline');
    };

    // Set initial status
    updatePresence('online');

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const prefs = await supportNetworkService.getNotificationPreferences(user.id);
      setPreferences(prefs);
      setError(null);
    } catch (err) {
      console.error('Error fetching notification preferences:', err);
      setError('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user?.id) return;

    try {
      await supportNetworkService.updateNotificationPreferences(user.id, newPreferences);
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