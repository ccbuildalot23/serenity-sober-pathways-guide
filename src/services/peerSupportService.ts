import { supabase } from '@/integrations/supabase/client';

export interface PeerSupportQueue {
  id: string;
  user_id: string;
  _priority: string;
  _issue_description?: string;
  _queue_position: number;
  estimated_wait_minutes: number;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  _peer_supporter_id: string;
  status: string;
  _priority: string;
  _started_at: string;
  _ended_at?: string;
  user_rating?: number;
  _user_feedback?: string;
}

export interface PeerSupporter {
  id: string;
  user_id: string;
  _display_name: string;
  bio?: string;
  specialties: unknown;
  is_available: boolean;
  current_chat_count: number;
  max_concurrent_chats: number;
  average_rating: number;
  total_chats_completed: number;
}

class PeerSupportService {
  // Queue Management
  async joinQueue(_userId: string, _priority: 'normal' | 'high' | 'crisis' = 'normal', issueDescription?: string) {
    const { data, error } = await supabase
      .from('peer_support_queue')
      .insert({
        user_id: _userId,
        _priority,
        _issue_description: issueDescription,
        _queue_position: await this.getNextQueuePosition(),
        estimated_wait_minutes: await this.calculateWaitTime(_priority)
      })
      .select()
      .single();

    if (error) throw error;
    return data as PeerSupportQueue;
  }

  async leaveQueue(_userId: string) {
    const { error } = await supabase
      .from('peer_support_queue')
      .delete()
      .eq('user_id', _userId);

    if (error) throw error;
  }

