import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePresenceState } from '@supabase/realtime-js';
import { v4 as uuidv4 } from 'uuid';
import Sentiment from 'sentiment';
import logger from './loggerService';

/**
 * Enhanced Peer Community Service
 * 
 * Builds on top of existing peer support with:
 * - Community forums
 * - Real-time group chat
 * - Mentorship matching
 * - Workshop scheduling
 * - Content moderation
 */

// Content moderation keywords
const BLOCKED_CONTENT = {
  harmful: [
    'suicide method', 'how to die', 'drug dealer', 'where to buy',
    'self harm technique', 'overdose guide'
  ],
  triggers: [
    'graphic violence', 'explicit substance details'
  ]
};

export const SUPPORT_CATEGORIES = [
  'Substance Recovery',
  'Mental Health',
  'Trauma & PTSD',
  'Family & Relationships',
  'Career & Purpose',
  'Daily Struggles',
  'Celebration & Wins',
  'Crisis Support'
];

export interface CommunityProfile {
  id: string;
  userId: string;
  username: string;
  bio: string;
  recoveryDate?: Date;
  supportAreas: string[];
  isMentor: boolean;
  mentorRating?: number;
  isOnline: boolean;
  lastActive: Date;
  badges: Badge[];
  totalPosts: number;
  helpfulReplies: number;
}

export interface Badge {
  id: string;
  type: 'days_sober' | 'helper' | 'mentor' | 'milestone' | 'contributor' | 'moderator';
  title: string;
  description: string;
  earnedDate: Date;
  icon?: string;
}

export interface ForumPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  category: string;
  title: string;
  content: string;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  replies: number;
  views: number;
  isPinned: boolean;
  isModerator: boolean;
  sentiment?: number;
  tags: string[];
}

export interface ForumReply {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  isAnonymous: boolean;
  createdAt: Date;
  likes: number;
  isModerator: boolean;
  isHelpful: boolean;
  replyToId?: string; // For nested replies
}

export interface GroupChat {
  id: string;
  name: string;
  description: string;
  category: string;
  maxParticipants: number;
  currentParticipants: number;
  isModerated: boolean;
  moderators: string[];
  createdAt: Date;
  isActive: boolean;
  isPrivate: boolean;
  joinCode?: string;
}

export interface Workshop {
  id: string;
  title: string;
  description: string;
  facilitatorId: string;
  facilitatorName: string;
  category: string;
  scheduledDate: Date;
  duration: number; // minutes
  maxParticipants: number;
  registeredCount: number;
  materials?: string[];
  isRecorded: boolean;
  meetingLink?: string;
  prerequisites?: string[];
  skillLevel: 'beginner' | 'intermediate' | 'advanced';
}

export interface MentorProfile {
  id: string;
  userId: string;
  username: string;
  bio: string;
  specialties: string[];
  yearsOfExperience: number;
  sobrietyDate?: Date;
  availability: {
    days: string[];
    times: string[];
  };
  rating: number;
  totalMentees: number;
  currentMentees: number;
  maxMentees: number;
  testimonials: string[];
}

