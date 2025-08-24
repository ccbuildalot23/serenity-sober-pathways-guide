import { supabase } from '@/integrations/supabase/client';

export interface VideoSession {
  id: string;
  user_id: string;
  peer_supporter_id: string;
  session_type: 'video' | 'audio';
  scheduled_at?: string;
  started_at?: string;
  ended_at?: string;
  status: 'scheduled' | 'active' | 'ended' | 'cancelled';
  room_id?: string;
  recording_consent: boolean;
  recording_url?: string;
  quality_score?: number;
  technical_issues: string[];
  duration_minutes?: number;
}

export interface QueueScheduleOptions {
  scheduled_time?: string;
  callback_requested?: boolean;
  callback_phone?: string;
}

export interface SupporterMetrics {
  supporter_id: string;
  metric_date: string;
  total_sessions: number;
  average_session_duration: number;
  average_rating: number;
  escalation_rate: number;
  response_time_avg: number;
  user_satisfaction_score: number;
  flags_received: number;
  schedule_adherence: number;
}

export interface SessionFlag {
  id: string;
  session_id: string;
  flag_type: 'safety_concern' | 'inappropriate_content' | 'crisis_indicator' | 'quality_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  flagged_by: string;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
}

class EnhancedPeerSupportService {
  // Video Session Management
  async createVideoSession(
    userId: string, 
    supporterId: string, 
    sessionType: 'video' | 'audio' = 'video',
    scheduledAt?: Date,
    recordingConsent: boolean = false
  ): Promise<VideoSession> {
    const { data, error } = await supabase
      .from('peer_video_sessions')
      .insert({
        user_id: userId,
        peer_supporter_id: supporterId,
        session_type: sessionType,
        scheduled_at: scheduledAt?.toISOString(),
        recording_consent: recordingConsent,
        room_id: `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })
      .select()
      .single();

    if (error) throw error;
    return data as unknown as VideoSession;
  }

  async startVideoSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('peer_video_sessions')
      .update({
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) throw error;
  }

  async endVideoSession(sessionId: string, qualityScore?: number, technicalIssues?: string[]): Promise<void> {
    const session = await this.getVideoSession(sessionId);
    const duration = session?.started_at 
      ? Math.floor((Date.now() - new Date(session.started_at).getTime()) / 60000)
      : undefined;

    const { error } = await supabase
      .from('peer_video_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
        duration_minutes: duration,
        quality_score: qualityScore,
        technical_issues: technicalIssues || []
      })
      .eq('id', sessionId);

    if (error) throw error;
  }

  async getVideoSession(sessionId: string): Promise<VideoSession | null> {
    const { data, error } = await supabase
      .from('peer_video_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as unknown as VideoSession | null;
  }

  async getUserVideoSessions(userId: string): Promise<VideoSession[]> {
    const { data, error } = await supabase
      .from('peer_video_sessions')
      .select('*')
      .or(`user_id.eq.${userId},peer_supporter_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as VideoSession[];
  }

  // Enhanced Queue Management
  async joinQueueWithScheduling(
    userId: string,
    priority: 'normal' | 'high' | 'crisis' = 'normal',
    options: QueueScheduleOptions = {}
  ) {
    // Calculate estimated wait time using the database function
    const { data: waitTime } = await supabase.rpc('calculate_queue_wait_time', {
      priority_level: priority
    });

    const { data, error } = await supabase
      .from('peer_support_queue')
      .insert({
        user_id: userId,
        priority,
        issue_description: options.callback_requested ? 'Callback requested' : undefined,
        scheduled_time: options.scheduled_time,
        callback_requested: options.callback_requested || false,
        callback_phone: options.callback_phone,
        estimated_wait_minutes: waitTime || 15
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async requestCallback(userId: string, phoneNumber: string): Promise<void> {
    const { error } = await supabase
      .from('peer_support_queue')
      .update({
        callback_requested: true,
        callback_phone: phoneNumber
      })
      .eq('user_id', userId);

    if (error) throw error;
  }

  async getAvailableTimeSlots(date: Date): Promise<string[]> {
    // Simple implementation - return hourly slots from 9 AM to 5 PM
    const slots: string[] = [];
    for (let hour = 9; hour <= 17; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }

  // Quality Assurance and Flagging (simplified for now)
  async flagSession(
    sessionId: string,
    flagType: 'safety_concern' | 'inappropriate_content' | 'crisis_indicator' | 'quality_issue',
    severity: 'low' | 'medium' | 'high' | 'critical',
    description: string,
    flaggedBy: string
  ): Promise<any> {
    // Store in audit logs for now until new tables are available
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: flaggedBy,
        action: `SESSION_FLAGGED_${flagType.toUpperCase()}`,
        details_encrypted: JSON.stringify({
          session_id: sessionId,
          flag_type: flagType,
          severity,
          description
        })
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getSessionFlags(supporterId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', supporterId)
      .like('action', 'SESSION_FLAGGED_%')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async generateSessionSummary(sessionId: string): Promise<string> {
    // Get session messages
    const { data: messages, error } = await supabase
      .from('peer_chat_messages')
      .select('message_text, sender_type')
      .eq('session_id', sessionId)
      .order('created_at');

    if (error) throw error;

    // Simple summary generation (in real app, you'd use AI)
    const messageCount = messages?.length || 0;
    const userMessages = messages?.filter(m => m.sender_type === 'user').length || 0;
    const supporterMessages = messages?.filter(m => m.sender_type === 'supporter').length || 0;

    return `Session summary: ${messageCount} total messages exchanged. User sent ${userMessages} messages, supporter sent ${supporterMessages} messages. Session appeared to be a typical peer support conversation with good engagement from both parties.`;
  }

  async saveSesssionSummary(sessionId: string, summary: string, keyTopics: string[] = []): Promise<void> {
    // Store in audit logs for now
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: sessionId, // Using session id as temp user id
        action: 'SESSION_SUMMARY_GENERATED',
        details_encrypted: JSON.stringify({
          session_id: sessionId,
          summary,
          key_topics: keyTopics
        })
      });

    if (error) throw error;
  }

  // Performance Metrics (simplified)
  async getSupporterMetrics(supporterId: string, dateRange: { start: Date; end: Date }): Promise<any[]> {
    // Calculate basic metrics from existing sessions
    const { data: sessions } = await supabase
      .from('peer_chat_sessions')
      .select('*')
      .eq('peer_supporter_id', supporterId)
      .gte('started_at', dateRange.start.toISOString())
      .lte('started_at', dateRange.end.toISOString());

    const totalSessions = sessions?.length || 0;
    const avgRating = sessions?.reduce((sum, s) => sum + (s.user_rating || 0), 0) / totalSessions || 0;
    const escalationRate = sessions?.filter(s => s.escalated_to_crisis).length / totalSessions || 0;

    return [{
      supporter_id: supporterId,
      total_sessions: totalSessions,
      average_rating: avgRating,
      escalation_rate: escalationRate,
      metric_date: new Date().toISOString().split('T')[0]
    }];
  }

  async updateSupporterMetrics(supporterId: string): Promise<void> {
    // Log metrics update
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: supporterId,
        action: 'SUPPORTER_METRICS_UPDATED',
        details_encrypted: JSON.stringify({
          updated_at: new Date().toISOString()
        })
      });

    if (error) throw error;
  }

  // WebRTC Room Management
  generateRoomToken(roomId: string, participantId: string): string {
    // In a real implementation, this would generate a secure token
    // for video calling service (Daily.co, Twilio, etc.)
    return `${roomId}_${participantId}_${Date.now()}`;
  }

  // Load balancing for supporters
  async getOptimalSupporter(priority: 'normal' | 'high' | 'crisis'): Promise<string | null> {
    const { data: supporters, error } = await supabase
      .from('peer_supporters')
      .select('user_id, current_chat_count, max_concurrent_chats, average_rating')
      .eq('is_available', true)
      .lt('current_chat_count', supabase.from('peer_supporters').select('max_concurrent_chats'))
      .order('current_chat_count', { ascending: true })
      .order('average_rating', { ascending: false });

    if (error || !supporters?.length) return null;

    // For crisis situations, prefer supporters with higher ratings
    if (priority === 'crisis') {
      return supporters.sort((a, b) => b.average_rating - a.average_rating)[0]?.user_id || null;
    }

    // For normal priority, use least loaded supporter
    return supporters[0]?.user_id || null;
  }
}

export const enhancedPeerSupportService = new EnhancedPeerSupportService();