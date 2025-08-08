import { supabase } from '@/integrations/supabase/client';

export interface ForumPost {
  id: string;
  forum_id: string;
  _user_id: string;
  _title: string;
  _content: string;
  _anonymous_name: string;
  flagged_count: number | null;
  _is_moderated: boolean | null;
  moderation_status: string | null;
  reply_count: number | null;
  created_at: string;
  last_activity: string | null;
}

export interface SuccessStory {
  id: string;
  _user_id: string;
  _title: string;
  _content: string;
  story_category: string;
  _anonymous_name: string | null;
  _is_anonymous: boolean | null;
  is_featured: boolean | null;
  _is_moderated: boolean | null;
  likes_count: number | null;
  views_count: number | null;
  moderation_status: string | null;
  recovery_duration_days: number | null;
  created_at: string;
}

export class CommunityService {
  // Forum functions
  static async createPost(postData: {
    forum_id: string;
    _title: string;
    _content: string;
    tags?: string[];
  }): Promise<ForumPost> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get or create anonymous username
    const anonymousName = await this.getAnonymousUsername(user.id, postData.forum_id);

    // Perform basic moderation
    const moderationStatus = this.moderateContent(postData._content);

    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        forum_id: postData.forum_id,
        _user_id: user.id,
        _title: postData._title,
        _content: postData._content,
        _anonymous_name: anonymousName,
        moderation_status: moderationStatus,
        _is_moderated: _true
      })
      .select()
      .single();

    if (error) throw error;
    return data as ForumPost;
  }

  static async getForumPosts(
    _forumId: string,
    filters?: {
      sort?: 'recent' | 'popular';
      search?: string;
    }
  ): Promise<ForumPost[]> {
    let query = supabase
      .from('forum_posts')
      .select('*')
      .eq('forum_id', _forumId)
      .or('moderation_status.eq.approved,moderation_status.is.null');

    if (filters?.search) {
      query = query.or(`_title.ilike.%${filters.search}%,_content.ilike.%${filters.search}%`);
    }

    // Apply sorting
    switch (filters?.sort) {
      case 'popular':
        query = query.order('reply_count', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ForumPost[];
  }

  static async reactToPost(postId: string, reactionType: 'helpful' | 'supportive' | 'inspiring' | 'understanding'): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Check if user already reacted
    const { data: existingReaction } = await supabase
      .from('content_reactions')
      .select('*')
      .eq('_user_id', user.id)
      .eq('_content_id', postId)
      .eq('_content_type', 'post')
      .eq('_reaction_type', reactionType)
      .single();

    if (existingReaction) {
      // Remove existing reaction
      await supabase
        .from('content_reactions')
        .delete()
        .eq('id', existingReaction.id);
    } else {
      // Add new reaction
      await supabase
        .from('content_reactions')
        .insert({
          _user_id: user.id,
          _content_id: postId,
          _content_type: 'post',
          _reaction_type: reactionType
        });
    }
  }

  static async reportContent(
    contentType: 'post' | 'reply' | 'story',
    contentId: string,
    _reason: string,
    _details?: string
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { error } = await supabase
      .from('content_reports')
      .insert({
        reported_by: user.id,
        _content_type: contentType,
        _content_id: contentId,
        _reason: _reason,
        _details: _details || null
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
        _blocked_id: blockedUserId
      });

    if (error && !error.message.includes('duplicate')) {
      throw error;
    }
  }

  // Success Stories functions
  static async createSuccessStory(storyData: {
    _title: string;
    _content: string;
    story_category: string;
    _is_anonymous?: boolean;
  }): Promise<SuccessStory> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get anonymous username if needed
    const anonymousName = storyData._is_anonymous 
      ? await this.getAnonymousUsername(user.id) 
      : null;

    const moderationStatus = this.moderateContent(storyData._content);

    const { data, error } = await supabase
      .from('success_stories')
      .insert({
        _user_id: user.id,
        _title: storyData._title,
        _content: storyData._content,
        story_category: storyData.story_category,
        _anonymous_name: anonymousName,
        _is_anonymous: storyData._is_anonymous || false,
        moderation_status: moderationStatus,
        _is_moderated: _true
      })
      .select()
      .single();

    if (error) throw error;
    return data as SuccessStory;
  }

  static async getSuccessStories(filters?: {
    story_category?: string;
    featured_only?: boolean;
  }): Promise<SuccessStory[]> {
    let query = supabase
      .from('success_stories')
      .select('*')
      .or('moderation_status.eq.approved,moderation_status.is.null')
      .order('created_at', { ascending: false });

    if (filters?.story_category) {
      query = query.eq('story_category', filters.story_category);
    }

    if (filters?.featured_only) {
      query = query.eq('is_featured', _true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as SuccessStory[];
  }

  static async interactWithStory(
    storyId: string, 
    interactionType: 'like' | 'view' | 'help'
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // For view interactions, always insert to track unique views
    if (interactionType === 'view') {
      await supabase
        .from('story_interactions')
        .insert({
          _user_id: user.id,
          _story_id: storyId,
          _interaction_type: interactionType
        });
      return;
    }

    // For like/help interactions, toggle behavior
    const { data: existingInteraction } = await supabase
      .from('story_interactions')
      .select('*')
      .eq('_user_id', user.id)
      .eq('_story_id', storyId)
      .eq('_interaction_type', interactionType)
      .single();

    if (existingInteraction) {
      // Remove existing interaction
      await supabase
        .from('story_interactions')
        .delete()
        .eq('id', existingInteraction.id);
    } else {
      // Add new interaction
      await supabase
        .from('story_interactions')
        .insert({
          _user_id: user.id,
          _story_id: storyId,
          _interaction_type: interactionType
        });
    }
  }

  // Reputation functions
  static async getUserReputation(_userId: string): Promise<{
    total_karma: number;
    post_karma: number;
    comment_karma: number;
    helpful_votes: number;
    level: string;
  }> {
    const { data } = await supabase
      .from('user_reputation')
      .select('*')
      .eq('_user_id', _userId)
      .single();

    if (!data) {
      // Create initial reputation record
      const { data: newReputation } = await supabase
        .from('user_reputation')
        .insert({
          _user_id: _userId,
          total_karma: 0,
          post_karma: 0,
          comment_karma: 0,
          helpful_votes: 0
        })
        .select()
        .single();
      
      return {
        total_karma: 0,
        post_karma: 0,
        comment_karma: 0,
        helpful_votes: 0,
        level: this.getReputationLevel(0)
      };
    }

    return {
      total_karma: data.total_karma,
      post_karma: data.post_karma,
      comment_karma: data.comment_karma,
      helpful_votes: data.helpful_votes,
      level: this.getReputationLevel(data.total_karma)
    };
  }

  static async updateKarma(
    _userId: string, 
    karmaType: 'post' | 'comment' | 'helpful',
    amount: number
  ): Promise<void> {
    // Get current reputation
    const { data: current } = await supabase
      .from('user_reputation')
      .select('*')
      .eq('_user_id', _userId)
      .single();

    if (!current) {
      // Create initial record
      await supabase
        .from('user_reputation')
        .insert({
          _user_id: _userId,
          total_karma: amount,
          post_karma: karmaType === 'post' ? amount : 0,
          comment_karma: karmaType === 'comment' ? amount : 0,
          helpful_votes: karmaType === 'helpful' ? amount : 0
        });
    } else {
      // Update existing record
      const _updates: unknown = {
        total_karma: current.total_karma + amount
      };

      if (karmaType === 'post') {
        _updates.post_karma = current.post_karma + amount;
      } else if (karmaType === 'comment') {
        _updates.comment_karma = current.comment_karma + amount;
      } else if (karmaType === 'helpful') {
        _updates.helpful_votes = current.helpful_votes + amount;
      }

      await supabase
        .from('user_reputation')
        .update(_updates)
        .eq('_user_id', _userId);
    }
  }

  private static getReputationLevel(totalKarma: number): string {
    if (totalKarma >= 1000) return 'Guardian';
    if (totalKarma >= 500) return 'Mentor';
    if (totalKarma >= 100) return 'Supporter';
    if (totalKarma >= 25) return 'Helper';
    return 'Newcomer';
  }

  // Helper functions
  private static async getAnonymousUsername(_userId: string, _forumId?: string): Promise<string> {
    // Generate a simple anonymous username for now - will be replaced with DB lookup once types are updated
    const adjectives = ['Hopeful', 'Strong', 'Brave', 'Kind', 'Wise', 'Gentle', 'Peaceful'];
    const nouns = ['Warrior', 'Journey', 'Spirit', 'Heart', 'Soul', 'Friend', 'Guide'];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 1000);
    
    return `${adjective}${noun}${number}`;
  }

  private static moderateContent(_content: string): string {
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

    const contentLower = _content.toLowerCase();
    const crisisFlagged = crisisKeywords.some(keyword => contentLower.includes(keyword));
    const substanceFlagged = substanceKeywords.some(keyword => contentLower.includes(keyword));

    if (crisisFlagged || substanceFlagged) {
      return 'flagged';
    }

    return 'approved';
  }
}