export class PeerCommunityService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private sentiment: Sentiment;
  private presenceState: RealtimePresenceState = {};

  constructor() {
    this.sentiment = new Sentiment();
  }

  /**
   * Initialize community profile for user
   */
  async initializeCommunityProfile(userId: string): Promise<CommunityProfile> {
    const { data: existing } = await supabase
      .from('community_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return this.mapToCommunityProfile(existing);
    }

    // Create new profile
    const { data: user } = await supabase.auth.getUser();
    const username = user?.user?.email?.split('@')[0] || `member_${Date.now()}`;

    const newProfile = {
      user_id: userId,
      username,
      bio: 'New community member',
      support_areas: ['General Support'],
      is_mentor: false,
      is_online: true,
      last_active: new Date().toISOString(),
      total_posts: 0,
      helpful_replies: 0
    };

    const { data: created } = await supabase
      .from('community_profiles')
      .insert(newProfile)
      .select()
      .single();

    return this.mapToCommunityProfile(created);
  }

  /**
   * Create a new forum post
   */
  async createForumPost(
    userId: string,
    category: string,
    title: string,
    content: string,
    tags: string[],
    isAnonymous: boolean = false
  ): Promise<ForumPost> {
    // Content moderation
    if (this.isContentBlocked(content) || this.isContentBlocked(title)) {
      throw new Error('Post contains prohibited content');
    }

    const { data: profile } = await supabase
      .from('community_profiles')
      .select('username')
      .eq('user_id', userId)
      .single();

    const sentimentScore = this.sentiment.analyze(content).score;

    const post = {
      author_id: userId,
      author_name: isAnonymous ? 'Anonymous' : profile?.username,
      category,
      title,
      content,
      tags,
      is_anonymous: isAnonymous,
      sentiment: sentimentScore,
      views: 0,
      likes: 0,
      replies: 0
    };

    const { data: created } = await supabase
      .from('forum_posts')
      .insert(post)
      .select()
      .single();

    // Update user's post count
    await this.incrementUserPostCount(userId);

    // Check for achievements
    await this.checkForumAchievements(userId);

    return this.mapToForumPost(created);
  }

  /**
   * Reply to a forum post
   */
  async replyToPost(
    postId: string,
    userId: string,
    content: string,
    replyToId?: string,
    isAnonymous: boolean = false
  ): Promise<ForumReply> {
    // Content moderation
    if (this.isContentBlocked(content)) {
      throw new Error('Reply contains prohibited content');
    }

    const { data: profile } = await supabase
      .from('community_profiles')
      .select('username')
      .eq('user_id', userId)
      .single();

    const reply = {
      post_id: postId,
      author_id: userId,
      author_name: isAnonymous ? 'Anonymous' : profile?.username,
      content,
      reply_to_id: replyToId,
      is_anonymous: isAnonymous
    };

    const { data: created } = await supabase
      .from('forum_replies')
      .insert(reply)
      .select()
      .single();

    // Update post reply count
    await supabase.rpc('increment_reply_count', { post_id: postId });

    return this.mapToForumReply(created);
  }

  /**
   * Get trending forum posts
   */
  async getTrendingPosts(category?: string, limit: number = 10): Promise<ForumPost[]> {
    let query = supabase
      .from('forum_posts')
      .select('*')
      .order('likes', { ascending: false })
      .order('replies', { ascending: false })
      .order('views', { ascending: false })
      .limit(limit);

    if (category) {
      query = query.eq('category', category);
    }

    const { data } = await query;
    return (data || []).map(this.mapToForumPost);
  }

  /**
   * Search forum posts
   */
  async searchPosts(searchTerm: string, category?: string): Promise<ForumPost[]> {
    let query = supabase
      .from('forum_posts')
      .select('*')
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`);

    if (category) {
      query = query.eq('category', category);
    }

    const { data } = await query.order('created_at', { ascending: false });
    return (data || []).map(this.mapToForumPost);
  }

  /**
   * Join a group chat room
   */
  async joinGroupChat(chatId: string, userId: string): Promise<RealtimeChannel> {
    // Leave existing room if any
    this.leaveGroupChat(chatId);

    // Get user profile
    const { data: profile } = await supabase
      .from('community_profiles')
      .select('username')
      .eq('user_id', userId)
      .single();

    // Create channel for the chat room
    const channel = supabase.channel(`group:${chatId}`)
      .on('presence', { event: 'sync' }, () => {
        this.presenceState = channel.presenceState();
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        logger.debug('User joined group:', key, newPresences, { component: 'peerCommunityService' });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        logger.debug('User left group:', key, leftPresences, { component: 'peerCommunityService' });
      })
      .on('broadcast', { event: 'message' }, (payload) => {
        // Handle incoming messages
        this.handleGroupMessage(chatId, payload.payload);
      })
      .on('broadcast', { event: 'typing' }, (payload) => {
        // Handle typing indicators
        logger.debug('User typing:', payload.payload, { component: 'peerCommunityService' });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Track user presence
          await channel.track({
            user_id: userId,
            username: profile?.username || 'Anonymous',
            online_at: new Date().toISOString()
          });
        }
      });

    this.channels.set(chatId, channel);
    return channel;
  }

  /**
   * Send message in group chat
   */
  async sendGroupMessage(chatId: string, userId: string, content: string): Promise<void> {
    // Content moderation
    if (this.isContentBlocked(content)) {
      throw new Error('Message contains prohibited content');
    }

    const channel = this.channels.get(chatId);
    if (!channel) {
      throw new Error('Not connected to chat room');
    }

    const { data: profile } = await supabase
      .from('community_profiles')
      .select('username')
      .eq('user_id', userId)
      .single();

    const sentimentScore = this.sentiment.analyze(content).score;

    // Save message to database
    await supabase.from('group_messages').insert({
      chat_id: chatId,
      user_id: userId,
      content,
      sentiment: sentimentScore
    });

    // Broadcast message
    await channel.send({
      type: 'broadcast',
      event: 'message',
      payload: {
        id: uuidv4(),
        userId,
        username: profile?.username || 'Anonymous',
        content,
        timestamp: new Date().toISOString(),
        sentiment: sentimentScore
      }
    });

    // Check for crisis content
    if (sentimentScore < -5) {
      await this.flagForModeration(chatId, userId, content);
    }
  }

  /**
   * Leave group chat
   */
  leaveGroupChat(chatId: string): void {
    const channel = this.channels.get(chatId);
    if (channel) {
      channel.unsubscribe();
      this.channels.delete(chatId);
    }
  }

  /**
   * Find a mentor match
   */
  async findMentorMatch(userId: string, preferences: string[]): Promise<MentorProfile[]> {
    // Get available mentors matching preferences
    const { data: mentors } = await supabase
      .from('mentor_profiles')
      .select('*')
      .contains('specialties', preferences)
      .lt('current_mentees', supabase.raw('max_mentees'))
      .order('rating', { ascending: false })
      .limit(5);

    if (!mentors || mentors.length === 0) {
      // Fallback to any available mentor
      const { data: anyMentors } = await supabase
        .from('mentor_profiles')
        .select('*')
        .lt('current_mentees', supabase.raw('max_mentees'))
        .order('rating', { ascending: false })
        .limit(3);

      return (anyMentors || []).map(this.mapToMentorProfile);
    }

    return mentors.map(this.mapToMentorProfile);
  }

  /**
   * Request mentorship
   */
  async requestMentorship(mentorId: string, menteeId: string, message: string): Promise<void> {
    // Check if request already exists
    const { data: existing } = await supabase
      .from('mentorship_requests')
      .select('*')
      .eq('mentor_id', mentorId)
      .eq('mentee_id', menteeId)
      .eq('status', 'pending')
      .single();

    if (existing) {
      throw new Error('Request already pending');
    }

    // Create request
    await supabase.from('mentorship_requests').insert({
      mentor_id: mentorId,
      mentee_id: menteeId,
      message,
      status: 'pending'
    });

    // Notify mentor
    await this.notifyMentor(mentorId, menteeId, message);
  }

  /**
   * Schedule a workshop
   */
  async scheduleWorkshop(workshop: Omit<Workshop, 'id' | 'registeredCount'>): Promise<Workshop> {
    const newWorkshop = {
      ...workshop,
      registered_count: 0
    };

    const { data: created } = await supabase
      .from('workshops')
      .insert(newWorkshop)
      .select()
      .single();

    // Notify community
    await this.broadcastWorkshopAnnouncement(created);

    return this.mapToWorkshop(created);
  }

  /**
   * Register for workshop
   */
  async registerForWorkshop(workshopId: string, userId: string): Promise<void> {
    // Check capacity
    const { data: workshop } = await supabase
      .from('workshops')
      .select('max_participants, registered_count')
      .eq('id', workshopId)
      .single();

    if (!workshop || workshop.registered_count >= workshop.max_participants) {
      throw new Error('Workshop is full');
    }

    // Check if already registered
    const { data: existing } = await supabase
      .from('workshop_registrations')
      .select('*')
      .eq('workshop_id', workshopId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      throw new Error('Already registered');
    }

    // Register user
    await supabase.from('workshop_registrations').insert({
      workshop_id: workshopId,
      user_id: userId
    });

    // Update count
    await supabase.rpc('increment_workshop_registration', { workshop_id: workshopId });
  }

  /**
   * Get upcoming workshops
   */
  async getUpcomingWorkshops(category?: string): Promise<Workshop[]> {
    let query = supabase
      .from('workshops')
      .select('*')
      .gte('scheduled_date', new Date().toISOString())
      .order('scheduled_date', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data } = await query;
    return (data || []).map(this.mapToWorkshop);
  }

  // Helper methods

  private isContentBlocked(content: string): boolean {
    const lowerContent = content.toLowerCase();
    
    for (const phrase of [...BLOCKED_CONTENT.harmful, ...BLOCKED_CONTENT.triggers]) {
      if (lowerContent.includes(phrase)) {
        return true;
      }
    }
    
    return false;
  }

  private async handleGroupMessage(chatId: string, message: any): Promise<void> {
    // Process incoming message
    logger.debug(`Message in ${chatId}:`, message, { component: 'peerCommunityService' });
    
    // Check for crisis content
    if (message.sentiment && message.sentiment < -5) {
      await this.flagForModeration(chatId, message.userId, message.content);
    }
  }

  private async flagForModeration(chatId: string, userId: string, content: string): Promise<void> {
    await supabase.from('moderation_queue').insert({
      chat_id: chatId,
      user_id: userId,
      content,
      reason: 'negative_sentiment',
      flagged_at: new Date().toISOString()
    });
  }

  private async incrementUserPostCount(userId: string): Promise<void> {
    await supabase.rpc('increment_user_posts', { user_id: userId });
  }

  private async checkForumAchievements(userId: string): Promise<void> {
    // Check post count milestones
    const { data: profile } = await supabase
      .from('community_profiles')
      .select('total_posts')
      .eq('user_id', userId)
      .single();

    if (profile) {
      const milestones = [1, 10, 50, 100, 500];
      for (const milestone of milestones) {
        if (profile.total_posts === milestone) {
          await this.awardBadge(userId, `posts_${milestone}`, `${milestone} Posts`);
        }
      }
    }
  }

  private async awardBadge(userId: string, badgeType: string, title: string): Promise<void> {
    // Check if already has badge
    const { data: existing } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .eq('badge_type', badgeType)
      .single();

    if (!existing) {
      await supabase.from('user_badges').insert({
        user_id: userId,
        badge_type: badgeType,
        title,
        earned_at: new Date().toISOString()
      });

      // Notify user
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'badge_earned',
        message: `Congratulations! You earned the "${title}" badge!`,
        data: { badge_type: badgeType }
      });
    }
  }

  private async notifyMentor(mentorId: string, menteeId: string, message: string): Promise<void> {
    await supabase.from('notifications').insert({
      user_id: mentorId,
      type: 'mentorship_request',
      message: 'New mentorship request received',
      data: { mentee_id: menteeId, request_message: message }
    });
  }

  private async broadcastWorkshopAnnouncement(workshop: any): Promise<void> {
    // Send to community announcements channel
    const channel = supabase.channel('community:announcements');
    await channel.send({
      type: 'broadcast',
      event: 'new_workshop',
      payload: workshop
    });
  }

  // Mapping functions

  private mapToCommunityProfile(data: any): CommunityProfile {
    return {
      id: data.id,
      userId: data.user_id,
      username: data.username,
      bio: data.bio,
      recoveryDate: data.recovery_date ? new Date(data.recovery_date) : undefined,
      supportAreas: data.support_areas || [],
      isMentor: data.is_mentor,
      mentorRating: data.mentor_rating,
      isOnline: data.is_online,
      lastActive: new Date(data.last_active),
      badges: [],
      totalPosts: data.total_posts || 0,
      helpfulReplies: data.helpful_replies || 0
    };
  }

  private mapToForumPost(data: any): ForumPost {
    return {
      id: data.id,
      authorId: data.author_id,
      authorName: data.author_name,
      authorAvatar: data.author_avatar,
      category: data.category,
      title: data.title,
      content: data.content,
      isAnonymous: data.is_anonymous,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      likes: data.likes || 0,
      replies: data.replies || 0,
      views: data.views || 0,
      isPinned: data.is_pinned || false,
      isModerator: data.is_moderator || false,
      sentiment: data.sentiment,
      tags: data.tags || []
    };
  }

  private mapToForumReply(data: any): ForumReply {
    return {
      id: data.id,
      postId: data.post_id,
      authorId: data.author_id,
      authorName: data.author_name,
      content: data.content,
      isAnonymous: data.is_anonymous,
      createdAt: new Date(data.created_at),
      likes: data.likes || 0,
      isModerator: data.is_moderator || false,
      isHelpful: data.is_helpful || false,
      replyToId: data.reply_to_id
    };
  }

  private mapToMentorProfile(data: any): MentorProfile {
    return {
      id: data.id,
      userId: data.user_id,
      username: data.username,
      bio: data.bio,
      specialties: data.specialties || [],
      yearsOfExperience: data.years_experience || 0,
      sobrietyDate: data.sobriety_date ? new Date(data.sobriety_date) : undefined,
      availability: data.availability || { days: [], times: [] },
      rating: data.rating || 0,
      totalMentees: data.total_mentees || 0,
      currentMentees: data.current_mentees || 0,
      maxMentees: data.max_mentees || 3,
      testimonials: data.testimonials || []
    };
  }

  private mapToWorkshop(data: any): Workshop {
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      facilitatorId: data.facilitator_id,
      facilitatorName: data.facilitator_name,
      category: data.category,
      scheduledDate: new Date(data.scheduled_date),
      duration: data.duration,
      maxParticipants: data.max_participants,
      registeredCount: data.registered_count,
      materials: data.materials,
      isRecorded: data.is_recorded,
      meetingLink: data.meeting_link,
      prerequisites: data.prerequisites,
      skillLevel: data.skill_level
    };
  }
}

// Export singleton instance
export const peerCommunityService = new PeerCommunityService();