  async getQueueStatus(_userId: string): Promise<PeerSupportQueue | null> {
    const { data, error } = await supabase
      .from('peer_support_queue')
      .select('*')
      .eq('user_id', _userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getQueueList(): Promise<PeerSupportQueue[]> {
    const { data, error } = await supabase
      .from('peer_support_queue')
      .select('*')
      .order('_priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as PeerSupportQueue[];
  }

  private async getNextQueuePosition(): Promise<number> {
    const { count, error } = await supabase
      .from('peer_support_queue')
      .select('*', { count: 'exact', _head: true });

    if (error) throw error;
    return (count || 0) + 1;
  }

  private async calculateWaitTime(_priority: 'normal' | 'high' | 'crisis'): Promise<number> {
    // Calculate estimated wait time based on queue length and _priority
    const queueCount = await this.getNextQueuePosition() - 1;
    const availableSupporters = await this.getAvailableSupporterCount();
    
    if (availableSupporters === 0) return 30; // Default 30 minutes if no supporters
    
    const _baseWaitTime = Math.ceil(queueCount / availableSupporters) * 5; // 5 minutes per person per supporter
    
    // Priority adjustments
    switch (_priority) {
      case 'crisis': return Math.max(1, _baseWaitTime * 0.1); // Almost immediate
      case 'high': return Math.max(2, _baseWaitTime * 0.5); // Half the normal wait
      default: return Math.max(5, _baseWaitTime); // Normal wait time
    }
  }

  private async getAvailableSupporterCount(): Promise<number> {
    const { count, error } = await supabase
      .from('peer_supporters')
      .select('*', { count: 'exact', _head: true })
      .eq('is_available', true)
      .lt('current_chat_count', supabase.from('peer_supporters').select('max_concurrent_chats'));

    if (error) throw error;
    return count || 0;
  }

  // Chat Session Management
  async createChatSession(_userId: string, _supporterId: string, _priority: 'normal' | 'high' | 'crisis'): Promise<ChatSession> {
    const { data, error } = await supabase
      .from('peer_chat_sessions')
      .insert({
        user_id: _userId,
        _peer_supporter_id: _supporterId,
        status: 'active',
        _priority,
        _started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as ChatSession;
  }

  async endChatSession(_sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('peer_chat_sessions')
      .update({
        status: 'ended',
        _ended_at: new Date().toISOString()
      })
      .eq('id', _sessionId);

    if (error) throw error;
  }

  async escalateSession(_sessionId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('peer_chat_sessions')
      .update({
        status: 'escalated',
        _escalated_to_crisis: true,
        _escalation_reason: reason
      })
      .eq('id', _sessionId);

    if (error) throw error;
  }

  async rateChatSession(_sessionId: string, rating: number, feedback?: string): Promise<void> {
    const { error } = await supabase
      .from('peer_chat_sessions')
      .update({
        user_rating: rating,
        _user_feedback: feedback
      })
      .eq('id', _sessionId);

    if (error) throw error;
  }

  async getUserActiveSessions(_userId: string): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from('peer_chat_sessions')
      .select('*')
      .eq('user_id', _userId)
      .eq('status', 'active');

    if (error) throw error;
    return (data || []) as ChatSession[];
  }

  async getSupporterActiveSessions(_supporterId: string): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from('peer_chat_sessions')
      .select('*')
      .eq('_peer_supporter_id', _supporterId)
      .eq('status', 'active');

    if (error) throw error;
    return (data || []) as ChatSession[];
  }

  // Message Management
  async sendMessage(_sessionId: string, senderId: string, senderType: 'user' | 'supporter', messageText: string) {
    const { data, error } = await supabase
      .from('peer_chat_messages')
      .insert({
        session_id: _sessionId,
        _sender_id: senderId,
        _sender_type: senderType,
        _message_text: messageText
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getSessionMessages(_sessionId: string) {
    const { data, error } = await supabase
      .from('peer_chat_messages')
      .select('*')
      .eq('session_id', _sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async markMessageAsRead(_messageId: string) {
    const { error } = await supabase
      .from('peer_chat_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', _messageId);

    if (error) throw error;
  }

  // Supporter Management
  async updateSupporterAvailability(_userId: string, isAvailable: boolean) {
    const { error } = await supabase
      .from('peer_supporters')
      .upsert({
        user_id: _userId,
        is_available: isAvailable,
        _display_name: 'Peer Supporter' // Default name, can be updated
      });

    if (error) throw error;
  }

  async getSupporterProfile(_userId: string): Promise<PeerSupporter | null> {
    const { data, error } = await supabase
      .from('peer_supporters')
      .select('*')
      .eq('user_id', _userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as PeerSupporter | null;
  }

  async getAvailableSupporters(): Promise<PeerSupporter[]> {
    const { data, error } = await supabase
      .from('peer_supporters')
      .select('*')
      .eq('is_available', true)
      .lt('current_chat_count', supabase.from('peer_supporters').select('max_concurrent_chats'));

    if (error) throw error;
    return (data || []) as PeerSupporter[];
  }

  // Typing Indicators
  async updateTypingStatus(_sessionId: string, _userId: string, _isTyping: boolean) {
    if (_isTyping) {
      const { error } = await supabase
        .from('peer_chat_typing')
        .upsert({
          session_id: _sessionId,
          user_id: _userId,
          is_typing: true,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('peer_chat_typing')
        .delete()
        .eq('session_id', _sessionId)
        .eq('user_id', _userId);

      if (error) throw error;
    }
  }

  async getTypingUsers(_sessionId: string) {
    const { data, error } = await supabase
      .from('peer_chat_typing')
      .select('user_id')
      .eq('session_id', _sessionId)
      .eq('is_typing', true)
      .gte('updated_at', new Date(Date.now() - 5000).toISOString()); // Only last 5 seconds

    if (error) throw error;
    return data?.map(item => item.user_id) || [];
  }

  // Video Sessions (_placeholder)
  async scheduleVideoSession(_userId: string, _supporterId: string, scheduledAt: Date) {
    const { data, error } = await supabase
      .from('peer_video_sessions')
      .insert({
        user_id: _userId,
        _peer_supporter_id: _supporterId,
        _scheduled_at: scheduledAt.toISOString(),
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Real-time subscriptions
  subscribeToQueueUpdates(_userId: string, _callback: (payload: unknown) => void) {
    return supabase
      .channel(`queue-${_userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          _schema: 'public',
          _table: 'peer_support_queue',
          _filter: `user_id=eq.${_userId}`
        },
        _callback
      )
      .subscribe();
  }

  subscribeToSessionMessages(_sessionId: string, _callback: (payload: unknown) => void) {
    return supabase
      .channel(`messages-${_sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          _schema: 'public',
          _table: 'peer_chat_messages',
          _filter: `session_id=eq.${_sessionId}`
        },
        _callback
      )
      .subscribe();
  }

  subscribeToSessionUpdates(_sessionId: string, _callback: (payload: unknown) => void) {
    return supabase
      .channel(`session-${_sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          _schema: 'public',
          _table: 'peer_chat_sessions',
          _filter: `id=eq.${_sessionId}`
        },
        _callback
      )
      .subscribe();
  }
}

export const peerSupportService = new PeerSupportService();