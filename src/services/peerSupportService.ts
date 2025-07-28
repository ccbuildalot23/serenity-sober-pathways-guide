import { supabase } from '@/integrations/supabase/client';

export interface PeerSupportQueue {
  id: string;
  user_id: string;
  priority: string;
  issue_description?: string;
  queue_position: number;
  estimated_wait_minutes: number;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  peer_supporter_id: string;
  status: string;
  priority: string;
  started_at: string;
  ended_at?: string;
  user_rating?: number;
  user_feedback?: string;
}

export interface PeerSupporter {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string;
  specialties: any;
  is_available: boolean;
  current_chat_count: number;
  max_concurrent_chats: number;
  average_rating: number;
  total_chats_completed: number;
}

class PeerSupportService {
  // Queue Management
  async joinQueue(userId: string, priority: 'normal' | 'high' | 'crisis' = 'normal', issueDescription?: string) {
    const { data, error } = await supabase
      .from('peer_support_queue')
      .insert({
        user_id: userId,
        priority,
        issue_description: issueDescription,
        queue_position: await this.getNextQueuePosition(),
        estimated_wait_minutes: await this.calculateWaitTime(priority)
      })
      .select()
      .single();

    if (error) throw error;
    return data as PeerSupportQueue;
  }

  async leaveQueue(userId: string) {
    const { error } = await supabase
      .from('peer_support_queue')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  }

  async getQueueStatus(userId: string): Promise<PeerSupportQueue | null> {
    const { data, error } = await supabase
      .from('peer_support_queue')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async getQueueList(): Promise<PeerSupportQueue[]> {
    const { data, error } = await supabase
      .from('peer_support_queue')
      .select('*')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as PeerSupportQueue[];
  }

  private async getNextQueuePosition(): Promise<number> {
    const { count, error } = await supabase
      .from('peer_support_queue')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;
    return (count || 0) + 1;
  }

  private async calculateWaitTime(priority: 'normal' | 'high' | 'crisis'): Promise<number> {
    // Calculate estimated wait time based on queue length and priority
    const queueCount = await this.getNextQueuePosition() - 1;
    const availableSupporters = await this.getAvailableSupporterCount();
    
    if (availableSupporters === 0) return 30; // Default 30 minutes if no supporters
    
    const baseWaitTime = Math.ceil(queueCount / availableSupporters) * 5; // 5 minutes per person per supporter
    
    // Priority adjustments
    switch (priority) {
      case 'crisis': return Math.max(1, baseWaitTime * 0.1); // Almost immediate
      case 'high': return Math.max(2, baseWaitTime * 0.5); // Half the normal wait
      default: return Math.max(5, baseWaitTime); // Normal wait time
    }
  }

  private async getAvailableSupporterCount(): Promise<number> {
    const { count, error } = await supabase
      .from('peer_supporters')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true)
      .lt('current_chat_count', supabase.from('peer_supporters').select('max_concurrent_chats'));

    if (error) throw error;
    return count || 0;
  }

  // Chat Session Management
  async createChatSession(userId: string, supporterId: string, priority: 'normal' | 'high' | 'crisis'): Promise<ChatSession> {
    const { data, error } = await supabase
      .from('peer_chat_sessions')
      .insert({
        user_id: userId,
        peer_supporter_id: supporterId,
        status: 'active',
        priority,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data as ChatSession;
  }

  async endChatSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('peer_chat_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) throw error;
  }

  async escalateSession(sessionId: string, reason: string): Promise<void> {
    const { error } = await supabase
      .from('peer_chat_sessions')
      .update({
        status: 'escalated',
        escalated_to_crisis: true,
        escalation_reason: reason
      })
      .eq('id', sessionId);

    if (error) throw error;
  }

  async rateChatSession(sessionId: string, rating: number, feedback?: string): Promise<void> {
    const { error } = await supabase
      .from('peer_chat_sessions')
      .update({
        user_rating: rating,
        user_feedback: feedback
      })
      .eq('id', sessionId);

    if (error) throw error;
  }

  async getUserActiveSessions(userId: string): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from('peer_chat_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error) throw error;
    return (data || []) as ChatSession[];
  }

  async getSupporterActiveSessions(supporterId: string): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from('peer_chat_sessions')
      .select('*')
      .eq('peer_supporter_id', supporterId)
      .eq('status', 'active');

    if (error) throw error;
    return (data || []) as ChatSession[];
  }

  // Message Management
  async sendMessage(sessionId: string, senderId: string, senderType: 'user' | 'supporter', messageText: string) {
    const { data, error } = await supabase
      .from('peer_chat_messages')
      .insert({
        session_id: sessionId,
        sender_id: senderId,
        sender_type: senderType,
        message_text: messageText
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getSessionMessages(sessionId: string) {
    const { data, error } = await supabase
      .from('peer_chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async markMessageAsRead(messageId: string) {
    const { error } = await supabase
      .from('peer_chat_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) throw error;
  }

  // Supporter Management
  async updateSupporterAvailability(userId: string, isAvailable: boolean) {
    const { error } = await supabase
      .from('peer_supporters')
      .upsert({
        user_id: userId,
        is_available: isAvailable,
        display_name: 'Peer Supporter' // Default name, can be updated
      });

    if (error) throw error;
  }

  async getSupporterProfile(userId: string): Promise<PeerSupporter | null> {
    const { data, error } = await supabase
      .from('peer_supporters')
      .select('*')
      .eq('user_id', userId)
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
  async updateTypingStatus(sessionId: string, userId: string, isTyping: boolean) {
    if (isTyping) {
      const { error } = await supabase
        .from('peer_chat_typing')
        .upsert({
          session_id: sessionId,
          user_id: userId,
          is_typing: true,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('peer_chat_typing')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) throw error;
    }
  }

  async getTypingUsers(sessionId: string) {
    const { data, error } = await supabase
      .from('peer_chat_typing')
      .select('user_id')
      .eq('session_id', sessionId)
      .eq('is_typing', true)
      .gte('updated_at', new Date(Date.now() - 5000).toISOString()); // Only last 5 seconds

    if (error) throw error;
    return data?.map(item => item.user_id) || [];
  }

  // Video Sessions (placeholder)
  async scheduleVideoSession(userId: string, supporterId: string, scheduledAt: Date) {
    const { data, error } = await supabase
      .from('peer_video_sessions')
      .insert({
        user_id: userId,
        peer_supporter_id: supporterId,
        scheduled_at: scheduledAt.toISOString(),
        status: 'scheduled'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Real-time subscriptions
  subscribeToQueueUpdates(userId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`queue-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'peer_support_queue',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe();
  }

  subscribeToSessionMessages(sessionId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`messages-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'peer_chat_messages',
          filter: `session_id=eq.${sessionId}`
        },
        callback
      )
      .subscribe();
  }

  subscribeToSessionUpdates(sessionId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'peer_chat_sessions',
          filter: `id=eq.${sessionId}`
        },
        callback
      )
      .subscribe();
  }
}

export const peerSupportService = new PeerSupportService();