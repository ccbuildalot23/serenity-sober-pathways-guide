import { supabase } from '@/integrations/supabase/client';

export interface ForumPost {
  id: string;
  forum_id: string;
  user_id: string;
  title: string;
  content: string;
  anonymous_name: string;
  sentiment_score?: number;
  ai_moderation_status: 'pending' | 'approved' | 'flagged' | 'auto_approved';
  crisis_flagged: boolean;
  keyword_flags: string[];
  view_count: number;
  is_pinned: boolean;
  tags: string[];
  reply_count: number;
  created_at: string;
  last_activity: string;
}

export interface SuccessStory {
  id: string;
  user_id: string;
  title: string;
  content: string;
  story_type: 'written' | 'audio' | 'video';
  media_url?: string;
  anonymity_level: 'full_name' | 'first_name' | 'anonymous';
  sharing_level: 'public' | 'community' | 'providers_only';
  milestones: any[];
  timeline: any[];
  substance_type?: string;
  recovery_length?: string;
  age_group?: string;
  is_featured: boolean;
  feature_consent: boolean;
  expires_at?: string;
  likes_count: number;
  views_count: number;
  helps_count: number;
  moderation_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export class CommunityService {
  // Forum functions
  static async createPost(postData: {
    forum_id: string;
    title: string;
    content: string;
    tags?: string[];
  }): Promise<ForumPost> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get or create anonymous username
    const anonymousName = await this.getAnonymousUsername(user.id);

    // Perform AI moderation
    const moderationResult = await this.moderateContent(postData.content);

    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        forum_id: postData.forum_id,
        user_id: user.id,
        title: postData.title,
        content: postData.content,
        anonymous_name: anonymousName,
        sentiment_score: moderationResult.sentimentScore,
        ai_moderation_status: moderationResult.status,
        crisis_flagged: moderationResult.crisisFlagged,
        keyword_flags: moderationResult.keywordFlags,
        tags: postData.tags || []
      })
      .select()
      .single();

    if (error) throw error;
    return data as ForumPost;
  }

  static async getForumPosts(
    forumId: string,
    filters?: {
      sort?: 'recent' | 'popular' | 'pinned';
      tags?: string[];
      search?: string;
    }
  ): Promise<ForumPost[]> {
    let query = supabase
      .from('forum_posts')
      .select('*')
      .eq('forum_id', forumId)
      .eq('ai_moderation_status', 'approved');

    if (filters?.tags?.length) {
      query = query.overlaps('tags', filters.tags);
    }

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    // Apply sorting
    switch (filters?.sort) {
      case 'popular':
        query = query.order('reply_count', { ascending: false });
        break;
      case 'pinned':
        query = query.order('is_pinned', { ascending: false });
        break;
      default:
        query = query.order('last_activity', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ForumPost[];
  }

  static async reactToPost(postId: string, reactionType: 'helpful' | 'supportive' | 'inspiring' | 'understanding'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Upsert reaction
    const { error } = await supabase
      .from('post_reactions')
      .upsert({
        post_id: postId,
        user_id: user.id,
        reaction_type: reactionType
      });

    if (error) throw error;

    // Update user reputation
    await this.updateUserReputation(user.id, 'helpful_reaction');
  }

  static async reportContent(
    contentType: 'post' | 'reply' | 'story',
    contentId: string,
    reason: string,
    details?: string
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('content_reports')
      .insert({
        reported_by: user.id,
        content_type: contentType,
        content_id: contentId,
        report_reason: reason,
        report_details: details
      });

    if (error) throw error;
  }

  static async blockUser(blockedUserId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('user_blocks')
      .insert({
        blocker_id: user.id,
        blocked_id: blockedUserId
      });

    if (error) throw error;
  }

  // Success Stories functions
  static async createSuccessStory(storyData: {
    title: string;
    content: string;
    story_type: 'written' | 'audio' | 'video';
    media_url?: string;
    anonymity_level: 'full_name' | 'first_name' | 'anonymous';
    sharing_level: 'public' | 'community' | 'providers_only';
    milestones?: any[];
    timeline?: any[];
    substance_type?: string;
    recovery_length?: string;
    age_group?: string;
    feature_consent?: boolean;
  }): Promise<SuccessStory> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Perform AI moderation
    const moderationResult = await this.moderateContent(storyData.content);

    const { data, error } = await supabase
      .from('success_stories')
      .insert({
        user_id: user.id,
        title: storyData.title,
        content: storyData.content,
        story_type: storyData.story_type,
        media_url: storyData.media_url,
        anonymity_level: storyData.anonymity_level,
        sharing_level: storyData.sharing_level,
        milestones: storyData.milestones || [],
        timeline: storyData.timeline || [],
        substance_type: storyData.substance_type,
        recovery_length: storyData.recovery_length,
        age_group: storyData.age_group,
        feature_consent: storyData.feature_consent || false,
        moderation_status: moderationResult.crisisFlagged ? 'pending' : 'approved'
      })
      .select()
      .single();

    if (error) throw error;
    return data as SuccessStory;
  }

  static async getSuccessStories(filters?: {
    substance_type?: string;
    recovery_length?: string;
    age_group?: string;
    story_type?: string;
    featured_only?: boolean;
  }): Promise<SuccessStory[]> {
    let query = supabase
      .from('success_stories')
      .select('*')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false });

    if (filters?.substance_type) {
      query = query.eq('substance_type', filters.substance_type);
    }

    if (filters?.recovery_length) {
      query = query.eq('recovery_length', filters.recovery_length);
    }

    if (filters?.age_group) {
      query = query.eq('age_group', filters.age_group);
    }

    if (filters?.story_type) {
      query = query.eq('story_type', filters.story_type);
    }

    if (filters?.featured_only) {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as SuccessStory[];
  }

  static async interactWithStory(
    storyId: string, 
    interactionType: 'like' | 'view' | 'help' | 'save'
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Upsert interaction
    const { error } = await supabase
      .from('story_interactions')
      .upsert({
        story_id: storyId,
        user_id: user.id,
        interaction_type: interactionType
      });

    if (error) throw error;

    // Update story counts
    const updateField = `${interactionType}s_count`;
    await supabase.rpc('increment_story_count', {
      story_id: storyId,
      field_name: updateField
    });
  }

  // Helper functions
  private static async getAnonymousUsername(userId: string): Promise<string> {
    const { data: existing } = await supabase
      .from('anonymous_usernames')
      .select('anonymous_name')
      .eq('user_id', userId)
      .single();

    if (existing) {
      return existing.anonymous_name;
    }

    // Generate new anonymous username
    const { data: newUsername } = await supabase.rpc('generate_anonymous_username');
    
    const { error } = await supabase
      .from('anonymous_usernames')
      .insert({
        user_id: userId,
        anonymous_name: newUsername,
        avatar_seed: Math.random().toString(36).substring(7)
      });

    if (error) throw error;
    return newUsername;
  }

  private static async moderateContent(content: string): Promise<{
    sentimentScore: number;
    status: 'pending' | 'approved' | 'flagged' | 'auto_approved';
    crisisFlagged: boolean;
    keywordFlags: string[];
  }> {
    // Crisis keywords
    const crisisKeywords = [
      'suicide', 'kill myself', 'end it all', 'give up', 'can\'t go on',
      'want to die', 'no point', 'worthless', 'hopeless'
    ];

    // Substance keywords to flag
    const substanceKeywords = [
      'dealer', 'buying', 'selling', 'high quality', 'pure stuff',
      'connect me', 'hook up', 'score some'
    ];

    const contentLower = content.toLowerCase();
    const crisisFlagged = crisisKeywords.some(keyword => contentLower.includes(keyword));
    const substanceFlagged = substanceKeywords.some(keyword => contentLower.includes(keyword));

    let keywordFlags: string[] = [];
    if (crisisFlagged) keywordFlags.push('crisis');
    if (substanceFlagged) keywordFlags.push('substance_seeking');

    // Simple sentiment analysis (in production, use AI service)
    const positiveWords = ['hope', 'better', 'grateful', 'progress', 'healing', 'recovery', 'strong'];
    const negativeWords = ['terrible', 'awful', 'worst', 'failed', 'relapse', 'struggling'];
    
    const positiveCount = positiveWords.filter(word => contentLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => contentLower.includes(word)).length;
    const sentimentScore = Math.min(Math.max((positiveCount - negativeCount) / 10 + 0.5, 0), 1);

    let status: 'pending' | 'approved' | 'flagged' | 'auto_approved' = 'auto_approved';
    if (crisisFlagged || substanceFlagged) {
      status = 'flagged';
    } else if (sentimentScore < 0.2) {
      status = 'pending';
    }

    return {
      sentimentScore,
      status,
      crisisFlagged,
      keywordFlags
    };
  }

  private static async updateUserReputation(userId: string, action: string): Promise<void> {
    const { data: reputation } = await supabase
      .from('user_reputation')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!reputation) {
      // Create initial reputation
      await supabase
        .from('user_reputation')
        .insert({
          user_id: userId,
          reputation_score: 1
        });
    } else {
      // Update existing reputation
      const scoreIncrement = action === 'helpful_reaction' ? 2 : 1;
      await supabase
        .from('user_reputation')
        .update({
          reputation_score: reputation.reputation_score + scoreIncrement,
          helpful_posts_count: reputation.helpful_posts_count + (action === 'helpful_reaction' ? 1 : 0)
        })
        .eq('user_id', userId);
    }
  }
}