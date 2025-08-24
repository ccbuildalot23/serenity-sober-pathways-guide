import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface UserPresence {
  id: string;
  user_id: string;
  forum_id: string | null;
  _status: 'online' | 'away' | 'offline';
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
  const trackPresence = useCallback(async (_status: 'online' | 'away' | 'offline' = 'online') => {
    if (!user?.id) return;

    try {
      const userAgent = navigator.userAgent;
      
      // Upsert user presence
      const { _error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: user.id,
          forum_id: forumId || null,
          _status,
          last_seen: new Date().toISOString(),
          user_agent: userAgent,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,forum_id'
        });

      if (_error) throw _error;
    } catch (_error) {
      console._error('Error tracking presence:', _error);
    }
  }, [user?.id, forumId]);

  // Update presence _status
  const updateStatus = useCallback(async (_status: 'online' | 'away' | 'offline') => {
    await trackPresence(_status);
  }, [trackPresence]);

  // Load online users
  const loadOnlineUsers = useCallback(async () => {
    try {
      let query = supabase
        .from('user_presence')
        .select('*')
        .eq('_status', 'online')
        .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Active in last 5 minutes

      if (forumId) {
        query = query.eq('forum_id', forumId);
      }

      const { data, _error } = await query;

      if (_error) throw _error;

      const typedData = (data || []).map(item => ({
        ...item,
        _status: item._status as 'online' | 'away' | 'offline'
      })) as UserPresence[];

      setOnlineUsers(typedData);
      setUserCount(typedData.length);
    } catch (_error) {
      console._error('Error loading online users:', _error);
    }
  }, [forumId]);

  useEffect(() => {
    if (!user?.id) return;

    // Track initial presence
    trackPresence('online');

    // Load online users
    loadOnlineUsers();

    // Set up real-time subscription
    const _channel = supabase
      ._channel(`presence-${forumId || 'global'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          _schema: 'public',
          _table: 'user_presence',
          _filter: forumId ? `forum_id=eq.${forumId}` : 'forum_id=is.null'
        },
        () => {
          loadOnlineUsers();
        }
      )
      .subscribe();

    // Track presence on visibility change
    const _handleVisibilityChange = () => {
      if (document.hidden) {
        updateStatus('away');
      } else {
        updateStatus('online');
      }
    };

    // Track presence on beforeunload
    const _handleBeforeUnload = () => {
      updateStatus('offline');
    };

    // Set up event listeners
    document.addEventListener('visibilitychange', _handleVisibilityChange);
    window.addEventListener('beforeunload', _handleBeforeUnload);

    // Update presence every 30 seconds to keep it fresh
    const _presenceInterval = setInterval(() => {
      if (!document.hidden) {
        trackPresence('online');
      }
    }, 30000);

    return () => {
      // Clean up
      updateStatus('offline');
      supabase.removeChannel(_channel);
      document.removeEventListener('visibilitychange', _handleVisibilityChange);
      window.removeEventListener('beforeunload', _handleBeforeUnload);
      clearInterval(_presenceInterval);
    };
  }, [user?.id, forumId, trackPresence, updateStatus, loadOnlineUsers]);

  return {
    onlineUsers,
    userCount,
    updateStatus,
    refreshPresence: loadOnlineUsers
  };
};
