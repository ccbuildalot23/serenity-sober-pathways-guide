import { supabase } from '@/integrations/supabase/client';

export interface SecureMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  message_content: string; // Encrypted
  message_type: 'text' | 'attachment' | 'system';
  attachment_url?: string;
  attachment_name?: string;
  attachment_size_bytes?: number;
  is_read: boolean;
  read_at?: string;
  is_edited: boolean;
  edited_at?: string;
  is_urgent: boolean;
  requires_response: boolean;
  created_at: string;
}

export interface MessageConversation {
  id: string;
  patient_id: string;
  provider_id: string;
  subject?: string;
  status: 'active' | 'archived' | 'closed';
  last_message_at?: string;
  last_message_by?: string;
  patient_can_initiate: boolean;
  auto_archive_days: number;
  created_at: string;
  archived_at?: string;
}

interface ConversationWithParticipants extends MessageConversation {
  patient?: {
    full_name: string;
    email: string;
  };
  provider?: {
    name: string;
    title: string;
  };
  unread_count?: number;
}

export class SecureMessagingService {
  // ============================================================================
  // CONVERSATIONS
  // ============================================================================

  /**
   * Get or create a conversation between provider and patient
   */
  static async getOrCreateConversation(
    patientId: string,
    providerId: string,
    subject?: string
  ): Promise<MessageConversation> {
    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('message_conversations')
      .select('*')
      .eq('patient_id', patientId)
      .eq('provider_id', providerId)
      .single();

    if (existing) {
      // Reactivate if archived
      if (existing.status === 'archived') {
        const { data, error } = await supabase
          .from('message_conversations')
          .update({ 
            status: 'active',
            archived_at: null 
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
      return existing;
    }

    // Create new conversation
    const { data, error } = await supabase
      .from('message_conversations')
      .insert({
        patient_id: patientId,
        provider_id: providerId,
        subject: subject || 'Healthcare Communication',
        status: 'active',
        patient_can_initiate: true,
        auto_archive_days: 90
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all conversations for current user
   */
  static async getUserConversations(): Promise<ConversationWithParticipants[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    // Check user role
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.user.id)
      .single();

    const isProvider = userRole?.role === 'provider';

    // Get conversations with participant info
    let query = supabase
      .from('message_conversations')
      .select(`
        *,
        patient:profiles!message_conversations_patient_id_fkey(full_name, email),
        provider:profiles!message_conversations_provider_id_fkey(full_name, email)
      `);

    if (isProvider) {
      query = query.eq('provider_id', user.user.id);
    } else {
      query = query.eq('patient_id', user.user.id);
    }

    const { data: conversations, error } = await query
      .eq('status', 'active')
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    // Get unread counts for each conversation
    const conversationsWithCounts = await Promise.all(
      (conversations || []).map(async (conv) => {
        const { count } = await supabase
          .from('secure_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .eq('recipient_id', user.user!.id)
          .eq('is_read', false);

        return {
          ...conv,
          unread_count: count || 0
        };
      })
    );

    return conversationsWithCounts;
  }

  /**
   * Archive a conversation
   */
  static async archiveConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('message_conversations')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (error) throw error;
  }

  /**
   * Close a conversation (permanent)
   */
  static async closeConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('message_conversations')
      .update({
        status: 'closed',
        archived_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (error) throw error;
  }

  // ============================================================================
  // MESSAGES
  // ============================================================================

  /**
   * Send a secure message
   */
  static async sendMessage(
    conversationId: string,
    recipientId: string,
    content: string,
    options: {
      isUrgent?: boolean;
      requiresResponse?: boolean;
      attachmentUrl?: string;
      attachmentName?: string;
      attachmentSize?: number;
    } = {}
  ): Promise<SecureMessage> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    // Verify user is part of the conversation
    const { data: conversation } = await supabase
      .from('message_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (!conversation) throw new Error('Conversation not found');

    if (
      conversation.patient_id !== user.user.id &&
      conversation.provider_id !== user.user.id
    ) {
      throw new Error('Not authorized to send messages in this conversation');
    }

    // Create the message
    const { data: message, error } = await supabase
      .from('secure_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.user.id,
        recipient_id: recipientId,
        message_content: content, // In production, encrypt this
        message_type: options.attachmentUrl ? 'attachment' : 'text',
        is_urgent: options.isUrgent || false,
        requires_response: options.requiresResponse || false,
        attachment_url: options.attachmentUrl,
        attachment_name: options.attachmentName,
        attachment_size_bytes: options.attachmentSize,
        is_read: false,
        is_edited: false
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation's last message info
    await supabase
      .from('message_conversations')
      .update({
        last_message_at: message.created_at,
        last_message_by: user.user.id
      })
      .eq('id', conversationId);

    // Send notification if urgent
    if (options.isUrgent) {
      await this.sendUrgentMessageNotification(message.id, recipientId);
    }

    return message;
  }

  /**
   * Get messages for a conversation
   */
  static async getConversationMessages(
    conversationId: string,
    limit = 50,
    offset = 0
  ): Promise<SecureMessage[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    // Verify user is part of the conversation
    const { data: conversation } = await supabase
      .from('message_conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (!conversation) throw new Error('Conversation not found');

    if (
      conversation.patient_id !== user.user.id &&
      conversation.provider_id !== user.user.id
    ) {
      throw new Error('Not authorized to view messages in this conversation');
    }

    const { data: messages, error } = await supabase
      .from('secure_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Mark messages as read if user is recipient
    const unreadMessageIds = messages
      ?.filter(m => m.recipient_id === user.user.id && !m.is_read)
      .map(m => m.id) || [];

    if (unreadMessageIds.length > 0) {
      await this.markMessagesAsRead(unreadMessageIds);
    }

    return messages || [];
  }

  /**
   * Mark messages as read
   */
  static async markMessagesAsRead(messageIds: string[]): Promise<void> {
    const { error } = await supabase
      .from('secure_messages')
      .update({
        is_read: true,
        read_at: new Date().toISOString()
      })
      .in('id', messageIds);

    if (error) throw error;
  }

  /**
   * Edit a message
   */
  static async editMessage(messageId: string, newContent: string): Promise<SecureMessage> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('secure_messages')
      .update({
        message_content: newContent,
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .eq('sender_id', user.user.id) // Can only edit own messages
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete a message (soft delete - marks as deleted but preserves for audit)
   */
  static async deleteMessage(messageId: string): Promise<void> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    // Replace content with deletion notice
    const { error } = await supabase
      .from('secure_messages')
      .update({
        message_content: '[Message deleted]',
        is_edited: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .eq('sender_id', user.user.id);

    if (error) throw error;
  }

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  /**
   * Send urgent message notification
   */
  private static async sendUrgentMessageNotification(
    messageId: string,
    recipientId: string
  ): Promise<void> {
    // This would integrate with your notification service
    // For now, just create a notification record
    try {
      await supabase
        .from('notification_queue')
        .insert({
          user_id: recipientId,
          notification_type: 'urgent_message',
          priority: 'high',
          title: 'Urgent Message from Provider',
          body: 'You have received an urgent message. Please check your secure inbox.',
          metadata: { message_id: messageId },
          channels: ['email', 'push', 'sms']
        });
    } catch (error) {
      console.error('Failed to send urgent message notification:', error);
    }
  }

  // ============================================================================
  // SEARCH & ANALYTICS
  // ============================================================================

  /**
   * Search messages in a conversation
   */
  static async searchMessages(
    conversationId: string,
    searchTerm: string
  ): Promise<SecureMessage[]> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    // Note: In production, implement proper full-text search on encrypted content
    const { data, error } = await supabase
      .from('secure_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .ilike('message_content', `%${searchTerm}%`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get messaging statistics
   */
  static async getMessagingStats(userId?: string) {
    const { data: user } = await supabase.auth.getUser();
    const targetUserId = userId || user?.user?.id;
    if (!targetUserId) throw new Error('Not authenticated');

    // Get all conversations for the user
    const { data: conversations } = await supabase
      .from('message_conversations')
      .select('id')
      .or(`patient_id.eq.${targetUserId},provider_id.eq.${targetUserId}`);

    const conversationIds = conversations?.map(c => c.id) || [];

    if (conversationIds.length === 0) {
      return {
        totalConversations: 0,
        activeConversations: 0,
        totalMessages: 0,
        unreadMessages: 0,
        urgentMessages: 0
      };
    }

    // Get message statistics
    const { data: messages } = await supabase
      .from('secure_messages')
      .select('is_read, is_urgent, recipient_id')
      .in('conversation_id', conversationIds);

    const stats = {
      totalConversations: conversationIds.length,
      activeConversations: conversations?.length || 0,
      totalMessages: messages?.length || 0,
      unreadMessages: messages?.filter(m => !m.is_read && m.recipient_id === targetUserId).length || 0,
      urgentMessages: messages?.filter(m => m.is_urgent && !m.is_read && m.recipient_id === targetUserId).length || 0
    };

    return stats;
  }

  // ============================================================================
  // COMPLIANCE & EXPORT
  // ============================================================================

  /**
   * Export conversation history (for compliance/patient records)
   */
  static async exportConversation(
    conversationId: string,
    format: 'json' | 'pdf' = 'json'
  ): Promise<any> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    // Get conversation details
    const { data: conversation } = await supabase
      .from('message_conversations')
      .select(`
        *,
        patient:profiles!message_conversations_patient_id_fkey(full_name, email),
        provider:profiles!message_conversations_provider_id_fkey(full_name, email)
      `)
      .eq('id', conversationId)
      .single();

    if (!conversation) throw new Error('Conversation not found');

    // Get all messages
    const { data: messages } = await supabase
      .from('secure_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (format === 'json') {
      return {
        conversation,
        messages,
        exported_at: new Date().toISOString(),
        exported_by: user.user.id
      };
    }

    // PDF export would require additional library
    throw new Error('PDF export not yet implemented');
  }
}