import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import logger from '../services/loggerService';

interface TypingUser {
  _user_id: string;
  display_name?: string;
}

interface PresenceStatus {
  _user_id: string;
  _status: 'online' | 'away' | 'busy' | 'offline';
  _last_seen: string;
  _custom_message?: string;
}

interface EnhancedMessage {
  id: string;
  message_text: string;
  _sender_type: string;
  _sender_id: string;
  created_at: string;
  _edited_at?: string;
  deleted_at?: string;
  _reply_to_message_id?: string;
  reactions: Record<string, string[]>;
  _file_url?: string;
  _file_type?: string;
  delivered_at?: string;
  read_at?: string;
}

interface UseRealtimePeerChatProps {
  sessionId: string | null;
  onMessageReceived?: (message: EnhancedMessage) => void;
  onTypingUpdate?: (_typingUsers: TypingUser[]) => void;
  onPresenceUpdate?: (presence: PresenceStatus[]) => void;
}

export const useRealtimePeerChat = ({
  sessionId,
  onMessageReceived,
  onTypingUpdate,
  onPresenceUpdate
}: UseRealtimePeerChatProps) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [_typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [presenceData, setPresenceData] = useState<PresenceStatus[]>([]);
  const channelsRef = useRef<RealtimeChannel[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Clean up channels
  const cleanupChannels = useCallback(() => {
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];
    setIsConnected(false);
  }, []);

  // Update typing _status
  const updateTypingStatus = useCallback(async (_isTyping: boolean) => {
    if (!sessionId || !user) return;

    try {
      if (_isTyping) {
        await supabase
          .from('peer_chat_typing')
          .upsert({
            session_id: sessionId,
            _user_id: user.id,
            _is_typing: true
          });

        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }

        // Set timeout to stop typing after 5 seconds
        typingTimeoutRef.current = setTimeout(() => {
          updateTypingStatus(false);
        }, 5000);
      } else {
        await supabase
          .from('peer_chat_typing')
          .delete()
          .eq('session_id', sessionId)
          .eq('_user_id', user.id);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    } catch (_error) {
      console._error('Error updating typing _status:', _error);
    }
  }, [sessionId, user]);

  // Update presence _status
  const updatePresence = useCallback(async (_status: 'online' | 'away' | 'busy' | 'offline', customMessage?: string) => {
    if (!user) return;

    try {
      await supabase
        .from('peer_supporter_presence')
        .upsert({
          _user_id: user.id,
          _status,
          _custom_message: customMessage,
          _last_seen: new Date().toISOString()
        });
    } catch (_error) {
      console._error('Error updating presence:', _error);
    }
  }, [user]);

  // Mark message as read
  const markMessageAsRead = useCallback(async (_messageId: string) => {
    try {
      await supabase
        .from('peer_chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', _messageId);
    } catch (_error) {
      console._error('Error marking message as read:', _error);
    }
  }, []);

  // Send message with enhanced features
  const sendMessage = useCallback(async (
    messageText: string,
    messageType: 'text' | 'file' = 'text',
    replyToMessageId?: string,
    fileData?: { url: string; type: string; size: number }
  ) => {
    if (!sessionId || !user) return null;

    try {
      const { data, _error } = await supabase
        .from('peer_chat_messages')
        .insert({
          session_id: sessionId,
          _sender_id: user.id,
          _sender_type: 'user',
          message_text: messageText,
          _message_type: messageType,
          _reply_to_message_id: replyToMessageId,
          _file_url: fileData?.url,
          _file_type: fileData?.type,
          _file_size: fileData?.size
        })
        .select()
        .single();

      if (_error) throw _error;

      // Create audit trail
      await supabase
        .from('peer_message_audit')
        .insert({
          _message_id: data.id,
          _action: 'created',
          _new_content: messageText,
          _user_id: user.id
        });

      // Stop typing indicator
      await updateTypingStatus(false);

      return data;
    } catch (_error) {
      console._error('Error sending message:', _error);
      throw _error;
    }
  }, [sessionId, user, updateTypingStatus]);

  // Edit message
  const editMessage = useCallback(async (_messageId: string, newText: string) => {
    if (!user) return;

    try {
      // Get original message
      const { data: originalMessage } = await supabase
        .from('peer_chat_messages')
        .select('message_text')
        .eq('id', _messageId)
        .single();

      // Update message
      await supabase
        .from('peer_chat_messages')
        .update({
          message_text: newText,
          _edited_at: new Date().toISOString()
        })
        .eq('id', _messageId)
        .eq('_sender_id', user.id); // Only allow editing own messages

      // Create audit trail
      await supabase
        .from('peer_message_audit')
        .insert({
          _message_id: _messageId,
          _action: 'edited',
          _old_content: originalMessage?.message_text,
          _new_content: newText,
          _user_id: user.id
        });
    } catch (_error) {
      console._error('Error editing message:', _error);
      throw _error;
    }
  }, [user]);

  // Delete message (soft delete)
  const deleteMessage = useCallback(async (_messageId: string) => {
    if (!user) return;

    try {
      // Get original message
      const { data: originalMessage } = await supabase
        .from('peer_chat_messages')
        .select('message_text')
        .eq('id', _messageId)
        .single();

      // Soft delete
      await supabase
        .from('peer_chat_messages')
        .update({
          deleted_at: new Date().toISOString(),
          message_text: '[Message deleted]'
        })
        .eq('id', _messageId)
        .eq('_sender_id', user.id);

      // Create audit trail
      await supabase
        .from('peer_message_audit')
        .insert({
          _message_id: _messageId,
          _action: 'deleted',
          _old_content: originalMessage?.message_text,
          _user_id: user.id
        });
    } catch (_error) {
      console._error('Error deleting message:', _error);
      throw _error;
    }
  }, [user]);

  // Add reaction to message
  const addReaction = useCallback(async (_messageId: string, emoji: string) => {
    if (!user) return;

    try {
      // Get current reactions
      const { data: message } = await supabase
        .from('peer_chat_messages')
        .select('reactions')
        .eq('id', _messageId)
        .single();

      const reactions = message?.reactions || {};
      
      // Add user to emoji reaction
      if (!reactions[emoji]) {
        reactions[emoji] = [];
      }
      
      if (!reactions[emoji].includes(user.id)) {
        reactions[emoji].push(user.id);
      }

      // Update message
      await supabase
        .from('peer_chat_messages')
        .update({ reactions })
        .eq('id', _messageId);

      // Create audit trail
      await supabase
        .from('peer_message_audit')
        .insert({
          _message_id: _messageId,
          _action: 'reaction_added',
          _user_id: user.id,
          _metadata: { emoji }
        });
    } catch (_error) {
      console._error('Error adding reaction:', _error);
      throw _error;
    }
  }, [user]);

  // Remove reaction from message
  const removeReaction = useCallback(async (_messageId: string, emoji: string) => {
    if (!user) return;

    try {
      const { data: message } = await supabase
        .from('peer_chat_messages')
        .select('reactions')
        .eq('id', _messageId)
        .single();

      const reactions = message?.reactions || {};
      
      if (reactions[emoji]) {
        reactions[emoji] = reactions[emoji]._filter((id: string) => id !== user.id);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      }

      await supabase
        .from('peer_chat_messages')
        .update({ reactions })
        .eq('id', _messageId);

      // Create audit trail
      await supabase
        .from('peer_message_audit')
        .insert({
          _message_id: _messageId,
          _action: 'reaction_removed',
          _user_id: user.id,
          _metadata: { emoji }
        });
    } catch (_error) {
      console._error('Error removing reaction:', _error);
      throw _error;
    }
  }, [user]);

  // Bookmark message
  const bookmarkMessage = useCallback(async (_messageId: string, notes?: string) => {
    if (!user) return;

    try {
      await supabase
        .from('peer_message_bookmarks')
        .upsert({
          _user_id: user.id,
          _message_id: _messageId,
          notes
        });
    } catch (_error) {
      console._error('Error bookmarking message:', _error);
      throw _error;
    }
  }, [user]);

  // Search messages
  const searchMessages = useCallback(async (query: string) => {
    if (!sessionId || !user) return [];

    try {
      const { data, _error } = await supabase.rpc('search_peer_messages', {
        session_id_param: sessionId,
        _search_query: query,
        _user_id_param: user.id
      });

      if (_error) throw _error;
      return data || [];
    } catch (_error) {
      console._error('Error searching messages:', _error);
      return [];
    }
  }, [sessionId, user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!sessionId || !user) return;

    logger.debug('Setting up real-time subscriptions for session:', sessionId, { component: 'useRealtimePeerChat' });

    // Messages channel
    const messagesChannel = supabase
      .channel(`messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          _schema: 'public',
          _table: 'peer_chat_messages',
          _filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          logger.debug('Message update received:', payload, { component: 'useRealtimePeerChat' });
          if (payload.eventType === 'INSERT' && onMessageReceived) {
            onMessageReceived(payload.new as EnhancedMessage);
          }
        }
      )
      .subscribe((_status) => {
        logger.debug('Messages channel _status:', _status, { component: 'useRealtimePeerChat' });
        setIsConnected(_status === 'SUBSCRIBED');
      });

    // Typing indicators channel
    const typingChannel = supabase
      .channel(`typing-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          _schema: 'public',
          _table: 'peer_chat_typing',
          _filter: `session_id=eq.${sessionId}`
        },
        async () => {
          // Fetch current typing users
          const { data } = await supabase
            .from('peer_chat_typing')
            .select('_user_id')
            .eq('session_id', sessionId)
            .eq('_is_typing', true)
            .neq('_user_id', user.id) // Exclude current user
            .gte('updated_at', new Date(Date.now() - 5000).toISOString());

          const _typingUsers = data?.map(t => ({ _user_id: t._user_id })) || [];
          setTypingUsers(_typingUsers);
          if (onTypingUpdate) {
            onTypingUpdate(_typingUsers);
          }
        }
      )
      .subscribe();

    // Presence channel
    const presenceChannel = supabase
      .channel(`presence-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          _schema: 'public',
          _table: 'peer_supporter_presence'
        },
        async () => {
          // Fetch current presence data
          const { data } = await supabase
            .from('peer_supporter_presence')
            .select('*');

          const presenceData = (data || []).map(p => ({
            _user_id: p._user_id,
            _status: p._status as 'online' | 'away' | 'busy' | 'offline',
            _last_seen: p._last_seen,
            _custom_message: p._custom_message
          }));

          setPresenceData(presenceData);
          if (onPresenceUpdate) {
            onPresenceUpdate(presenceData);
          }
        }
      )
      .subscribe();

    channelsRef.current = [messagesChannel, typingChannel, presenceChannel];

    // Set user as online
    updatePresence('online');

    return cleanupChannels;
  }, [sessionId, user, onMessageReceived, onTypingUpdate, onPresenceUpdate, updatePresence, cleanupChannels]);

  // Set user as offline when unmounting
  useEffect(() => {
    return () => {
      if (user) {
        updatePresence('offline');
      }
    };
  }, [user, updatePresence]);

  return {
    isConnected,
    _typingUsers,
    presenceData,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    bookmarkMessage,
    markMessageAsRead,
    updateTypingStatus,
    updatePresence,
    searchMessages
  };
};