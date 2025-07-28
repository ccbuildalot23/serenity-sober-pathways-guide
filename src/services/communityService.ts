import { supabase } from '@/integrations/supabase/client';

export interface ForumPost {
  id: string;
  forum_id: string;
  user_id: string;
  title: string;
  content: string;
  anonymous_name: string;
  flagged_count: number | null;
  is_moderated: boolean | null;
  moderation_status: string | null;
  reply_count: number | null;
  created_at: string;
  last_activity: string | null;
}

export interface SuccessStory {
  id: string;
  user_id: string;
  title: string;
  content: string;
  story_category: string;
  anonymous_name: string | null;
  is_anonymous: boolean | null;
  is_featured: boolean | null;
  is_moderated: boolean | null;
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
    title: string;
    content: string;
    tags?: string[];
  }): Promise<ForumPost> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get or create anonymous username
    const anonymousName = await this.getAnonymousUsername(user.id, postData.forum_id);

    // Perform basic moderation
    const moderationStatus = this.moderateContent(postData.content);

    const { data, error } = await supabase
      .from('forum_posts')
      .insert({
        forum_id: postData.forum_id,
        user_id: user.id,
        title: postData.title,
        content: postData.content,
        anonymous_name: anonymousName,
        moderation_status: moderationStatus,
        is_moderated: true
      })
      .select()
      .single();

    if (error) throw error;
    return data as ForumPost;
  }

  static async getForumPosts(
    forumId: string,
    filters?: {
      sort?: 'recent' | 'popular';
      search?: string;
    }
  ): Promise<ForumPost[]> {
    let query = supabase
      .from('forum_posts')
      .select('*')
      .eq('forum_id', forumId)
      .or('moderation_status.eq.approved,moderation_status.is.null');

    if (filters?.search) {
      query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
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
    // Placeholder - tables exist but types not yet regenerated
    console.log(`Reacting to post ${postId} with ${reactionType}`);
  }

  static async reportContent(
    contentType: 'post' | 'reply' | 'story',
    contentId: string,
    reason: string,
    details?: string
  ): Promise<void> {
    // Placeholder - tables exist but types not yet regenerated
    console.log(`Reporting ${contentType} ${contentId} for ${reason}:`, details);
  }

  static async blockUser(blockedUserId: string): Promise<void> {
    // Placeholder - tables exist but types not yet regenerated
    console.log(`Blocking user ${blockedUserId}`);
  }

  // Success Stories functions
  static async createSuccessStory(storyData: {
    title: string;
    content: string;
    story_category: string;
    is_anonymous?: boolean;
  }): Promise<SuccessStory> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    // Get anonymous username if needed
    const anonymousName = storyData.is_anonymous 
      ? await this.getAnonymousUsername(user.id) 
      : null;

    const moderationStatus = this.moderateContent(storyData.content);

    const { data, error } = await supabase
      .from('success_stories')
      .insert({
        user_id: user.id,
        title: storyData.title,
        content: storyData.content,
        story_category: storyData.story_category,
        anonymous_name: anonymousName,
        is_anonymous: storyData.is_anonymous || false,
        moderation_status: moderationStatus,
        is_moderated: true
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
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as SuccessStory[];
  }

  static async interactWithStory(
    storyId: string, 
    interactionType: 'like' | 'view' | 'help'
  ): Promise<void> {
    // Placeholder - tables exist but types not yet regenerated
    console.log(`Interacting with story ${storyId}: ${interactionType}`);
  }

  // Helper functions
  private static async getAnonymousUsername(userId: string, forumId?: string): Promise<string> {
    // Generate a simple anonymous username for now - will be replaced with DB lookup once types are updated
    const adjectives = ['Hopeful', 'Strong', 'Brave', 'Kind', 'Wise', 'Gentle', 'Peaceful'];
    const nouns = ['Warrior', 'Journey', 'Spirit', 'Heart', 'Soul', 'Friend', 'Guide'];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 1000);
    
    return `${adjective}${noun}${number}`;
  }

  private static moderateContent(content: string): string {
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

    if (crisisFlagged || substanceFlagged) {
      return 'flagged';
    }

    return 'approved';
  }
}