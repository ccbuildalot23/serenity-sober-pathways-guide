import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface UserPresence {
  id: string;
  user_id: string;
  forum_id: string | null;
  status: 'online' | 'away' | 'offline';
  last_seen: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
}

export const useUserPresence = (forumId?: string) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [userCount, setUserCount] = useState(0);

  // Track user's own presence
  const trackPresence = useCallback(async (status: 'online' | 'away' | 'offline' = 'online') => {
    if (!user?.id) return;

    try {
      const userAgent = navigator.userAgent;
      
      // Upsert user presence
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          forum_id: forumId || null,
          status,
          last_seen: new Date().toISOString(),
          user_agent: userAgent,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,forum_id'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error tracking presence:', error);
    }
  }, [user?.id, forumId]);

  // Update presence status
  const updateStatus = useCallback(async (status: 'online' | 'away' | 'offline') => {
    await trackPresence(status);
  }, [trackPresence]);

  // Load online users
  const loadOnlineUsers = useCallback(async () => {
    try {
      let query = supabase
        .from('user_presence')
        .select('*')
        .eq('status', 'online')
        .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Active in last 5 minutes

      if (forumId) {
        query = query.eq('forum_id', forumId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const typedData = (data || []).map(item => ({
        ...item,
        status: item.status as 'online' | 'away' | 'offline'
      })) as UserPresence[];

      setOnlineUsers(typedData);
      setUserCount(typedData.length);
    } catch (error) {
      console.error('Error loading online users:', error);
    }
  }, [forumId]);

  useEffect(() => {
    if (!user?.id) return;

    // Track initial presence
    trackPresence('online');

    // Load online users
    loadOnlineUsers();

    // Set up real-time subscription
    const channel = supabase
      .channel(`presence-${forumId || 'global'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: forumId ? `forum_id=eq.${forumId}` : 'forum_id=is.null'
        },
        () => {
          loadOnlineUsers();
        }
      )
      .subscribe();

    // Track presence on visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updateStatus('away');
      } else {
        updateStatus('online');
      }
    };

    // Track presence on beforeunload
    const handleBeforeUnload = () => {
      updateStatus('offline');
    };

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Update presence every 30 seconds to keep it fresh
    const presenceInterval = setInterval(() => {
      if (!document.hidden) {
        trackPresence('online');
      }
    }, 30000);

    return () => {
      // Clean up
      updateStatus('offline');
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(presenceInterval);
    };
  }, [user?.id, forumId, trackPresence, updateStatus, loadOnlineUsers]);

  return {
    onlineUsers,
    userCount,
    updateStatus,
    refreshPresence: loadOnlineUsers
  };
};
