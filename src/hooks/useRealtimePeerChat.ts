import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface TypingUser {
  user_id: string;
  display_name?: string;
}

interface PresenceStatus {
  user_id: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  last_seen: string;
  custom_message?: string;
}

interface EnhancedMessage {
  id: string;
  message_text: string;
  sender_type: string;
  sender_id: string;
  created_at: string;
  edited_at?: string;
  deleted_at?: string;
  reply_to_message_id?: string;
  reactions: Record<string, string[]>;
  file_url?: string;
  file_type?: string;
  delivered_at?: string;
  read_at?: string;
}

interface UseRealtimePeerChatProps {
  sessionId: string | null;
  onMessageReceived?: (message: EnhancedMessage) => void;
  onTypingUpdate?: (typingUsers: TypingUser[]) => void;
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
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
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

  // Update typing status
  const updateTypingStatus = useCallback(async (isTyping: boolean) => {
    if (!sessionId || !user) return;

    try {
      if (isTyping) {
        await supabase
          .from('peer_chat_typing')
          .upsert({
            session_id: sessionId,
            user_id: user.id,
            is_typing: true
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
          .eq('user_id', user.id);

        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [sessionId, user]);

  // Update presence status
  const updatePresence = useCallback(async (status: 'online' | 'away' | 'busy' | 'offline', customMessage?: string) => {
    if (!user) return;

    try {
      await supabase
        .from('peer_supporter_presence')
        .upsert({
          user_id: user.id,
          status,
          custom_message: customMessage,
          last_seen: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  }, [user]);

  // Mark message as read
  const markMessageAsRead = useCallback(async (messageId: string) => {
    try {
      await supabase
        .from('peer_chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);
    } catch (error) {
      console.error('Error marking message as read:', error);
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
      const { data, error } = await supabase
        .from('peer_chat_messages')
        .insert({
          session_id: sessionId,
          sender_id: user.id,
          sender_type: 'user',
          message_text: messageText,
          message_type: messageType,
          reply_to_message_id: replyToMessageId,
          file_url: fileData?.url,
          file_type: fileData?.type,
          file_size: fileData?.size
        })
        .select()
        .single();

      if (error) throw error;

      // Create audit trail
      await supabase
        .from('peer_message_audit')
        .insert({
          message_id: data.id,
          action: 'created',
          new_content: messageText,
          user_id: user.id
        });

      // Stop typing indicator
      await updateTypingStatus(false);

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }, [sessionId, user, updateTypingStatus]);

  // Edit message
  const editMessage = useCallback(async (messageId: string, newText: string) => {
    if (!user) return;

    try {
      // Get original message
      const { data: originalMessage } = await supabase
        .from('peer_chat_messages')
        .select('message_text')
        .eq('id', messageId)
        .single();

      // Update message
      await supabase
        .from('peer_chat_messages')
        .update({
          message_text: newText,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', user.id); // Only allow editing own messages

      // Create audit trail
      await supabase
        .from('peer_message_audit')
        .insert({
          message_id: messageId,
          action: 'edited',
          old_content: originalMessage?.message_text,
          new_content: newText,
          user_id: user.id
        });
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }, [user]);

  // Delete message (soft delete)
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user) return;

    try {
      // Get original message
      const { data: originalMessage } = await supabase
        .from('peer_chat_messages')
        .select('message_text')
        .eq('id', messageId)
        .single();

      // Soft delete
      await supabase
        .from('peer_chat_messages')
        .update({
          deleted_at: new Date().toISOString(),
          message_text: '[Message deleted]'
        })
        .eq('id', messageId)
        .eq('sender_id', user.id);

      // Create audit trail
      await supabase
        .from('peer_message_audit')
        .insert({
          message_id: messageId,
          action: 'deleted',
          old_content: originalMessage?.message_text,
          user_id: user.id
        });
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, [user]);

  // Add reaction to message
  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      // Get current reactions
      const { data: message } = await supabase
        .from('peer_chat_messages')
        .select('reactions')
        .eq('id', messageId)
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
        .eq('id', messageId);

      // Create audit trail
      await supabase
        .from('peer_message_audit')
        .insert({
          message_id: messageId,
          action: 'reaction_added',
          user_id: user.id,
          metadata: { emoji }
        });
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }, [user]);

  // Remove reaction from message
  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user) return;

    try {
      const { data: message } = await supabase
        .from('peer_chat_messages')
        .select('reactions')
        .eq('id', messageId)
        .single();

      const reactions = message?.reactions || {};
      
      if (reactions[emoji]) {
        reactions[emoji] = reactions[emoji].filter((id: string) => id !== user.id);
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      }

      await supabase
        .from('peer_chat_messages')
        .update({ reactions })
        .eq('id', messageId);

      // Create audit trail
      await supabase
        .from('peer_message_audit')
        .insert({
          message_id: messageId,
          action: 'reaction_removed',
          user_id: user.id,
          metadata: { emoji }
        });
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }, [user]);

  // Bookmark message
  const bookmarkMessage = useCallback(async (messageId: string, notes?: string) => {
    if (!user) return;

    try {
      await supabase
        .from('peer_message_bookmarks')
        .upsert({
          user_id: user.id,
          message_id: messageId,
          notes
        });
    } catch (error) {
      console.error('Error bookmarking message:', error);
      throw error;
    }
  }, [user]);

  // Search messages
  const searchMessages = useCallback(async (query: string) => {
    if (!sessionId || !user) return [];

    try {
      const { data, error } = await supabase.rpc('search_peer_messages', {
        session_id_param: sessionId,
        search_query: query,
        user_id_param: user.id
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching messages:', error);
      return [];
    }
  }, [sessionId, user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!sessionId || !user) return;

    console.log('Setting up real-time subscriptions for session:', sessionId);

    // Messages channel
    const messagesChannel = supabase
      .channel(`messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'peer_chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('Message update received:', payload);
          if (payload.eventType === 'INSERT' && onMessageReceived) {
            onMessageReceived(payload.new as EnhancedMessage);
          }
        }
      )
      .subscribe((status) => {
        console.log('Messages channel status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Typing indicators channel
    const typingChannel = supabase
      .channel(`typing-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'peer_chat_typing',
          filter: `session_id=eq.${sessionId}`
        },
        async () => {
          // Fetch current typing users
          const { data } = await supabase
            .from('peer_chat_typing')
            .select('user_id')
            .eq('session_id', sessionId)
            .eq('is_typing', true)
            .neq('user_id', user.id) // Exclude current user
            .gte('updated_at', new Date(Date.now() - 5000).toISOString());

          const typingUsers = data?.map(t => ({ user_id: t.user_id })) || [];
          setTypingUsers(typingUsers);
          if (onTypingUpdate) {
            onTypingUpdate(typingUsers);
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
          schema: 'public',
          table: 'peer_supporter_presence'
        },
        async () => {
          // Fetch current presence data
          const { data } = await supabase
            .from('peer_supporter_presence')
            .select('*');

          const presenceData = (data || []).map(p => ({
            user_id: p.user_id,
            status: p.status as 'online' | 'away' | 'busy' | 'offline',
            last_seen: p.last_seen,
            custom_message: p.custom_message
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
    typingUsers,
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